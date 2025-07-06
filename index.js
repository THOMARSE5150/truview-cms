require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 8080;

// Database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Test DB connection
async function testConnection() {
  try {
    console.log('Testing database connection...');
    const client = await db.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected! Time:', result.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

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

// Flash middleware: makes flash messages available to all views
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || {};
  delete req.session.flash;
  next();
});

// Routes

// Home page -> renders views/landing.ejs
app.get('/', (req, res) => {
  res.render('landing');
});

// Database test endpoint
app.get('/test-db', async (req, res) => {
  try {
    const client = await db.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    client.release();
    res.json({ status: 'success', message: 'Database connection working!', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database connection failed', error: err.message });
  }
});

// Admin login
app.get('/admin/login', (req, res) => {
  res.render('admin-login');
});

// Admin login POST
app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    const user = rows[0];
    if (user && await bcrypt.compare(password, user.password_hash)) {
      req.session.user = { id: user.id, username: user.username, role: user.role };
      return res.redirect('/admin');
    }
    req.session.flash = { error: ['Invalid username or password'] };
    res.redirect('/admin/login');
  } catch (err) {
    console.error('Login error:', err);
    req.session.flash = { error: ['Server error'] };
    res.redirect('/admin/login');
  }
});

// Admin dashboard (protected)
app.get('/admin', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  try {
    const { rows: contacts } = await db.query('SELECT * FROM contact_submissions ORDER BY created_at DESC');
    res.render('admin-dashboard', { user: req.session.user, contacts });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.send('Something went wrong!');
  }
});

// Admin logout
app.post('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Contact page
app.get('/contact', (req, res) => {
  res.render('contact');
});

// 404 handler (keep this last!)
app.use((req, res) => {
  res.status(404).render('404');
});

// Server startup
(async () => {
  const dbOk = await testConnection();
  if (dbOk) console.log('Database check passed!');
  else console.log('⚠️ Database check failed; app may not work correctly.');
  app.listen(port, () => console.log(`🚀 TruView CMS running on port ${port}`));
})();