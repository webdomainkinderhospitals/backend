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
const { bootstrapKinderNews, STORIES, FLAG } = require('../src/lib/bootstrapKinderNews');
const { COLLECTIONS } = require('../src/routes/collections');
Module._load = load;

function database(existing = []) {
  const settings = [];
  const posts = [...existing];
  const media = [];
  return {
    settings, posts, mediaRows: media,
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => {
        if (settings.some((s) => s.key === data.key)) throw new Error('Unique constraint failed');
        settings.push({ ...data });
      },
      update: async ({ where, data }) => Object.assign(settings.find((s) => s.key === where.key), data),
      delete: async ({ where }) => settings.splice(settings.findIndex((s) => s.key === where.key), 1),
    },
    newsPost: {
      findUnique: async ({ where }) => posts.find((p) => p.slug === where.slug) || null,
      create: async ({ data }) => posts.push(data),
    },
    media: { create: async ({ data }) => media.push(data) },
  };
}
const store = async (file) => ({ fileName: `news/${file.originalname}`, url: `https://cdn.test/news/${file.originalname}` });

test('all 21 stories are in the repository with their photos', () => {
  assert.equal(STORIES.length, 21);
  const slugs = new Set(STORIES.map((s) => s.slug));
  assert.equal(slugs.size, 21);
  for (const s of STORIES) {
    assert.ok(s.title && s.excerpt && s.body && /^\d{4}-\d{2}-\d{2}$/.test(s.date), s.slug);
    for (const f of [s.cover, ...s.photos]) assert.ok(fs.existsSync(path.join(__dirname, '..', 'content', 'news', s.slug, f)), `${s.slug}/${f}`);
  }
});

test('each story becomes a published News post with its cover and gallery, once', async () => {
  const db = database();
  await bootstrapKinderNews(db, { store });
  assert.equal(db.posts.length, 21);
  const record = db.posts.find((p) => p.slug === 'tharattazhaku-season-3-world-record');
  assert.equal(record.imageUrl, 'https://cdn.test/news/tharattazhaku-season-3-world-record-cover.webp');
  assert.equal(record.galleryUrls.split('\n').length, STORIES.find((s) => s.slug === record.slug).photos.length);
  assert.equal(record.location, 'Kochi');
  assert.equal(record.publishedAt.toISOString(), '2024-05-12T04:30:00.000Z');
  assert.ok(record.published);
  const photos = STORIES.reduce((n, s) => n + 1 + s.photos.length, 0);
  assert.equal(db.mediaRows.length, photos);
  assert.ok(STORIES.every((s) => db.settings.find((x) => x.key === FLAG(s.slug)).value === 'done'));
  await bootstrapKinderNews(db, { store });
  assert.equal(db.posts.length, 21);
});

test('a story already added by hand is left alone', async () => {
  const db = database([{ slug: 'mom-mix-season-3', title: 'Edited in the admin' }]);
  await bootstrapKinderNews(db, { store });
  assert.equal(db.posts.length, 21);
  assert.equal(db.posts.find((p) => p.slug === 'mom-mix-season-3').title, 'Edited in the admin');
});

test('a failed upload releases the claim so a later start tries again', async () => {
  const db = database();
  let calls = 0;
  const flaky = async (file) => { if (++calls === 2) throw new Error('storage down'); return store(file); };
  await assert.rejects(bootstrapKinderNews(db, { store: flaky }));
  assert.equal(db.settings.find((s) => s.key === FLAG(STORIES[0].slug)), undefined);
  await bootstrapKinderNews(db, { store });
  assert.equal(db.posts.length, 21);
});

test('the admin can edit a story\'s gallery', () => {
  assert.ok(COLLECTIONS.news.fields.includes('galleryUrls'));
});
