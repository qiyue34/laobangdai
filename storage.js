// Cloudflare R2 存储模块
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

const BUCKET = process.env.R2_BUCKET || 'laobangdai';

let client = null;

function getClient() {
  if (client) return client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY;
  const secretKey = process.env.R2_SECRET_KEY;

  if (!accountId || !accessKey || !secretKey) {
    console.warn('⚠️ R2 未配置，使用本地存储');
    return null;
  }

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });
  return client;
}

// 上传文件到 R2
async function upload(filename, fileBuffer, mimeType) {
  const c = getClient();
  if (!c) return null;

  const key = `uploads/${filename}`;
  await c.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  }));
  return key;
}

// 删除文件
async function remove(filename) {
  const c = getClient();
  if (!c) return;

  const key = `uploads/${filename}`;
  await c.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

// 获取公开访问 URL（有效期 7 天）
async function getUrl(filename) {
  const c = getClient();
  if (!c) return null;

  const key = `uploads/${filename}`;
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return await getSignedUrl(c, command, { expiresIn: 604800 });
}

module.exports = { upload, remove, getUrl };
