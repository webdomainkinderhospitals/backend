const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapHomeBannerSwap, FLAG } = require('../src/lib/bootstrapHomeBannerSwap');
Module._load = load;

function database(rows) {
  return { setting: {
    rows,
    findUnique: async ({ where }) => rows.find((r) => r.key === where.key) || null,
    create: async ({ data }) => { rows.push(data); return data; },
    upsert: async ({ where, update, create }) => {
      const row = rows.find((r) => r.key === where.key);
      if (row) return Object.assign(row, update);
      rows.push(create); return create;
    },
  } };
}

test('hero slider is emptied and its artwork moves to the campaign banner', async () => {
  const db = database([
    { key: 'heroSlideImageUrl', value: 'https://x/banners/hero-comprehensive-care.webp' },
    { key: 'heroSlide2ImageUrl', value: 'https://x/banners/hero-ivf-future.webp' },
    { key: 'homePromoImageUrl', value: 'https://x/banners/home-ivf-mother.jpg' },
    { key: 'homePromo2ImageUrl', value: 'https://x/banners/kochi-ivf-father.jpg' },
  ]);
  await bootstrapHomeBannerSwap(db);
  const get = (k) => db.setting.rows.find((r) => r.key === k)?.value;
  for (const n of ['', '2', '3']) assert.equal(get(`heroSlide${n}ImageUrl`), '');
  assert.match(get('homePromoImageUrl'), /hero-comprehensive-care\.webp$/);
  assert.match(get('homePromo2ImageUrl'), /hero-ivf-future\.webp$/);
  assert.equal(get('homePromo3ImageUrl'), '');

  db.setting.rows.find((r) => r.key === 'homePromoImageUrl').value = 'edited later';
  await bootstrapHomeBannerSwap(db);
  assert.equal(get('homePromoImageUrl'), 'edited later', 'runs once');
  assert.ok(get(FLAG));
});
