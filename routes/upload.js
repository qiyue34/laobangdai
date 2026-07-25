const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const asyncHandler = require('./asyncHandler');

const CATEGORIES = ['日常', '话剧', '游戏', '风景'];

// 允许的文件类型 — 照片完全放开，视频保持常见格式
function detectType(mimeType, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.flv'];
  const isVideo = mimeType.startsWith('video/') || videoExts.includes(ext);
  return isVideo ? 'video' : 'photo';
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.flv'];
    const isVideo = file.mimetype.startsWith('video/') || videoExts.includes(ext);
    const dest = isVideo ? 'uploads/videos' : 'uploads/photos';
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024, files: 20 }, // 单文件1GB，一次最多20个
  fileFilter: (req, file, cb) => {
    // 照片完全不受限，视频只拦极罕见的格式
    cb(null, true);
  }
});

// 获取导航数据
async function getNavData() {
  const counts = await db.all('SELECT category, COUNT(*) AS count FROM media WHERE is_private IS NULL OR is_private = 0 GROUP BY category');
  const categoryCounts = {};
  counts.forEach(c => { categoryCounts[c.category] = c.count; });
  return { categoryCounts, categories: CATEGORIES };
}

// GET 上传页面
router.get('/', asyncHandler(async (req, res) => {
  const navData = await getNavData();
  res.render('upload', { ...navData, currentCategory: null, error: null });
}));

// POST 处理多文件上传
router.post('/', (req, res) => {
  upload.array('file', 20)(req, res, async (err) => {
    if (err) {
      const navData = await getNavData();
      const errorMsg = err instanceof multer.MulterError
        ? (err.code === 'LIMIT_FILE_SIZE' ? '文件太大！单文件最大 1GB' : err.message)
        : err.message;
      return res.render('upload', { ...navData, error: errorMsg, currentCategory: null });
    }

    const files = req.files || [];
    if (files.length === 0) {
      const navData = await getNavData();
      return res.render('upload', { ...navData, error: '请选择至少一个文件', currentCategory: null });
    }

    const category = req.body.category;
    if (!CATEGORIES.includes(category)) {
      const navData = await getNavData();
      return res.render('upload', { ...navData, error: '请选择有效的分类', currentCategory: null });
    }

    const description = req.body.description?.trim() || '';
    const isPrivate = req.body.is_private === '1' ? 1 : 0;
    const userId = req.session?.userId || null;
    let successCount = 0;

    try {
      for (const file of files) {
        const title = req.body.title?.trim() || file.originalname.replace(/\.[^/.]+$/, '');
        const mediaType = detectType(file.mimetype, file.originalname);

        await db.run(
          `INSERT INTO media (title, description, category, type, filename, original_name, mime_type, file_size, is_private, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [title, description, category, mediaType, file.filename, file.originalname, file.mimetype, file.size, isPrivate, userId]
        );
        successCount++;
      }

      if (successCount > 1) {
        res.redirect(`/?uploaded=${successCount}`);
      } else {
        res.redirect('/?uploaded=1');
      }
    } catch (dbErr) {
      console.error(dbErr);
      const navData = await getNavData();
      const msg = successCount > 0
        ? `已上传 ${successCount} 个文件，部分保存失败`
        : '保存失败，请重试';
      res.render('upload', { ...navData, error: msg, currentCategory: null });
    }
  });
});

module.exports = router;
