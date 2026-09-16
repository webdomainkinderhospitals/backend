require('dotenv').config();
const prisma = require('../src/lib/prisma');
const { previewImport, importContent } = require('../src/lib/websiteImport');
(async () => {
  const result = process.argv.includes('--apply') ? await importContent(prisma) : await previewImport(prisma);
  console.log(JSON.stringify(result, null, 2));
})().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
