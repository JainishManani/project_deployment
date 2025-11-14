const express = require('express');
const validator = require('validator');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// POST /api/reminders - Set reminder
router.post('/', authenticateToken, (req, res) => {
  const { bookId, reminderDate, reminderNote } = req.body;
  if (!Number.isInteger(bookId)) {
    return res.status(400).json({ error: 'Invalid book ID' });
  }
  if (!validator.isISO8601(reminderDate)) {
    return res.status(400).json({ error: 'Invalid reminder date format (ISO8601)' });
  }
  if (reminderNote && !validator.isLength(reminderNote, { min: 1, max: 255 })) {
    return res.status(400).json({ error: 'Reminder note must be 1-255 characters' });
  }

  db.query(
    'INSERT INTO Reminders (UserID, BookID, ReminderDate, ReminderNote) VALUES (?, ?, ?, ?)',
    [req.user.UserID, bookId, reminderDate, reminderNote || null],
    (err) => {
      if (err) {
        console.error('Insert reminder error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to set reminder' });
      }
      res.json({ message: 'Reminder set successfully' });
    }
  );
});

// GET /api/reminders - List user's reminders
router.get('/', authenticateToken, (req, res) => {
  db.query(
    'SELECT r.ReminderID, b.Title, b.Author, r.ReminderDate, r.ReminderNote FROM Reminders r JOIN Books b ON r.BookID = b.BookID WHERE r.UserID = ?',
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
    'DELETE FROM Reminders WHERE ReminderID = ? AND UserID = ?',
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