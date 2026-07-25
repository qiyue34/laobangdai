# 📸 拾光影集 — 照片视频分享站

公共上传照片和视频的分享网站，支持分类浏览、瀑布流展示、私人空间。

## 功能

- 📤 公共上传（照片+视频，格式不限）
- 📂 四大分类：日常、话剧、游戏、风景
- 🏛️ 瀑布流布局 + 无限滚动
- 🔒 私人空间（注册后可上传私密内容）
- 🌸 花瓣飘落特效
- 🔊 轻快音效

## 快速启动

```bash
npm install
npm start
```

访问 http://localhost:3000

## 部署到 Railway

1. Fork 或推送此项目到 GitHub
2. 在 [Railway.app](https://railway.app) 创建新项目 → Deploy from GitHub repo
3. 添加一个 Volume，挂载路径 `/data` 和 `/uploads`
4. 可选：设置环境变量 `ADMIN_PASSWORD`
5. 部署完成即可访问
