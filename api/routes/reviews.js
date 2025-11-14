const express = require('express');
const validator = require('validator');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// POST /api/reviews - Post a review
router.post('/', authenticateToken, (req, res) => {
  const { bookId, rating, reviewText } = req.body;
  if (!Number.isInteger(bookId)) {
    return res.status(400).json({ error: 'Invalid book ID' });
  }
  if (rating !== null && (!Number.isFinite(rating) || rating < 0.5 || rating > 5.0 || rating % 0.5 !== 0)) {
    return res.status(400).json({ error: 'Invalid rating (0.5-5.0, half-star increments)' });
  }
  if (reviewText && !validator.isLength(reviewText, { min: 1, max: 1000 })) {
    return res.status(400).json({ error: 'Review text must be 1-1000 characters' });
  }

  db.query(
    'INSERT INTO Reviews (UserID, BookID, Rating, ReviewText) VALUES (?, ?, ?, ?)',
    [req.user.UserID, bookId, rating || null, reviewText || null],
    (err) => {
      if (err) {
        console.error('Insert review error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to post review' });
      }
      res.json({ message: 'Review posted successfully' });
    }
  );
});

// GET /api/reviews/:bookId - Get reviews for a book
router.get('/:bookId', authenticateToken, (req, res) => {
  const { bookId } = req.params;
  if (!Number.isInteger(parseInt(bookId))) {
    return res.status(400).json({ error: 'Invalid book ID' });
  }

  db.query(
    'SELECT r.ReviewID, r.UserID, u.Username, r.Rating, r.ReviewText, r.DatePosted FROM Reviews r JOIN Users u ON r.UserID = u.UserID WHERE r.BookID = ?',
    [bookId],
    (err, results) => {
      if (err) {
        console.error('Query error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to fetch reviews' });
      }
      res.json(results);
    }
  );
});

// POST /api/reviews/:reviewId/comments - Post a comment
router.post('/:reviewId/comments', authenticateToken, (req, res) => {
  const { reviewId } = req.params;
  const { commentText, progressPercent } = req.body;
  if (!Number.isInteger(parseInt(reviewId))) {
    return res.status(400).json({ error: 'Invalid review ID' });
  }
  if (!validator.isLength(commentText, { min: 1, max: 500 })) {
    return res.status(400).json({ error: 'Comment text must be 1-500 characters' });
  }
  if (!Number.isInteger(progressPercent) || progressPercent < 0 || progressPercent > 100) {
    return res.status(400).json({ error: 'Progress percent must be 0-100' });
  }

  db.query(
    'INSERT INTO Comments (ReviewID, UserID, CommentText, ProgressPercent) VALUES (?, ?, ?, ?)',
    [reviewId, req.user.UserID, commentText, progressPercent || 0],
    (err) => {
      if (err) {
        console.error('Insert comment error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to post comment' });
      }
      res.json({ message: 'Comment posted successfully' });
    }
  );
});

// GET /api/reviews/:reviewId/comments - Get comments for a review
router.get('/:reviewId/comments', authenticateToken, (req, res) => {
  const { reviewId } = req.params;
  if (!Number.isInteger(parseInt(reviewId))) {
    return res.status(400).json({ error: 'Invalid review ID' });
  }

  db.query(
    'SELECT c.CommentID, c.UserID, u.Username, c.CommentText, c.ProgressPercent, c.DatePosted FROM Comments c JOIN Users u ON c.UserID = u.UserID WHERE c.ReviewID = ?',
    [reviewId],
    (err, results) => {
      if (err) {
        console.error('Query error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to fetch comments' });
      }
      res.json(results);
    }
  );
});

module.exports = router;