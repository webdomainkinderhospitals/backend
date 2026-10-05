const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const Module = require('module');
const load = Module._load;
Module._load = function (request) {
  if (request === './prisma') return {};
  return load.apply(this, arguments);
};
const { enquiryRouter, validateEnquiry, rateLimiter } = require('../src/routes/enquiries');
const { bootstrapHelplineContacts, KEY } = require('../src/lib/bootstrapHelplineContacts');
Module._load = load;

// In-memory stand-in for the parts of Prisma the router uses.
function database() {
  const rows = [];
  return {
    rows,
    enquiry: {
      create: async ({ data }) => { const row = { id: rows.length + 1, status: 'new', notes: '', createdAt: new Date(), ...data }; rows.push(row); return row; },
      findMany: async ({ where = {} }) => rows.filter((r) => (!where.status || r.status === where.status) && (!where.type || r.type === where.type)).slice().reverse(),
      groupBy: async () => Object.entries(rows.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {})).map(([status, n]) => ({ status, _count: { _all: n } })),
      update: async ({ where, data }) => Object.assign(rows.find((r) => r.id === where.id), data),
      delete: async ({ where }) => rows.splice(rows.findIndex((r) => r.id === where.id), 1),
    },
  };
}

async function serve(db, options) {
  const app = express();
  app.use(express.json());
  app.use('/api/enquiries', enquiryRouter(db, options));
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api/enquiries`;
  const call = (path = '', { method = 'GET', body, token } = {}) =>
    fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }).then(async (r) => ({ status: r.status, json: await r.json() }));
  return { call, close: () => server.close() };
}

const booking = {
  type: 'appointment', hospital: 'Kochi', doctor: 'Dr. Manoj M', speciality: 'Orthopaedics & Sports Medicine',
  preferredDate: 'Fri 02 Oct', preferredTime: 'Morning', name: 'Anitha K', phone: '98470 12345', patientType: 'New patient',
};

test('a doctor booking from the website is stored for the admin', async () => {
  const db = database();
  const api = await serve(db);
  try {
    const res = await api.call('', { method: 'POST', body: booking });
    assert.equal(res.status, 201);
    assert.equal(db.rows.length, 1);
    assert.equal(db.rows[0].doctor, 'Dr. Manoj M');
    assert.equal(db.rows[0].status, 'new');
  } finally { api.close(); }
});

test('staff need to be signed in to read or change requests', async () => {
  const db = database();
  const api = await serve(db);
  const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
  try {
    await api.call('', { method: 'POST', body: booking });
    await api.call('', { method: 'POST', body: { type: 'callback', hospital: 'Kinder Hospitals Kollam', name: 'Ravi', phone: '+91 79944 45542' } });
    assert.equal((await api.call('')).status, 401);
    assert.equal((await api.call('/1', { method: 'PATCH', body: { status: 'closed' } })).status, 401);

    const list = await api.call('', { token });
    assert.equal(list.status, 200);
    assert.equal(list.json.items.length, 2);
    assert.equal(list.json.counts.new, 2);

    const updated = await api.call('/1', { method: 'PATCH', token, body: { status: 'confirmed', notes: 'Called back, 10:30 slot' } });
    assert.equal(updated.json.status, 'confirmed');
    assert.equal((await api.call('/1', { method: 'PATCH', token, body: { status: 'nonsense' } })).status, 400);
    assert.equal((await api.call('?type=callback', { token })).json.items.length, 1);
  } finally { api.close(); }
});

test('bad input is rejected with a message the visitor can act on', () => {
  assert.match(validateEnquiry({ ...booking, name: 'A' }).error, /name/);
  assert.match(validateEnquiry({ ...booking, phone: '123' }).error, /phone/);
  assert.match(validateEnquiry({ ...booking, email: 'not-an-email' }).error, /email/);
  assert.match(validateEnquiry({ ...booking, doctor: '' }).error, /doctor/);
  assert.equal(validateEnquiry({ ...booking, message: 'x'.repeat(5000) }).data.message.length, 2000);
  assert.equal(validateEnquiry({ ...booking, type: 'bogus' }).data.type, 'enquiry');
});

test('bots and floods are turned away', async () => {
  const db = database();
  const api = await serve(db, { limiter: rateLimiter({ max: 2, windowMs: 60000 }) });
  try {
    const bot = await api.call('', { method: 'POST', body: { ...booking, website: 'http://spam' } });
    assert.equal(bot.status, 201);
    assert.equal(db.rows.length, 0, 'honeypot submissions are not stored');
    await api.call('', { method: 'POST', body: booking });
    await api.call('', { method: 'POST', body: booking });
    assert.equal((await api.call('', { method: 'POST', body: booking })).status, 429);
  } finally { api.close(); }
});

test('the header contact numbers are seeded once, never over an admin edit', async () => {
  const rows = [];
  const db = { setting: {
    findUnique: async ({ where }) => rows.find((r) => r.key === where.key) || null,
    create: async ({ data }) => rows.push(data),
    upsert: async ({ where, update, create }) => { const r = rows.find((x) => x.key === where.key); if (r) Object.assign(r, update); else rows.push(create); },
  } };
  await bootstrapHelplineContacts(db);
  const lines = rows.find((r) => r.key === KEY).value.split('\n');
  assert.equal(lines.length, 4);
  assert.match(lines[0], /Cherthala & Alappuzha \| \+91 94466 54500 \| marketing@kinderhospital\.in/);

  rows.length = 0; rows.push({ key: KEY, value: 'Our own list | 123 | a@b.c' });
  await bootstrapHelplineContacts(db);
  assert.equal(rows.find((r) => r.key === KEY).value, 'Our own list | 123 | a@b.c');
});
