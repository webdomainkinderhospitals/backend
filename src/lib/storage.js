// Where uploaded (and imported) images live. Production: Google Cloud Storage
// (set GCS_BUCKET). Development fallback: a local ./uploads folder served at
// /uploads. Shared by the admin's upload route and the startup imports.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function makeName(original) {
  const ext = path.extname(original).toLowerCase() || '.jpg';
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

// file: { buffer, originalname, mimetype }
async function storeFile(file, folder) {
  const fileName = `${folder}/${makeName(file.originalname)}`;
  if (process.env.GCS_BUCKET) {
    const { Storage } = require('@google-cloud/storage');
    const bucket = new Storage().bucket(process.env.GCS_BUCKET);
    const blob = bucket.file(fileName);
    await blob.save(file.buffer, {
      contentType: file.mimetype,
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    });
    // Bucket must have public read (or be behind Cloudflare/CDN)
    const base = process.env.GCS_PUBLIC_BASE || `https://storage.googleapis.com/${process.env.GCS_BUCKET}`;
    return { fileName, url: `${base}/${fileName}` };
  }
  // Local dev fallback
  const dir = path.join(__dirname, '..', '..', 'uploads', folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, path.basename(fileName)), file.buffer);
  const base = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 8080}`;
  return { fileName, url: `${base}/uploads/${fileName}` };
}

module.exports = { storeFile, makeName };
