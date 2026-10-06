const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma' || request === '../lib/prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapGalleryFilm, FILM, FLAG } = require('../src/lib/bootstrapGalleryFilm');
const { COLLECTIONS } = require('../src/routes/collections');
Module._load = load;

function database() {
  const settings = [];
  const items = [];
  const media = [];
  return {
    settings, items, mediaRows: media,
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => {
        if (settings.some((s) => s.key === data.key)) throw new Error('Unique constraint failed');
        settings.push({ ...data });
      },
      update: async ({ where, data }) => Object.assign(settings.find((s) => s.key === where.key), data),
      delete: async ({ where }) => settings.splice(settings.findIndex((s) => s.key === where.key), 1),
    },
    galleryItem: { create: async ({ data }) => items.push(data) },
    media: { create: async ({ data }) => media.push(data) },
  };
}
const store = async (file) => ({ fileName: `gallery/${file.originalname}`, url: `/uploads/gallery/${file.originalname}` });

test('the film and its cover are in the repository, at a size the web can stream', () => {
  const dir = path.join(__dirname, '..', 'content', 'gallery');
  const film = fs.statSync(path.join(dir, FILM.video)).size;
  assert.ok(film > 1e6 && film < 30 * 1024 * 1024);
  assert.ok(fs.existsSync(path.join(dir, FILM.poster)));
});

test('the Water Birthing film becomes the featured home-page video, once', async () => {
  const db = database();
  await bootstrapGalleryFilm(db, { store });
  assert.equal(db.items.length, 1);
  const [film] = db.items;
  assert.equal(film.kind, 'video');
  assert.equal(film.mediaUrl, '/uploads/gallery/water-birthing.mp4');
  assert.equal(film.posterUrl, '/uploads/gallery/water-birthing-poster.webp');
  assert.ok(film.featured && film.showOnHome && film.published);
  assert.equal(db.mediaRows.length, 2);
  assert.equal(db.settings.find((s) => s.key === FLAG).value, 'done');
  await bootstrapGalleryFilm(db, { store });
  assert.equal(db.items.length, 1);
});

test('a failed upload releases the claim so a later start tries again', async () => {
  const db = database();
  await assert.rejects(bootstrapGalleryFilm(db, { store: async () => { throw new Error('storage down'); } }), /storage down/);
  assert.equal(db.settings.length, 0);
  await bootstrapGalleryFilm(db, { store });
  assert.equal(db.items.length, 1);
});

test('another instance already adding the film is left to it', async () => {
  const db = database();
  db.settings.push({ key: FLAG, value: 'adding' });
  await bootstrapGalleryFilm(db, { store });
  assert.equal(db.items.length, 0);
});

test('the gallery is an admin-editable collection', () => {
  const cfg = COLLECTIONS.gallery;
  assert.equal(cfg.model, 'galleryItem');
  for (const f of ['title', 'caption', 'kind', 'mediaUrl', 'posterUrl', 'location', 'showOnHome', 'featured', 'sortOrder', 'published']) {
    assert.ok(cfg.fields.includes(f), f);
  }
  assert.deepEqual(cfg.required, ['title', 'mediaUrl']);
});
