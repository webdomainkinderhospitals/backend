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

test('every centre with an elevation gets it while still on stock photography', async () => {
  const db = database([
    { id: 1, name: 'Cherthala', imageUrl: STOCK },
    { id: 2, name: 'Kochi', imageUrl: STOCK },
    { id: 3, name: 'Kollam', imageUrl: '' },
    { id: 4, name: 'Aranmula', imageUrl: STOCK },
    { id: 5, name: 'Bengaluru', imageUrl: STOCK },
  ]);
  await bootstrapElevations(db);

  for (const [name, file] of Object.entries(ELEVATIONS)) {
    const loc = db._locations.find((l) => l.name === name);
    assert.match(loc.imageUrl, new RegExp(`/hospitals/${file}\\.webp$`), name);
  }
  // A centre with no elevation is left exactly as it was.
  assert.equal(db._locations.find((l) => l.name === 'Bengaluru').imageUrl, STOCK);
});

test("an editor's own upload is never replaced", async () => {
  const own = 'https://storage.googleapis.com/kinder-media/cherthala-front.jpg';
  const db = database([
    { id: 1, name: 'Cherthala', imageUrl: own },
    { id: 2, name: 'Kochi', imageUrl: STOCK },
  ]);
  await bootstrapElevations(db);
  assert.equal(db._locations[0].imageUrl, own, 'uploaded photo kept');
  assert.match(db._locations[1].imageUrl, /\/hospitals\/kochi\.webp$/);
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
