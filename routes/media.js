const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const asyncHandler = require('./asyncHandler');

const CATEGORIES = ['日常', '话剧', '游戏', '风景'];

// 获取导航数据
async function getNavData() {
  const counts = await db.all('SELECT category, COUNT(*) AS count FROM media WHERE is_private IS NULL OR is_private = 0 GROUP BY category');
  const categoryCounts = {};
  counts.forEach(c => { categoryCounts[c.category] = c.count; });
  return { categoryCounts, categories: CATEGORIES };
}

// 媒体详情页
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(404).render('error', { message: '媒体不存在', backLink: '/' });
  }

  const item = await db.get(
    `SELECT id, title, description, category, type, filename, original_name, mime_type, file_size, uploaded_at, views
     FROM media WHERE id = $1`,
    [id]
  );

  if (!item) {
    return res.status(404).render('error', { message: '媒体不存在', backLink: '/' });
  }

  // 增加浏览量
  await db.run('UPDATE media SET views = views + 1 WHERE id = $1', [id]);

  // 获取同分类的其他媒体（随机推荐4个）
  const related = await db.all(
    `SELECT id, title, type, filename, uploaded_at FROM media
     WHERE category = $1 AND id != $2 ORDER BY RANDOM() LIMIT 4`,
    [item.category, id]
  );

  // 格式化文件大小
  item.fileSizeFormatted = formatFileSize(item.file_size);
  item.isVideo = item.type === 'video';

  const navData = await getNavData();

  res.render('detail', { ...navData, item, related, currentCategory: null });
}));

// 下载媒体
router.get('/:id/download', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.redirect('/');

  const item = await db.get('SELECT * FROM media WHERE id = $1', [id]);
  if (!item) return res.redirect('/');

  const filePath = path.join(
    __dirname, '..', 'uploads',
    item.type === 'video' ? 'videos' : 'photos',
    item.filename
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).render('error', { message: '文件不存在', backLink: `/media/${id}` });
  }

  res.download(filePath, item.original_name);
}));

// 删除媒体
router.get('/:id/delete', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.redirect('/');

  const item = await db.get('SELECT * FROM media WHERE id = $1', [id]);
  if (!item) return res.redirect('/');

  // 删除文件
  const filePath = path.join(__dirname, '..', 'uploads', item.type === 'video' ? 'videos' : 'photos', item.filename);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) { /* ignore */ }

  await db.run('DELETE FROM media WHERE id = $1', [id]);
  res.redirect('/');
}));

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

module.exports = router;
