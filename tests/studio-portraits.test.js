const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  if (request === './storage') return { storeFile: async () => { throw new Error('no storage in tests'); } };
  return load.apply(this, arguments);
};
const { bootstrapStudioPortraits, PORTRAITS, doctorFor } = require('../src/lib/bootstrapStudioPortraits');
Module._load = load;

function database(doctors) {
  const settings = [];
  return {
    doctors, settings,
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => settings.push(data),
    },
    media: { create: async () => {} },
    doctor: {
      findMany: async () => doctors,
      update: async ({ where, data }) => Object.assign(doctors.find((d) => d.id === where.id), data),
    },
  };
}
const store = async (file) => ({ fileName: file.originalname, url: `https://media.test/${file.originalname}` });

test('every portrait file is present', () => {
  for (const p of PORTRAITS) assert.ok(fs.existsSync(path.join(__dirname, '..', 'content', 'doctor-photos', 'studio', p.file)), p.file);
});

test('a portrait goes to the doctor of that name at that centre only', () => {
  const doctors = [
    { id: 1, name: 'Dr. Jeevan Raj C N', location: 'Cherthala' },
    { id: 2, name: 'Dr. Reshmy R. Pillai', location: 'Kollam' },
    { id: 3, name: 'Dr. Hira Fathima', location: 'Kollam' },
    { id: 4, name: 'Dr. Roshna Ramachandran', location: 'Cochin' },
    { id: 5, name: 'Dr. Kevin Antony George', location: 'Cherthala' },
  ];
  const find = (name, centre) => doctorFor({ name, centre }, doctors)?.id ?? null;
  assert.equal(find('Dr Jeevan Raj CN', 'Cherthala'), 1);
  assert.equal(find('Dr. Reshmy R Pillai', 'Kollam'), 2);
  assert.equal(find('Dr. Hira', 'Kollam'), 3);
  assert.equal(find('Dr. Roshna Ramachandran', 'Kochi'), 4);
  assert.equal(find('Dr. Roshna Ramachandran', 'Kollam'), null);
  assert.equal(find('Dr Kevin George', 'Cherthala'), 5);
  assert.equal(find('Dr Remya', 'Cherthala'), null);
});

test('photos are set once, the earlier photo is noted, and a later admin change is kept', async () => {
  const db = database([{ id: 1, name: 'Dr. Manju V K', location: 'Kollam', imageUrl: 'https://old/manju.jpg', reviewNotes: '' }]);
  await bootstrapStudioPortraits(db, { store });
  assert.equal(db.doctors[0].imageUrl, 'https://media.test/kollam-manju-v-k.webp');
  assert.match(db.doctors[0].reviewNotes, /https:\/\/old\/manju\.jpg/);

  db.doctors[0].imageUrl = 'https://admin/new.jpg';
  await bootstrapStudioPortraits(db, { store });
  assert.equal(db.doctors[0].imageUrl, 'https://admin/new.jpg');
});
