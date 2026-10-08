// Leadership, as the hospital asked: the group's leaders in the order
// Dr V K Pradeep Kumar, Mr Renjith Krishnan, Mr Basanta Kumar Dash; and
// Mr Anto Twinkle presented with Kinder Kochi rather than the group.
//
// Runs once. After that the pages' Display order and Location fields in the
// admin Content Library decide, so later edits there are never undone.
const prisma = require('./prisma');

const FLAG = 'bootstrap.leadership.v1';
const GROUP_ORDER = ['leadership-dr-v-k-pradeep-kumar', 'leadership-mr-renjith-krishnan', 'leadership-mr-basanta-kumar-dash'];
const KOCHI = 'leadership-mr-anto-twinkle';

async function bootstrapLeadership(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  for (const [i, slug] of GROUP_ORDER.entries()) {
    const page = await db.contentPage.findUnique({ where: { slug } });
    if (page && page.sortOrder !== i + 1) await db.contentPage.update({ where: { slug }, data: { sortOrder: i + 1 } });
  }
  const anto = await db.contentPage.findUnique({ where: { slug: KOCHI } });
  if (anto && !String(anto.location || '').trim()) await db.contentPage.update({ where: { slug: KOCHI }, data: { location: 'Kochi' } });
  console.log('Ordered the leadership pages and placed Mr Anto Twinkle with Kinder Kochi');
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapLeadership, GROUP_ORDER, KOCHI, FLAG };
