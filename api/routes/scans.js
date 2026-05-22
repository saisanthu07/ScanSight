const express = require('express');
const router = express.Router();
const multer = require('multer');
const Scan = require('../models/Scan');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const { analyzeScan } = require('../utils/aiAnalysis');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

async function runAndPersistAnalysis(scan, logLabel = 'Analysis', imageBuffer = null) {
  const result = await analyzeScan(
    scan.imageUrl,
    scan.scanType,
    scan.bodyPart,
    scan.clinicalNotes || '',
    scan.originalFilename || '',
    imageBuffer
  );

  const detectedConditions = [...new Set(
    (result.findings || []).map((finding) => finding.diseaseName).filter(Boolean)
  )];

  await Scan.findByIdAndUpdate(scan._id, {
    regions: result.regions,
    findings: result.findings,
    overallSeverity: result.overallSeverity,
    overallConfidence: result.overallConfidence,
    aiSummary: result.aiSummary,
    analysisSource: result.analysisSource || result.source || 'fallback',
    primaryDiagnosis: detectedConditions[0] || '',
    detectedConditions,
    analysisStatus: 'completed',
    analysisCompletedAt: new Date(),
  });

  console.log(`✅ ${logLabel} complete for scan ${scan._id} via ${result.analysisSource || result.source || 'fallback'}`);
}

// Multer config — memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'application/dicom'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.dcm')) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, TIFF, and DICOM files allowed'), false);
    }
  },
});

// GET /api/scans/analytics/overview  ← MUST be before /:id
router.get('/analytics/overview', auth, async (req, res) => {
  try {
    const doctorId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [bySeverity, byScanType, recentActivity] = await Promise.all([
      Scan.aggregate([
        { $match: { uploadedBy: doctorId } },
        { $group: { _id: '$overallSeverity', count: { $sum: 1 } } },
      ]),
      Scan.aggregate([
        { $match: { uploadedBy: doctorId } },
        { $group: { _id: '$scanType', count: { $sum: 1 } } },
      ]),
      Scan.aggregate([
        { $match: { uploadedBy: doctorId, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({ bySeverity, byScanType, recentActivity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scans
router.get('/', auth, async (req, res) => {
  try {
    const { patientId, status, analysisStatus, page = 1, limit = 20 } = req.query;
    const query = { uploadedBy: req.user._id };
    if (patientId) query.patient = patientId;
    if (analysisStatus) query.analysisStatus = analysisStatus;
    if (status) query.status = status;

    const scans = await Scan.find(query)
      .populate('patient', 'name patientId age gender')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-regions -aiSummary');

    const total = await Scan.countDocuments(query);
    res.json({ scans, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scans/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, uploadedBy: req.user._id })
      .populate('patient', 'name patientId age gender bloodGroup medicalHistory')
      .populate('uploadedBy', 'name specialization');
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    res.json({ scan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scans/upload
router.post('/upload', auth, upload.single('scan'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { patientId, scanType, bodyPart, priority, clinicalNotes, contrastUsed } = req.body;
    const patient = await Patient.findOne({ _id: patientId, assignedDoctor: req.user._id });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Upload to Cloudinary
    const cloudResult = await uploadToCloudinary(req.file.buffer, 'scansight/scans');

    // Create scan record
    const scan = await Scan.create({
      patient: patient._id,
      uploadedBy: req.user._id,
      scanType,
      bodyPart,
      priority: priority || 'routine',
      clinicalNotes: clinicalNotes || '',
      contrastUsed: contrastUsed === 'true',
      imageUrl: cloudResult.secure_url,
      imagePublicId: cloudResult.public_id,
      thumbnailUrl: cloudResult.secure_url.replace('/upload/', '/upload/w_400,q_auto/'),
      originalFilename: req.file.originalname,
      fileSize: req.file.size,
      analysisStatus: 'analyzing',
    });

    // Respond immediately, then analyze in background
    res.status(202).json({ scan, message: 'Scan uploaded. AI analysis in progress...' });

    // Background analysis
    setImmediate(async () => {
      try {
        await runAndPersistAnalysis(scan, 'Analysis', req.file.buffer);
      } catch (err) {
        await Scan.findByIdAndUpdate(scan._id, { analysisStatus: 'failed' });
        console.error('Analysis failed:', err.message);
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scans/reanalyze/bulk
router.post('/reanalyze/bulk', auth, async (req, res) => {
  try {
    const { analysisStatus } = req.body || {};
    const statuses = Array.isArray(analysisStatus)
      ? analysisStatus.filter(Boolean)
      : ['completed', 'failed'];

    const query = {
      uploadedBy: req.user._id,
      analysisStatus: { $in: statuses },
    };

    const scans = await Scan.find(query).select('_id imageUrl scanType bodyPart clinicalNotes originalFilename');
    if (!scans.length) {
      return res.json({ message: 'No scans matched for re-analysis', queued: 0 });
    }

    await Scan.updateMany(query, { $set: { analysisStatus: 'analyzing' } });
    res.status(202).json({ message: 'Bulk re-analysis started', queued: scans.length });

    setImmediate(async () => {
      for (const scan of scans) {
        try {
          await runAndPersistAnalysis(scan, 'Bulk re-analysis');
        } catch (err) {
          await Scan.findByIdAndUpdate(scan._id, { analysisStatus: 'failed' });
          console.error(`Bulk re-analysis failed for ${scan._id}:`, err.message);
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scans/:id/reanalyze
router.post('/:id/reanalyze', auth, async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, uploadedBy: req.user._id });
    if (!scan) return res.status(404).json({ error: 'Scan not found' });

    await Scan.findByIdAndUpdate(scan._id, { analysisStatus: 'analyzing' });
    res.json({ message: 'Re-analysis started' });

    setImmediate(async () => {
      try {
        await runAndPersistAnalysis(scan, 'Re-analysis');
      } catch (err) {
        await Scan.findByIdAndUpdate(scan._id, { analysisStatus: 'failed' });
        console.error('Re-analysis failed:', err.message);
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/scans/:id/notes
router.patch('/:id/notes', auth, async (req, res) => {
  try {
    const scan = await Scan.findOneAndUpdate(
      { _id: req.params.id, uploadedBy: req.user._id },
      { clinicalNotes: req.body.clinicalNotes, status: req.body.status || 'reviewed' },
      { new: true }
    );
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    res.json({ scan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/scans/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const scan = await Scan.findOneAndDelete({ _id: req.params.id, uploadedBy: req.user._id });
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    if (scan.imagePublicId) await deleteFromCloudinary(scan.imagePublicId);
    res.json({ message: 'Scan deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
