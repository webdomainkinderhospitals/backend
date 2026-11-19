const test = require('node:test');
const assert = require('node:assert/strict');
const { bootstrapAnanthenProfile, PROFILE } = require('../src/lib/bootstrapAnanthenProfile');

function database(doctors) {
  const settings = new Map();
  return {
    doctors,
    setting: {
      findUnique: async ({ where }) => (settings.has(where.key) ? { key: where.key, value: settings.get(where.key) } : null),
      create: async ({ data }) => { settings.set(data.key, data.value); return data; },
    },
    doctor: {
      findMany: async () => doctors,
      update: async ({ where, data }) => Object.assign(doctors.find((d) => d.id === where.id), data),
    },
  };
}

test('the unformatted import becomes the formatted profile, with his qualifications as the short bio', async () => {
  const db = database([{ id: 1, name: 'Dr. Ananthen K S', bio: 'Dr.', fullBio: `${PROFILE.earlierStart} from government Medical College…` }]);
  await bootstrapAnanthenProfile(db);
  assert.equal(db.doctors[0].fullBio, PROFILE.fullBio);
  assert.match(db.doctors[0].fullBio, /### Areas of interest\n\n- Neonatology\n- High-risk preterm care/);
  assert.equal(db.doctors[0].bio, PROFILE.qualifications);
  db.doctors[0].fullBio = 'Edited in the admin.';
  await bootstrapAnanthenProfile(db); // runs once
  assert.equal(db.doctors[0].fullBio, 'Edited in the admin.');
});

test('a profile written in the admin is kept', async () => {
  const db = database([{ id: 1, name: 'Dr Ananthen K S', bio: 'MBBS, MD', fullBio: 'A profile written in the admin.' }]);
  await bootstrapAnanthenProfile(db);
  assert.equal(db.doctors[0].fullBio, 'A profile written in the admin.');
  assert.equal(db.doctors[0].bio, 'MBBS, MD');
});

test('waits for the doctor to be added', async () => {
  const db = database([{ id: 1, name: 'Dr. Neena Ananthen', bio: '', fullBio: '' }]);
  await bootstrapAnanthenProfile(db);
  assert.equal(db.doctors[0].fullBio, '');
  assert.equal(await db.setting.findUnique({ where: { key: 'bootstrap.ananthenProfile.v1' } }), null);
});
