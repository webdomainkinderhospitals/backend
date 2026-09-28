const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapKochiFirst, FLAG } = require('../src/lib/bootstrapKochiFirst');
Module._load = load;

function database(locations) {
  const settings = [];
  return {
    _locations: locations,
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => { settings.push(data); return data; },
    },
    location: {
      findMany: async () => [...locations].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
      update: async ({ where, data }) => Object.assign(locations.find((l) => l.id === where.id), data),
    },
  };
}
const order = (db) => [...db._locations].sort((a, b) => a.sortOrder - b.sortOrder).map((l) => l.name);

test('Kochi moves to the top and the rest keep their order', async () => {
  const db = database([
    { id: 1, name: 'Cherthala', sortOrder: 1 },
    { id: 2, name: 'Kochi', sortOrder: 2 },
    { id: 3, name: 'Aranmula', sortOrder: 3 },
    { id: 4, name: 'Kollam', sortOrder: 90 },
  ]);
  await bootstrapKochiFirst(db);
  assert.deepEqual(order(db), ['Kochi', 'Cherthala', 'Aranmula', 'Kollam']);
  assert.deepEqual(db._locations.map((l) => l.sortOrder), [2, 1, 3, 4]);
});

test('runs once, so a later reorder in the admin is kept', async () => {
  const db = database([{ id: 1, name: 'Cherthala', sortOrder: 1 }, { id: 2, name: 'Kochi', sortOrder: 2 }]);
  await bootstrapKochiFirst(db);
  db._locations[0].sortOrder = 0; // admin puts Cherthala back on top
  await bootstrapKochiFirst(db);
  assert.deepEqual(order(db), ['Cherthala', 'Kochi']);
  assert.ok(FLAG);
});
