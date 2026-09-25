const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapPromoBanners, FLAG } = require('../src/lib/bootstrapPromoBanners');
Module._load = load;

function database(locations, settings = []) {
  return {
    _locations: locations,
    _settings: settings,
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => { settings.push(data); return data; },
      upsert: async ({ where, create, update }) => {
        const row = settings.find((s) => s.key === where.key);
        if (row) return Object.assign(row, update);
        settings.push({ ...create });
        return create;
      },
    },
    location: {
      findFirst: async ({ where }) =>
        locations.find((l) => l.name.toLowerCase() === where.name.equals.toLowerCase()) || null,
      update: async ({ where, data }) => Object.assign(locations.find((l) => l.id === where.id), data),
    },
  };
}
const value = (db, key) => db._settings.find((s) => s.key === key)?.value;

test('fills the homepage banner and the Kochi banner once', async () => {
  const db = database([
    { id: 1, name: 'Kochi', promoImageUrl: '', promoAlt: '' },
    { id: 2, name: 'Cherthala', promoImageUrl: '', promoAlt: '' },
  ]);
  await bootstrapPromoBanners(db);
  assert.match(value(db, 'homePromoImageUrl'), /\/banners\/home-ivf-mother\.jpg$/);
  assert.ok(value(db, 'homePromoAlt'));
  assert.match(db._locations[0].promoImageUrl, /\/banners\/kochi-ivf-father\.jpg$/);
  assert.equal(db._locations[1].promoImageUrl, '');
  assert.equal(value(db, FLAG), 'done');
});

test('never overrides a banner set in the admin, nor runs twice', async () => {
  const db = database(
    [{ id: 1, name: 'Kochi', promoImageUrl: 'https://cdn/own.jpg', promoAlt: 'Own' }],
    [{ key: 'homePromoImageUrl', value: 'https://cdn/home.jpg' }]
  );
  await bootstrapPromoBanners(db);
  assert.equal(value(db, 'homePromoImageUrl'), 'https://cdn/home.jpg');
  assert.equal(db._locations[0].promoImageUrl, 'https://cdn/own.jpg');

  // A banner cleared after the first run stays cleared.
  db._locations[0].promoImageUrl = '';
  await bootstrapPromoBanners(db);
  assert.equal(db._locations[0].promoImageUrl, '');
});
