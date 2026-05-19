const Analysis = require('../models/Analysis');
const Scan = require('../models/Scan');
const nvidiaService = require('../services/nvidiaVista3D');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @route   POST /api/analysis/start/:scanId
 * @desc    Start AI analysis for a scan
 * @access  Private
 */
const startAnalysis = asyncHandler(async (req, res) => {
  const { scanId } = req.params;
  const { analysisType = 'full', priority } = req.body;

  const scan = await Scan.findById(scanId);
  if (!scan) {
    return res.status(404).json({ success: false, message: 'Scan not found.' });
  }

  // Check ownership
  if (scan.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  // Check if already analyzing
  const existingAnalysis = await Analysis.findOne({ scanId, status: { $in: ['pending', 'processing'] } });
  if (existingAnalysis) {
    return res.status(409).json({
      success: false,
      message: 'Analysis already in progress for this scan.',
      data: { analysisId: existingAnalysis._id },
    });
  }

  // Create analysis record
  const analysis = await Analysis.create({
    scanId,
    userId: req.user.id,
    analysisType,
    status: 'pending',
    progress: 0,
    model: {
      name: 'NVIDIA VISTA-3D',
      version: '1.0',
      endpoint: process.env.NVIDIA_VISTA3D_ENDPOINT,
    },
  });

  // Update scan status
  await Scan.findByIdAndUpdate(scanId, {
    status: 'processing',
    processingStartedAt: new Date(),
  });

  const io = req.app.get('io');

  // Start analysis asynchronously
  processAnalysisAsync(analysis._id, scan, req.user.id, io).catch((err) => {
    logger.error(`Async analysis failed: ${err.message}`);
  });

  res.status(202).json({
    success: true,
    message: 'Analysis started. Track progress via WebSocket.',
    data: {
      analysisId: analysis._id,
      scanId,
      status: 'pending',
    },
  });
});

/**
 * Process analysis asynchronously with Socket.IO progress updates
 */
async function processAnalysisAsync(analysisId, scan, userId, io) {
  const emitProgress = (progress, message, status = 'processing') => {
    if (io) {
      io.to(`analysis-${analysisId}`).emit('analysis-progress', {
        analysisId,
        scanId: scan._id,
        progress,
        message,
        status,
      });
    }
    logger.debug(`Analysis ${analysisId}: ${progress}% - ${message}`);
  };

  try {
    await Analysis.findByIdAndUpdate(analysisId, {
      status: 'processing',
      startedAt: new Date(),
      progress: 5,
    });

    emitProgress(5, 'Initializing AI model...');
    await sleep(500);

    emitProgress(15, 'Preprocessing scan data...');
    await Analysis.findByIdAndUpdate(analysisId, { progress: 15 });
    await sleep(800);

    emitProgress(30, 'Running NVIDIA VISTA-3D segmentation...');
    await Analysis.findByIdAndUpdate(analysisId, { progress: 30 });

    // Run the actual NVIDIA analysis
    const results = await nvidiaService.analyzeScan(scan.filePath, {
      bodyPart: scan.bodyPart,
      scanType: scan.scanType,
      analysisType: 'full',
    });

    emitProgress(75, 'Processing segmentation results...');
    await Analysis.findByIdAndUpdate(analysisId, { progress: 75 });
    await sleep(500);

    emitProgress(90, 'Generating 3D visualization data...');
    await Analysis.findByIdAndUpdate(analysisId, { progress: 90 });
    await sleep(500);

    const completedAt = new Date();
    const startedAt = (await Analysis.findById(analysisId)).startedAt;
    const duration = completedAt - startedAt;

    await Analysis.findByIdAndUpdate(analysisId, {
      status: 'completed',
      progress: 100,
      results,
      completedAt,
      processingDurationMs: duration,
    });

    await Scan.findByIdAndUpdate(scan._id, {
      status: 'completed',
      processingCompletedAt: completedAt,
    });

    emitProgress(100, 'Analysis complete!', 'completed');

    if (io) {
      io.to(`analysis-${analysisId}`).emit('analysis-complete', {
        analysisId,
        scanId: scan._id,
        results,
      });
    }

    logger.info(`✅ Analysis ${analysisId} completed in ${Math.round(duration / 1000)}s`);
  } catch (error) {
    logger.error(`❌ Analysis ${analysisId} failed: ${error.message}`);

    await Analysis.findByIdAndUpdate(analysisId, {
      status: 'failed',
      errorMessage: error.message,
      errorCode: error.code,
      completedAt: new Date(),
    });

    await Scan.findByIdAndUpdate(scan._id, { status: 'failed' });

    emitProgress(0, `Analysis failed: ${error.message}`, 'failed');
  }
}

/**
 * @route   GET /api/analysis/:scanId
 * @desc    Get analysis for a scan
 * @access  Private
 */
const getAnalysis = asyncHandler(async (req, res) => {
  const { scanId } = req.params;

  const analysis = await Analysis.findOne({ scanId }).sort({ createdAt: -1 }).populate('scanId', 'scanType bodyPart patientInfo');

  if (!analysis) {
    return res.status(404).json({ success: false, message: 'No analysis found for this scan.' });
  }

  res.status(200).json({ success: true, data: { analysis } });
});

/**
 * @route   GET /api/analysis/status/:analysisId
 * @desc    Get analysis status
 * @access  Private
 */
const getAnalysisStatus = asyncHandler(async (req, res) => {
  const analysis = await Analysis.findById(req.params.analysisId).select(
    'status progress startedAt completedAt processingDurationMs errorMessage'
  );

  if (!analysis) {
    return res.status(404).json({ success: false, message: 'Analysis not found.' });
  }

  res.status(200).json({ success: true, data: { analysis } });
});

/**
 * @route   GET /api/analysis/results/:analysisId
 * @desc    Get full analysis results
 * @access  Private
 */
const getAnalysisResults = asyncHandler(async (req, res) => {
  const analysis = await Analysis.findById(req.params.analysisId)
    .populate('scanId', 'scanType bodyPart patientInfo filePath')
    .populate('userId', 'name email role');

  if (!analysis) {
    return res.status(404).json({ success: false, message: 'Analysis not found.' });
  }

  if (analysis.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  res.status(200).json({ success: true, data: { analysis } });
});

/**
 * @route   POST /api/analysis/:analysisId/review
 * @desc    Add doctor review to analysis
 * @access  Private (doctors/radiologists)
 */
const reviewAnalysis = asyncHandler(async (req, res) => {
  const { notes, overrideFindings } = req.body;

  const analysis = await Analysis.findByIdAndUpdate(
    req.params.analysisId,
    {
      isReviewed: true,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      reviewNotes: notes,
      ...(overrideFindings && { 'results.findings': overrideFindings }),
    },
    { new: true }
  );

  if (!analysis) {
    return res.status(404).json({ success: false, message: 'Analysis not found.' });
  }

  res.status(200).json({
    success: true,
    message: 'Analysis reviewed successfully.',
    data: { analysis },
  });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { startAnalysis, getAnalysis, getAnalysisStatus, getAnalysisResults, reviewAnalysis };
