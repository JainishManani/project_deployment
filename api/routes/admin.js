const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Middleware to check admin role
const isAdmin = (req, res, next) => {
  if (req.user.Role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET /api/admin/users - List all users
router.get('/users', authenticateToken, isAdmin, (req, res) => {
  db.query('SELECT UserID, Username, Email, Role FROM users', (err, results) => {
    if (err) {
      console.error('Query error:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(results);
  });
});

// GET /api/admin/trends - Book trends
router.get('/trends', authenticateToken, isAdmin, (req, res) => {
  db.query(
    'SELECT b.BookID, b.Title, b.Author, COUNT(ub.BookID) as addCount FROM books b LEFT JOIN userbooks ub ON b.BookID = ub.BookID GROUP BY b.BookID ORDER BY addCount DESC LIMIT 10',
    (err, results) => {
      if (err) {
        console.error('Query error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to fetch trends' });
      }
      res.json(results);
    }
  );
});

module.exports = router;