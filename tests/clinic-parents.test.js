const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapClinicParents, FLAG } = require('../src/lib/bootstrapClinicParents');
Module._load = load;

function database(locations) {
  const settings = [];
  return {
    locations,
    settings,
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => settings.push(data),
    },
    location: {
      findMany: async ({ where }) => locations.filter((l) => l.kind === where.kind),
      update: async ({ where, data }) => Object.assign(locations.find((l) => l.id === where.id), data),
    },
  };
}

test('Kinder Alappuzha is listed under Cherthala, once', async () => {
  const db = database([
    { id: 1, name: 'Cherthala', kind: 'hospital', parentHospital: '' },
    { id: 2, name: 'Alappuzha', slug: 'alappuzha', kind: 'clinic', parentHospital: '' },
  ]);
  await bootstrapClinicParents(db);
  assert.equal(db.locations[1].parentHospital, 'Cherthala');
  assert.equal(db.locations[0].parentHospital, '');
  assert.ok(db.settings.find((s) => s.key === FLAG));

  db.locations[1].parentHospital = '';
  await bootstrapClinicParents(db);
  assert.equal(db.locations[1].parentHospital, '', 'an admin edit after the first run is kept');
});

test('a clinic the admin already assigned is left alone', async () => {
  const db = database([{ id: 2, name: 'Alappuzha', kind: 'clinic', parentHospital: 'Kochi' }]);
  await bootstrapClinicParents(db);
  assert.equal(db.locations[0].parentHospital, 'Kochi');
});
