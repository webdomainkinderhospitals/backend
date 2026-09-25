// Startup bootstraps, run once the database is actually reachable.
//
// Neon suspends a database that has been idle and Cloud Run scales to zero, so
// a cold start routinely reaches `app.listen` before the database can answer.
// Firing the bootstraps there means every one of them fails on a dead socket
// and the centre they were meant to create never appears. Waiting for the
// first successful query fixes that, and running the tasks one after another
// keeps a waking database from being hit by three connections at once.
const prisma = require('./prisma');

// Neon typically wakes in a few seconds; the backoff below allows about two
// minutes before giving up, which costs nothing when the database is warm.
async function waitForDatabase({ attempts = 8, baseDelayMs = 1500 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      if (attempt > 1) console.log(`Database reachable after ${attempt} attempts`);
      return;
    } catch (e) {
      if (attempt >= attempts) throw e;
      const delay = baseDelayMs * attempt;
      console.log(`Database not reachable yet (attempt ${attempt}/${attempts}), retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

const TASKS = [
  ['Speciality', () => require('./bootstrapSpecialities').bootstrapSpecialities()],
  ['Aranmula', () => require('./bootstrapAranmula').bootstrapAranmula()],
  ['Kollam', () => require('./bootstrapKollam').bootstrapKollam()],
  ['Elevation', () => require('./bootstrapElevations').bootstrapElevations()],
  ['Promo banner', () => require('./bootstrapPromoBanners').bootstrapPromoBanners()],
  ['Kochi first', () => require('./bootstrapKochiFirst').bootstrapKochiFirst()],
  ['Alappuzha clinic', () => require('./bootstrapAlappuzhaClinic').bootstrapAlappuzhaClinic()],
];

// Never throws: a failed bootstrap is logged and the API keeps serving.
async function runStartupTasks() {
  try {
    await waitForDatabase();
  } catch (e) {
    console.error('Skipping startup bootstraps — database unreachable:', e.message);
    return;
  }
  for (const [name, run] of TASKS) {
    try {
      await run();
    } catch (e) {
      console.error(`${name} bootstrap failed:`, e.message);
    }
  }
}

module.exports = { runStartupTasks, waitForDatabase };
