const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapKochiProfileDocs, DOCS } = require('../src/lib/bootstrapKochiProfileDocs');
const { DIRECTORY, personKey } = require('../src/lib/bootstrapKochiUpdates');
Module._load = load;
const PROFILES = require('../src/lib/data/kochiDoctorProfiles.json');
const EARLIER = require('../src/lib/data/kochiDoctorProfilesEarlier.json');

const listed = (name) => DIRECTORY.find((d) => d.name === name);
function database(doctors, imported = true) {
  const rows = doctors.map((d, i) => ({ id: i + 1, location: 'Kochi', imageUrl: '', reviewNotes: '', bio: listed(d.name)?.qualifications || '', fullBio: '', ...d }));
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

test('every document belongs to a directory doctor, and every photo is in the repository', () => {
  for (const entry of DOCS) {
    assert.ok(DIRECTORY.some((d) => personKey(d.name) === personKey(entry.name)), entry.name);
    if (entry.photo) assert.ok(fs.existsSync(path.join(__dirname, '..', 'content', 'doctor-photos', 'kochi', entry.photo)), entry.photo);
    if (entry.profile) assert.ok(PROFILES[entry.name], `profile for ${entry.name}`);
  }
  assert.equal(new Set(DOCS.map((d) => personKey(d.name))).size, DOCS.length);
});

test('the profile from the document replaces the imported one, with the portrait', async () => {
  const db = database([
    { name: 'Brigadier (Dr.) A P Radhakrishnan', fullBio: EARLIER['Brigadier (Dr.) A P Radhakrishnan'] },
    { name: 'Dr. Sooraj Menon R', fullBio: listed('Dr. Sooraj Menon R').profile, imageUrl: '/uploads/doctors/old.jpg' },
    { name: 'Dr. Rekha B Nair' },
  ]);
  await bootstrapKochiProfileDocs(db, { store });
  const [radha, sooraj, rekha] = db.rows;
  assert.match(radha.fullBio, /### Awards\n\n- Chief of Army Staff Commendation Card for Exemplary Service \(2006\)/);
  assert.match(sooraj.fullBio, /### Experience\n\n- Lakshmi Hospital, Ernakulam & Aluva/);
  assert.equal(sooraj.imageUrl, '/uploads/doctors/dr-sooraj-menon-r.jpg');
  assert.match(sooraj.reviewNotes, /Previous photo: \/uploads\/doctors\/old\.jpg/);
  assert.equal(rekha.fullBio, '', 'no written profile in her document');
  assert.equal(rekha.imageUrl, '/uploads/doctors/dr-rekha-b-nair.jpg');
  assert.equal(db.mediaRows.length, 3);
});

test('qualifications the document adds are applied unless edited in the admin', async () => {
  const db = database([{ name: 'Dr. Nasna Majeed' }, { name: 'Dr. Shine Shukoor', bio: 'Edited in the admin' }]);
  await bootstrapKochiProfileDocs(db, { store });
  assert.equal(db.rows[0].bio, 'MBBS, DGO, DNB, FAMS, DAMS, FIH, MCCG');
  assert.equal(db.rows[1].bio, 'Edited in the admin');
});

test('a profile edited in the admin is kept, and each doctor is handled once', async () => {
  const db = database([{ name: 'Dr. Manoj M', fullBio: 'Written by the hospital in the admin.' }]);
  await bootstrapKochiProfileDocs(db, { store });
  assert.equal(db.rows[0].fullBio, 'Written by the hospital in the admin.');
  db.rows[0].imageUrl = '/uploads/doctors/chosen-in-admin.jpg';
  await bootstrapKochiProfileDocs(db, { store });
  assert.equal(db.rows[0].imageUrl, '/uploads/doctors/chosen-in-admin.jpg');
});

test('waits for the directory import', async () => {
  const db = database([{ name: 'Dr. Manoj M' }], false);
  await bootstrapKochiProfileDocs(db, { store });
  assert.equal(db.rows[0].imageUrl, '');
});
