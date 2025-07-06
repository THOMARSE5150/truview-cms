require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'changeme',
  resave: false,
  saveUninitialized: false,
}));

// Flash middleware so flash errors don't crash EJS views
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || {};
  delete req.session.flash;
  next();
});

// Database connection pool - only Railway Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Routes
app.get('/', (req, res) => {
  res.render('landing');
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'success',
      message: 'Database connection working!',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

app.get('/admin/login', (req, res) => {
  res.render('admin-login');
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'password') {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    req.session.flash = { error: ['Invalid username or password'] };
    res.redirect('/admin/login');
  }
});

app.get('/admin', async (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/admin/login');

  try {
    const contactsResult = await pool.query('SELECT * FROM contact_submissions ORDER BY created_at DESC');
    res.render('admin-dashboard', { contacts: contactsResult.rows });
  } catch (error) {
    res.status(500).send('Failed to fetch contacts.');
  }
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// 404 handler - must come after all other routes
app.use((req, res) => {
  res.status(404).render('404');
});

// Set EJS views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Start server
app.listen(port, () => {
  console.log(`🚀 TruView CMS running on port ${port}`);
});