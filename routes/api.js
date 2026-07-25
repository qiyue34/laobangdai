const express = require('express');
const router = express.Router();
const db = require('../database/db');
const asyncHandler = require('./asyncHandler');

const CATEGORIES = ['日常', '话剧', '游戏', '风景'];

// GET /api/media?page=1&category=风景
router.get('/media', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const category = req.query.category || null;

  let total, items;

  if (category && CATEGORIES.includes(category)) {
    total = await db.get('SELECT COUNT(*) AS count FROM media WHERE category = $1 AND (is_private IS NULL OR is_private = 0)', [category]);
    items = await db.all(
      `SELECT id, title, category, type, filename, original_name, file_size, uploaded_at, views
       FROM media WHERE category = $1 AND (is_private IS NULL OR is_private = 0) ORDER BY uploaded_at DESC LIMIT $2 OFFSET $3`,
      [category, limit, offset]
    );
  } else {
    total = await db.get('SELECT COUNT(*) AS count FROM media WHERE is_private IS NULL OR is_private = 0');
    items = await db.all(
      `SELECT id, title, category, type, filename, original_name, file_size, uploaded_at, views
       FROM media WHERE is_private IS NULL OR is_private = 0 ORDER BY uploaded_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
  }

  const totalPages = Math.ceil(total.count / limit);
  const hasMore = page < totalPages;

  res.json({
    items,
    page,
    totalPages,
    hasMore,
    total: total.count
  });
}));

module.exports = router;
