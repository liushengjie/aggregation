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
      platform TEXT NOT NULL CHECK(platform IN ('Weibo', 'Bilibili', 'Xiaohongshu', 'Douyin')),
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
      category TEXT DEFAULT 'other',
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES platform_accounts(id),
      UNIQUE(account_id, external_id)
    )
  `);

  // Add category column if not exists (for existing databases)
  try {
    db.exec(`ALTER TABLE social_items ADD COLUMN category TEXT DEFAULT 'other'`);
  } catch (e: any) {
    // Column already exists, ignore
    if (!e.message?.includes('duplicate column')) {
      console.warn('[Database] Error adding category column to social_items:', e.message);
    }
  }

  // Hot trends table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hot_trends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      category_id TEXT NOT NULL,
      rank INTEGER NOT NULL,
      title TEXT NOT NULL,
      hotness TEXT,
      url TEXT,
      extra_data TEXT,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Public social items table (for all users, no user_id required)
  db.exec(`
    CREATE TABLE IF NOT EXISTS public_social_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL CHECK(platform IN ('Weibo', 'Bilibili', 'Xiaohongshu', 'Douyin')),
      source_url TEXT NOT NULL,
      source_label TEXT NOT NULL,
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
      category TEXT DEFAULT 'other',
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(platform, source_url, external_id)
    )
  `);

  // Add category column if not exists (for existing databases)
  try {
    db.exec(`ALTER TABLE public_social_items ADD COLUMN category TEXT DEFAULT 'other'`);
  } catch (e: any) {
    // Column already exists, ignore
    if (!e.message?.includes('duplicate column')) {
      console.warn('[Database] Error adding category column to public_social_items:', e.message);
    }
  }

  // Create indexes for hot_trends
  db.exec(`CREATE INDEX IF NOT EXISTS idx_hot_trends_platform_category ON hot_trends(platform, category_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_hot_trends_fetched_at ON hot_trends(fetched_at)`);

  // Create indexes for public_social_items
  db.exec(`CREATE INDEX IF NOT EXISTS idx_public_social_items_platform ON public_social_items(platform)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_public_social_items_source_label ON public_social_items(source_label)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_public_social_items_fetched_at ON public_social_items(fetched_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_public_social_items_category ON public_social_items(category)`);

  // Create indexes for social_items category
  db.exec(`CREATE INDEX IF NOT EXISTS idx_social_items_category ON social_items(category)`);

  // Hot dramas table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hot_dramas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      original_title TEXT,
      download_link TEXT,
      baidu_url TEXT,
      quark_url TEXT,
      tmdb_id INTEGER,
      poster_path TEXT,
      backdrop_path TEXT,
      overview TEXT,
      release_date TEXT,
      vote_average REAL,
      media_type TEXT,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // OpenSource trending table (GitHub Trending)
  db.exec(`
    CREATE TABLE IF NOT EXISTS opensource_trending (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_full_name TEXT NOT NULL,
      repo_name TEXT,
      description TEXT,
      language TEXT,
      stars INTEGER DEFAULT 0,
      stars_today INTEGER DEFAULT 0,
      forks INTEGER DEFAULT 0,
      url TEXT,
      period TEXT DEFAULT 'today',
      language_filter TEXT,
      rank INTEGER,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(repo_full_name, period, language_filter)
    )
  `);

  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_opensource_trending_period ON opensource_trending(period)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_opensource_trending_language ON opensource_trending(language_filter)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_opensource_trending_fetched_at ON opensource_trending(fetched_at)`);

  // Analytics events table (for tracking page views and user behavior)
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL CHECK(event_type IN ('pageview', 'click', 'view')),
      page_path TEXT NOT NULL,
      page_title TEXT,
      user_id INTEGER,
      session_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      country TEXT,
      city TEXT,
      event_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for analytics_events
  db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_events_page_path ON analytics_events(page_path)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_events_date ON analytics_events(DATE(created_at))`);

  // Scheduler configuration table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduler_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheduler_name TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 0,
      interval_minutes INTEGER NOT NULL,
      initial_delay_minutes REAL NOT NULL DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Maoyan movie list table (电影列表) - 保留现有数据
  db.exec(`
    CREATE TABLE IF NOT EXISTS maoyan_movie_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movie_id TEXT NOT NULL,
      title TEXT NOT NULL,
      release_info TEXT,
      box_office REAL,
      box_office_unit TEXT,
      sum_box_desc TEXT,
      sum_split_box_desc TEXT,
      box_rate TEXT,
      box_split_rate TEXT,
      show_count INTEGER,
      show_count_rate TEXT,
      avg_seat_view TEXT,
      avg_show_view TEXT,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(movie_id)
    )
  `);

  // Maoyan calendar table (即将上映)
  db.exec(`
    CREATE TABLE IF NOT EXISTS maoyan_calendar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movie_id TEXT NOT NULL,
      title TEXT NOT NULL,
      release_date TEXT,
      poster TEXT,
      want_count INTEGER DEFAULT 0,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Maoyan rankings table (排行：电视剧、网络剧、综艺)
  db.exec(`
    CREATE TABLE IF NOT EXISTS maoyan_rankings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rank INTEGER NOT NULL,
      item_id TEXT NOT NULL,
      title TEXT NOT NULL,
      score REAL DEFAULT 0,
      poster TEXT,
      info TEXT,
      category TEXT NOT NULL CHECK(category IN ('tv', 'webSeries', 'variety')),
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for maoyan tables
  db.exec(`CREATE INDEX IF NOT EXISTS idx_maoyan_calendar_fetched_at ON maoyan_calendar(fetched_at DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_maoyan_rankings_category ON maoyan_rankings(category)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_maoyan_rankings_fetched_at ON maoyan_rankings(fetched_at DESC)`);
}

// Migration function to update platform_accounts table CHECK constraint
function migratePlatformAccountsTable() {
  try {
    // Check if table exists
    const tableInfo = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='platform_accounts'`).get();
    if (!tableInfo) {
      // Table doesn't exist, initSchema will create it
      return;
    }

    // Check if the constraint already includes 'Douyin'
    const tableSchema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='platform_accounts'`).get() as { sql: string } | undefined;
    if (tableSchema && tableSchema.sql.includes("'Douyin'")) {
      // Already migrated
      return;
    }

    console.log('[Database] Migrating platform_accounts table to support Douyin...');

    // Temporarily disable foreign keys for migration
    db.pragma('foreign_keys = OFF');

    try {
      // Create new table with updated constraint
      db.exec(`
        CREATE TABLE platform_accounts_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          platform TEXT NOT NULL CHECK(platform IN ('Weibo', 'Bilibili', 'Xiaohongshu', 'Douyin')),
          platform_username TEXT,
          cookies TEXT,
          status TEXT DEFAULT 'disconnected',
          last_sync DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(user_id, platform)
        )
      `);

      // Copy data from old table
      db.exec(`INSERT INTO platform_accounts_new SELECT * FROM platform_accounts`);

      // Drop old table
      db.exec(`DROP TABLE platform_accounts`);

      // Rename new table
      db.exec(`ALTER TABLE platform_accounts_new RENAME TO platform_accounts`);

      // Recreate indexes if they existed
      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_platform_accounts_user_id ON platform_accounts(user_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_platform_accounts_status ON platform_accounts(status)`);
      } catch {
        // Indexes may already exist or may not have existed before
      }

      console.log('[Database] Migration completed successfully');
    } finally {
      // Re-enable foreign keys
      db.pragma('foreign_keys = ON');
    }
  } catch (error: any) {
    console.error('[Database] Migration error:', error.message);
    // If migration fails, try to clean up
    try {
      db.pragma('foreign_keys = OFF');
      db.exec(`DROP TABLE IF EXISTS platform_accounts_new`);
      db.pragma('foreign_keys = ON');
    } catch {
      // Ignore cleanup errors
      db.pragma('foreign_keys = ON');
    }
  }
}

// Migration function to add baidu_url and quark_url columns to hot_dramas table
// and update UNIQUE constraint to be based on title only
function migrateHotDramasTable() {
  try {
    // Check if table exists
    const tableInfo = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='hot_dramas'`).get();
    if (!tableInfo) {
      // Table doesn't exist, initSchema will create it
      return;
    }

    // Check if columns already exist
    const tableInfo2 = db.prepare(`PRAGMA table_info(hot_dramas)`).all() as Array<{ name: string }>;
    const hasBaiduUrl = tableInfo2.some(col => col.name === 'baidu_url');
    const hasQuarkUrl = tableInfo2.some(col => col.name === 'quark_url');

    // Check current table schema
    const tableSchema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='hot_dramas'`).get() as { sql: string } | undefined;
    const hasTitleUnique = tableSchema?.sql.includes('title TEXT NOT NULL UNIQUE') || tableSchema?.sql.includes('UNIQUE(title)');

    let needsMigration = false;

    if (!hasBaiduUrl || !hasQuarkUrl || !hasTitleUnique) {
      needsMigration = true;
      console.log('[Database] Migrating hot_dramas table...');
    }

    if (needsMigration) {
      // SQLite doesn't support ALTER TABLE to modify UNIQUE constraints
      // So we need to recreate the table
      db.pragma('foreign_keys = OFF');

      try {
        // Create new table with correct structure
        db.exec(`
          CREATE TABLE IF NOT EXISTS hot_dramas_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            original_title TEXT,
            download_link TEXT,
            baidu_url TEXT,
            quark_url TEXT,
            tmdb_id INTEGER,
            poster_path TEXT,
            backdrop_path TEXT,
            overview TEXT,
            release_date TEXT,
            vote_average REAL,
            media_type TEXT,
            fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Copy data from old table, handling duplicates by keeping the latest one
        db.exec(`
          INSERT INTO hot_dramas_new 
          SELECT * FROM hot_dramas
          WHERE id IN (
            SELECT MAX(id) 
            FROM hot_dramas 
            GROUP BY title
          )
        `);

        // Drop old table
        db.exec(`DROP TABLE hot_dramas`);

        // Rename new table
        db.exec(`ALTER TABLE hot_dramas_new RENAME TO hot_dramas`);

        console.log('[Database] Migration completed successfully');
      } catch (error: any) {
        console.error('[Database] Migration error:', error.message);
        // Try to clean up
        try {
          db.exec(`DROP TABLE IF EXISTS hot_dramas_new`);
        } catch { }
      } finally {
        db.pragma('foreign_keys = ON');
      }
    }
  } catch (error: any) {
    console.error('[Database] Migration error:', error.message);
  }
}

// Initialize schema before preparing statements
initSchema();
// Run migration after schema init
migratePlatformAccountsTable();
migrateHotDramasTable();

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
    INSERT INTO social_items (account_id, platform, external_id, title, author, thumbnail, url, content, likes, comments, shares, views, tags, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      category = excluded.category,
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
    SELECT id, account_id, platform, external_id, title, author, thumbnail, url, content, likes, comments, shares, views, tags, category, fetched_at FROM (
      SELECT si.*, ROW_NUMBER() OVER (PARTITION BY pa.user_id, si.title, si.platform ORDER BY si.fetched_at DESC, si.id DESC) as rn
      FROM social_items si
      JOIN platform_accounts pa ON si.account_id = pa.id
      WHERE pa.user_id = ?
    ) WHERE rn = 1
    ORDER BY fetched_at DESC, id DESC
    LIMIT ? OFFSET ?
  `),

  findByUserAndPlatform: db.prepare(`
    SELECT id, account_id, platform, external_id, title, author, thumbnail, url, content, likes, comments, shares, views, tags, category, fetched_at FROM (
      SELECT si.*, ROW_NUMBER() OVER (PARTITION BY pa.user_id, si.title, si.platform ORDER BY si.fetched_at DESC, si.id DESC) as rn
      FROM social_items si
      JOIN platform_accounts pa ON si.account_id = pa.id
      WHERE pa.user_id = ? AND si.platform = ?
    ) WHERE rn = 1
    ORDER BY fetched_at DESC, id DESC
    LIMIT ? OFFSET ?
  `),

  findByUserAndCategory: db.prepare(`
    SELECT id, account_id, platform, external_id, title, author, thumbnail, url, content, likes, comments, shares, views, tags, category, fetched_at FROM (
      SELECT si.*, ROW_NUMBER() OVER (PARTITION BY pa.user_id, si.title, si.platform ORDER BY si.fetched_at DESC, si.id DESC) as rn
      FROM social_items si
      JOIN platform_accounts pa ON si.account_id = pa.id
      WHERE pa.user_id = ? AND si.category = ?
    ) WHERE rn = 1
    ORDER BY fetched_at DESC, id DESC
    LIMIT ? OFFSET ?
  `),

  findByUserPlatformAndCategory: db.prepare(`
    SELECT id, account_id, platform, external_id, title, author, thumbnail, url, content, likes, comments, shares, views, tags, category, fetched_at FROM (
      SELECT si.*, ROW_NUMBER() OVER (PARTITION BY pa.user_id, si.title, si.platform ORDER BY si.fetched_at DESC, si.id DESC) as rn
      FROM social_items si
      JOIN platform_accounts pa ON si.account_id = pa.id
      WHERE pa.user_id = ? AND si.platform = ? AND si.category = ?
    ) WHERE rn = 1
    ORDER BY fetched_at DESC, id DESC
    LIMIT ? OFFSET ?
  `),

  countByUserAndCategory: db.prepare(`
    SELECT COUNT(DISTINCT si.title || '|' || si.platform) as count FROM social_items si
    JOIN platform_accounts pa ON si.account_id = pa.id
    WHERE pa.user_id = ? AND si.category = ?
  `),

  countByUserPlatformAndCategory: db.prepare(`
    SELECT COUNT(DISTINCT si.title) as count FROM social_items si
    JOIN platform_accounts pa ON si.account_id = pa.id
    WHERE pa.user_id = ? AND si.platform = ? AND si.category = ?
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

// Hot trend operations
export const hotTrendOps = {
  // Insert a hot trend item
  insert: db.prepare(`
    INSERT INTO hot_trends (platform, category_id, rank, title, hotness, url, extra_data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  // Get all hot trends for a platform and category (no batch filtering, returns all items)
  findLatest: db.prepare(`
    SELECT * FROM hot_trends
    WHERE platform = ? AND category_id = ?
    ORDER BY rank ASC
  `),

  // Get latest fetch time for a platform and category
  getLatestFetchTime: db.prepare(`
    SELECT MAX(fetched_at) as latest FROM hot_trends WHERE platform = ? AND category_id = ?
  `),

  // Delete old hot trends (older than 24 hours)
  deleteOld: db.prepare(`
    DELETE FROM hot_trends WHERE fetched_at < datetime('now', '-24 hours')
  `),

  // Delete all for a platform and category (before inserting new batch)
  deleteByPlatformCategory: db.prepare(`
    DELETE FROM hot_trends WHERE platform = ? AND category_id = ?
  `),

  // Count by platform
  countByPlatform: db.prepare(`
    SELECT platform, COUNT(*) as count FROM hot_trends GROUP BY platform
  `),
};

// Public social items operations (for all users)
export const publicItemOps = {
  // Upsert a public social item
  upsert: db.prepare(`
    INSERT INTO public_social_items (platform, source_url, source_label, external_id, title, author, thumbnail, url, content, likes, comments, shares, views, tags, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(platform, source_url, external_id) DO UPDATE SET
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
      category = excluded.category,
      fetched_at = datetime('now')
  `),

  // Get public items by platform
  findByPlatform: db.prepare(`
    SELECT * FROM public_social_items
    WHERE platform = ?
    ORDER BY fetched_at DESC, id DESC
    LIMIT ? OFFSET ?
  `),

  // Get all public items
  findAll: db.prepare(`
    SELECT * FROM public_social_items
    ORDER BY fetched_at DESC, id DESC
    LIMIT ? OFFSET ?
  `),

  // Get public items by source label
  findBySourceLabel: db.prepare(`
    SELECT * FROM public_social_items
    WHERE platform = ? AND source_label = ?
    ORDER BY fetched_at DESC, id DESC
    LIMIT ? OFFSET ?
  `),

  // Get count by platform
  countByPlatform: db.prepare(`
    SELECT platform, COUNT(*) as count FROM public_social_items GROUP BY platform
  `),

  // Get public items by category
  findByCategory: db.prepare(`
    SELECT * FROM public_social_items
    WHERE category = ?
    ORDER BY fetched_at DESC, id DESC
    LIMIT ? OFFSET ?
  `),

  // Get public items by platform and category
  findByPlatformAndCategory: db.prepare(`
    SELECT * FROM public_social_items
    WHERE platform = ? AND category = ?
    ORDER BY fetched_at DESC, id DESC
    LIMIT ? OFFSET ?
  `),

  // Count by category
  countByCategory: db.prepare(`
    SELECT category, COUNT(*) as count FROM public_social_items GROUP BY category
  `),

  // Count by platform and category
  countByPlatformAndCategory: db.prepare(`
    SELECT COUNT(*) as count FROM public_social_items
    WHERE platform = ? AND category = ?
  `),

  // Delete old items (older than 7 days)
  deleteOld: db.prepare(`
    DELETE FROM public_social_items WHERE fetched_at < datetime('now', '-7 days')
  `),
};

// Hot drama operations
export const hotDramaOps = {
  upsert: db.prepare(`
    INSERT INTO hot_dramas (title, original_title, download_link, baidu_url, quark_url, tmdb_id, poster_path, backdrop_path, overview, release_date, vote_average, media_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(title) DO UPDATE SET
      original_title = COALESCE(excluded.original_title, original_title),
      download_link = COALESCE(excluded.download_link, download_link),
      baidu_url = COALESCE(excluded.baidu_url, baidu_url),
      quark_url = COALESCE(excluded.quark_url, quark_url),
      tmdb_id = COALESCE(excluded.tmdb_id, tmdb_id),
      poster_path = COALESCE(excluded.poster_path, poster_path),
      backdrop_path = COALESCE(excluded.backdrop_path, backdrop_path),
      overview = COALESCE(excluded.overview, overview),
      release_date = COALESCE(excluded.release_date, release_date),
      vote_average = COALESCE(excluded.vote_average, vote_average),
      media_type = COALESCE(excluded.media_type, media_type),
      fetched_at = datetime('now')
  `),

  findAll: db.prepare(`
    SELECT * FROM hot_dramas
    ORDER BY 
      CASE WHEN release_date IS NULL OR release_date = '' THEN 0 ELSE 1 END DESC,
      release_date DESC,
      fetched_at DESC
  `),

  findAllPaginated: db.prepare(`
    SELECT * FROM hot_dramas
    ORDER BY 
      CASE WHEN release_date IS NULL OR release_date = '' THEN 0 ELSE 1 END DESC,
      release_date DESC,
      fetched_at DESC
    LIMIT ? OFFSET ?
  `),

  findAllPaginatedByType: db.prepare(`
    SELECT * FROM hot_dramas
    WHERE media_type = ?
    ORDER BY 
      CASE WHEN release_date IS NULL OR release_date = '' THEN 0 ELSE 1 END DESC,
      release_date DESC,
      fetched_at DESC
    LIMIT ? OFFSET ?
  `),

  count: db.prepare(`
    SELECT COUNT(*) as total FROM hot_dramas
  `),

  countByType: db.prepare(`
    SELECT COUNT(*) as total FROM hot_dramas WHERE media_type = ?
  `),

  // 搜索查询
  searchByTitle: db.prepare(`
    SELECT * FROM hot_dramas
    WHERE title LIKE ?
    ORDER BY 
      CASE WHEN release_date IS NULL OR release_date = '' THEN 0 ELSE 1 END DESC,
      release_date DESC,
      fetched_at DESC
    LIMIT ? OFFSET ?
  `),

  searchByTitleAndType: db.prepare(`
    SELECT * FROM hot_dramas
    WHERE title LIKE ? AND media_type = ?
    ORDER BY 
      CASE WHEN release_date IS NULL OR release_date = '' THEN 0 ELSE 1 END DESC,
      release_date DESC,
      fetched_at DESC
    LIMIT ? OFFSET ?
  `),

  countSearch: db.prepare(`
    SELECT COUNT(*) as total FROM hot_dramas WHERE title LIKE ?
  `),

  countSearchByType: db.prepare(`
    SELECT COUNT(*) as total FROM hot_dramas WHERE title LIKE ? AND media_type = ?
  `),

  // 检查标题是否已存在且有 TMDB 数据
  findByTitle: db.prepare(`
    SELECT title, tmdb_id, poster_path FROM hot_dramas WHERE title = ?
  `),

  deleteAll: db.prepare(`
    DELETE FROM hot_dramas
  `)
};

// OpenSource trending operations
export const opensourceTrendingOps = {
  // Upsert a trending project
  upsert: db.prepare(`
    INSERT INTO opensource_trending (repo_full_name, repo_name, description, language, stars, stars_today, forks, url, period, language_filter, rank)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(repo_full_name, period, language_filter) DO UPDATE SET
      repo_name = excluded.repo_name,
      description = excluded.description,
      language = excluded.language,
      stars = excluded.stars,
      stars_today = excluded.stars_today,
      forks = excluded.forks,
      url = excluded.url,
      rank = excluded.rank,
      fetched_at = datetime('now')
  `),

  // Find by period and language
  findByPeriodAndLanguage: db.prepare(`
    SELECT * FROM opensource_trending
    WHERE period = ? AND (language_filter = ? OR language_filter = 'all' OR ? = 'all')
    ORDER BY rank ASC, fetched_at DESC
  `),

  // Find latest by period and language (today's data)
  // If language = 'all', return all data; otherwise, only return matching language_filter
  findLatest: db.prepare(`
    SELECT * FROM opensource_trending
    WHERE period = ? AND (? = 'all' OR language_filter = ?)
    AND DATE(fetched_at) = DATE('now')
    ORDER BY rank ASC
  `),

  // Delete old data (older than 7 days)
  deleteOld: db.prepare(`
    DELETE FROM opensource_trending WHERE fetched_at < datetime('now', '-7 days')
  `),

  // Delete by period and language before inserting new batch (delete today's data)
  deleteByPeriodAndLanguage: db.prepare(`
    DELETE FROM opensource_trending WHERE period = ? AND language_filter = ? AND DATE(fetched_at) = DATE('now')
  `),

  // Count by period
  countByPeriod: db.prepare(`
    SELECT period, COUNT(*) as count FROM opensource_trending GROUP BY period
  `),
};

// Analytics operations
export const analyticsOps = {
  // Insert an analytics event
  insert: db.prepare(`
    INSERT INTO analytics_events (event_type, page_path, page_title, user_id, session_id, ip_address, user_agent, referrer, device_type, browser, os, country, city, event_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  // Get page views count by date range
  getPageViewsByDateRange: db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM analytics_events
    WHERE event_type = 'pageview' AND DATE(created_at) >= DATE('now', ?) AND DATE(created_at) <= DATE('now')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `),

  // Get unique visitors by date range
  getUniqueVisitorsByDateRange: db.prepare(`
    SELECT DATE(created_at) as date, COUNT(DISTINCT session_id) as count
    FROM analytics_events
    WHERE event_type = 'pageview' AND DATE(created_at) >= DATE('now', ?) AND DATE(created_at) <= DATE('now')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `),

  // Get page views by page path
  getPageViewsByPath: db.prepare(`
    SELECT page_path, COUNT(*) as count
    FROM analytics_events
    WHERE event_type = 'pageview' AND DATE(created_at) >= DATE('now', ?)
    GROUP BY page_path
    ORDER BY count DESC
    LIMIT ?
  `),

  // Get total page views
  getTotalPageViews: db.prepare(`
    SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'pageview'
  `),

  // Get total unique visitors (by session_id)
  getTotalUniqueVisitors: db.prepare(`
    SELECT COUNT(DISTINCT session_id) as count FROM analytics_events WHERE event_type = 'pageview'
  `),

  // Get page views today
  getPageViewsToday: db.prepare(`
    SELECT COUNT(*) as count FROM analytics_events 
    WHERE event_type = 'pageview' AND DATE(created_at) = DATE('now')
  `),

  // Get unique visitors today
  getUniqueVisitorsToday: db.prepare(`
    SELECT COUNT(DISTINCT session_id) as count FROM analytics_events 
    WHERE event_type = 'pageview' AND DATE(created_at) = DATE('now')
  `),

  // Get device statistics
  getDeviceStats: db.prepare(`
    SELECT device_type, COUNT(*) as count
    FROM analytics_events
    WHERE event_type = 'pageview' AND DATE(created_at) >= DATE('now', ?)
    GROUP BY device_type
    ORDER BY count DESC
  `),

  // Get browser statistics
  getBrowserStats: db.prepare(`
    SELECT browser, COUNT(*) as count
    FROM analytics_events
    WHERE event_type = 'pageview' AND DATE(created_at) >= DATE('now', ?)
    GROUP BY browser
    ORDER BY count DESC
    LIMIT ?
  `),

  // Get OS statistics
  getOSStats: db.prepare(`
    SELECT os, COUNT(*) as count
    FROM analytics_events
    WHERE event_type = 'pageview' AND DATE(created_at) >= DATE('now', ?)
    GROUP BY os
    ORDER BY count DESC
    LIMIT ?
  `),

  // Get referrer statistics
  getReferrerStats: db.prepare(`
    SELECT CASE 
      WHEN referrer IS NULL OR referrer = '' THEN 'direct'
      WHEN referrer LIKE '%' || page_path || '%' THEN 'internal'
      ELSE referrer
    END as referrer_type, COUNT(*) as count
    FROM analytics_events
    WHERE event_type = 'pageview' AND DATE(created_at) >= DATE('now', ?)
    GROUP BY referrer_type
    ORDER BY count DESC
    LIMIT ?
  `),

  // Delete old events (older than specified days)
  deleteOld: db.prepare(`
    DELETE FROM analytics_events WHERE created_at < datetime('now', ?)
  `),
};

// Maoyan data type definitions
export interface MaoyanMovie {
  movieId: string;
  title: string;
  releaseInfo: string | null;
  boxOffice: number | null;
  boxOfficeUnit: string | null;
  sumBoxDesc: string | null;
  sumSplitBoxDesc: string | null;
  boxRate: string | null;
  boxSplitRate: string | null;
  showCount: number | null;
  showCountRate: string | null;
  avgSeatView: string | null;
  avgShowView: string | null;
  fetchedAt: string;
}

export interface MaoyanCalendar {
  movieId: string;
  title: string;
  releaseDate: string | null;
  poster: string | null;
  wantCount: number;
}

export interface MaoyanRanking {
  rank: number;
  itemId: string;
  title: string;
  score: number;
  poster: string | null;
  info: string | null;
  category: string;
}

// Maoyan data operations
export const maoyanOps = {
  // Movie List operations
  deleteAllMovieList: db.prepare(`DELETE FROM maoyan_movie_list`),
  insertMovie: db.prepare(`
    INSERT OR REPLACE INTO maoyan_movie_list 
    (movie_id, title, release_info, box_office, box_office_unit, sum_box_desc, sum_split_box_desc, box_rate, box_split_rate, show_count, show_count_rate, avg_seat_view, avg_show_view, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getLatestMovieList: db.prepare(`
    SELECT movie_id as movieId, title, release_info as releaseInfo, 
           box_office as boxOffice, box_office_unit as boxOfficeUnit, 
           sum_box_desc as sumBoxDesc, sum_split_box_desc as sumSplitBoxDesc,
           box_rate as boxRate, box_split_rate as boxSplitRate,
           show_count as showCount, show_count_rate as showCountRate,
           avg_seat_view as avgSeatView, avg_show_view as avgShowView,
           fetched_at as fetchedAt
    FROM maoyan_movie_list
    ORDER BY fetched_at DESC
    LIMIT 100
  `),
  getMovieById: db.prepare(`
    SELECT movie_id as movieId, title, release_info as releaseInfo, 
           box_office as boxOffice, box_office_unit as boxOfficeUnit,
           sum_box_desc as sumBoxDesc, sum_split_box_desc as sumSplitBoxDesc,
           box_rate as boxRate, box_split_rate as boxSplitRate,
           show_count as showCount, show_count_rate as showCountRate,
           avg_seat_view as avgSeatView, avg_show_view as avgShowView,
           fetched_at as fetchedAt
    FROM maoyan_movie_list
    WHERE movie_id = ?
    ORDER BY fetched_at DESC
    LIMIT 1
  `),

  // Calendar operations
  deleteAllCalendar: db.prepare(`DELETE FROM maoyan_calendar`),
  insertCalendar: db.prepare(`
    INSERT INTO maoyan_calendar (movie_id, title, release_date, poster, want_count, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  getLatestCalendar: db.prepare(`
    SELECT movie_id as movieId, title, release_date as releaseDate, poster, want_count as wantCount
    FROM maoyan_calendar
    ORDER BY fetched_at DESC
    LIMIT 50
  `),

  // Rankings operations
  deleteAllRankings: db.prepare(`DELETE FROM maoyan_rankings`),
  deleteRankingsByCategory: db.prepare(`DELETE FROM maoyan_rankings WHERE category = ?`),
  insertRanking: db.prepare(`
    INSERT INTO maoyan_rankings (rank, item_id, title, score, poster, info, category, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getLatestRankings: db.prepare(`
    SELECT rank, item_id as itemId, title, score, poster, info, category
    FROM maoyan_rankings
    WHERE category = ?
    ORDER BY fetched_at DESC, rank ASC
    LIMIT 50
  `),
  getAllLatestRankings: db.prepare(`
    SELECT rank, item_id as itemId, title, score, poster, info, category
    FROM maoyan_rankings
    ORDER BY fetched_at DESC, category, rank ASC
    LIMIT 150
  `),

  // Get latest fetch time
  getLatestFetchTime: db.prepare(`
    SELECT MAX(fetched_at) as latest_fetch_time
    FROM (
      SELECT fetched_at FROM maoyan_movie_list
      UNION ALL
      SELECT fetched_at FROM maoyan_calendar
      UNION ALL
      SELECT fetched_at FROM maoyan_rankings
    )
  `),
};

// Scheduler configuration operations
export const schedulerConfigOps = {
  // Get all scheduler configurations
  getAll: db.prepare(`
    SELECT scheduler_name, enabled, interval_minutes, initial_delay_minutes
    FROM scheduler_config
  `),

  // Get a specific scheduler configuration
  getByName: db.prepare(`
    SELECT scheduler_name, enabled, interval_minutes, initial_delay_minutes
    FROM scheduler_config
    WHERE scheduler_name = ?
  `),

  // Insert or update (upsert) a scheduler configuration
  upsert: db.prepare(`
    INSERT INTO scheduler_config (scheduler_name, enabled, interval_minutes, initial_delay_minutes, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(scheduler_name) DO UPDATE SET
      enabled = excluded.enabled,
      interval_minutes = excluded.interval_minutes,
      initial_delay_minutes = excluded.initial_delay_minutes,
      updated_at = CURRENT_TIMESTAMP
  `),

  // Update a specific scheduler configuration
  update: db.prepare(`
    UPDATE scheduler_config
    SET enabled = ?, interval_minutes = ?, initial_delay_minutes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE scheduler_name = ?
  `),

  // Delete a scheduler configuration (usually not needed, but available)
  delete: db.prepare(`
    DELETE FROM scheduler_config WHERE scheduler_name = ?
  `),
};

export default db;
