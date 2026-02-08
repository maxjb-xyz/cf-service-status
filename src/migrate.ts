// Database schema and auto-migration
// This runs automatically on first request to create tables

export const SCHEMA = `
-- Categories for grouping services
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- Services to monitor
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  check_interval INTEGER DEFAULT 60,
  timeout INTEGER DEFAULT 10000,
  expected_status INTEGER DEFAULT 200,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Status history records (raw data - kept for 24 hours only)
CREATE TABLE IF NOT EXISTS status_history (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  response_time INTEGER,
  status_code INTEGER,
  error_message TEXT,
  check_location TEXT,
  checked_at TEXT NOT NULL
);

-- Create index for faster history queries
CREATE INDEX IF NOT EXISTS idx_status_history_service_time 
ON status_history(service_id, checked_at DESC);

-- Hourly aggregated status (one row per service per hour)
CREATE TABLE IF NOT EXISTS hourly_status (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  hour_start TEXT NOT NULL,
  status TEXT NOT NULL,
  avg_response_time INTEGER,
  check_count INTEGER DEFAULT 0,
  check_location TEXT,
  UNIQUE(service_id, hour_start)
);

-- Index for hourly status queries
CREATE INDEX IF NOT EXISTS idx_hourly_status_service_hour 
ON hourly_status(service_id, hour_start DESC);

-- Site settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const DEFAULT_SETTINGS = `
INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('site_title', 'Service Status'),
  ('site_description', 'Current status of our services'),
  ('history_hours', '48'),
  ('discord_webhook', '');
`;

export async function initializeDatabase(db: D1Database): Promise<void> {
  try {
    // Check if database is already initialized by checking for settings table
    await db.prepare('SELECT 1 FROM settings LIMIT 1').first();
    // If we get here, database is already initialized
  } catch {
    // Database not initialized, run migrations
    console.log('Initializing database...');

    // Split schema into individual statements and execute
    const statements = SCHEMA.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await db.prepare(statement).run();
    }

    // Insert default settings
    const settingStatements = DEFAULT_SETTINGS.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of settingStatements) {
      await db.prepare(statement).run();
    }

    console.log('Database initialized successfully');
  }
}
