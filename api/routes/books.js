const express = require('express');
const fetch = require('node-fetch').default || require('node-fetch');
const validator = require('validator');
const db = require('../db');
const { authenticateToken } = require('./auth');
const config = require('../config');

const router = express.Router();

// updated and used on 28-11-2025

// GET /api/books
router.get('/', authenticateToken, (req, res) => {
  db.query(
    `SELECT ub.UserBookID, b.BookID, b.Title, b.Author, b.CoverURL,
            ub.ReadingStatus, ub.Progress, ub.Owned, ub.DNF
     FROM userbooks ub
     JOIN books b ON ub.BookID = b.BookID
     WHERE ub.UserID = ?
     ORDER BY ub.UserBookID DESC`,
    [req.user.UserID],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch your books' });
      res.json(results);
    }
  );
});

// POST /api/books - Add book from Google Books
router.post('/', authenticateToken, async (req, res) => {
  const { query, readingStatus, progress = 0, owned = false, dnf = false } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length < 1) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  if (!['Read', 'Reading', 'To Read'].includes(readingStatus)) {
    return res.status(400).json({ error: 'Invalid reading status' });
  }
  const progressNum = parseInt(progress, 10);
  if (!Number.isInteger(progressNum) || progressNum < 0 || progressNum > 100) {
    return res.status(400).json({ error: 'Progress must be 0–100' });
  }

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query.trim())}&key=${config.googleBooksApiKey}&maxResults=1`;
    const response = await fetch(url);
    if (!response.ok) return res.status(502).json({ error: 'Google Books API error' });

    const data = await response.json();
    if (!data.items?.length) return res.status(404).json({ error: 'Book not found' });

    const book = data.items[0].volumeInfo;

    const bookData = {
      title: book.title?.trim() || 'Unknown Title',
      author: Array.isArray(book.authors) ? book.authors.join(', ') : 'Unknown Author',
      type: Array.isArray(book.categories) && book.categories.some(c => /fiction/i.test(c)) ? 'Fiction' : 'Non-Fiction',
      mood: Array.isArray(book.categories) ? book.categories.join(', ') : null,
      isbn: book.industryIdentifiers?.find(i => i.type.includes('ISBN'))?.identifier || null,
      summary: typeof book.description === 'string' ? book.description.slice(0, 2000) : null,
      coverUrl: book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || null
    };

    // Insert or get existing book
    db.query(
      `INSERT IGNORE INTO books (Title, Author, Type, Mood, ISBN, Summary, CoverURL, AddedByUserID)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [bookData.title, bookData.author, bookData.type, bookData.mood, bookData.isbn, bookData.summary, bookData.coverUrl, req.user.UserID],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to save book' });

        const bookId = result.insertId || null;

        const finalize = (id) => {
          db.query(
            `INSERT INTO userbooks (UserID, BookID, ReadingStatus, Progress, Owned, DNF)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               ReadingStatus = VALUES(ReadingStatus),
               Progress = VALUES(Progress),
               Owned = VALUES(Owned),
               DNF = VALUES(DNF)`,
            [req.user.UserID, id, readingStatus, progressNum, owned ? 1 : 0, dnf ? 1 : 0],
            (err2) => {
              if (err2) return res.status(500).json({ error: 'Failed to add to library' });
              res.status(201).json({ message: 'Book added!', bookId: id });
            }
          );
        };

        if (bookId) {
          finalize(bookId);
        } else {
          db.query('SELECT BookID FROM books WHERE Title = ? AND Author = ? LIMIT 1', [bookData.title, bookData.author], (err3, rows) => {
            if (err3 || !rows.length) return res.status(500).json({ error: 'Book exists but ID not found' });
            finalize(rows[0].BookID);
          });
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/books/:id - Update status/progress
router.put('/:id', authenticateToken, (req, res) => {
  const userBookId = parseInt(req.params.id, 10);
  if (!Number.isInteger(userBookId) || userBookId <= 0) {
    return res.status(400).json({ error: 'Invalid book ID' });
  }

  const updates = [];
  const values = [];
  const allowed = ['readingStatus', 'progress', 'owned', 'dnf'];

  Object.keys(req.body).forEach(key => {
    if (allowed.includes(key)) {
      if (key === 'progress') {
        const p = parseInt(req.body[key], 10);
        if (Number.isInteger(p) && p >= 0 && p <= 100) {
          updates.push('Progress = ?');
          values.push(p);
        }
      } else if (key === 'readingStatus' && ['Read', 'Reading', 'To Read'].includes(req.body[key])) {
        updates.push('ReadingStatus = ?');
        values.push(req.body[key]);
      } else if (key === 'owned' || key === 'dnf') {
        updates.push(`${key === 'owned' ? 'Owned' : 'DNF'} = ?`);
        values.push(req.body[key] ? 1 : 0);
      }
    }
  });

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  values.push(userBookId, req.user.UserID);

  db.query(
    `UPDATE userbooks SET ${updates.join(', ')} WHERE UserBookID = ? AND UserID = ?`,
    values,
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Update failed' });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Book not found' });
      res.json({ message: 'Updated!' });
    }
  );
});

// DELETE /api/books/:id
router.delete('/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });

  db.query('DELETE FROM userbooks WHERE UserBookID = ? AND UserID = ?', [id, req.user.UserID], (err, result) => {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Removed from library' });
  });
});

// GET /api/books/search → Updated to use Google Books API 
// Brfoe: Local DB search
router.get('/search', authenticateToken, async (req, res) => {
  let { query = '', page = 1, limit = 10 } = req.query;  

  if (!query || query.trim() === '') {
    return res.json({ books: [], total: 0, page: 1, limit: 10 });
  }

  page = Math.max(1, parseInt(page, 10) || 1);
  limit = 10;  
  const startIndex = (page - 1) * limit;

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query.trim())}&key=${config.googleBooksApiKey}&maxResults=${limit}&startIndex=${startIndex}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: 'Google Books API error' });
    }

    const books = (data.items || []).map(item => {
      const v = item.volumeInfo;
      return {
        BookID: null,
        Title: v.title || 'No Title',
        Author: Array.isArray(v.authors) ? v.authors.join(', ') : 'Unknown Author',
        CoverURL: v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || null,
        ReadingStatus: null,
        Progress: null,
        Owned: null,
        DNF: null,
        UserBookID: null
      };
    });

    
    res.json({
      books,
      total: data.totalItems || 0,
      page: parseInt(page),
      limit: 10
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/books/autocomplete
// Brfoe: Local DB autocomplete
router.get('/autocomplete', authenticateToken, async (req, res) => {
  const { query } = req.query;
  if (!query || query.trim().length < 2) return res.json([]);

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query.trim())}&key=${config.googleBooksApiKey}&maxResults=3`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) return res.json([]);

    const results = data.items.slice(0, 10).map(item => {
      const v = item.volumeInfo;
      return {
        Title: v.title || 'Unknown',
        Author: Array.isArray(v.authors) ? v.authors.join(', ') : 'Unknown'
      };
    });

    res.json(results);
  } catch (err) {
    res.json([]);
  }
});


module.exports = router;