// const express = require('express');
// const cookieParser = require('cookie-parser');
// const cors = require('cors');
// const db = require('./db');
// const { router: authRouter, authenticateToken } = require('./routes/auth');
// const booksRouter = require('./routes/books');
// const favoritesRouter = require('./routes/favorites');
// const remindersRouter = require('./routes/reminders');
// const statsRouter = require('./routes/stats');
// const reviewsRouter = require('./routes/reviews');
// const adminRouter = require('./routes/admin');

// const app = express();
// // //Local port
// const port = 3000;

// app.use(cors({
//   origin: ['http://127.0.0.1:8080', 'https://csunix.mohawkcollege.ca/~sa000882016/Final_Project_frontend/login.html'],
//   credentials: true
// }));
// app.use(express.json());
// app.use(cookieParser());

// app.get('/', (req, res) => res.send('Book Tracker Backend'));

// app.use('/api/auth', authRouter);
// app.use('/api/books', booksRouter);
// app.use('/api/userbooks', booksRouter);
// app.use('/api/favorites', favoritesRouter);
// app.use('/api/reminders', remindersRouter);
// app.use('/api/stats', statsRouter);
// app.use('/api/reviews', reviewsRouter);
// app.use('/api/admin', adminRouter);

// app.get('/protected', authenticateToken, (req, res) => {
//   res.json({ message: 'Protected route accessed', user: req.user });
// });

// app.get('/users', (req, res) => {
//   db.query('SELECT * FROM Users WHERE Role = ?', ['User'], (err, results) => {
//     if (err) {
//       console.error('Database query error:', err.message, err.stack);
//       return res.status(500).json({ error: 'Failed to fetch users' });
//     }
//     res.json(results);
//   });
// });

// app.get('/books', (req, res) => {
//   const moodFilter = '%Adventurous%';
//   db.query('SELECT * FROM Books WHERE Mood LIKE ?', [moodFilter], (err, results) => {
//     if (err) {
//       console.error('Database query error:', err.message, err.stack);
//       return res.status(500).json({ error: 'Failed to fetch books' });
//     }
//     res.json(results);
//   });
// });

// // // //For deployment
// // module.exports = app;

// // For local testing
// app.listen(port, () => console.log(`Server running on http://localhost:${port}`));

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const db = require('./db');
const { router: authRouter, authenticateToken } = require('./routes/auth');
const booksRouter = require('./routes/books');
const favoritesRouter = require('./routes/favorites');
const remindersRouter = require('./routes/reminders');
const statsRouter = require('./routes/stats');
const reviewsRouter = require('./routes/reviews');
const adminRouter = require('./routes/admin');

const app = express();
// Local port
const port = process.env.PORT || 3000;  

app.use(cors({
  origin: [
    'http://127.0.0.1:8080', 
    'https://csunix.mohawkcollege.ca/~sa000882016/Final_Project_frontend/login.html',
    'http://localhost:3000',  
    'https://project-jainish-manani-deploy.vercel.app', 
    'https://project-deployment-sepia-sigma.vercel.app' 
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => res.send('Book Tracker Backend'));

app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/userbooks', booksRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/stats', statsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/admin', adminRouter);

app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Protected route accessed', user: req.user });
});

app.get('/users', (req, res) => {
  db.query('SELECT * FROM book_tracker.users WHERE Role = ?', ['User'], (err, results) => {
    if (err) {
      console.error('Database query error:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(results);
  });
});

app.get('/books', (req, res) => {
  const moodFilter = '%Adventurous%';
  db.query('SELECT * FROM book_tracker.books WHERE Mood LIKE ?', [moodFilter], (err, results) => {
    if (err) {
      console.error('Database query error:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to fetch books' });
    }
    res.json(results);
  });
});

// For deployment (Vercel serverless - uncomment for dev/deploy)
module.exports = app;

// For local testing (standalone - uncomment for node index.js)
//  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));