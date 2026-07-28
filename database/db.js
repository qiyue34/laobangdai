const { Pool } = require('pg');

let pool = null;

// 初始化连接池
async function initDB() {
  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL 未设置 - 请在 Railway 上添加 PostgreSQL');
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  // 测试连接
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('✅ PostgreSQL 连接成功');
  } finally {
    client.release();
  }

  // 建表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS media (
      id            SERIAL PRIMARY KEY,
      title         TEXT NOT NULL DEFAULT '',
      description   TEXT DEFAULT '',
      category      TEXT NOT NULL CHECK(category IN ('日常', '话剧', '游戏', '风景')),
      type          TEXT NOT NULL CHECK(type IN ('photo', 'video')),
      filename      TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type     TEXT NOT NULL,
      file_size     BIGINT NOT NULL,
      uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      views         INTEGER DEFAULT 0,
      is_private    INTEGER DEFAULT 0,
      file_data     TEXT DEFAULT NULL,
      user_id       INTEGER DEFAULT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      username  TEXT NOT NULL UNIQUE,
      password  TEXT NOT NULL,
      salt      TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 索引
  await pool.query('CREATE INDEX IF NOT EXISTS idx_media_category ON media(category)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON media(uploaded_at DESC)');

  // 迁移：添加 file_data 字段
  try { await pool.query('ALTER TABLE media ADD COLUMN file_data TEXT DEFAULT NULL'); } catch(e) {}

  console.log('✅ 数据库表初始化完成');
  return pool;
}

// 获取连接池
async function getDB() {
  if (!pool) {
    await initDB();
  }
  return pool;
}

// 查询多行
async function all(sql, params = []) {
  const p = await getDB();
  const result = await p.query(sql, params);
  return result.rows;
}

// 查询单行
async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// 执行（INSERT/UPDATE/DELETE）
async function run(sql, params = []) {
  const p = await getDB();
  const result = await p.query(sql, params);
  return result;
}

module.exports = { getDB, all, get, run };
