const express = require('express');
const router = express.Router();
const { generateReport, getReports, getReport, downloadPDF, updateReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getReports);
router.post('/generate/:analysisId', generateReport);
router.route('/:id').get(getReport).put(updateReport);
router.get('/:id/pdf', downloadPDF);

module.exports = router;
