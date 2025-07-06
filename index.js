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

// Test database connection
async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('DATABASE_URL format:', process.env.DATABASE_URL ? 'postgresql://postgres:***@db.mvlnoicmdtraonppiptc.supabase.co:5432/postgres' : 'NOT SET');
    
    const client = await db.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    console.log('Current time from database:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Database initialization function
async function initializeDatabase() {
  console.log('Initialising database...');
  try {
    // Create tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS global_content (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'manager',
        stripeCustomerId TEXT
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        message TEXT,
        created_at BIGINT DEFAULT EXTRACT(epoch FROM NOW())
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS billing_events (
        id SERIAL PRIMARY KEY,
        customer_id TEXT,
        event_type TEXT,
        details TEXT,
        timestamp BIGINT DEFAULT EXTRACT(epoch FROM NOW())
      )
    `);

    // Insert default data
    const { rows } = await db.query('SELECT COUNT(*) AS count FROM global_content');
    if (parseInt(rows[0].count) === 0) {
      await db.query('INSERT INTO global_content (key, value) VALUES ($1, $2)', ['site_name', 'TruView Glass']);
    }

    // Insert admin user (password: 'password')
    await db.query(`
      INSERT INTO admin_users (username, password_hash, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', '$2b$10$Id0aOxElSAQVb1JWWWIWQu8bwjMcTkOignQqRpUNa8YI9dMPLjBv.', 'admin']);

    console.log('✅ Database initialised successfully!');
    
  } catch (error) {
    console.error('❌ Database initialisation error:', error);
    throw error;
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

// Home page
app.get('/', (req, res) => {
  res.send(`
    <h1>TruView CMS</h1>
    <p>✅ Server is running successfully!</p>
    <p><a href="/admin">Go to Admin Panel</a></p>
    <p><a href="/test-db">Test Database Connection</a></p>
  `);
});

// Database test endpoint
app.get('/test-db', async (req, res) => {
  try {
    const client = await db.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    client.release();
    
    res.json({
      status: 'success',
      message: 'Database connection working!',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
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

// Admin logout
app.post('/admin/logout', (req, res) => {
  req.session.destroy();
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
  const timestamp = Math.floor(Date.now() / 1000);
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

// Initialize database and start server
async function startServer() {
  try {
    // Test connection first
    const connectionWorking = await testConnection();
    
    if (!connectionWorking) {
      console.log('⚠️  Starting server without database initialization...');
      app.listen(port, () => {
        console.log(`🚀 TruView CMS running on port ${port}`);
        console.log(`📍 Visit your app and go to /test-db to check database connection`);
      });
      return;
    }
    
    // Initialize database if connection works
    await initializeDatabase();
    
    app.listen(port, () => {
      console.log(`🚀 TruView CMS running on port ${port}`);
      console.log(`📍 Admin login: username=admin, password=password`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    
    // Start server anyway for debugging
    app.listen(port, () => {
      console.log(`🚀 TruView CMS running on port ${port} (DATABASE ISSUES - CHECK /test-db)`);
    });
  }
}

startServer();