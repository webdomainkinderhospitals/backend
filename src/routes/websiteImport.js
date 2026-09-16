const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { previewImport, importContent } = require('../lib/websiteImport');
const router = express.Router();
router.use(requireAuth);
router.get('/', async (req, res, next) => {
  try { res.json(await previewImport(prisma)); } catch (e) { next(e); }
});
router.post('/', async (req, res, next) => {
  try { res.json(await importContent(prisma)); } catch (e) { next(e); }
});
module.exports = router;
