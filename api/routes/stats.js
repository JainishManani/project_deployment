// /api/routes/stats.js
const express = require("express");
const { query } = require("../db");           
const { authenticateToken } = require("./auth");

const router = express.Router();

// GET /api/stats/books-read - Books read over time
router.get("/books-read", authenticateToken, async (req, res) => {
  try {
    const results = await query(
      'SELECT YEAR(ub.DateAdded) as year, MONTH(ub.DateAdded) as month, COUNT(*) as count FROM userbooks ub WHERE ub.UserID = ? AND ub.ReadingStatus = "Read" GROUP BY year, month',
      [req.user.UserID]
    );
    res.json(results);
  } catch (err) {
    console.error("Query error:", err.message, err.stack);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/stats/moods - Mood distribution
router.get("/moods", authenticateToken, async (req, res) => {
  try {
    const results = await query(
      "SELECT b.Mood, COUNT(*) as count FROM userbooks ub JOIN books b ON ub.BookID = b.BookID WHERE ub.UserID = ? GROUP BY b.Mood",
      [req.user.UserID]
    );
    res.json(results);
  } catch (err) {
    console.error("Query error:", err.message, err.stack);
    return res.status(500).json({ error: "Failed to fetch mood stats" });
  }
});

module.exports = router;