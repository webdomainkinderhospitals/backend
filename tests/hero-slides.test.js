const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const load = Module._load;
Module._load = function (request) { if (request === './prisma') return {}; return load.apply(this, arguments); };
const { bootstrapHeroSlides, SLIDES, FLAG } = require('../src/lib/bootstrapHeroSlides');
Module._load = load;

function database(initial = {}) {
  const rows = Object.entries(initial).map(([key, value]) => ({ key, value }));
  return {
    rows,
    setting: {
      findUnique: async ({ where }) => rows.find((r) => r.key === where.key) || null,
      findMany: async ({ where }) => rows.filter((r) => where.key.in.includes(r.key)),
      upsert: async ({ where, update, create }) => {
        const row = rows.find((r) => r.key === where.key);
        if (row) Object.assign(row, update); else rows.push({ ...create });
      },
      create: async ({ data }) => { rows.push(data); return data; },
    },
  };
}
const value = (db, key) => db.rows.find((r) => r.key === key)?.value;

test('an empty slider gets both banners, as absolute URLs the admin can show', async () => {
  const db = database();
  await bootstrapHeroSlides(db);
  assert.match(value(db, 'heroSlideImageUrl'), /^https:\/\/.+\/banners\/hero-comprehensive-care\.webp$/);
  assert.match(value(db, 'heroSlide2ImageUrl'), /^https:\/\/.+\/banners\/hero-ivf-future\.webp$/);
  assert.equal(value(db, 'heroSlideLink'), '/book');
  assert.ok(value(db, 'heroSlideAlt') && value(db, 'heroSlide2Alt'), 'every banner says what it shows');
});

test('a slider someone has already set up is left exactly as it is', async () => {
  const own = 'https://storage.googleapis.com/kinder-media/onam-offer.jpg';
  const db = database({ heroSlide3ImageUrl: own });
  await bootstrapHeroSlides(db);
  assert.equal(value(db, 'heroSlideImageUrl'), undefined);
  assert.equal(value(db, 'heroSlide3ImageUrl'), own);
});

test('runs once, so a banner an editor removes stays removed', async () => {
  const db = database();
  await bootstrapHeroSlides(db);
  for (const r of db.rows) if (r.key.startsWith('heroSlide')) r.value = '';
  await bootstrapHeroSlides(db);
  assert.equal(value(db, 'heroSlideImageUrl'), '');
  assert.equal(db.rows.filter((r) => r.key === FLAG).length, 1);
});
