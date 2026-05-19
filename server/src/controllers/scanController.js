const path = require('path');
const fs = require('fs');
const Scan = require('../models/Scan');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @route   POST /api/scans/upload
 * @desc    Upload a new CT scan
 * @access  Private
 */
const uploadScan = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const { scanType, bodyPart, patientName, patientAge, patientGender, patientId, notes, priority } = req.body;

  if (!scanType) {
    // Clean up uploaded file
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, message: 'Scan type is required.' });
  }

  const scan = await Scan.create({
    userId: req.user.id,
    scanType,
    bodyPart: bodyPart || 'other',
    patientInfo: {
      name: patientName,
      age: patientAge ? parseInt(patientAge) : undefined,
      gender: patientGender,
      patientId,
    },
    originalFilename: req.file.originalname,
    storedFilename: req.file.filename,
    filePath: req.file.path,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    notes,
    priority: priority || 'normal',
    status: 'uploaded',
  });

  // Update user stats
  await User.findByIdAndUpdate(req.user.id, { $inc: { 'stats.totalScans': 1 } });

  logger.info(`Scan uploaded: ${scan._id} by user ${req.user.id}`);

  res.status(201).json({
    success: true,
    message: 'Scan uploaded successfully.',
    data: { scan },
  });
});

/**
 * @route   GET /api/scans
 * @desc    Get all scans for the current user
 * @access  Private
 */
const getScans = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    scanType,
    bodyPart,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search,
  } = req.query;

  const query = { userId: req.user.id, isArchived: false };

  if (status) query.status = status;
  if (scanType) query.scanType = scanType;
  if (bodyPart) query.bodyPart = bodyPart;
  if (search) {
    query.$or = [
      { 'patientInfo.name': { $regex: search, $options: 'i' } },
      { 'patientInfo.patientId': { $regex: search, $options: 'i' } },
      { originalFilename: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [scans, total] = await Promise.all([
    Scan.find(query).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
    Scan.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      scans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * @route   GET /api/scans/:id
 * @desc    Get a single scan
 * @access  Private
 */
const getScan = asyncHandler(async (req, res) => {
  const scan = await Scan.findById(req.params.id);

  if (!scan) {
    return res.status(404).json({ success: false, message: 'Scan not found.' });
  }

  // Check ownership or sharing
  const hasAccess =
    scan.userId.toString() === req.user.id ||
    scan.sharedWith.some((s) => s.userId.toString() === req.user.id) ||
    req.user.role === 'admin';

  if (!hasAccess) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  // Get associated analysis
  const analysis = await Analysis.findOne({ scanId: scan._id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: { scan, analysis },
  });
});

/**
 * @route   DELETE /api/scans/:id
 * @desc    Delete a scan
 * @access  Private
 */
const deleteScan = asyncHandler(async (req, res) => {
  const scan = await Scan.findById(req.params.id);

  if (!scan) {
    return res.status(404).json({ success: false, message: 'Scan not found.' });
  }

  if (scan.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  // Delete file from disk
  if (fs.existsSync(scan.filePath)) {
    fs.unlink(scan.filePath, (err) => {
      if (err) logger.warn(`Failed to delete file: ${scan.filePath}`);
    });
  }

  // Delete associated analyses
  await Analysis.deleteMany({ scanId: scan._id });

  await scan.deleteOne();

  res.status(200).json({ success: true, message: 'Scan deleted successfully.' });
});

/**
 * @route   PATCH /api/scans/:id
 * @desc    Update scan metadata
 * @access  Private
 */
const updateScan = asyncHandler(async (req, res) => {
  const allowedUpdates = ['notes', 'priority', 'tags', 'patientInfo', 'bodyPart'];
  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const scan = await Scan.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    updates,
    { new: true, runValidators: true }
  );

  if (!scan) {
    return res.status(404).json({ success: false, message: 'Scan not found.' });
  }

  res.status(200).json({ success: true, data: { scan } });
});

module.exports = { uploadScan, getScans, getScan, deleteScan, updateScan };
