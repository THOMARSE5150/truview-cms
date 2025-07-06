// index.js - full replacement for Postgres

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 8080;

// Database connection (Supabase Postgres)
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'changeme',
  resave: false,
  saveUninitialized: false,
}));

// Home page
app.get('/', (req, res) => {
  res.send('CMS is running. Go to <a href="/admin">Admin</a> to log in.');
});

// Admin login page
app.get('/admin/login', (req, res) => {
  res.render('admin-login');
});

// Admin login POST handler
app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    const user = rows[0];
    if (user && await bcrypt.compare(password, user.password_hash)) {
      req.session.user = { id: user.id, username: user.username, role: user.role };
      return res.redirect('/admin');
    }
  } catch (err) {
    console.error('Login error:', err);
  }
  res.redirect('/admin/login');
});

// Admin dashboard
app.get('/admin', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/admin/login');
  }
  try {
    const { rows: contacts } = await db.query('SELECT * FROM contact_submissions ORDER BY created_at DESC');
    res.render('admin-dashboard', { user: req.session.user, contacts });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.send('Something went wrong!');
  }
});

// Contact form POST
app.post('/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;
  const timestamp = Date.now();
  try {
    await db.query(
      'INSERT INTO contact_submissions (name, email, phone, message, created_at) VALUES ($1, $2, $3, $4, $5)',
      [name, email, phone, message, timestamp]
    );
    res.render('success');
  } catch (err) {
    console.error('Contact form error:', err);
    res.send('Something went wrong!');
  }
});

// Start server
app.listen(port, () => {
  console.log(`TruView CMS running on port ${port}`);
});