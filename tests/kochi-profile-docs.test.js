const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapKochiProfileDocs, DOCS } = require('../src/lib/bootstrapKochiProfileDocs');
Module._load = load;

const NAME = 'Brigadier (Dr.) A P Radhakrishnan';
function database(doctor, imported = true) {
  const rows = [{ id: 1, name: NAME, location: 'Kochi', imageUrl: '', fullBio: DOCS[0].earlier, ...doctor }];
  const settings = imported ? [{ key: 'bootstrap.kochiClientUpdates.v1', value: 'done' }] : [];
  const media = [];
  return {
    rows, settings, mediaRows: media,
    doctor: { findMany: async () => rows, update: async ({ where, data }) => Object.assign(rows.find((r) => r.id === where.id), data) },
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => settings.push(data),
    },
    media: { create: async ({ data }) => media.push(data) },
  };
}
const store = async (file) => ({ fileName: file.originalname, url: `/uploads/doctors/${file.originalname}` });

test('the fuller profile and the portrait from the document are added', async () => {
  const db = database();
  await bootstrapKochiProfileDocs(db, { store });
  const doc = db.rows[0];
  assert.match(doc.fullBio, /### Awards\n\n- Chief of Army Staff Commendation Card for Exemplary Service \(2006\)/);
  assert.match(doc.fullBio, /### Special interests\n\n- Critical care/);
  assert.match(doc.fullBio, /^Brigadier \(Dr\.\) A P Radhakrishnan is a Senior Consultant/);
  assert.equal(doc.imageUrl, '/uploads/doctors/brigadier-dr-a-p-radhakrishnan.jpg');
  assert.equal(db.mediaRows.length, 1);
});

test('a profile or photo set in the admin is kept, and it runs once', async () => {
  const db = database({ fullBio: 'Written by the hospital in the admin.', imageUrl: '/uploads/own.jpg' });
  await bootstrapKochiProfileDocs(db, { store });
  assert.equal(db.rows[0].fullBio, 'Written by the hospital in the admin.');
  assert.equal(db.rows[0].imageUrl, '/uploads/own.jpg');
  db.rows[0].fullBio = '';
  await bootstrapKochiProfileDocs(db, { store });
  assert.equal(db.rows[0].fullBio, '');
});

test('waits for the directory import', async () => {
  const db = database({}, false);
  await bootstrapKochiProfileDocs(db, { store });
  assert.equal(db.rows[0].imageUrl, '');
});
