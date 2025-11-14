const express = require('express');
const validator = require('validator');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// POST /api/favorites - Mark book as favorite
router.post('/', authenticateToken, (req, res) => {
  const { bookId } = req.body;
  if (!Number.isInteger(bookId)) {
    return res.status(400).json({ error: 'Invalid book ID' });
  }

  db.query(
    'INSERT INTO favorites (UserID, BookID) VALUES (?, ?)',
    [req.user.UserID, bookId],
    (err) => {
      if (err) {
        console.error('Insert favorite error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to add favorite' });
      }
      res.json({ message: 'Book marked as favorite' });
    }
  );
});

// DELETE /api/favorites/:bookId - Unmark favorite
router.delete('/:bookId', authenticateToken, (req, res) => {
  const { bookId } = req.params;
  if (!Number.isInteger(parseInt(bookId))) {
    return res.status(400).json({ error: 'Invalid book ID' });
  }

  db.query(
    'DELETE FROM favorites WHERE UserID = ? AND BookID = ?',
    [req.user.UserID, bookId],
    (err, result) => {
      if (err) {
        console.error('Delete favorite error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to remove favorite' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Favorite not found' });
      }
      res.json({ message: 'Book removed from favorites' });
    }
  );
});

// GET /api/favorites - List user's favorites
router.get('/', authenticateToken, (req, res) => {
  db.query(
    'SELECT f.FavoriteID, b.BookID, b.Title, b.Author, b.CoverURL FROM favorites f JOIN books b ON f.BookID = b.BookID WHERE f.UserID = ?',
    [req.user.UserID],
    (err, results) => {
      if (err) {
        console.error('Query error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to fetch favorites' });
      }
      res.json(results);
    }
  );
});

module.exports = router;