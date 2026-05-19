const express = require('express');
const router = express.Router();
const { uploadScan, getScans, getScan, deleteScan, updateScan } = require('../controllers/scanController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');

router.use(protect);

router.route('/')
  .get(getScans)
  .post(uploadLimiter, upload.single('scan'), uploadScan);

router.route('/:id')
  .get(getScan)
  .put(updateScan)
  .delete(deleteScan);

module.exports = router;
