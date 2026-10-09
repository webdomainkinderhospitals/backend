// The homepage numbers, as the hospital asked on 9 Oct 2026: births become
// "30K+", and "32K+ Surgeries Performed" is added after births. Only the
// numbers saved in the admin (Site Settings → Homepage statistics) are
// touched — when none are saved, the website's own defaults already say this.
// Runs once; later edits in the admin are kept.
const prisma = require('./prisma');

const FLAG = 'bootstrap.homeStats.v1';
const KEY = 'stats';
const SURGERIES = { label: 'Surgeries Performed', value: '32K+' };

function updatedStats(stats) {
  if (!Array.isArray(stats) || !stats.length) return stats;
  const out = stats.map((s) => (s && /birth/i.test(String(s.label || '')) ? { ...s, value: '30K+' } : s));
  if (!out.some((s) => s && /surg/i.test(String(s.label || '')))) {
    const births = out.findIndex((s) => s && /birth/i.test(String(s.label || '')));
    out.splice(births === -1 ? out.length : births + 1, 0, SURGERIES);
  }
  return out;
}

async function bootstrapHomeStats(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  const row = await db.setting.findUnique({ where: { key: KEY } });
  if (row && Array.isArray(row.value) && row.value.length) {
    await db.setting.update({ where: { key: KEY }, data: { value: updatedStats(row.value) } });
    console.log('Updated the homepage numbers (births 30K+, surgeries 32K+)');
  }
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapHomeStats, updatedStats };
