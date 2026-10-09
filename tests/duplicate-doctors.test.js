const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapDuplicateDoctors } = require('../src/lib/bootstrapDuplicateDoctors');
Module._load = load;

const profile = 'Dr. Roshna Ramachandran is a physician with more than 15 years of clinical experience in patient care and disease management.';

test('the profile-less Roshna copy is hidden once, with a note; everyone else is untouched', async () => {
  const doctors = [
    { id: 1, name: 'Dr. Roshna Ramachandran', location: 'Kochi', fullBio: profile, published: true, reviewNotes: '' },
    { id: 2, name: 'Dr.Roshan', location: 'Kochi', fullBio: '', speciality: 'General Medicine', published: true, reviewNotes: '' },
    { id: 3, name: 'Dr. Roshan Kumar', location: 'Kollam', fullBio: '', published: true, reviewNotes: '' },
    { id: 4, name: 'Dr. Vidya Prasad', location: 'Cherthala', fullBio: '', published: true, reviewNotes: '' },
  ];
  const settings = [];
  const db = {
    doctor: {
      findMany: async () => doctors,
      update: async ({ where, data }) => Object.assign(doctors.find((d) => d.id === where.id), data),
    },
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => settings.push(data),
    },
  };
  await bootstrapDuplicateDoctors(db);
  assert.deepEqual(doctors.map((d) => d.published), [true, false, true, true]);
  assert.match(doctors[1].reviewNotes, /duplicate of Dr\. Roshna Ramachandran/);
  doctors[1].published = true; // brought back in the admin
  await bootstrapDuplicateDoctors(db);
  assert.equal(doctors[1].published, true, 'runs once, so an admin decision is kept');
});
