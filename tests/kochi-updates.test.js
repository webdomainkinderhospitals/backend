const { test } = require('node:test');
const assert = require('node:assert/strict');

// Driven against an in-memory stand-in for Prisma, like the Kollam tests.
const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapKochiUpdates, FLAG, LOCATION, DEPARTMENTS, DIRECTORY, LINKED, personKey } =
  require('../src/lib/bootstrapKochiUpdates');
const { bootstrapKochiDoctorPhotos, photoUrlFrom } = require('../src/lib/bootstrapKochiDoctorPhotos');
const { bootstrapBrandPhilosophy, BRAND } = require('../src/lib/bootstrapBrandPhilosophy');
Module._load = load;

function database(seed = {}) {
  const db = {};
  for (const name of ['location', 'speciality', 'doctor', 'contentPage', 'setting', 'media']) {
    const rows = (seed[name] || []).map((r, i) => ({ id: i + 1, ...r }));
    db[name] = {
      rows,
      findMany: async () => rows,
      findUnique: async ({ where }) => rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) || null,
      create: async ({ data }) => { const row = { id: rows.length + 1, ...data }; rows.push(row); return row; },
      update: async ({ where, data }) => Object.assign(rows.find((r) => r.id === where.id), data),
      upsert: async ({ where, update, create }) => {
        const row = rows.find((r) => r.key === where.key);
        if (row) return Object.assign(row, update);
        rows.push({ id: rows.length + 1, ...create });
        return create;
      },
    };
  }
  return db;
}

const live = () => database({
  location: [
    { name: 'Kochi', since: 'Since 2018', phone: '+91 484 405 4000', email: 'contactus@kinderhospital.in', website: 'https://www.kinderkochi.com', tagline: 'A 125-bed multispeciality hospital with 25 specialities in Edappally.' },
    { name: 'Cherthala', phone: '+91 478 2830000' },
  ],
  contentPage: [
    { slug: 'kochi-general-laparoscopic-surgery', title: 'General & Laparoscopic Surgery in Kochi', category: 'Kochi Care', sortOrder: 0, location: 'Kochi', published: true },
    { slug: 'kochi-obstetrics-gynaecology', title: 'Obstetrics & Gynaecology at Kinder Hospitals, Kochi', category: 'Kochi Care', sortOrder: 0, location: 'Kochi', published: true },
    { slug: 'kochi-premium-birthing-centre', title: 'Premium Birthing Centre at Kinder Hospitals, Kochi', category: 'Kochi Care', sortOrder: 0, location: 'Kochi', published: true },
    { slug: 'kochi-water-birthing-suite', title: 'Water Birth at Kinder Hospitals, Kochi', category: 'Kochi Care', sortOrder: 0, location: 'Kochi', published: true },
    { slug: 'kochi-tharattazhaku', title: 'Tharattazhaku', category: 'Kochi Care', sortOrder: 0, location: 'Kochi', published: true },
  ],
  doctor: [
    { name: 'Brigadier (Dr.) A P Radhakrishnan', speciality: 'General Medicine', location: 'Kochi', imageUrl: 'https://x/ap.jpg', fullBio: 'Kept as written', published: true, sortOrder: 1 },
    { name: 'Dr Roshna Ramachandran', designation: 'Consultant — Internal Medicine', speciality: 'Internal Medicine', location: 'Kochi', published: true, sortOrder: 2 },
    { name: 'Dr. Rita K M', speciality: 'Paed. Surgery', location: 'Kochi', published: true, sortOrder: 3 },
    { name: 'Dr. Shared Doctor', speciality: 'Paediatrics', location: 'Kochi, Cherthala', published: true, sortOrder: 4 },
    { name: 'Dr. Abhishek Radhakrishnan', speciality: 'Reproductive Medicine', location: 'Cherthala', published: false, sortOrder: 5 },
    { name: 'Dr. Cherthala Only', speciality: 'Paediatrics', location: 'Cherthala', published: true, sortOrder: 6 },
  ],
});

test('the Kochi record carries every contact and wording change from the notes', async () => {
  const db = live();
  await bootstrapKochiUpdates(db);
  const kochi = db.location.rows[0];
  assert.equal(kochi.since, '', 'Since 2018 is gone');
  assert.equal(kochi.accreditation, 'NABH Accredited');
  assert.match(kochi.accreditationLogoUrl, /\/nabh-badge\.png$/);
  assert.equal(kochi.phone, '0484 666 00 00');
  assert.match(kochi.phone2, /97466 00600/);
  assert.equal(kochi.email, 'contactus@kinderkochi.com');
  assert.match(kochi.address, /Kalamassery/);
  assert.match(kochi.address, /682033/);
  assert.match(kochi.officeAddress, /Kadavil Castle/);
  assert.match(kochi.mapUrl, /^https:\/\/www\.google\.com\/maps\//);
  assert.equal(kochi.website, '', 'no Visit kinderkochi.com link');
  assert.match(kochi.tagline, /35 specialities/);
  assert.doesNotMatch(kochi.tagline, /Edappally/);
  assert.match(kochi.description, /^Kinder Multispeciality Hospital, Kochi brings/);
  assert.equal(kochi.highlights.split('\n').length, 8);
  assert.equal(db.location.rows[1].phone, '+91 478 2830000', 'other centres untouched');
});

test('departments arrive in the two groups the hospital asked for', async () => {
  const db = live();
  await bootstrapKochiUpdates(db);
  const own = db.speciality.rows.filter((s) => s.location === 'Kochi');
  assert.equal(own.length, DEPARTMENTS.length);
  assert.deepEqual([...new Set(own.map((s) => s.category))], ['Multispeciality Services', 'Women & Fertility Centre']);
  assert.ok(own.every((s) => s.published && s.description));
  assert.equal(new Set(own.map((s) => s.name)).size, own.length, 'no duplicates');
});

test('the care cards become the five the hospital listed', async () => {
  const db = live();
  await bootstrapKochiUpdates(db);
  const cards = db.contentPage.rows
    .filter((p) => p.category === 'Kochi Care' && p.published)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => p.slug);
  assert.deepEqual(cards, ['kochi-multispeciality-services', 'kochi-obstetrics-gynaecology', 'kochi-ivf-fertility', 'kochi-premium-birthing-centre']);
  const bySlug = Object.fromEntries(db.contentPage.rows.map((p) => [p.slug, p]));
  assert.equal(bySlug['kochi-general-laparoscopic-surgery'].category, LINKED);
  assert.equal(bySlug['kochi-water-birthing-suite'].category, LINKED);
  assert.equal(bySlug['kochi-tharattazhaku'].category, 'Celebrate Pregnancy');
  assert.equal(bySlug['kochi-premium-birthing-centre'].title, 'Premium Birthing Services at Kinder Hospitals, Kochi');
  assert.match(bySlug['kochi-multispeciality-services'].body, /## Our departments/);
});

test('the Kochi roster matches the doctor directory', async () => {
  const db = live();
  await bootstrapKochiUpdates(db);
  const kochi = db.doctor.rows.filter((d) => d.published && String(d.location).split(',').some((l) => l.trim() === 'Kochi'));
  assert.equal(kochi.length, DIRECTORY.length, 'all 41, nobody else');
  assert.equal(DIRECTORY.length, 41);

  const ap = db.doctor.rows.find((d) => d.name.startsWith('Brigadier'));
  assert.equal(ap.imageUrl, 'https://x/ap.jpg', 'photo kept');
  assert.equal(ap.fullBio, 'Kept as written', 'existing profile kept');
  assert.equal(ap.speciality, 'General Medicine & Diabetology');

  const roshna = db.doctor.rows.find((d) => /Roshna/.test(d.name));
  assert.equal(roshna.speciality, 'General Medicine & Diabetology');
  assert.match(roshna.bio, /PDF/);
  assert.equal(roshna.designation, 'Consultant', 'stale department dropped from the role');

  const rita = db.doctor.rows.find((d) => /Rita/.test(d.name));
  assert.equal(rita.published, false, 'not in the directory');
  assert.match(rita.reviewNotes, /Kochi doctor directory/);

  const shared = db.doctor.rows.find((d) => /Shared/.test(d.name));
  assert.equal(shared.location, 'Cherthala', 'kept at the other centre');
  assert.equal(shared.published, true);

  const abhishek = db.doctor.rows.find((d) => /Abhishek/.test(d.name));
  assert.equal(abhishek.published, true);
  assert.equal(abhishek.location, 'Kochi', 'unconfirmed draft centre not published');
  assert.match(abhishek.reviewNotes, /Cherthala/);

  assert.equal(db.doctor.rows.find((d) => /Cherthala Only/.test(d.name)).published, true);
  assert.ok(!db.doctor.rows.some((d) => /^Dr[^.]/.test(d.name) && !/^Dr\. /.test(d.name) && d.sourceFiles), 'new names read "Dr. …"');
});

test('runs once and leaves later admin edits alone', async () => {
  const db = live();
  await bootstrapKochiUpdates(db);
  db.location.rows[0].phone = 'edited';
  const count = db.doctor.rows.length;
  await bootstrapKochiUpdates(db);
  assert.equal(db.location.rows[0].phone, 'edited');
  assert.equal(db.doctor.rows.length, count);
  assert.ok(db.setting.rows.some((r) => r.key === FLAG));
});

test('names match however the title is written', () => {
  assert.equal(personKey('Dr Vinay Raj'), personKey('Dr. Vinay Raj'));
  assert.equal(personKey('Dr.Sajitha Surendran'), personKey('Dr. Sajitha Surendran'));
  assert.equal(personKey('Brigadier (Dr.) A P Radhakrishnan'), personKey('Dr. A P Radhakrishnan'));
  assert.notEqual(personKey('Andrology'), personKey('Anology'));
});

test('doctor photos come from the profile page into the media library', async () => {
  assert.equal(photoUrlFrom('<img src="/uploads/doctors/main/Dr.Rekha_1_.jpeg">'), 'https://www.kinderkochi.com/uploads/doctors/main/Dr.Rekha_1_.jpeg');
  assert.equal(photoUrlFrom('<p>no photo</p>'), '');

  const db = live();
  await bootstrapKochiUpdates(db);
  const fetched = [];
  const fetchImpl = async (url) => {
    fetched.push(url);
    return url.includes('/uploads/')
      ? { ok: true, arrayBuffer: async () => new Uint8Array(4096).buffer }
      : { ok: true, text: async () => `<img src="/uploads/doctors/main/${url.split('/').pop()}.jpg">` };
  };
  const store = async (file, folder) => ({ fileName: `${folder}/x.jpg`, url: `https://storage.example/${folder}/${file.originalname}` });
  await bootstrapKochiDoctorPhotos(db, { fetchImpl, store });

  const ap = db.doctor.rows.find((d) => d.name.startsWith('Brigadier'));
  assert.equal(ap.imageUrl, 'https://x/ap.jpg', 'existing photo never replaced');
  assert.ok(!fetched.some((u) => u.includes('brigadier')), 'no request for a doctor who has a photo');
  const withPhotos = db.doctor.rows.filter((d) => /storage\.example/.test(d.imageUrl || ''));
  assert.equal(withPhotos.length, DIRECTORY.length - 1);
  assert.equal(db.media.rows.length, withPhotos.length);
});

test('an unreachable site is retried on a later start, then given up', async () => {
  const db = live();
  await bootstrapKochiUpdates(db);
  const fetchImpl = async () => { throw new Error('blocked'); };
  for (let i = 0; i < 4; i++) {
    await bootstrapKochiDoctorPhotos(db, { fetchImpl });
    assert.ok(!db.setting.rows.some((r) => r.key === 'bootstrap.kochiDoctorPhotos.v1'));
  }
  await bootstrapKochiDoctorPhotos(db, { fetchImpl });
  assert.ok(db.setting.rows.some((r) => r.key === 'bootstrap.kochiDoctorPhotos.v1'));
});

test('brand philosophy is seeded once without overwriting', async () => {
  const db = database({ setting: [{ key: 'brandVision', value: 'Our own words' }] });
  await bootstrapBrandPhilosophy(db);
  const get = (k) => db.setting.rows.find((r) => r.key === k)?.value;
  assert.equal(get('brandVision'), 'Our own words');
  assert.equal(get('brandMission'), BRAND.brandMission);
  assert.equal(get('brandValues').split('\n').length, 5);
  assert.equal(get('brandCoreIdea'), 'A caring presence protecting and nurturing life.');
});
