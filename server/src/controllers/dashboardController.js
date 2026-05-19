const Scan = require('../models/Scan');
const Analysis = require('../models/Analysis');
const Report = require('../models/Report');
const Patient = require('../models/Patient');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

  const [
    totalScans,
    completedAnalyses,
    pendingAnalyses,
    totalReports,
    totalPatients,
    scansThisMonth,
    recentScans,
    urgentCases,
    scansByType,
    scansByStatus,
    weeklyTrend,
    recentActivity,
  ] = await Promise.all([
    Scan.countDocuments({ userId }),
    Analysis.countDocuments({ userId, status: 'completed' }),
    Analysis.countDocuments({ userId, status: { $in: ['pending', 'processing'] } }),
    Report.countDocuments({ generatedBy: userId }),
    Patient.countDocuments({ createdBy: userId }),
    Scan.countDocuments({ userId, createdAt: { $gte: startOfMonth } }),
    Scan.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    Analysis.countDocuments({
      userId,
      'results.overallAssessment.urgency': { $in: ['urgent', 'emergency'] },
      status: 'completed',
    }),
    Scan.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId) } },
      { $group: { _id: '$scanType', count: { $sum: 1 } } },
    ]),
    Scan.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Scan.aggregate([
      {
        $match: {
          userId: require('mongoose').Types.ObjectId.createFromHexString(userId),
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Scan.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('patientInfo scanType status createdAt bodyPart')
      .lean(),
  ]);

  // Format weekly trend
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyData = days.map((day, index) => {
    const found = weeklyTrend.find((w) => w._id === index + 1);
    return { day, scans: found?.count || 0 };
  });

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalScans,
        completedAnalyses,
        pendingAnalyses,
        totalReports,
        totalPatients,
        scansThisMonth,
        urgentCases,
        analysisRate: totalScans > 0 ? Math.round((completedAnalyses / totalScans) * 100) : 0,
      },
      charts: {
        scansByType: scansByType.map((s) => ({ type: s._id, count: s.count })),
        scansByStatus: scansByStatus.map((s) => ({ status: s._id, count: s.count })),
        weeklyTrend: weeklyData,
      },
      recentScans: recentScans.slice(0, 5),
      recentActivity: recentActivity.map((s) => ({
        id: s._id,
        type: 'scan',
        description: `${s.scanType} scan of ${s.bodyPart}`,
        patient: s.patientInfo?.name || 'Anonymous',
        status: s.status,
        time: s.createdAt,
      })),
    },
  });
});

/**
 * @route   GET /api/dashboard/activity
 * @desc    Get recent activity feed
 * @access  Private
 */
const getRecentActivity = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20 } = req.query;

  const [recentScans, recentAnalyses, recentReports] = await Promise.all([
    Scan.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
    Analysis.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
    Report.find({ generatedBy: userId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const activity = [
    ...recentScans.map((s) => ({
      type: 'scan_upload',
      icon: 'upload',
      description: `Uploaded ${s.scanType} scan`,
      patient: s.patientInfo?.name || 'Anonymous',
      time: s.createdAt,
      id: s._id,
    })),
    ...recentAnalyses
      .filter((a) => a.status === 'completed')
      .map((a) => ({
        type: 'analysis_complete',
        icon: 'brain',
        description: 'AI Analysis completed',
        time: a.completedAt || a.createdAt,
        id: a._id,
      })),
    ...recentReports.map((r) => ({
      type: 'report_generated',
      icon: 'report',
      description: 'Medical report generated',
      patient: r.patientInfo?.name || 'Anonymous',
      time: r.createdAt,
      id: r._id,
    })),
  ];

  activity.sort((a, b) => new Date(b.time) - new Date(a.time));

  res.status(200).json({
    success: true,
    data: { activity: activity.slice(0, parseInt(limit)) },
  });
});

module.exports = { getDashboardStats, getRecentActivity };
