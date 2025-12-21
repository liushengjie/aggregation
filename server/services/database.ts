import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'aggregation.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema immediately
function initSchema() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Platform accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS platform_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      platform TEXT NOT NULL CHECK(platform IN ('Weibo', 'Bilibili', 'Xiaohongshu')),
      platform_username TEXT,
      cookies TEXT,
      status TEXT DEFAULT 'disconnected',
      last_sync DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, platform)
    )
  `);

  // Social items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      external_id TEXT NOT NULL,
      title TEXT,
      author TEXT,
      thumbnail TEXT,
      url TEXT,
      content TEXT,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      tags TEXT,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES platform_accounts(id),
      UNIQUE(account_id, external_id)
    )
  `);
}

// Initialize schema before preparing statements
initSchema();

// User operations
export const userOps = {
  create: db.prepare(`
    INSERT INTO users (username, password_hash) VALUES (?, ?)
  `),

  findByUsername: db.prepare(`
    SELECT * FROM users WHERE username = ?
  `),

  findById: db.prepare(`
    SELECT id, username, created_at FROM users WHERE id = ?
  `),
};

// Platform account operations
export const accountOps = {
  create: db.prepare(`
    INSERT INTO platform_accounts (user_id, platform, platform_username, cookies, status)
    VALUES (?, ?, ?, ?, ?)
  `),

  findByUserAndPlatform: db.prepare(`
    SELECT * FROM platform_accounts WHERE user_id = ? AND platform = ?
  `),

  findByUser: db.prepare(`
    SELECT * FROM platform_accounts WHERE user_id = ?
  `),

  updateCookies: db.prepare(`
    UPDATE platform_accounts SET cookies = ?, status = 'connected', last_sync = datetime('now')
    WHERE user_id = ? AND platform = ?
  `),

  updateStatus: db.prepare(`
    UPDATE platform_accounts SET status = ? WHERE id = ?
  `),

  delete: db.prepare(`
    DELETE FROM platform_accounts WHERE user_id = ? AND platform = ?
  `),

  findAllConnected: db.prepare(`
    SELECT * FROM platform_accounts WHERE status = 'connected' AND cookies IS NOT NULL
  `),
};

// Social item operations
export const itemOps = {
  upsert: db.prepare(`
    INSERT INTO social_items (account_id, platform, external_id, title, author, thumbnail, url, content, likes, comments, shares, views, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_id, external_id) DO UPDATE SET
      title = excluded.title,
      author = excluded.author,
      thumbnail = excluded.thumbnail,
      url = excluded.url,
      content = excluded.content,
      likes = excluded.likes,
      comments = excluded.comments,
      shares = excluded.shares,
      views = excluded.views,
      tags = excluded.tags,
      fetched_at = datetime('now')
  `),

  findByUser: db.prepare(`
    SELECT si.* FROM social_items si
    JOIN platform_accounts pa ON si.account_id = pa.id
    WHERE pa.user_id = ?
    ORDER BY si.fetched_at DESC
    LIMIT ? OFFSET ?
  `),

  findByUserAndPlatform: db.prepare(`
    SELECT si.* FROM social_items si
    JOIN platform_accounts pa ON si.account_id = pa.id
    WHERE pa.user_id = ? AND si.platform = ?
    ORDER BY si.fetched_at DESC
    LIMIT ? OFFSET ?
  `),

  findById: db.prepare(`
    SELECT * FROM social_items WHERE id = ?
  `),

  countByUser: db.prepare(`
    SELECT COUNT(*) as count FROM social_items si
    JOIN platform_accounts pa ON si.account_id = pa.id
    WHERE pa.user_id = ?
  `),

  clearAll: db.prepare(`DELETE FROM social_items`),
};

// Export initDatabase for compatibility (now just logs)
export function initDatabase() {
  console.log('Database initialized successfully');
}

export default db;
