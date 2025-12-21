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

  clearCookies: db.prepare(`
    UPDATE platform_accounts SET cookies = NULL WHERE user_id = ? AND platform = ?
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

  // Get user_id by account_id
  getUserIdByAccountId: db.prepare(`
    SELECT user_id FROM platform_accounts WHERE id = ?
  `),

  // Check if item exists by user_id, title, and platform
  existsByUserTitlePlatform: db.prepare(`
    SELECT si.id FROM social_items si
    JOIN platform_accounts pa ON si.account_id = pa.id
    WHERE pa.user_id = ? AND si.title = ? AND si.platform = ?
    LIMIT 1
  `),

  findByUser: db.prepare(`
    SELECT id, account_id, platform, external_id, title, author, thumbnail, url, content, likes, comments, shares, views, tags, fetched_at FROM (
      SELECT si.*, ROW_NUMBER() OVER (PARTITION BY pa.user_id, si.title, si.platform ORDER BY si.fetched_at DESC, si.id DESC) as rn
      FROM social_items si
      JOIN platform_accounts pa ON si.account_id = pa.id
      WHERE pa.user_id = ?
    ) WHERE rn = 1
    ORDER BY fetched_at DESC, id DESC
    LIMIT ? OFFSET ?
  `),

  findByUserAndPlatform: db.prepare(`
    SELECT id, account_id, platform, external_id, title, author, thumbnail, url, content, likes, comments, shares, views, tags, fetched_at FROM (
      SELECT si.*, ROW_NUMBER() OVER (PARTITION BY pa.user_id, si.title, si.platform ORDER BY si.fetched_at DESC, si.id DESC) as rn
      FROM social_items si
      JOIN platform_accounts pa ON si.account_id = pa.id
      WHERE pa.user_id = ? AND si.platform = ?
    ) WHERE rn = 1
    ORDER BY fetched_at DESC, id DESC
    LIMIT ? OFFSET ?
  `),

  findById: db.prepare(`
    SELECT * FROM social_items WHERE id = ?
  `),

  countByUser: db.prepare(`
    SELECT COUNT(DISTINCT si.title || '|' || si.platform) as count FROM social_items si
    JOIN platform_accounts pa ON si.account_id = pa.id
    WHERE pa.user_id = ?
  `),

  countByUserAndPlatform: db.prepare(`
    SELECT COUNT(DISTINCT si.title) as count FROM social_items si
    JOIN platform_accounts pa ON si.account_id = pa.id
    WHERE pa.user_id = ? AND si.platform = ?
  `),

  countByPlatforms: db.prepare(`
    SELECT si.platform, COUNT(DISTINCT si.title) as count FROM social_items si
    JOIN platform_accounts pa ON si.account_id = pa.id
    WHERE pa.user_id = ?
    GROUP BY si.platform
  `),

  clearAll: db.prepare(`DELETE FROM social_items`),

  // Get distinct batch timestamps (using fetched_at as batch identifier) for a user and platform
  // Group by date and hour to identify batches
  getBatchCountByUserAndPlatform: db.prepare(`
    SELECT COUNT(DISTINCT strftime('%Y-%m-%d %H:%M', si.fetched_at)) as batch_count
    FROM social_items si
    JOIN platform_accounts pa ON si.account_id = pa.id
    WHERE pa.user_id = ? AND si.platform = ?
  `),

  // Get oldest batch timestamp for a user and platform
  getOldestBatchTimestamp: db.prepare(`
    SELECT MIN(strftime('%Y-%m-%d %H:%M', si.fetched_at)) as oldest_batch
    FROM social_items si
    JOIN platform_accounts pa ON si.account_id = pa.id
    WHERE pa.user_id = ? AND si.platform = ?
  `),

  // Delete items from a specific batch (identified by fetched_at hour/minute)
  deleteBatchByUserPlatformTimestamp: db.prepare(`
    DELETE FROM social_items
    WHERE account_id IN (
      SELECT id FROM platform_accounts WHERE user_id = ? AND platform = ?
    )
    AND platform = ?
    AND strftime('%Y-%m-%d %H:%M', fetched_at) = ?
  `),

  // Get batch timestamps ordered by time (newest first), limited to keep only the latest N batches
  getBatchTimestampsToKeep: db.prepare(`
    SELECT strftime('%Y-%m-%d %H:%M', si.fetched_at) as batch_time
    FROM social_items si
    JOIN platform_accounts pa ON si.account_id = pa.id
    WHERE pa.user_id = ? AND si.platform = ?
    GROUP BY strftime('%Y-%m-%d %H:%M', si.fetched_at)
    ORDER BY MAX(si.fetched_at) DESC
    LIMIT ?
  `),
};

// Export initDatabase for compatibility (now just logs)
export function initDatabase() {
  console.log('Database initialized successfully');
}

export default db;
