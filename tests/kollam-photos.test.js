const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapKollamDoctorPhotos, PHOTOS } = require('../src/lib/bootstrapKollamDoctorPhotos');
Module._load = load;

function database(doctors) {
  const settings = [];
  const stored = [];
  return {
    doctors, settings, stored,
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => settings.push(data),
    },
    media: { create: async ({ data }) => stored.push(data) },
    doctor: {
      findMany: async () => doctors,
      update: async ({ where, data }) => Object.assign(doctors.find((d) => d.id === where.id), data),
    },
  };
}
let n = 0;
const store = async (file) => ({ fileName: file.originalname, url: `https://media.test/${file.originalname}?${++n}` });

test('each Kollam doctor gets the photo the hospital named for them', async () => {
  const db = database([
    { id: 1, name: 'Dr. Reshmy R Pillai', location: 'Kollam', imageUrl: '' },
    { id: 2, name: 'Dr. Manju V K', location: 'Kollam', imageUrl: 'https://admin.upload/manju.jpg' },
    { id: 3, name: 'Dr. Karthik Prakash', location: 'Kollam', imageUrl: '' },
    { id: 4, name: 'Dr. Deepthi Prem', location: 'Kochi', imageUrl: '' },
  ]);
  await bootstrapKollamDoctorPhotos(db, { store });
  assert.match(db.doctors[0].imageUrl, /reshmy-r-pillai\.jpg/);
  assert.equal(db.doctors[1].imageUrl, 'https://admin.upload/manju.jpg', 'a photo uploaded in the admin is kept');
  assert.equal(db.doctors[2].imageUrl, '', 'no photo was supplied for this doctor');
  assert.equal(db.doctors[3].imageUrl, '', 'a doctor at another hospital is not touched');
  // Every supplied photo except the kept one is in the media library, ready to use.
  assert.equal(db.stored.length, PHOTOS.length - 1);
});

test('a photo waits for its doctor to be added, then is attached once', async () => {
  const db = database([{ id: 1, name: 'Dr. Reshmy R Pillai', location: 'Kollam', imageUrl: '' }]);
  await bootstrapKollamDoctorPhotos(db, { store });
  const before = db.stored.length;
  db.doctors.push({ id: 9, name: 'Dr. Shoji Thomas', location: 'Kollam', imageUrl: '' });
  await bootstrapKollamDoctorPhotos(db, { store });
  assert.match(db.doctors[1].imageUrl, /shoji\.jpg/);
  assert.equal(db.stored.length, before, 'the photo is not uploaded a second time');
  db.doctors[0].imageUrl = 'https://admin.upload/new.jpg';
  await bootstrapKollamDoctorPhotos(db, { store });
  assert.equal(db.doctors[0].imageUrl, 'https://admin.upload/new.jpg', 'a later admin change is never undone');
});

test('every named photo file is in the deploy', () => {
  const fs = require('fs');
  for (const p of PHOTOS) assert.ok(fs.existsSync(`content/doctor-photos/kollam/${p.file}`), p.file);
});
