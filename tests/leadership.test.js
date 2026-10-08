const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapLeadership, FLAG } = require('../src/lib/bootstrapLeadership');
Module._load = load;

test('leaders are ordered once, and Anto Twinkle joins Kinder Kochi', async () => {
  const pages = [
    { slug: 'leadership-mr-anto-twinkle', location: '', sortOrder: 1 },
    { slug: 'leadership-mr-basanta-kumar-dash', location: '', sortOrder: 2 },
    { slug: 'leadership-dr-v-k-pradeep-kumar', location: '', sortOrder: 3 },
    { slug: 'leadership-mr-renjith-krishnan', location: '', sortOrder: 4 },
  ];
  const settings = [];
  const db = {
    contentPage: {
      findUnique: async ({ where }) => pages.find((p) => p.slug === where.slug) || null,
      update: async ({ where, data }) => Object.assign(pages.find((p) => p.slug === where.slug), data),
    },
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => settings.push(data),
    },
  };
  await bootstrapLeadership(db);
  const group = pages.filter((p) => !p.location).sort((a, b) => a.sortOrder - b.sortOrder).map((p) => p.slug);
  assert.deepEqual(group, ['leadership-dr-v-k-pradeep-kumar', 'leadership-mr-renjith-krishnan', 'leadership-mr-basanta-kumar-dash']);
  assert.equal(pages[0].location, 'Kochi');
  assert(settings.some((s) => s.key === FLAG));

  pages[0].location = 'Cherthala'; // a later admin edit is kept
  await bootstrapLeadership(db);
  assert.equal(pages[0].location, 'Cherthala');
});
