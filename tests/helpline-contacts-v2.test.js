const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapHelplineContactsV2, updateContacts, FLAG, KEY } = require('../src/lib/bootstrapHelplineContactsV2');
const { CONTACTS } = require('../src/lib/bootstrapHelplineContacts');
Module._load = load;

test('Cherthala drops "& Alappuzha"; Kochi gets its landline; other lines are untouched', () => {
  const next = updateContacts(CONTACTS).split('\n');
  assert.equal(next[0], 'Kinder Hospitals Cherthala | +91 94466 54500 | marketing@kinderhospital.in');
  assert.equal(next[1], 'Kinder Hospitals Kochi | 0484 666 0000 | contactus@kinderkochi.com');
  assert.deepEqual(next.slice(2), CONTACTS.split('\n').slice(2));
  // Also after the brand was made plural, or a line was edited in the admin.
  assert.equal(updateContacts('Kinder Hospital Cochin|+91 97466 00600'), 'Kinder Hospital Cochin| 0484 666 0000 ');
  assert.equal(updateContacts('Kinder Alappuzha clinic | 123'), 'Kinder Alappuzha clinic | 123');
});

function fakeDb(value) {
  const settings = value == null ? [] : [{ key: KEY, value }];
  return {
    settings,
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      update: async ({ where, data }) => Object.assign(settings.find((s) => s.key === where.key), data),
      create: async ({ data }) => settings.push(data),
    },
  };
}

test('the stored list is updated once, and an empty list is left to the site default', async () => {
  const db = fakeDb(CONTACTS);
  await bootstrapHelplineContactsV2(db);
  assert.match(db.settings[0].value, /^Kinder Hospitals Cherthala \|/);
  assert.match(db.settings[0].value, /Kochi \| 0484 666 0000 \|/);
  assert(db.settings.some((s) => s.key === FLAG));
  db.settings[0].value = 'Kinder Hospitals Cherthala & Alappuzha | 1';
  await bootstrapHelplineContactsV2(db);
  assert.equal(db.settings[0].value, 'Kinder Hospitals Cherthala & Alappuzha | 1');

  const empty = fakeDb(null);
  await bootstrapHelplineContactsV2(empty);
  assert.deepEqual(empty.settings.map((s) => s.key), [FLAG]);
});
