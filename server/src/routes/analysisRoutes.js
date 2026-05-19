const express = require('express');
const router = express.Router();
const { startAnalysis, getAnalysis, getAnalysisStatus, getAnalysisResults, reviewAnalysis } = require('../controllers/analysisController');
const { protect, authorize } = require('../middleware/auth');
const { analysisLimiter } = require('../middleware/rateLimiter');

router.use(protect);

router.post('/start/:scanId', analysisLimiter, startAnalysis);
router.get('/scan/:scanId', getAnalysis);
router.get('/status/:analysisId', getAnalysisStatus);
router.get('/results/:analysisId', getAnalysisResults);
router.post('/:analysisId/review', authorize('doctor', 'radiologist', 'admin'), reviewAnalysis);

module.exports = router;
