const db = require('better-sqlite3')('truview-cms.db');

db.prepare(`CREATE TABLE IF NOT EXISTS locations_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location TEXT UNIQUE
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS services_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER,
  service_name TEXT,
  service_slug TEXT,
  service_description TEXT,
  hero_image_url TEXT,
  cta_text TEXT,
  testimonial1 TEXT,
  testimonial2 TEXT,
  faq1q TEXT,
  faq1a TEXT,
  faq2q TEXT,
  faq2a TEXT,
  FOREIGN KEY(location_id) REFERENCES locations_content(id)
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password_hash TEXT,
  role TEXT,
  stripeCustomerId TEXT
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS global_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE,
  value TEXT
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT,
  location TEXT,
  timestamp INTEGER
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  created_at INTEGER
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS billing_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT,
  event_type TEXT,
  details TEXT,
  timestamp INTEGER
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS billing_dunning (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT,
  attempts INTEGER DEFAULT 0,
  last_attempt INTEGER
)`).run();

console.log('Database initialized.');