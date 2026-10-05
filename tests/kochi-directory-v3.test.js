const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapKochiDirectoryV3, FLAG } = require('../src/lib/bootstrapKochiDirectoryV3');
Module._load = load;

function database(doctors, imported = true) {
  const rows = doctors.map((d, i) => ({ id: i + 1, ...d }));
  const settings = imported ? [{ key: 'bootstrap.kochiClientUpdates.v1', value: 'done' }] : [];
  return {
    rows, settings,
    doctor: {
      findMany: async () => rows,
      update: async ({ where, data }) => Object.assign(rows.find((r) => r.id === where.id), data),
    },
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => settings.push(data),
    },
  };
}

const reju = (extra = {}) => ({
  name: 'Dr. Reju Joseph Thomas', designation: 'Paediatric Surgery & Paediatric Urology',
  speciality: 'Paediatric Surgery', location: 'Kochi', ...extra,
});

test('Dr. Reju Joseph Thomas moves to Paediatric Surgery & Paediatric Urology', async () => {
  const db = database([reju()]);
  await bootstrapKochiDirectoryV3(db);
  assert.equal(db.rows[0].speciality, 'Paediatric Surgery & Paediatric Urology');
  assert.equal(db.rows[0].designation, '');
  assert.ok(db.settings.some((s) => s.key === FLAG));
});

test('values edited in the admin are kept', async () => {
  const db = database([reju({ designation: 'Senior Consultant', speciality: 'Paediatric Surgery' })]);
  await bootstrapKochiDirectoryV3(db);
  assert.equal(db.rows[0].designation, 'Senior Consultant');
  assert.equal(db.rows[0].speciality, 'Paediatric Surgery & Paediatric Urology');
});

test('waits for the directory import, and runs once', async () => {
  const early = database([reju()], false);
  await bootstrapKochiDirectoryV3(early);
  assert.equal(early.rows[0].speciality, 'Paediatric Surgery');
  const db = database([reju()]);
  await bootstrapKochiDirectoryV3(db);
  db.rows[0].speciality = 'Paediatric Surgery';
  await bootstrapKochiDirectoryV3(db);
  assert.equal(db.rows[0].speciality, 'Paediatric Surgery');
});
