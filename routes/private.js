const express = require('express');
const router = express.Router();
const db = require('../database/db');
const asyncHandler = require('./asyncHandler');
const { requireAuth } = require('./auth');

const CATEGORIES = ['日常', '话剧', '游戏', '风景'];

async function getNavData() {
  const counts = await db.all('SELECT category, COUNT(*) AS count FROM media WHERE is_private IS NULL OR is_private = 0 GROUP BY category');
  const categoryCounts = {};
  counts.forEach(c => { categoryCounts[c.category] = c.count; });
  return { categoryCounts, categories: CATEGORIES };
}

router.use(requireAuth);

// 私人画廊（仅当前用户）
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const totalRow = await db.get('SELECT COUNT(*) AS count FROM media WHERE is_private = 1 AND user_id = $1', [userId]);
  const totalPages = Math.ceil(totalRow.count / limit);

  const items = await db.all(
    `SELECT id, title, category, type, filename, original_name, file_size, uploaded_at, views
     FROM media WHERE is_private = 1 AND user_id = $1 ORDER BY uploaded_at DESC LIMIT $2::int OFFSET $3::int`,
    [userId, limit, offset]
  );

  const navData = await getNavData();

  res.render('private', {
    ...navData,
    items,
    page,
    totalPages,
    currentCategory: null,
    loggedIn: true,
    username: req.session.username
  });
}));

// 私密分类页
router.get('/category/:name', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const category = req.params.name;
  if (!CATEGORIES.includes(category)) return res.redirect('/private');

  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const totalRow = await db.get(
    'SELECT COUNT(*) AS count FROM media WHERE category = $1 AND is_private = 1 AND user_id = $2', [category, userId]
  );
  const totalPages = Math.ceil(totalRow.count / limit);

  const items = await db.all(
    `SELECT id, title, category, type, filename, original_name, file_size, uploaded_at, views
     FROM media WHERE category = $1 AND is_private = 1 AND user_id = $2 ORDER BY uploaded_at DESC LIMIT $3::int OFFSET $4::int`,
    [category, userId, limit, offset]
  );

  const navData = await getNavData();

  res.render('private', {
    ...navData,
    items,
    category,
    page,
    totalPages,
    currentCategory: category,
    loggedIn: true,
    username: req.session.username
  });
}));

module.exports = router;
