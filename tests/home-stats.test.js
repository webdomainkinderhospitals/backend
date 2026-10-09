const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapHomeStats, updatedStats } = require('../src/lib/bootstrapHomeStats');
Module._load = load;

test('births become 30K+ and surgeries 32K+ is added after births', () => {
  const out = updatedStats([
    { label: 'Women Treated', value: '6L+' }, { label: 'Births Delivered', value: '13,000+' },
    { label: 'IVF Successes', value: '1,500+' }, { label: 'Senior Consultants', value: '60+' },
  ]);
  assert.deepEqual(out.map((s) => `${s.value} ${s.label}`), ['6L+ Women Treated', '30K+ Births Delivered', '32K+ Surgeries Performed', '1,500+ IVF Successes', '60+ Senior Consultants']);
  assert.equal(updatedStats([{ label: 'Surgeries', value: '1' }]).length, 1, 'an existing surgeries number is not duplicated');
});

test('saved numbers are updated once; nothing saved means nothing changes', async () => {
  const settings = [{ key: 'stats', value: [{ label: 'Births Delivered', value: '13,000+' }] }];
  const db = { setting: {
    findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
    update: async ({ where, data }) => Object.assign(settings.find((s) => s.key === where.key), data),
    create: async ({ data }) => settings.push(data),
  } };
  await bootstrapHomeStats(db);
  assert.deepEqual(settings[0].value.map((s) => s.value), ['30K+', '32K+']);
  settings[0].value = [{ label: 'Births Delivered', value: '31K+' }];
  await bootstrapHomeStats(db);
  assert.equal(settings[0].value[0].value, '31K+', 'a later admin edit is kept');

  const empty = []; const db2 = { setting: { findUnique: async ({ where }) => empty.find((s) => s.key === where.key) || null, create: async ({ data }) => empty.push(data) } };
  await bootstrapHomeStats(db2);
  assert.deepEqual(empty.map((s) => s.key), ['bootstrap.homeStats.v1']);
});
