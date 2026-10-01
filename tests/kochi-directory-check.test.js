const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapKochiDirectoryCheck, FLAG } = require('../src/lib/bootstrapKochiDirectoryCheck');
const { DIRECTORY } = require('../src/lib/bootstrapKochiUpdates');
Module._load = load;

function database(doctors) {
  const rows = doctors.map((d, i) => ({ id: i + 1, sortOrder: i + 1, published: true, ...d }));
  const settings = [{ key: 'bootstrap.kochiClientUpdates.v1', value: 'done' }];
  return {
    rows, settings,
    doctor: {
      findMany: async () => rows,
      create: async ({ data }) => { rows.push({ id: rows.length + 1, ...data }); },
      update: async ({ where, data }) => Object.assign(rows.find((r) => r.id === where.id), data),
    },
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => settings.push(data),
    },
  };
}

// The live list as the first import left it, then edited in the admin.
const live = () => DIRECTORY.slice(1).map((e) => ({
  name: e.name, designation: e.designation, speciality: e.department, location: 'Kochi',
  bio: e.qualifications, fullBio: e.profile, imageUrl: '',
}));

test('a directory doctor missing from the site is added, and empty fields are filled', async () => {
  const doctors = live();
  doctors[0].speciality = ''; doctors[0].fullBio = '';
  doctors[1].bio = 'Edited in the admin';
  const db = database(doctors);
  await bootstrapKochiDirectoryCheck(db);
  const kochi = db.rows.filter((d) => d.published && d.location.includes('Kochi'));
  assert.equal(kochi.length, DIRECTORY.length, 'all 41 listed');
  assert.ok(db.rows.some((d) => d.name === DIRECTORY[0].name), 'the missing doctor was added');
  assert.equal(db.rows[0].speciality, DIRECTORY[1].department, 'empty department filled');
  assert.equal(db.rows[1].bio, 'Edited in the admin', 'existing text kept');
});

test('raw directory notes become a written profile; an edited profile is kept', async () => {
  const doctors = live();
  doctors.find((d) => d.name === 'Dr. Manoj M').fullBio = 'Written by the hospital in the admin.';
  const db = database(doctors);
  await bootstrapKochiDirectoryCheck(db);
  const sooraj = db.rows.find((d) => d.name === 'Dr. Sooraj Menon R');
  const manoj = db.rows.find((d) => d.name === 'Dr. Manoj M');
  assert.match(sooraj.fullBio, /^Dr\. Sooraj Menon R is an experienced cardiologist/);
  assert.match(sooraj.fullBio, /### Education & training\n\n- MBBS — Government Medical College, Thrissur/);
  assert.equal(manoj.fullBio, 'Written by the hospital in the admin.');
});

test('a stray incomplete entry is hidden with a note naming its likely twin', async () => {
  const db = database([...live(), { name: 'Dr.Roshan', designation: '', speciality: '', location: '', bio: '', fullBio: '', imageUrl: '/x.jpg' },
    { name: 'Dr. Real Cherthala Doctor', speciality: '', bio: '', location: 'Cherthala' }]);
  await bootstrapKochiDirectoryCheck(db);
  const stray = db.rows.find((d) => d.name === 'Dr.Roshan');
  assert.equal(stray.published, false);
  assert.match(stray.reviewNotes, /duplicate of Dr\. Roshna Ramachandran/);
  assert.equal(db.rows.find((d) => /Cherthala Doctor/.test(d.name)).published, true, 'other centres untouched');
});

test('runs once', async () => {
  const db = database(live());
  await bootstrapKochiDirectoryCheck(db);
  const count = db.rows.length;
  db.rows.pop();
  await bootstrapKochiDirectoryCheck(db);
  assert.equal(db.rows.length, count - 1);
  assert.ok(db.settings.some((s) => s.key === FLAG));
});
