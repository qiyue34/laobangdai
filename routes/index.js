const express = require('express');
const router = express.Router();
const db = require('../database/db');
const asyncHandler = require('./asyncHandler');

const CATEGORIES = ['日常', '话剧', '游戏', '风景'];

// 获取导航数据（分类计数，仅公开内容）
async function getNavData() {
  const counts = await db.all('SELECT category, COUNT(*) AS count FROM media WHERE is_private IS NULL OR is_private = 0 GROUP BY category');
  const categoryCounts = {};
  counts.forEach(c => { categoryCounts[c.category] = c.count; });
  return { categoryCounts, categories: CATEGORIES };
}

// 首页 - 展示所有媒体
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const totalRow = await db.get('SELECT COUNT(*) AS count FROM media WHERE is_private IS NULL OR is_private = 0');
  const totalPages = Math.ceil(totalRow.count / limit);

  const items = await db.all(
    `SELECT id, title, category, type, filename, original_name, file_size, uploaded_at, views
     FROM media WHERE is_private IS NULL OR is_private = 0 ORDER BY uploaded_at DESC LIMIT $1::int OFFSET $2::int`,
    [limit, offset]
  );

  const navData = await getNavData();

  res.render('index', {
    ...navData,
    items,
    page,
    totalPages,
    currentCategory: null
  });
}));

// 分类页
router.get('/category/:name', asyncHandler(async (req, res) => {
  const category = req.params.name;

  if (!CATEGORIES.includes(category)) {
    return res.status(404).render('error', { message: '分类不存在', backLink: '/' });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const totalRow = await db.get('SELECT COUNT(*) AS count FROM media WHERE category = $1 AND (is_private IS NULL OR is_private = 0)', [category]);
  const totalPages = Math.ceil(totalRow.count / limit);

  const items = await db.all(
    `SELECT id, title, category, type, filename, original_name, file_size, uploaded_at, views
     FROM media WHERE category = $1 AND (is_private IS NULL OR is_private = 0) ORDER BY uploaded_at DESC LIMIT $2::int OFFSET $3::int`,
    [category, limit, offset]
  );

  const navData = await getNavData();

  res.render('category', {
    ...navData,
    items,
    category,
    page,
    totalPages,
    currentCategory: category
  });
}));

module.exports = router;
