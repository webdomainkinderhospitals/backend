const { test } = require('node:test');
const assert = require('node:assert/strict');

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { bootstrapTharattazhaku, PAGE, FLAG } = require('../src/lib/bootstrapTharattazhaku');
Module._load = load;

function database(pages = []) {
  const settings = [];
  return {
    pages,
    setting: {
      rows: settings,
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key) || null,
      create: async ({ data }) => { settings.push(data); return data; },
    },
    contentPage: {
      findUnique: async ({ where }) => {
        const [k, v] = Object.entries(where)[0];
        return pages.find((p) => p[k] === v) || null;
      },
      create: async ({ data }) => { const row = { id: pages.length + 1, ...data }; pages.push(row); return row; },
    },
  };
}

test('publishes one Kochi care page that opens inside the Kochi sub-site', async () => {
  const db = database();
  await bootstrapTharattazhaku(db);
  assert.equal(db.pages.length, 1);
  const page = db.pages[0];
  assert.equal(page.category, 'Kochi Care');
  assert.equal(page.location, 'Kochi');
  assert.equal(page.published, true);
  assert.equal(page.reviewNotes, '');
  assert.match(page.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  // The Celebrate Pregnancy page lists care pages whose title or excerpt
  // mention pregnancy.
  assert.match(`${page.title} ${page.excerpt}`, /pregnan/i);
});

test('every figure from the source page is carried over', () => {
  for (const fact of ['101 participants', '₹25 lakh', '100 pregnant women', 'Nearly 70',
    '48 expecting mothers', '20+', '10,000+', '600 people', '15 leading brands',
    'India Book of Records', 'Asia Book of Records', 'KLF Nirmal', 'MomMix',
    'Spandanan', 'Kin Baby Bloom', "Mother's Day"]) {
    assert.ok(PAGE.body.includes(fact), fact);
  }
});

test('nothing from the hidden parts of the source page is published', () => {
  // Commented out on kinderkochi.com: a 2023 registration notice and a prize
  // list. Visitors there never saw them, so neither should visitors here.
  assert.doesNotMatch(PAGE.body, /7306701372/);
  assert.doesNotMatch(PAGE.body, /registrations? open/i);
  assert.doesNotMatch(PAGE.body, /2\.5 lakh|1\.25 lakh|runner-up/i);
  // The source says the show had the potential to enter the Limca Book of
  // Records, not that it did; it is not presented as an achievement.
  assert.doesNotMatch(PAGE.body, /limca/i);
});

test('every image is an absolute URL, so the admin on its own origin can show it', () => {
  const images = [...PAGE.body.matchAll(/!\[[^\]]*\]\((\S+?)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]);
  assert.ok(images.length >= 6, `found ${images.length} images`);
  for (const src of [PAGE.imageUrl, ...images]) {
    assert.match(src, /^https:\/\/.+\/kochi\/tharattazhaku\/[a-z0-9-]+\.webp$/, src);
  }
  assert.match(PAGE.body, /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/m);
});

test('created once; an edited or existing page is never replaced', async () => {
  const edited = { id: 1, slug: PAGE.slug, body: 'Edited by the Kochi team', published: false };
  const db = database([edited]);
  await bootstrapTharattazhaku(db);
  assert.equal(db.pages.length, 1);
  assert.equal(db.pages[0].body, 'Edited by the Kochi team');
  assert.equal(db.pages[0].published, false, 'an editor who hid it keeps it hidden');

  const fresh = database();
  await bootstrapTharattazhaku(fresh);
  fresh.pages.length = 0;                       // deleted by an editor afterwards
  await bootstrapTharattazhaku(fresh);
  assert.equal(fresh.pages.length, 0, 'a deliberate deletion is respected');
  assert.equal(fresh.setting.rows.filter((s) => s.key === FLAG).length, 1);
});
