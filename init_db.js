// init-db.js
const path = require('path');

let db;

try {
  const Database = require('better-sqlite3');
  
  // Use absolute path to ensure database is created in the right location
  const dbPath = path.join(__dirname, 'truview-cms.db');
  console.log(`Initializing database at: ${dbPath}`);
  
  db = new Database(dbPath);
  
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
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `).run();

  // Create billing_events table if not exists
  db.prepare(`
    CREATE TABLE IF NOT EXISTS billing_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT,
      event_type TEXT,
      details TEXT,
      timestamp INTEGER DEFAULT (strftime('%s', 'now'))
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
  console.log("Database initialization completed successfully!");

} catch (error) {
  console.error("Database initialization failed:", error.message);
  console.error("Stack trace:", error.stack);
  
  // Check for common issues
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error("\n❌ Missing dependency: Run 'npm install better-sqlite3'");
  } else if (error.message.includes('SQLITE_CANTOPEN')) {
    console.error("\n❌ Cannot open database file. Check file permissions and path.");
  } else if (error.message.includes('SQLITE_CORRUPT')) {
    console.error("\n❌ Database file is corrupted. Consider deleting and recreating it.");
  }
  
  process.exit(1);
} finally {
  if (db) {
    try {
      db.close();
      console.log("Database connection closed.");
    } catch (closeError) {
      console.error("Error closing database:", closeError.message);
    }
  }
}