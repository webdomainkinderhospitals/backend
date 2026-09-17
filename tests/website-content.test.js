const { test } = require('node:test');
const assert = require('node:assert/strict');
const pack = require('../src/lib/contentPack');
const { previewImport, importContent } = require('../src/lib/websiteImport');
const { publicRecord, validatePublication } = require('../src/lib/contentValidation');

function database() {
  const db = { $executeRaw: async () => 1 };
  for (const name of ['doctor', 'speciality', 'contentPage']) {
    const rows = [];
    db[name] = {
      rows,
      findUnique: async ({ where }) => rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)),
      findFirst: async ({ where }) => rows.find((r) => Object.entries(where).every(([k, v]) => String(r[k]).toLowerCase() === v.equals.toLowerCase())),
      create: async ({ data }) => { const row = { id: rows.length + 1, ...data }; rows.push(row); return row; },
    };
  }
  db.$transaction = async (fn) => fn(db);
  return db;
}

test('supplied content covers every source, with unique keys and draft defaults', () => {
  assert.equal(pack.records.length, 97);
  assert.equal(new Set(pack.records.map((r) => r.data.sourceKey)).size, 97);
  assert.equal(new Set(pack.records.filter((r) => r.collection === 'pages').map((r) => r.data.slug)).size, 53);
  assert(pack.records.every((r) => r.data.published === false));
  for (const source of pack.sources) assert(pack.records.some((r) => r.data.sourceFiles.includes(source)), source);
  assert.match(pack.unavailable[0].source, /Chairman/);
});
test('import is repeatable and preserves editorial changes', async () => {
  const db = database();
  assert.equal((await importContent(db)).created, 97);
  db.doctor.rows[0].fullBio = 'Edited by hospital staff';
  const again = await importContent(db);
  assert.equal(again.created, 0);
  assert.equal(again.preserved, 97);
  assert.equal(db.doctor.rows[0].fullBio, 'Edited by hospital staff');
  assert((await previewImport(db)).items.every((r) => r.action === 'preserve'));
});
test('matching existing records are not overwritten or unpublished', async () => {
  const db = database();
  const source = pack.records.find((r) => r.collection === 'doctors').data;
  db.doctor.rows.push({ id: 50, name: source.name.toUpperCase(), location: source.location, published: true, fullBio: 'Existing approved profile' });
  const result = await importContent(db);
  assert.equal(result.preserved, 1);
  assert.equal(db.doctor.rows[0].published, true);
  assert.equal(db.doctor.rows[0].fullBio, 'Existing approved profile');
});
test('review metadata never enters the public record', () => {
  assert.deepEqual(publicRecord({ title: 'Care', sourceFiles: 'private.docx', sourceKey: 'a', reviewNotes: 'Check' }), { title: 'Care' });
});
test('publication rejects unresolved review notes, empty pages and invalid slugs', () => {
  assert.throws(() => validatePublication('doctors', { published: true, reviewNotes: 'Confirm hospital' }), /review notes/);
  assert.throws(() => validatePublication('pages', { slug: 'valid-page', published: true, body: '' }), /page content/);
  assert.throws(() => validatePublication('pages', { slug: '../invalid' }), /Page address/);
  assert.doesNotThrow(() => validatePublication('pages', { slug: 'valid-page', published: true, body: 'Approved', reviewNotes: '' }));
});
test('shared doctors merge hospital assignments and flag folder conflicts', () => {
  const reshmy = pack.records.find((r) => r.collection === 'doctors' && /Reshmy/.test(r.data.name));
  assert.equal(reshmy.data.location, 'Cherthala, Alappuzha');
  assert.equal(reshmy.data.speciality, 'Reproductive Medicine');
  assert.match(reshmy.data.reviewNotes, /Radiodiagnosis/);
});
test('spreadsheet package prices and test counts remain intact', () => {
  const expected = [[5700,19],[3150,17],[4350,14],[2150,12],[2450,10],[1550,9]];
  const packages = pack.records.filter((r) => r.data.sourceFiles.includes('.xlsx'));
  assert.equal(packages.length, 6);
  packages.forEach((r, i) => {
    assert(r.data.excerpt.includes(String(expected[i][0])));
    assert.equal(r.data.body.split('\n').filter((line) => line.startsWith('- ')).length, expected[i][1]);
  });
});
test('import and admin collection endpoints require authentication', async () => {
  const express = require('express');
  const prismaPath = require.resolve('../src/lib/prisma');
  require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: database() };
  const app = express(); app.use(express.json());
  app.use('/api/website-import', require('../src/routes/websiteImport'));
  app.use('/api', require('../src/routes/collections'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    for (const [method, path] of [['GET','/website-import'],['POST','/website-import'],['GET','/pages/all'],['POST','/pages'],['PUT','/pages/1'],['DELETE','/pages/1']]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method });
      assert.equal(response.status, 401, `${method} ${path}`);
    }
  } finally { await new Promise((resolve) => server.close(resolve)); }
});


test('Kochi documents import as four editable drafts without internal notes in public copy', async () => {
  const pages = pack.records.filter((r) => r.data.category === 'Kochi Care');
  assert.equal(pages.length, 4);
  for (const { data } of pages) {
    assert.equal(data.location, 'Kochi');
    assert.equal(data.published, false);
    assert(data.reviewNotes.length > 0);
    assert.match(data.body, /## Frequently Asked Questions/);
    assert.doesNotMatch(data.body, /\[phone\]|Keyword research|Technical Notes|Structured for FAQPage|Opening paragraph/);
  }
  const db = database();
  await importContent(db);
  const page = db.contentPage.rows.find((r) => r.category === 'Kochi Care');
  page.body = 'Hospital-reviewed content'; page.published = true;
  const repeat = await importContent(db);
  assert.equal(repeat.created, 0);
  assert.equal(page.body, 'Hospital-reviewed content');
  assert.equal(page.published, true);
});
