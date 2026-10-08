const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma' || request === './storage') return {};
  return load.apply(this, arguments);
};
const { bootstrapCherthalaDoctorPhotos, doctorFor, PHOTOS } = require('../src/lib/bootstrapCherthalaDoctorPhotos');
Module._load = load;

// The Cherthala doctors as listed on the site.
const CHERTHALA = ['Dr. Ananthen K S', 'Dr. Rahul Kh', 'Dr. Vidya Prasad', 'Dr. Vijitha A S', 'Dr. Jeevan Raj C N',
  'Dr. Kevin Antony George', 'Dr. Neena Ananthen', 'Dr. Sudha Sajeevan', 'Dr. Thankachy Roy', 'Dr. Reshmy J R', 'Dr. Shilpa Govind']
  .map((name, i) => ({ id: i + 1, name, location: 'Cherthala', imageUrl: '', reviewNotes: '' }));

function database(doctors) {
  const settings = []; const stored = [];
  return {
    doctors, stored,
    doctor: {
      findMany: async () => doctors,
      update: async ({ where, data }) => Object.assign(doctors.find((d) => d.id === where.id), data),
    },
    media: { create: async ({ data }) => stored.push(data) },
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => settings.push(data),
    },
  };
}
let n = 0;
const store = async (file) => ({ fileName: file.originalname, url: `https://media.test/${file.originalname}?${++n}` });

test('each captioned portrait finds its Cherthala doctor', () => {
  const match = Object.fromEntries(PHOTOS.map((p) => [p.name, doctorFor(p, CHERTHALA)?.name || null]));
  assert.equal(match['Dr Jeevan Raj CN'], 'Dr. Jeevan Raj C N');
  assert.equal(match['Dr Kevin George'], 'Dr. Kevin Antony George');
  assert.equal(match['Dr Rahul KH'], 'Dr. Rahul Kh');
  assert.equal(match['Dr Ananthen K S'], 'Dr. Ananthen K S');
  assert.equal(match['Dr Neena Ananthen'], 'Dr. Neena Ananthen');
  for (const missing of ['Dr Ashby Joseph', 'Dr Meera Mohan', 'Dr Remya']) assert.equal(match[missing], null, missing);
  assert.equal(Object.values(match).filter(Boolean).length, 9);
});

test('portraits are set once, replacing the old photo (kept in review notes), and wait for new doctors', async () => {
  const doctors = CHERTHALA.map((d) => ({ ...d }));
  doctors[0].imageUrl = 'https://old/ananthen.jpg';
  doctors.push({ id: 50, name: 'Dr. Reshmy R Pillai', location: 'Kollam', imageUrl: '' });
  const db = database(doctors);
  await bootstrapCherthalaDoctorPhotos(db, { store });
  assert.match(doctors[0].imageUrl, /cherthala-ananthen-k-s\.jpg/);
  assert.match(doctors[0].reviewNotes, /https:\/\/old\/ananthen\.jpg/);
  assert.equal(doctors.find((d) => d.id === 50).imageUrl, '', 'another hospital\'s doctor is untouched');
  assert.equal(doctors.find((d) => d.name === 'Dr. Vidya Prasad').imageUrl, '', 'no portrait was supplied');
  assert.equal(db.stored.length, PHOTOS.length, 'every portrait is in the media library');

  doctors[0].imageUrl = 'https://admin.upload/new.jpg';
  doctors.push({ id: 60, name: 'Dr. Meera Mohan', location: 'Cherthala', imageUrl: '' });
  await bootstrapCherthalaDoctorPhotos(db, { store });
  assert.equal(doctors[0].imageUrl, 'https://admin.upload/new.jpg', 'a later admin change is kept');
  assert.match(doctors.find((d) => d.id === 60).imageUrl, /meera-mohan\.jpg/, 'a waiting portrait is attached once the doctor is added');
  assert.equal(db.stored.length, PHOTOS.length, 'nothing is uploaded twice');
});

test('every portrait file is in the deploy', () => {
  for (const p of PHOTOS) assert.ok(fs.existsSync(`content/doctor-photos/cherthala/${p.file}`), p.file);
});
