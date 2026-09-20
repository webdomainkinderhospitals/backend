const { test } = require('node:test');
const assert = require('node:assert/strict');

// The bootstrap module pulls in the shared Prisma client, which needs a
// generated client and a database. The tests drive it against an in-memory
// stand-in instead, exactly as the website-content tests do.
const Module = require('module');
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapKollam, LOCATION, SPECIALITIES, DOCTORS, PRIVACY_PAGE, FLAG_V1 } =
  require('../src/lib/bootstrapKollam');
Module._load = load;

const norm = (s) => String(s || '').trim().toLowerCase();

function database() {
  const db = {};
  for (const name of ['location', 'speciality', 'doctor', 'contentPage', 'setting']) {
    const rows = [];
    db[name] = {
      rows,
      findMany: async ({ where } = {}) =>
        rows.filter((r) => !where || Object.entries(where).every(([k, v]) => r[k] === v)),
      findUnique: async ({ where }) =>
        rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) || null,
      findFirst: async ({ where }) =>
        rows.find((r) =>
          Object.entries(where).every(([k, v]) =>
            v && v.equals !== undefined ? norm(r[k]) === norm(v.equals) : r[k] === v
          )
        ) || null,
      aggregate: async () => ({ _max: { sortOrder: rows.reduce((m, r) => Math.max(m, r.sortOrder || 0), 0) } }),
      create: async ({ data }) => { const row = { id: rows.length + 1, ...data }; rows.push(row); return row; },
      update: async ({ where, data }) => {
        const row = rows.find((r) => r.id === where.id);
        Object.assign(row, data);
        return row;
      },
    };
  }
  return db;
}

test('the Kollam centre and all its content arrive published and complete', async () => {
  const db = database();
  await bootstrapKollam(db);

  const loc = db.location.rows[0];
  assert.equal(loc.name, 'Kollam');
  assert.equal(loc.slug, 'kollam');
  assert.equal(loc.published, true);
  assert.equal(loc.phone, '0474-2550000');
  assert.equal(loc.email, 'contactus@kinderkollam.com');
  assert.equal(loc.website, 'https://kinderkollam.com');
  assert.equal(loc.bookingUrl, 'https://mobapp.kinderhospitals.com');
  assert.equal(loc.since, 'Since 2026');
  assert.match(loc.address, /Randamkutty, Kilikollor PO, Kollam, Kerala - 691004/);
  // Four paragraphs of welcome text and four facilities, one per line.
  assert.equal(loc.description.split('\n').length, 4);
  const facilities = loc.highlights.split('\n');
  assert.equal(facilities.length, 4);
  for (const line of facilities) assert.match(line, / — /, line);

  assert.equal(db.speciality.rows.length, SPECIALITIES.length);
  assert(db.speciality.rows.every((s) => s.location === 'Kollam' && s.published && s.description));
  assert.equal(db.doctor.rows.length, DOCTORS.length);
  assert(db.doctor.rows.every((d) => d.location === 'Kollam' && d.published && d.designation && d.bio));

  const policy = db.contentPage.rows[0];
  assert.equal(policy.slug, PRIVACY_PAGE.slug);
  assert.equal(policy.location, 'Kollam');
  assert.equal(policy.published, true);
  // No blanks are left for a visitor to puzzle over.
  assert.doesNotMatch(policy.body, /_{3,}/);
});

test('the bootstrap runs once and never overwrites an editor\'s work', async () => {
  const db = database();
  await bootstrapKollam(db);
  assert.equal(db.setting.rows.filter((s) => s.key === FLAG_V1).length, 1);

  db.location.rows[0].tagline = 'Edited by hospital staff';
  db.doctor.rows[0].designation = 'Edited by hospital staff';
  db.contentPage.rows[0].body = 'Edited by hospital staff';

  await bootstrapKollam(db);
  assert.equal(db.location.rows.length, 1);
  assert.equal(db.speciality.rows.length, SPECIALITIES.length);
  assert.equal(db.doctor.rows.length, DOCTORS.length);
  assert.equal(db.contentPage.rows.length, 1);
  assert.equal(db.location.rows[0].tagline, 'Edited by hospital staff');
  assert.equal(db.doctor.rows[0].designation, 'Edited by hospital staff');
  assert.equal(db.contentPage.rows[0].body, 'Edited by hospital staff');
});

test('an existing Kollam centre is left alone, and its missing content filled in', async () => {
  const db = database();
  db.location.rows.push({ id: 1, name: 'kollam', slug: 'kollam', tagline: 'Set up by hand', sortOrder: 6, published: false });

  await bootstrapKollam(db);
  assert.equal(db.location.rows.length, 1);
  assert.equal(db.location.rows[0].tagline, 'Set up by hand');
  assert.equal(db.location.rows[0].published, false, 'the admin switch stays where the admin left it');
  assert.equal(db.speciality.rows.length, SPECIALITIES.length);
  assert.equal(db.doctor.rows.length, DOCTORS.length);
});

test('a doctor already on the roster is not duplicated', async () => {
  const db = database();
  db.doctor.rows.push({ id: 1, name: 'dr. deepthi prem', location: 'Cherthala', sortOrder: 3 });

  await bootstrapKollam(db);
  assert.equal(db.doctor.rows.length, DOCTORS.length); // 1 kept + 8 created
  assert.equal(db.doctor.rows[0].location, 'Cherthala');
  assert.equal(db.doctor.rows.filter((d) => norm(d.name) === 'dr. deepthi prem').length, 1);
});

test('the supplied Kollam content is carried over verbatim', () => {
  assert.equal(LOCATION.tagline, 'Where Every Tiny Heartbeat Is Cherished with Kindness');
  assert.deepEqual(
    SPECIALITIES.map((s) => s.name),
    ['Obstetrics', 'Gynaecology', 'Paediatrics', 'Neonatology', 'Radiology & Diagnostics']
  );
  assert.equal(DOCTORS.length, 9);
  assert.match(LOCATION.highlights, /five-bedded Level 3 NICU/);
  assert.match(LOCATION.highlights, /three-bedded SICU/);
  assert.match(LOCATION.description, /every precious heartbeat/);
});
