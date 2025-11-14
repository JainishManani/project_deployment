const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const db = require('../db');
const config = require('../config');

const router = express.Router();
router.use(cookieParser());

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: config.email.auth
});

const sendEmail = (to, subject, html) => {
  return transporter.sendMail({ from: config.email.auth.user, to, subject, html });
};

// GET /api/auth/me - Fetch current user info
router.get('/me', authenticateToken, (req, res) => {
  db.query('SELECT UserID, Username, Role FROM users WHERE UserID = ?', [req.user.UserID], (err, results) => {
    if (err) {
      console.error('Query error:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(results[0]);
  });
});

// POST /api/auth/register - Register a new user
router.post('/register', async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    console.error('Invalid request body:', req.body);
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { username, email, password } = req.body;
  if (!username || !validator.isAlphanumeric(username.replace(/\s/g, '')) || username.length < 3) {
    return res.status(400).json({ error: 'Invalid username (alphanumeric, min 3 chars)' });
  }
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (!validator.isStrongPassword(password, { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })) {
    return res.status(400).json({ error: 'Weak password (min 8 chars, 1 upper, 1 number, 1 symbol)' });
  }
  const sanitizedUsername = validator.escape(username.trim());
  const sanitizedEmail = validator.normalizeEmail(email.toLowerCase());

  try {
    db.query('SELECT * FROM users WHERE Username = ? OR Email = ?', [sanitizedUsername, sanitizedEmail], (err, results) => {
      if (err) {
        console.error('Database query error:', err.message, err.stack);
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length > 0) return res.status(400).json({ error: 'Username or email already exists' });

      bcrypt.hash(password, 10, (hashErr, hash) => {
        if (hashErr) {
          console.error('Password hash error:', hashErr.message, err.stack);
          return res.status(500).json({ error: 'Hashing error' });
        }

        db.query(
          'INSERT INTO users (Username, Email, PasswordHash, IsConfirmed) VALUES (?, ?, ?, ?)',
          [sanitizedUsername, sanitizedEmail, hash, false],
          (insertErr) => {
            if (insertErr) {
              console.error('Database insert error:', insertErr.message, err.stack);
              return res.status(500).json({ error: 'Insert error' });
            }

            const confirmationToken = jwt.sign({ email: sanitizedEmail }, config.jwtSecret, { expiresIn: '1d' });
            const confirmationLink = `/api/auth/confirm/${confirmationToken}`; //http://localhost:3000
            sendEmail(sanitizedEmail, 'Confirm Your Book Tracker Account', `<p>Click <a href="${confirmationLink}">here</a> to confirm your account.</p>`)
              .then(() => {
                res.json({ message: 'Registered successfully! Check your email for confirmation.' });
              })
              .catch((emailErr) => {
                console.error('Email sending error:', emailErr.message, emailErr.stack);
                res.json({ message: 'Registered successfully, but failed to send confirmation email. Contact support.' });
              });
          }
        );
      });
    });
  } catch (err) {
    console.error('Unexpected server error:', err.message, err.stack);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
});

// GET /api/auth/confirm/:token - Confirm email
router.get('/confirm/:token', (req, res) => {
  const { token } = req.params;
  try {
    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err) return res.status(400).json({ error: 'Invalid or expired token' });

      db.query('UPDATE Users SET Role = ?, IsConfirmed = ? WHERE Email = ?', ['User', true, decoded.email], (updateErr) => {
        if (updateErr) {
          console.error('Update error:', updateErr.message, updateErr.stack);
          return res.status(500).json({ error: 'Server error' });
        }
        res.json({ message: 'Email confirmed! You can now log in.' });
      });
    });
  } catch (err) {
    console.error('Server error:', err.message, err.stack);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login - User login
router.post('/login', (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    console.error('Invalid request body:', req.body);
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { usernameOrEmail, password, rememberMe } = req.body;
  const sanitizedInput = validator.escape(usernameOrEmail.trim());

  db.query(
    'SELECT * FROM users WHERE Username = ? OR Email = ?',
    [sanitizedInput, sanitizedInput],
    (err, results) => {
      if (err || results.length === 0) {
        console.error('Query error:', err ? err.message : 'No user found');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = results[0];
      if (!user.IsConfirmed) {
        return res.status(401).json({ error: 'Email not confirmed. Check your email.' });
      }

      bcrypt.compare(password, user.PasswordHash, (compareErr, match) => {
        if (compareErr || !match) {
          console.error('Compare error:', compareErr ? compareErr.message : 'Password mismatch');
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ UserID: user.UserID, Role: user.Role }, config.jwtSecret, { expiresIn: config.jwtExpiry });
        if (rememberMe) {
          res.cookie('rememberMe', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
          });
        }
        res.json({ token, user: { UserID: user.UserID, Username: user.Username, Role: user.Role } });
      });
    }
  );
});

// POST /api/auth/reset - Send password reset link
router.post('/reset', (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    console.error('Invalid request body:', req.body);
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { email } = req.body;
  const sanitizedEmail = validator.normalizeEmail(email.toLowerCase());

  db.query('SELECT * FROM users WHERE Email = ?', [sanitizedEmail], (err, results) => {
    if (err || results.length === 0) {
      console.error('Query error:', err ? err.message : 'No user found');
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = jwt.sign({ email: sanitizedEmail }, config.jwtSecret, { expiresIn: '1h' });
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    sendEmail(sanitizedEmail, 'Reset Your Book Tracker Password', `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`)
      .then(() => {
        res.json({ message: 'Password reset link sent to your email.' });
      })
      .catch((emailErr) => {
        console.error('Email error:', emailErr.message, emailErr.stack);
        res.status(500).json({ error: 'Failed to send reset email' });
      });
  });
});

// POST /api/auth/reset-password/:token - Reset password
router.post('/reset-password/:token', (req, res) => {
  const { token } = req.params;
  if (!req.body || typeof req.body !== 'object') {
    console.error('Invalid request body:', req.body);
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { password } = req.body;
  if (!validator.isStrongPassword(password, { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })) {
    return res.status(400).json({ error: 'Weak password (min 8 chars, 1 upper, 1 number, 1 symbol)' });
  }

  try {
    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err) return res.status(400).json({ error: 'Invalid or expired token' });

      bcrypt.hash(password, 10, (hashErr, hash) => {
        if (hashErr) {
          console.error('Hash error:', hashErr.message, err.stack);
          return res.status(500).json({ error: 'Hashing error' });
        }

        db.query('UPDATE Users SET PasswordHash = ? WHERE Email = ?', [hash, decoded.email], (updateErr) => {
          if (updateErr) {
            console.error('Update error:', updateErr.message, err.stack);
            return res.status(500).json({ error: 'Server error' });
          }
          res.json({ message: 'Password reset successfully.' });
        });
      });
    });
  } catch (err) {
    console.error('Server error:', err.message, err.stack);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout - Clear rememberMe cookie
router.post('/logout', (req, res) => {
  res.clearCookie('rememberMe', {
    httpOnly: true,
    secure: false,
    sameSite: 'strict'
  });
  res.json({ message: 'Logged out successfully' });
});

// Middleware for protected routes
function authenticateToken (req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1] || req.cookies.rememberMe;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

module.exports = { router, authenticateToken };