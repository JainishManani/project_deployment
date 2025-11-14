const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET /api/stats/books-read - Books read over time
router.get('/books-read', authenticateToken, (req, res) => {
  db.query(
    'SELECT YEAR(ub.CreatedAt) as year, MONTH(ub.CreatedAt) as month, COUNT(*) as count FROM UserBooks ub WHERE ub.UserID = ? AND ub.ReadingStatus = "Read" GROUP BY year, month',
    [req.user.UserID],
    (err, results) => {
      if (err) {
        console.error('Query error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to fetch stats' });
      }
      res.json(results);
    }
  );
});

// GET /api/stats/moods - Mood distribution
router.get('/moods', authenticateToken, (req, res) => {
  db.query(
    'SELECT b.Mood, COUNT(*) as count FROM UserBooks ub JOIN Books b ON ub.BookID = b.BookID WHERE ub.UserID = ? GROUP BY b.Mood',
    [req.user.UserID],
    (err, results) => {
      if (err) {
        console.error('Query error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to fetch mood stats' });
      }
      res.json(results);
    }
  );
});

module.exports = router;