const { test } = require('node:test');
const assert = require('node:assert/strict');

// Driven against an in-memory stand-in for the database, as in the other
// bootstrap tests.
const Module = require('module');
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { joinAranmulaDoctors, FLAG_V4 } = require('../src/lib/bootstrapAranmula');
Module._load = load;

function database(doctors = []) {
  const rows = { doctor: doctors.map((d, i) => ({ id: i + 1, sortOrder: i + 1, ...d })), setting: [] };
  const table = (name) => ({
    findMany: async () => rows[name],
    findUnique: async ({ where }) => rows[name].find((r) => r.key === where.key) || null,
    create: async ({ data }) => { const row = { id: rows[name].length + 1, ...data }; rows[name].push(row); return row; },
    update: async ({ where, data }) => Object.assign(rows[name].find((r) => r.id === where.id), data),
  });
  return { rows, doctor: table('doctor'), setting: table('setting') };
}

test('doctors not yet in the database are created at Aranmula', async () => {
  const db = database([{ name: 'Dr. Ganga M P', location: 'Aranmula' }]);
  await joinAranmulaDoctors(db);
  const added = db.rows.doctor.slice(1);
  assert.deepEqual(added.map((d) => [d.name, d.location, d.speciality]), [
    ['Dr. Chris Placid', 'Aranmula', 'Paediatrics'],
    ['Dr. Simi Thomas', 'Aranmula', 'Obstetrics & Gynaecology'],
  ]);
  assert.equal(added[0].bio, 'MBBS, MD (Pediatrics), Fellowship in Neonatology');
  assert.ok(db.rows.setting.some((s) => s.key === FLAG_V4));
});

test('doctors already in the database get Aranmula added, once', async () => {
  const db = database([
    { name: 'Dr Chris Placid', location: 'Kochi' }, { name: 'Dr. Charlie Cherian', location: 'Cherthala, Alappuzha' },
    { name: 'Dr. Simi Thomas K', location: 'Aranmula' },
  ]);
  await joinAranmulaDoctors(db);
  await joinAranmulaDoctors(db);
  assert.deepEqual(db.rows.doctor.map((d) => d.location), ['Kochi, Aranmula', 'Cherthala, Alappuzha, Aranmula', 'Aranmula']);
});

test('the step runs once, so later admin changes stay', async () => {
  const db = database();
  await joinAranmulaDoctors(db);
  db.rows.doctor.splice(0); // deleted in the admin
  await joinAranmulaDoctors(db);
  assert.equal(db.rows.doctor.length, 0);
});
