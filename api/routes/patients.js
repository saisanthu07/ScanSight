const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const Patient = require('../models/Patient');
const Scan = require('../models/Scan');
const auth = require('../middleware/auth');

// GET /api/patients
router.get('/', auth, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const query = { assignedDoctor: req.user._id };
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
      ];
    }
    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Patient.countDocuments(query);
    res.json({ patients, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, assignedDoctor: req.user._id });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const scans = await Scan.find({ patient: patient._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-regions -findings');

    res.json({ patient, scans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients
router.post('/', auth, [
  body('name').trim().notEmpty(),
  body('age').isInt({ min: 0, max: 130 }),
  body('gender').isIn(['Male', 'Female', 'Other']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const patient = await Patient.create({
      ...req.body,
      patientId: `PAT-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`,
      assignedDoctor: req.user._id,
    });
    res.status(201).json({ patient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/patients/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, assignedDoctor: req.user._id },
      req.body,
      { new: true }
    );
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json({ patient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/patients/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findOneAndDelete({ _id: req.params.id, assignedDoctor: req.user._id });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/stats/summary
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const doctorId = req.user._id;
    const [total, active, critical] = await Promise.all([
      Patient.countDocuments({ assignedDoctor: doctorId }),
      Patient.countDocuments({ assignedDoctor: doctorId, status: 'active' }),
      Patient.countDocuments({ assignedDoctor: doctorId, status: 'critical' }),
    ]);
    const [totalScans, pendingScans, recentScans] = await Promise.all([
      Scan.countDocuments({ uploadedBy: doctorId }),
      Scan.countDocuments({ uploadedBy: doctorId, analysisStatus: 'pending' }),
      Scan.find({ uploadedBy: doctorId }).sort({ createdAt: -1 }).limit(5)
        .populate('patient', 'name patientId age gender'),
    ]);
    res.json({ total, active, critical, totalScans, pendingScans, recentScans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
