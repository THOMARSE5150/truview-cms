// init-db.js

const db = require('better-sqlite3')('truview-cms.db');

console.log("Running database migrations...");

// Create global_content table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS global_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT
  )
`).run();

// Create admin_users table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'manager',
    stripeCustomerId TEXT
  )
`).run();

// Create contact_submissions table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS contact_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    phone TEXT,
    message TEXT,
    created_at INTEGER
  )
`).run();

// Create billing_events table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS billing_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT,
    event_type TEXT,
    details TEXT,
    timestamp INTEGER
  )
`).run();

console.log("Database tables ensured!");

// Optionally: Insert default content if global_content is empty
const count = db.prepare('SELECT COUNT(*) AS count FROM global_content').get().count;
if (count === 0) {
  db.prepare('INSERT INTO global_content (key, value) VALUES (?, ?)').run('site_name', 'TruView Glass');
  console.log("Database seeded with default global_content data");
}
// Insert admin user if not exists
db.prepare(`
  INSERT OR IGNORE INTO admin_users (username, password_hash, role)
  VALUES ('admin', '$2b$10$Id0aOxElSAQVb1JWWWIWQu8bwjMcTkOignQqRpUNa8YI9dMPLjBv.', 'admin')
`).run();

console.log("Admin user ensured!");

db.close();