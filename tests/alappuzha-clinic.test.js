const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapAlappuzhaClinic, FLAG } = require('../src/lib/bootstrapAlappuzhaClinic');
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
      findFirst: async ({ where }) => locations.find((l) => l.name.toLowerCase() === where.name.equals.toLowerCase()) || null,
      aggregate: async () => ({ _max: { sortOrder: Math.max(0, ...locations.map((l) => l.sortOrder || 0)) } }),
      create: async ({ data }) => { const row = { id: locations.length + 1, ...data }; locations.push(row); return row; },
      update: async ({ where, data }) => Object.assign(locations.find((l) => l.id === where.id), data),
    },
  };
}

test('creates the Alappuzha clinic when it is missing, last in the list', async () => {
  const db = database([{ id: 1, name: 'Kochi', sortOrder: 1 }, { id: 2, name: 'Kollam', sortOrder: 4 }]);
  await bootstrapAlappuzhaClinic(db);
  const clinic = db._locations.find((l) => l.name === 'Alappuzha');
  assert.equal(clinic.kind, 'clinic');
  assert.equal(clinic.published, true);
  assert.equal(clinic.sortOrder, 5);
  assert.equal(clinic.slug, 'alappuzha');
  assert.ok(!clinic.imageUrl, 'no stock photo');
});

test('marks an existing Alappuzha as a clinic and shows it, once only', async () => {
  const db = database([{ id: 1, name: 'alappuzha', kind: 'hospital', published: false, sortOrder: 2 }]);
  await bootstrapAlappuzhaClinic(db);
  assert.equal(db._locations[0].kind, 'clinic');
  assert.equal(db._locations[0].published, true);
  assert.equal(db._locations.length, 1);
  db._locations[0].kind = 'hospital'; // changed later in the admin
  await bootstrapAlappuzhaClinic(db);
  assert.equal(db._locations[0].kind, 'hospital');
  assert.ok(FLAG);
});
