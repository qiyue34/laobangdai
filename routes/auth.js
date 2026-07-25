const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database/db');
const asyncHandler = require('./asyncHandler');

const CATEGORIES = ['日常', '话剧', '游戏', '风景'];

// 密码哈希
function hash(pwd, salt) {
  return crypto.createHash('sha256').update(pwd + salt).digest('hex');
}

function makeSalt() {
  return crypto.randomBytes(8).toString('hex');
}

// 获取导航数据
async function getNavData() {
  const counts = await db.all('SELECT category, COUNT(*) AS count FROM media WHERE is_private IS NULL OR is_private = 0 GROUP BY category');
  const categoryCounts = {};
  counts.forEach(c => { categoryCounts[c.category] = c.count; });
  return { categoryCounts, categories: CATEGORIES };
}

// 中间件：检查登录
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.redirect('/login');
}

// GET /login — 登录页
router.get('/', asyncHandler(async (req, res) => {
  const navData = await getNavData();
  res.render('login', { ...navData, currentCategory: null, error: null, reg: false });
}));

// POST /login — 验证
router.post('/', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    const navData = await getNavData();
    return res.render('login', { ...navData, error: '请输入用户名和密码', reg: false });
  }

  const user = await db.get('SELECT * FROM users WHERE username = $1', [username]);
  if (!user) {
    const navData = await getNavData();
    return res.render('login', { ...navData, error: '用户名或密码错误', reg: false });
  }

  const h = hash(password, user.salt);
  if (h !== user.password) {
    const navData = await getNavData();
    return res.render('login', { ...navData, error: '用户名或密码错误', reg: false });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect('/private');
}));

// GET /register — 注册页
router.get('/register', asyncHandler(async (req, res) => {
  const navData = await getNavData();
  res.render('login', { ...navData, currentCategory: null, error: null, reg: true });
}));

// POST /register — 创建用户
router.post('/register', asyncHandler(async (req, res) => {
  const { username, password, confirm } = req.body;

  if (!username || !password) {
    const navData = await getNavData();
    return res.render('login', { ...navData, error: '请填写用户名和密码', reg: true });
  }
  if (username.length < 2 || username.length > 20) {
    const navData = await getNavData();
    return res.render('login', { ...navData, error: '用户名需要 2-20 个字符', reg: true });
  }
  if (password.length < 4) {
    const navData = await getNavData();
    return res.render('login', { ...navData, error: '密码至少 4 个字符', reg: true });
  }
  if (password !== confirm) {
    const navData = await getNavData();
    return res.render('login', { ...navData, error: '两次密码输入不一致', reg: true });
  }

  // 检查重名
  const exist = await db.get('SELECT id FROM users WHERE username = $1', [username]);
  if (exist) {
    const navData = await getNavData();
    return res.render('login', { ...navData, error: '用户名已被注册', reg: true });
  }

  const salt = makeSalt();
  const hpwd = hash(password, salt);
  await db.run('INSERT INTO users (username, password, salt) VALUES ($1, $2, $3)', [username, hpwd, salt]);

  // 自动登录
  const user = await db.get('SELECT id FROM users WHERE username = $1', [username]);
  req.session.userId = user.id;
  req.session.username = username;
  res.redirect('/private');
}));

module.exports = router;
module.exports.requireAuth = requireAuth;
