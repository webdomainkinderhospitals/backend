const { test } = require('node:test');
const assert = require('node:assert/strict');

// A cold Neon endpoint refuses the first queries; the startup tasks must wait
// for it rather than failing the bootstraps they exist to run.
const Module = require('module');
const load = Module._load;
let fakePrisma;
Module._load = function (request) {
  if (request === './prisma') return fakePrisma;
  return load.apply(this, arguments);
};
fakePrisma = {};
const { waitForDatabase } = require('../src/lib/startupTasks');
Module._load = load;

test('waits out a database that is still waking up', async () => {
  let calls = 0;
  fakePrisma.$queryRaw = async () => {
    if (++calls < 4) throw new Error("Can't reach database server");
    return [{ ok: 1 }];
  };
  await waitForDatabase({ attempts: 8, baseDelayMs: 1 });
  assert.equal(calls, 4, 'retried until the database answered');
});

test('returns immediately when the database is already warm', async () => {
  let calls = 0;
  fakePrisma.$queryRaw = async () => { calls++; return [{ ok: 1 }]; };
  await waitForDatabase({ attempts: 8, baseDelayMs: 1000 });
  assert.equal(calls, 1, 'no retry cost on a warm database');
});

test('gives up after the last attempt and reports why', async () => {
  let calls = 0;
  fakePrisma.$queryRaw = async () => { calls++; throw new Error("Can't reach database server"); };
  await assert.rejects(
    () => waitForDatabase({ attempts: 3, baseDelayMs: 1 }),
    /Can't reach database server/
  );
  assert.equal(calls, 3);
});
