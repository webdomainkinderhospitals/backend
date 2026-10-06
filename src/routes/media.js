// Image and video uploads. Production: Google Cloud Storage (set GCS_BUCKET).
// Development fallback: local ./uploads folder served at /uploads.
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { storeFile } = require('../lib/storage');

const router = express.Router();

const IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'];
// Videos for the Gallery. Cloud Run accepts requests up to 32 MB, so a video
// may be up to 30 MB; a longer film is better added as a YouTube link.
const VIDEOS = ['video/mp4', 'video/webm', 'video/quicktime'];
const IMAGE_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 30 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: VIDEO_MAX },
  fileFilter: (req, file, cb) =>
    IMAGES.includes(file.mimetype) || VIDEOS.includes(file.mimetype)
      ? cb(null, true)
      : cb(Object.assign(new Error('Only images (JPG, PNG, WebP) and videos (MP4, WebM, MOV) can be uploaded'), { status: 400 })),
});
// Multer's own limit error, in words the team can act on.
function receive(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'That file is larger than 30 MB. Shorten or compress the video, or add it as a YouTube link.' });
    }
    if (err) return res.status(err.status || 400).json({ error: err.message });
    if (req.file && IMAGES.includes(req.file.mimetype) && req.file.size > IMAGE_MAX) {
      return res.status(413).json({ error: 'Images can be up to 10 MB. Please use a smaller photo.' });
    }
    next();
  });
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const where = req.query.folder ? { folder: String(req.query.folder) } : {};
    res.json(await prisma.media.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }));
  } catch (e) { next(e); }
});

router.post('/', requireAuth, receive, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name must be "file")' });
    const folder = String(req.body.folder || 'general').replace(/[^a-z0-9_-]/gi, '') || 'general';
    const { fileName, url } = await storeFile(req.file, folder);
    const media = await prisma.media.create({
      data: {
        fileName,
        url,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        folder,
      },
    });
    res.status(201).json(media);
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const media = await prisma.media.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!media) return res.status(404).json({ error: 'Not found' });
    if (process.env.GCS_BUCKET) {
      const { Storage } = require('@google-cloud/storage');
      await new Storage().bucket(process.env.GCS_BUCKET).file(media.fileName).delete({ ignoreNotFound: true });
    } else {
      const local = path.join(__dirname, '..', '..', 'uploads', media.fileName);
      if (fs.existsSync(local)) fs.unlinkSync(local);
    }
    await prisma.media.delete({ where: { id: media.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
