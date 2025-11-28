const express = require("express");
const db = require("../db");
const { authenticateToken } = require("./auth");

const router = express.Router();

//updated and checked on 28-11-2025

// Middleware to check admin role
const isAdmin = (req, res, next) => {
  if (req.user.Role !== "Admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// GET /api/admin/users - List all users
router.get("/users", authenticateToken, isAdmin, (req, res) => {
  db.query(
    "SELECT UserID, Username, Email, Role FROM users",
    (err, results) => {
      if (err) {
        console.error("Query error:", err.message, err.stack);
        return res.status(500).json({ error: "Failed to fetch users" });
      }
      res.json(results);
    }
  );
});

// GET /api/admin/trends - Book trends
router.get("/trends", authenticateToken, isAdmin, (req, res) => {
  db.query(
    "SELECT b.BookID, b.Title, b.Author, COUNT(ub.BookID) as addCount FROM books b LEFT JOIN userbooks ub ON b.BookID = ub.BookID GROUP BY b.BookID ORDER BY addCount DESC LIMIT 10",
    (err, results) => {
      if (err) {
        console.error("Query error:", err.message, err.stack);
        return res.status(500).json({ error: "Failed to fetch trends" });
      }
      res.json(results);
    }
  );
});

// DELETE /api/admin/users/:id - Delete or ban user
router.delete("/users/:id", authenticateToken, isAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  if (userId === req.user.UserID) {
    return res.status(400).json({ error: "You cannot delete yourself!" });
  }

  db.query("DELETE FROM users WHERE UserID = ?", [userId], (err, result) => {
    if (err) return res.status(500).json({ error: "Delete failed" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully" });
  });
});

// PATCH /api/admin/users/:id/role - Change role
router.patch("/users/:id/role", authenticateToken, isAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { role } = req.body;
  if (!["User", "Admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  if (userId === req.user.UserID && role !== "Admin") {
    return res
      .status(400)
      .json({ error: "You cannot remove your own admin rights" });
  }

  db.query(
    "UPDATE users SET Role = ? WHERE UserID = ?",
    [role, userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Update failed" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "User not found" });
      res.json({ message: "Role updated" });
    }
  );
});

module.exports = router;
