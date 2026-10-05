const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapKochiStudioPortraits, PORTRAITS, imageType, FLAG } = require('../src/lib/bootstrapKochiStudioPortraits');
Module._load = load;

const jpeg = (size = 50 * 1024) => { const b = Buffer.alloc(size, 1); b[0] = 0xff; b[1] = 0xd8; return b; };
const ok = (buffer) => ({ ok: true, arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length) });

function database(doctors, settings = [{ key: 'bootstrap.kochiClientUpdates.v1', value: 'done' }]) {
  const rows = doctors.map((d, i) => ({ id: i + 1, location: 'Kochi', reviewNotes: '', imageUrl: '', ...d }));
  const media = [];
  return {
    rows, settings, media: { create: async ({ data }) => media.push(data) }, mediaRows: media,
    doctor: { findMany: async () => rows, update: async ({ where, data }) => Object.assign(rows.find((r) => r.id === where.id), data) },
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => settings.push(data),
      upsert: async ({ where, update, create }) => { const s = settings.find((x) => x.key === where.key); if (s) Object.assign(s, update); else settings.push(create); },
    },
  };
}
const store = async (file) => ({ fileName: `doctors/${file.originalname}`, url: `/uploads/doctors/${file.originalname}` });

test('every portrait is named for a different doctor', () => {
  assert.equal(new Set(PORTRAITS.map((p) => p.name)).size, PORTRAITS.length);
  assert.equal(new Set(PORTRAITS.map((p) => p.id)).size, PORTRAITS.length);
});

test('only real images of a sensible size are accepted', () => {
  assert.deepEqual(imageType(jpeg()), { ext: '.jpg', mimetype: 'image/jpeg' });
  assert.equal(imageType(Buffer.from('<html>Sign in</html>'.padEnd(20000))), null);
  assert.equal(imageType(jpeg(6 * 1024 * 1024)), null);
});

test('a portrait replaces the earlier photo, which is noted for the admin', async () => {
  const db = database([
    { name: 'Dr. Afshana Sidhik', imageUrl: '/uploads/doctors/old.jpg' },
    { name: 'Dr. Anooj' },
  ]);
  const asked = [];
  await bootstrapKochiStudioPortraits(db, { store, fetchImpl: async (url) => { asked.push(url); return ok(jpeg()); } });
  const [afshana, anooj] = db.rows;
  assert.equal(afshana.imageUrl, '/uploads/doctors/dr-afshana-sidhik.jpg');
  assert.match(afshana.reviewNotes, /Previous photo: \/uploads\/doctors\/old\.jpg/);
  assert.equal(anooj.imageUrl, '/uploads/doctors/dr-anooj.jpg');
  assert.equal(anooj.reviewNotes, '');
  assert.equal(db.mediaRows.length, 2);
  assert.match(asked[0], /^https:\/\/lh3\.googleusercontent\.com\/d\/1vRt5IuRB0TC6RRNcxWiVjtvSOxulVZmi=w1200$/);
});

test('each doctor is done once, so a later admin change is kept', async () => {
  const db = database([{ name: 'Dr. Anooj' }]);
  const fetchImpl = async () => ok(jpeg());
  await bootstrapKochiStudioPortraits(db, { store, fetchImpl });
  db.rows[0].imageUrl = '/uploads/doctors/chosen-in-admin.jpg';
  await bootstrapKochiStudioPortraits(db, { store, fetchImpl });
  assert.equal(db.rows[0].imageUrl, '/uploads/doctors/chosen-in-admin.jpg');
});

test('the second source is used when the first fails; failures retry on later starts', async () => {
  const db = database([{ name: 'Dr. Anooj' }]);
  await bootstrapKochiStudioPortraits(db, { store, fetchImpl: async (url) => (url.includes('lh3') ? { ok: false } : ok(jpeg())) });
  assert.equal(db.rows[0].imageUrl, '/uploads/doctors/dr-anooj.jpg');

  const down = database([{ name: 'Dr. Anooj', imageUrl: '/keep.jpg' }, { name: 'Dr. Manoj M' }, { name: 'Dr. Priyanka' }, { name: 'Dr. Vinay Raj' }]);
  let calls = 0;
  const offline = async () => { calls++; throw new Error('offline'); };
  await bootstrapKochiStudioPortraits(down, { store, fetchImpl: offline });
  assert.equal(down.rows[0].imageUrl, '/keep.jpg', 'nothing changes when Google cannot be reached');
  assert.equal(calls, 6, 'gives up for this start after three portraits fail');
  assert.equal(down.settings.find((s) => s.key === 'bootstrap.kochiStudioPortraits.attempts').value, '1');
  for (let i = 0; i < 5; i++) await bootstrapKochiStudioPortraits(down, { store, fetchImpl: offline });
  assert.equal(down.settings.find((s) => s.key === 'bootstrap.kochiStudioPortraits.attempts').value, '5', 'stops after five starts');
  assert.ok(!down.settings.some((s) => s.key === FLAG(PORTRAITS[0].id)));
});
