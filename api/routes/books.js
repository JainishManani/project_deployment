const express = require('express');
const fetch = require('node-fetch');
const validator = require('validator');
const db = require('../db');
const { authenticateToken } = require('./auth');
const config = require('../config');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  db.query(
    'SELECT ub.UserBookID, b.BookID, b.Title, b.Author, b.CoverURL, ub.ReadingStatus, ub.Progress, ub.Owned, ub.DNF FROM userbooks ub JOIN books b ON ub.BookID = b.BookID WHERE ub.UserID = ?',
    [req.user.UserID],
    (err, results) => {
      if (err) {
        console.error('Query error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to fetch books' });
      }
      res.json(results);
    }
  );
});

router.post('/', authenticateToken, async (req, res) => {
  const { query, readingStatus, progress, owned, dnf } = req.body;
  if (!query || !validator.isAlphanumeric(query.replace(/\s/g, ''))) {
    return res.status(400).json({ error: 'Invalid query (alphanumeric)' });
  }
  if (!['Read', 'Reading', 'To Read'].includes(readingStatus)) {
    return res.status(400).json({ error: 'Invalid reading status' });
  }
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
    return res.status(400).json({ error: 'Invalid progress (0-100)' });
  }

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${config.googleBooksApiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = data.items[0].volumeInfo;
    const bookData = {
      title: book.title || 'Unknown',
      author: book.authors?.join(', ') || 'Unknown',
      type: book.categories?.includes('Fiction') ? 'Fiction' : 'Non-Fiction',
      mood: book.categories?.join(',') || null,
      pace: null,
      isbn: book.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || null,
      summary: book.description || null,
      coverUrl: book.imageLinks?.thumbnail || null,
      addedByUserId: req.user.UserID
    };

    db.query(
      'INSERT INTO Books (Title, Author, Type, Mood, Pace, ISBN, Summary, CoverURL, AddedByUserID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [bookData.title, bookData.author, bookData.type, bookData.mood, bookData.pace, bookData.isbn, bookData.summary, bookData.coverUrl, bookData.addedByUserId],
      (err, result) => {
        if (err) {
          console.error('Insert book error:', err.message, err.stack);
          return res.status(500).json({ error: 'Failed to add book' });
        }

        const bookId = result.insertId;
        db.query(
          'INSERT INTO UserBooks (UserID, BookID, ReadingStatus, Progress, Owned, DNF) VALUES (?, ?, ?, ?, ?, ?)',
          [req.user.UserID, bookId, readingStatus, progress, owned || false, dnf || false],
          (err2) => {
            if (err2) {
              console.error('Insert userbook error:', err2.message, err2.stack);
              return res.status(500).json({ error: 'Failed to link book to user' });
            }
            res.json({ message: 'Book added successfully', bookId });
          }
        );
      }
    );
  } catch (err) {
    console.error('API error:', err.message, err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { readingStatus, progress, owned, dnf } = req.body;
  if (!['Read', 'Reading', 'To Read'].includes(readingStatus)) {
    return res.status(400).json({ error: 'Invalid reading status' });
  }
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
    return res.status(400).json({ error: 'Invalid progress (0-100)' });
  }

  db.query(
    'UPDATE UserBooks SET ReadingStatus = ?, Progress = ?, Owned = ?, DNF = ? WHERE UserBookID = ? AND UserID = ?',
    [readingStatus, progress, owned || false, dnf || false, id, req.user.UserID],
    (err, result) => {
      if (err) {
        console.error('Update error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to update book' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Book not found or not owned by user' });
      }
      res.json({ message: 'Book updated successfully' });
    }
  );
});

router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM userbooks WHERE UserBookID = ? AND UserID = ?', [id, req.user.UserID], (err, result) => {
    if (err) {
      console.error('Delete error:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to delete book' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Book not found or not owned by user' });
    }
    res.json({ message: 'Book deleted successfully' });
  });
});

router.get('/search', authenticateToken, (req, res) => {
  const { query, mood, type, status, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  let sql = 'SELECT DISTINCT b.BookID, b.Title, b.Author, b.CoverURL, ub.ReadingStatus, ub.Progress, ub.Owned, ub.DNF FROM books b LEFT JOIN userbooks ub ON b.BookID = ub.BookID AND ub.UserID = ? WHERE 1=1';
  const params = [req.user.UserID];

  if (query) {
    sql += ' AND (b.Title LIKE ? OR b.Author LIKE ?)';
    params.push(`%${query}%`, `%${query}%`);
  }
  if (mood) {
    sql += ' AND b.Mood LIKE ?';
    params.push(`%${mood}%`);
  }
  if (type) {
    sql += ' AND b.Type = ?';
    params.push(type);
  }
  if (status) {
    sql += ' AND ub.ReadingStatus = ?';
    params.push(status);
  }

  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Search error:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to search books' });
    }
    db.query('SELECT COUNT(DISTINCT b.BookID) as total FROM books b LEFT JOIN userbooks ub ON b.BookID = ub.BookID AND ub.UserID = ? WHERE 1=1' + sql.split('WHERE 1=1')[1].split('LIMIT')[0], params.slice(0, -2), (countErr, countResults) => {
      if (countErr) {
        console.error('Count error:', countErr.message, countErr.stack);
        return res.status(500).json({ error: 'Failed to count books' });
      }
      res.json({
        books: results,
        total: countResults[0].total,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    });
  });
});

router.get('/autocomplete', authenticateToken, (req, res) => {
  const { query } = req.query;
  if (!query || !validator.isLength(query, { min: 1, max: 100 })) {
    return res.status(400).json({ error: 'Invalid query' });
  }

  db.query(
    'SELECT DISTINCT Title, Author FROM books WHERE Title LIKE ? OR Author LIKE ? LIMIT 5',
    [`%${query}%`, `%${query}%`],
    (err, results) => {
      if (err) {
        console.error('Autocomplete error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to fetch suggestions' });
      }
      res.json(results);
    }
  );
});

module.exports = router;