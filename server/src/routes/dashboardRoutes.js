const express = require('express');
const router = express.Router();
const { getDashboardStats, getRecentActivity } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/stats', getDashboardStats);
router.get('/activity', getRecentActivity);

module.exports = router;
