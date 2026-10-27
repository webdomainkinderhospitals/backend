const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapGroupHospitals, FLAG } = require('../src/lib/bootstrapGroupHospitals');
Module._load = load;

test('Singapore and Bengaluru come off the site; the four hospitals lead in order, once', async () => {
  const locations = ['Kochi', 'Cherthala', 'Bengaluru', 'Alappuzha', 'Singapore', 'Kollam', 'Aranmula']
    .map((name, i) => ({ id: i + 1, name, sortOrder: i + 1, published: true, kind: name === 'Alappuzha' ? 'clinic' : 'hospital' }));
  locations[6].published = false;
  const settings = [];
  const db = {
    location: {
      findMany: async () => [...locations].sort((a, b) => a.sortOrder - b.sortOrder),
      update: async ({ where, data }) => Object.assign(locations.find((l) => l.id === where.id), data),
    },
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => settings.push(data),
    },
  };
  await bootstrapGroupHospitals(db);
  const shown = locations.filter((l) => l.published && l.kind !== 'clinic').sort((a, b) => a.sortOrder - b.sortOrder);
  assert.deepEqual(shown.map((l) => l.name), ['Cherthala', 'Kochi', 'Aranmula', 'Kollam']);
  assert(settings.some((s) => s.key === FLAG));

  locations.find((l) => l.name === 'Singapore').published = true; // an admin change afterwards is kept
  await bootstrapGroupHospitals(db);
  assert.equal(locations.find((l) => l.name === 'Singapore').published, true);
});
