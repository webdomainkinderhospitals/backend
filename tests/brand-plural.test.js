const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapBrandPlural, pluralBrand, FLAG } = require('../src/lib/bootstrapBrandPlural');
Module._load = load;

test('the brand reads "Kinder Hospitals", and nothing else changes', () => {
  assert.equal(pluralBrand('Welcome to Kinder Hospital Kochi'), 'Welcome to Kinder Hospitals Kochi');
  assert.equal(pluralBrand('Kinder Hospital’s Operation Theatre'), 'Kinder Hospitals’ Operation Theatre');
  assert.equal(pluralBrand("Kinder Hospital's care"), "Kinder Hospitals' care");
  assert.equal(pluralBrand('Blood Storage\n\nKinder Hospital has'), 'Blood Storage\n\nKinder Hospitals has');
  assert.equal(pluralBrand('Already Kinder Hospitals Kollam'), 'Already Kinder Hospitals Kollam');
  assert.equal(pluralBrand('at every Kinder hospital'), 'at every Kinder hospital');
  assert.equal(pluralBrand('write to marketing@kinderhospital.in'), 'write to marketing@kinderhospital.in');
  assert.equal(pluralBrand('KINDER HOSPITAL KOCHI'), 'KINDER HOSPITALS KOCHI');
});

function table(rows) {
  return {
    rows,
    findMany: async () => rows,
    update: async ({ where, data }) => Object.assign(rows.find((r) => r.id === where.id), data),
  };
}

test('stored text is updated once; testimonials and addresses keep their words', async () => {
  const settings = [
    { key: 'helplineContacts', value: 'Kinder Hospital Kochi | +91 97466 00600 | contactus@kinderkochi.com' },
    { key: 'bootstrap.kochiUpdates.v1', value: 'done' },
  ];
  const db = {
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      findMany: async () => settings,
      update: async ({ where, data }) => Object.assign(settings.find((s) => s.key === where.key), data),
      create: async ({ data }) => settings.push(data),
    },
    location: table([{ id: 1, name: 'Kochi', address: 'Kinder Hospital, Pathadipalam', description: 'At Kinder Hospital, we care.' }]),
    doctor: table([{ id: 1, designation: 'Consultant', bio: 'Consultant at Kinder Hospital Kochi.', fullBio: '' }]),
    testimonial: table([{ id: 1, quote: 'Kinder Hospital saved us.' }]),
  };
  await bootstrapBrandPlural(db);
  assert.match(settings[0].value, /^Kinder Hospitals Kochi \|/);
  assert.equal(db.location.rows[0].description, 'At Kinder Hospitals, we care.');
  assert.equal(db.location.rows[0].address, 'Kinder Hospital, Pathadipalam');
  assert.equal(db.doctor.rows[0].bio, 'Consultant at Kinder Hospitals Kochi.');
  assert.equal(db.testimonial.rows[0].quote, 'Kinder Hospital saved us.');
  assert.ok(settings.find((s) => s.key === FLAG));

  db.location.rows[0].description = 'Kinder Hospital — the admin chose this.';
  await bootstrapBrandPlural(db);
  assert.equal(db.location.rows[0].description, 'Kinder Hospital — the admin chose this.', 'runs only once');
});
