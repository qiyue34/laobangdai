const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const db = require('./database/db');

const indexRouter = require('./routes/index');
const uploadRouter = require('./routes/upload');
const mediaRouter = require('./routes/media');
const apiRouter = require('./routes/api');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保 uploads 子目录存在
const uploadsDir = path.join(__dirname, 'uploads');
['photos', 'videos'].forEach(dir => {
  const fullPath = path.join(uploadsDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// 视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session 中间件（用于登录状态）
app.use(session({
  secret: 'laobangdai-session-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24小时
}));

// 文件服务：优先本地，数据库持久化做后备
const serveStatic = express.static(path.join(__dirname, 'uploads'));
app.use('/uploads', async (req, res, next) => {
  const filePath = path.join(__dirname, 'uploads', req.path.replace(/^\//, ''));
  if (require('fs').existsSync(filePath)) {
    serveStatic(req, res, next);
  } else {
    // 从数据库读取
    try {
      const filename = req.path.split('/').pop();
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      const result = await pool.query('SELECT file_data, mime_type FROM media WHERE filename = $1', [filename]);
      await pool.end();
      if (result.rows.length > 0 && result.rows[0].file_data) {
        res.set('Content-Type', result.rows[0].mime_type || 'image/png');
        res.set('Cache-Control', 'public, max-age=31536000');
        return res.send(Buffer.from(result.rows[0].file_data, 'base64'));
      }
    } catch(e) { /* ignore */ }
    res.status(404).send('File not found');
  }
});

// 注入登录状态到模板
app.use((req, res, next) => {
  res.locals.loggedIn = req.session && req.session.userId ? true : false;
  res.locals.username = req.session?.username || null;
  next();
});

// 路由
app.use('/', indexRouter);
app.use('/upload', uploadRouter);
app.use('/media', mediaRouter);
app.use('/api', apiRouter);
app.use('/login', authRouter);
app.use('/private', require('./routes/private'));
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// 404 处理
app.use((req, res) => {
  res.status(404).render('error', { message: '页面未找到', backLink: '/' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { message: '服务器内部错误', backLink: '/' });
});

// 启动服务器
async function start() {
  await db.getDB(); // 初始化数据库
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 照片视频分享站已启动!`);
    console.log(`   http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
