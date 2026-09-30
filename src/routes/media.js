// Image uploads. Production: Google Cloud Storage (set GCS_BUCKET).
// Development fallback: local ./uploads folder served at /uploads.
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { storeFile } = require('../lib/storage');

const router = express.Router();

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed')),
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const where = req.query.folder ? { folder: String(req.query.folder) } : {};
    res.json(await prisma.media.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }));
  } catch (e) { next(e); }
});

router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
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
