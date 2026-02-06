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

-- Status history records
CREATE TABLE IF NOT EXISTS status_history (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  response_time INTEGER,
  status_code INTEGER,
  error_message TEXT,
  checked_at TEXT NOT NULL
);

-- Create index for faster history queries
CREATE INDEX IF NOT EXISTS idx_status_history_service_time 
ON status_history(service_id, checked_at DESC);

-- Site settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('site_title', 'Service Status'),
  ('site_description', 'Current status of our services'),
  ('history_days', '7'),
  ('discord_webhook', '');
