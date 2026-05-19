const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { asyncHandler } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(protect);

// GET all patients
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  const query = { createdBy: req.user.id, isActive: true };
  if (search) {
    query.$or = [
      { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
      { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
      { patientId: { $regex: search, $options: 'i' } },
    ];
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [patients, total] = await Promise.all([
    Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Patient.countDocuments(query),
  ]);
  res.status(200).json({
    success: true,
    data: { patients, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } },
  });
}));

// POST create patient
router.post('/', asyncHandler(async (req, res) => {
  const patientId = `PT-${uuidv4().slice(0, 8).toUpperCase()}`;
  const patient = await Patient.create({ ...req.body, patientId, createdBy: req.user.id });
  res.status(201).json({ success: true, data: { patient } });
}));

// GET single patient
router.get('/:id', asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, createdBy: req.user.id });
  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
  res.status(200).json({ success: true, data: { patient } });
}));

// PUT update patient
router.put('/:id', asyncHandler(async (req, res) => {
  const patient = await Patient.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user.id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
  res.status(200).json({ success: true, data: { patient } });
}));

// DELETE patient (soft delete)
router.delete('/:id', asyncHandler(async (req, res) => {
  await Patient.findOneAndUpdate({ _id: req.params.id, createdBy: req.user.id }, { isActive: false });
  res.status(200).json({ success: true, message: 'Patient removed.' });
}));

module.exports = router;
