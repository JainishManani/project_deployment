const express = require('express');
const validator = require('validator');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// updated and checked on 28-11-2025

// POST /api/reminders - Set reminder
router.post('/', authenticateToken, (req, res) => {
  const { bookId, reminderDate, reminderNote } = req.body;

  // Convert bookId to number and validate
  const bookIdNum = parseInt(bookId, 10);
  if (!bookId || isNaN(bookIdNum) || bookIdNum <= 0) {
    return res.status(400).json({ error: 'Invalid book ID: must be a positive integer' });
  }

  // Validate date
  if (!reminderDate || !validator.isISO8601(reminderDate.toString())) {
    return res.status(400).json({ error: 'Invalid reminder date format (must be ISO8601)' });
  }

  // validate note length
  if (reminderNote !== undefined && 
      (!validator.isLength(reminderNote.toString(), { min: 1, max: 255 }))) {
    return res.status(400).json({ error: 'Reminder note must be 1-255 characters' });
  }

  db.query(
    'INSERT INTO reminders (UserID, BookID, ReminderDate, ReminderNote) VALUES (?, ?, ?, ?)',
    [req.user.UserID, bookIdNum, reminderDate, reminderNote || null],
    (err, result) => {
      if (err) {
        console.error('Insert reminder error:', err.message, err.sql);
        return res.status(500).json({ error: 'Failed to set reminder', details: err.message });
      }
      res.json({ 
        message: 'Reminder set successfully',
        reminderId: result.insertId 
      });
    }
  );
});

// GET /api/reminders - List user's reminders
router.get('/', authenticateToken, (req, res) => {
  db.query(
    'SELECT r.ReminderID, b.Title, b.Author, r.ReminderDate, r.ReminderNote FROM reminders r JOIN books b ON r.BookID = b.BookID WHERE r.UserID = ?',
    [req.user.UserID],
    (err, results) => {
      if (err) {
        console.error('Query error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to fetch reminders' });
      }
      res.json(results);
    }
  );
});

// DELETE /api/reminders/:id - Delete reminder
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(parseInt(id))) {
    return res.status(400).json({ error: 'Invalid reminder ID' });
  }

  db.query(
    'DELETE FROM reminders WHERE ReminderID = ? AND UserID = ?',
    [id, req.user.UserID],
    (err, result) => {
      if (err) {
        console.error('Delete reminder error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to delete reminder' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Reminder not found' });
      }
      res.json({ message: 'Reminder deleted successfully' });
    }
  );
});

module.exports = router;