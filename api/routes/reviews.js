const express = require("express");
const validator = require("validator");
const db = require("../db");
const { authenticateToken } = require("./auth");

const router = express.Router();

// updated and checked on 28-11-2025

// POST /api/reviews - Post a review
router.post("/", authenticateToken, (req, res) => {
  const { bookId: rawBookId, rating, reviewText } = req.body;

  // Parse and validate bookId
  const bookId = parseInt(rawBookId, 10);
  if (!Number.isInteger(bookId) || bookId <= 0) {
    return res.status(400).json({ error: "Invalid or missing book ID" });
  }

  // Validate rating 
  if (rating !== undefined && rating !== null) {
    const numRating = parseFloat(rating);
    if (
      !Number.isFinite(numRating) ||
      numRating < 0.5 ||
      numRating > 5.0 ||
      numRating % 0.5 !== 0
    ) {
      return res.status(400).json({
        error: "Invalid rating: must be between 0.5 and 5.0 in 0.5 increments",
      });
    }
  }

  // Validate review text 
  if (reviewText != null) {
    const trimmedText = reviewText.toString().trim();
    if (!validator.isLength(trimmedText, { min: 1, max: 1000 })) {
      return res.status(400).json({
        error: "Review text must be between 1 and 1000 characters",
      });
    }
  }

  const finalRating = rating != null ? parseFloat(rating) : null;
  const finalReviewText = reviewText?.toString().trim() || null;

  db.query(
    "INSERT INTO reviews (UserID, BookID, Rating, ReviewText) VALUES (?, ?, ?, ?)",
    [req.user.UserID, bookId, finalRating, finalReviewText],
    (err, result) => {
      if (err) {
        console.error("Insert review error:", err.message);
        return res.status(500).json({ error: "Failed to post review" });
      }
      res.status(201).json({
        message: "Review posted successfully",
        reviewId: result.insertId,
      });
    }
  );
});

// GET /api/reviews/:bookId - Get all reviews for a book
router.get("/:bookId", authenticateToken, (req, res) => {
  const bookId = parseInt(req.params.bookId, 10);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return res.status(400).json({ error: "Invalid book ID" });
  }

  db.query(
    `SELECT 
       r.ReviewID, 
       r.UserID, 
       u.Username, 
       r.Rating, 
       r.ReviewText, 
       r.DatePosted 
     FROM reviews r 
     JOIN users u ON r.UserID = u.UserID 
     WHERE r.BookID = ? 
     ORDER BY r.DatePosted DESC`,
    [bookId],
    (err, results) => {
      if (err) {
        console.error("Fetch reviews error:", err.message);
        return res.status(500).json({ error: "Failed to fetch reviews" });
      }
      res.json(results);
    }
  );
});

// POST /api/reviews/:reviewId/comments
router.post("/:reviewId/comments", authenticateToken, (req, res) => {
  const reviewId = parseInt(req.params.reviewId, 10);
  const { commentText, progressPercent = 0 } = req.body;

  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return res.status(400).json({ error: "Invalid review ID" });
  }

  if (!commentText || typeof commentText !== "string") {
    return res.status(400).json({ error: "Comment text is required" });
  }

  const trimmedComment = commentText.trim();
  if (!validator.isLength(trimmedComment, { min: 1, max: 500 })) {
    return res.status(400).json({
      error: "Comment must be between 1 and 500 characters",
    });
  }

  const progress = parseInt(progressPercent, 10);
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
    return res.status(400).json({
      error: "Progress percent must be an integer between 0 and 100",
    });
  }

  db.query(
    "INSERT INTO comments (ReviewID, UserID, CommentText, ProgressPercent) VALUES (?, ?, ?, ?)",
    [reviewId, req.user.UserID, trimmedComment, progress],
    (err, result) => {
      if (err) {
        console.error("Insert comment error:", err.message);
        return res.status(500).json({ error: "Failed to post comment" });
      }
      res.status(201).json({
        message: "Comment posted successfully",
        commentId: result.insertId,
      });
    }
  );
});

// GET /api/reviews/:reviewId/comments 
router.get("/:reviewId/comments", authenticateToken, (req, res) => {
  const reviewId = parseInt(req.params.reviewId, 10);

  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return res.status(400).json({ error: "Invalid review ID" });
  }

  db.query(
    `SELECT 
       c.CommentID,
       c.UserID,
       u.Username,
       c.CommentText,
       c.ProgressPercent,
       c.DatePosted
     FROM comments c
     JOIN users u ON c.UserID = u.UserID
     WHERE c.ReviewID = ?
     ORDER BY c.DatePosted ASC`,
    [reviewId],
    (err, results) => {
      if (err) {
        console.error("Fetch comments error:", err.message);
        return res.status(500).json({ error: "Failed to fetch comments" });
      }
      res.json(results);
    }
  );
});

module.exports = router;
