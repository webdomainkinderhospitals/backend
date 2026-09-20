const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapElevations, ELEVATIONS, FLAG } = require('../src/lib/bootstrapElevations');
Module._load = load;

const STOCK = 'https://images.unsplash.com/photo-1586773860418?auto=format&w=800';

function database(locations) {
  const settings = [];
  return {
    _locations: locations,
    setting: {
      rows: settings,
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => { settings.push(data); return data; },
    },
    location: {
      findFirst: async ({ where }) =>
        locations.find(
          (l) => l.name.toLowerCase() === where.name.equals.toLowerCase()
        ) || null,
      update: async ({ where, data }) => {
        const row = locations.find((l) => l.id === where.id);
        Object.assign(row, data);
        return row;
      },
    },
  };
}

test('every centre with an elevation gets it on both the card and the banner', async () => {
  const db = database([
    { id: 1, name: 'Cherthala', imageUrl: STOCK, heroImageUrl: STOCK },
    { id: 2, name: 'Kochi', imageUrl: STOCK, heroImageUrl: '' },
    { id: 3, name: 'Kollam', imageUrl: '', heroImageUrl: '' },
    { id: 4, name: 'Aranmula', imageUrl: STOCK, heroImageUrl: STOCK },
    { id: 5, name: 'Bengaluru', imageUrl: STOCK, heroImageUrl: STOCK },
  ]);
  await bootstrapElevations(db);

  for (const [name, file] of Object.entries(ELEVATIONS)) {
    const loc = db._locations.find((l) => l.name === name);
    const expected = new RegExp(`/hospitals/${file}\\.webp$`);
    assert.match(loc.imageUrl, expected, `${name} card`);
    assert.match(loc.heroImageUrl, expected, `${name} banner`);
  }
  // A centre with no elevation is left exactly as it was.
  const blr = db._locations.find((l) => l.name === 'Bengaluru');
  assert.equal(blr.imageUrl, STOCK);
  assert.equal(blr.heroImageUrl, STOCK);
});

test('an install that already ran v1 still gets its banners filled', async () => {
  const card = 'https://frontend.example/hospitals/kochi.webp';
  const db = database([{ id: 1, name: 'Kochi', imageUrl: card, heroImageUrl: STOCK }]);
  await bootstrapElevations(db);
  assert.equal(db._locations[0].imageUrl, card, 'card left as v1 set it');
  assert.match(db._locations[0].heroImageUrl, /\/hospitals\/kochi\.webp$/, 'banner filled');
});

test("an editor's own upload is never replaced, on either field", async () => {
  const own = 'https://storage.googleapis.com/kinder-media/cherthala-front.jpg';
  const ownBanner = 'https://storage.googleapis.com/kinder-media/cherthala-wide.jpg';
  const db = database([
    { id: 1, name: 'Cherthala', imageUrl: own, heroImageUrl: ownBanner },
    { id: 2, name: 'Kochi', imageUrl: STOCK, heroImageUrl: STOCK },
  ]);
  await bootstrapElevations(db);
  assert.equal(db._locations[0].imageUrl, own, 'uploaded card kept');
  assert.equal(db._locations[0].heroImageUrl, ownBanner, 'uploaded banner kept');
  assert.match(db._locations[1].imageUrl, /\/hospitals\/kochi\.webp$/);
  assert.match(db._locations[1].heroImageUrl, /\/hospitals\/kochi\.webp$/);
});

test('it runs once and is a no-op afterwards', async () => {
  const db = database([{ id: 1, name: 'Kochi', imageUrl: STOCK }]);
  await bootstrapElevations(db);
  assert.equal(db.setting.rows.filter((s) => s.key === FLAG).length, 1);

  db._locations[0].imageUrl = STOCK;   // as if someone put a stock photo back
  await bootstrapElevations(db);
  assert.equal(db._locations[0].imageUrl, STOCK, 'flag stops a second pass');
});

test('a centre missing from the database is skipped, not created', async () => {
  const db = database([{ id: 1, name: 'Kochi', imageUrl: STOCK }]);
  await bootstrapElevations(db);
  assert.equal(db._locations.length, 1);
});
