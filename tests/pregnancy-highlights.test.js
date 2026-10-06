const { test } = require('node:test');
const assert = require('node:assert/strict');
const { bootstrapPregnancyHighlights, PAGES, FLAG } = require('../src/lib/bootstrapPregnancyHighlights');
function database(initial = []) {
  let pages = structuredClone(initial), settings = [];
  const tx = {
    $executeRaw: async () => {},
    contentPage: {
      findFirst: async ({ where }) => pages.find((p) => where.OR.some((match) => Object.entries(match).every(([k, v]) => p[k] === v))),
      create: async ({ data }) => pages.push(structuredClone(data)),
    },
    setting: {
      findUnique: async ({ where }) => settings.find((s) => s.key === where.key),
      create: async ({ data }) => settings.push(structuredClone(data)),
    },
  };
  return { $transaction: async (fn) => {
    const before = [structuredClone(pages), structuredClone(settings)];
    try { return await fn(tx); } catch (e) { [pages, settings] = before; throw e; }
  }, get pages() { return pages; }, get settings() { return settings; }, tx };
}
test('startup preserves existing drafts and edits, and does not recreate hidden/deleted content on restart', async () => {
  const edited = { ...PAGES[0], title: 'Hospital edit', published: false };
  const db = database([edited]);
  await bootstrapPregnancyHighlights(db);
  assert.equal(db.pages.length, 7);
  assert.deepEqual(db.pages[0], edited);
  assert.equal(db.settings[0].key, FLAG);
  db.pages.splice(1, 1);
  await bootstrapPregnancyHighlights(db);
  assert.equal(db.pages.length, 6);
  assert.deepEqual(db.pages[0], edited);
});
test('an interrupted import rolls back and can be retried', async () => {
  const db = database();
  const create = db.tx.contentPage.create;
  let calls = 0;
  db.tx.contentPage.create = async (args) => { if (++calls === 3) throw new Error('failed'); return create(args); };
  await assert.rejects(bootstrapPregnancyHighlights(db), /failed/);
  assert.equal(db.pages.length, 0);
  assert.equal(db.settings.length, 0);
  db.tx.contentPage.create = create;
  await bootstrapPregnancyHighlights(db);
  assert.equal(db.pages.length, 7);
});
