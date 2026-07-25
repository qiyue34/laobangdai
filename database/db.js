const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'media.db');

let db = null;

// 初始化数据库
async function initDB() {
  const SQL = await initSqlJs();

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 如果已有数据库文件，加载它
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS media (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL DEFAULT '',
      description   TEXT DEFAULT '',
      category      TEXT NOT NULL CHECK(category IN ('日常', '话剧', '游戏', '风景')),
      type          TEXT NOT NULL CHECK(type IN ('photo', 'video')),
      filename      TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type     TEXT NOT NULL,
      file_size     INTEGER NOT NULL,
      uploaded_at   TEXT DEFAULT (datetime('now', 'localtime')),
      views         INTEGER DEFAULT 0
    )
  `);

  // 创建索引
  db.run('CREATE INDEX IF NOT EXISTS idx_media_category ON media(category)');
  db.run('CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON media(uploaded_at DESC)');

  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      username  TEXT NOT NULL UNIQUE,
      password  TEXT NOT NULL,
      salt      TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 迁移：添加 is_private 和 user_id 字段
  try { db.run('ALTER TABLE media ADD COLUMN is_private INTEGER DEFAULT 0'); } catch(e) {}
  try { db.run('ALTER TABLE media ADD COLUMN user_id INTEGER DEFAULT NULL'); } catch(e) {}
  try { db.run('ALTER TABLE media ADD COLUMN private_token TEXT DEFAULT NULL'); } catch(e) {}

  saveDB();
  console.log('✅ 数据库初始化完成');
  return db;
}

// 保存数据库到文件
function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// 保存到磁盘的自动包装
function wrapDB() {
  return new Proxy(db, {
    get(target, prop) {
      const orig = target[prop];
      if (typeof orig === 'function') {
        return function (...args) {
          const result = orig.apply(target, args);

          // 如果是写操作，保存到磁盘
          if (typeof args[0] === 'string' &&
              (args[0].toUpperCase().startsWith('INSERT') ||
               args[0].toUpperCase().startsWith('UPDATE') ||
               args[0].toUpperCase().startsWith('DELETE') ||
               args[0].toUpperCase().startsWith('CREATE') ||
               args[0].toUpperCase().startsWith('DROP'))) {
            // 延迟保存，合并多次写的磁盘 I/O
            setImmediate(() => saveDB());
          }

          return result;
        };
      }
      return orig;
    }
  });
}

let initialized = false;

// 获取数据库实例
async function getDB() {
  if (!initialized) {
    await initDB();
    initialized = true;
    // 用 Proxy 包装，自动保存写操作
    db = wrapDB();
  }
  return db;
}

// 便捷查询：查询多行
async function all(sql, params = []) {
  const d = await getDB();
  const stmt = d.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// 便捷查询：查询单行
async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// 便捷查询：执行写操作
async function run(sql, params = []) {
  const d = await getDB();
  if (params.length > 0) {
    d.run(sql, params);
  } else {
    d.run(sql);
  }
}

// 获取最后插入的 ID
function lastInsertId() {
  return db.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0];
}

module.exports = { getDB, all, get, run, saveDB };
