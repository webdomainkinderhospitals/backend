const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapCentreOrder, orderCentres, orderContacts, FLAG } = require('../src/lib/bootstrapCentreOrder');
Module._load = load;

test('Cherthala, Kochi, Aranmula, Kollam lead; other centres keep their order after them', () => {
  const names = ['Kochi', 'Cherthala', 'Bengaluru', 'Kollam', 'Singapore', 'Aranmula', 'Alappuzha']
    .map((name, i) => ({ id: i + 1, name }));
  assert.deepEqual(orderCentres(names).map((l) => l.name),
    ['Cherthala', 'Kochi', 'Aranmula', 'Kollam', 'Bengaluru', 'Singapore', 'Alappuzha']);
});

test('the header contacts follow the same order', () => {
  const text = [
    'Kinder Hospitals Cherthala | +91 94466 54500 | a',
    'Kinder Hospitals Kochi | 0484 666 0000 | b',
    'Kinder Hospitals Kollam | +91 79944 45542 | c',
    'Kinder Hospitals Aranmula | +91 91884 01767 | d',
  ].join('\n');
  assert.deepEqual(orderContacts(text).split('\n').map((l) => l.split(' |')[0]),
    ['Kinder Hospitals Cherthala', 'Kinder Hospitals Kochi', 'Kinder Hospitals Aranmula', 'Kinder Hospitals Kollam']);
  assert.equal(orderContacts('Kinder Hospital Cochin | 1\nKinder Hospitals Cherthala & Alappuzha | 2'),
    'Kinder Hospitals Cherthala & Alappuzha | 2\nKinder Hospital Cochin | 1');
});

test('display order and contacts are updated once', async () => {
  const locations = [
    { id: 1, name: 'Kochi', sortOrder: 1 }, { id: 2, name: 'Cherthala', sortOrder: 2 },
    { id: 3, name: 'Kollam', sortOrder: 3 }, { id: 4, name: 'Aranmula', sortOrder: 4 },
  ];
  const settings = [{ key: 'helplineContacts', value: 'Kinder Hospitals Kollam | 3\nKinder Hospitals Aranmula | 4' }];
  const db = {
    location: {
      findMany: async () => [...locations].sort((a, b) => a.sortOrder - b.sortOrder),
      update: async ({ where, data }) => Object.assign(locations.find((l) => l.id === where.id), data),
    },
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      update: async ({ where, data }) => Object.assign(settings.find((s) => s.key === where.key), data),
      create: async ({ data }) => settings.push(data),
    },
  };
  await bootstrapCentreOrder(db);
  assert.deepEqual([...locations].sort((a, b) => a.sortOrder - b.sortOrder).map((l) => l.name), ['Cherthala', 'Kochi', 'Aranmula', 'Kollam']);
  assert.equal(settings[0].value, 'Kinder Hospitals Aranmula | 4\nKinder Hospitals Kollam | 3');
  assert(settings.some((s) => s.key === FLAG));

  locations[0].sortOrder = 0; // an admin reorder afterwards is kept
  await bootstrapCentreOrder(db);
  assert.equal(locations[0].sortOrder, 0);
});
