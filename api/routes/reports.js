const express = require('express');
const router = express.Router();
const Scan = require('../models/Scan');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');

// GET /api/reports/:scanId
router.get('/:scanId', auth, async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.scanId, uploadedBy: req.user._id })
      .populate('patient')
      .populate('uploadedBy', 'name specialization hospital licenseNumber');

    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    if (scan.analysisStatus !== 'completed') {
      return res.status(400).json({ error: 'Analysis not yet completed' });
    }

    const report = buildReport(scan, req.user);
    await Scan.findByIdAndUpdate(scan._id, { reportGenerated: true, status: 'reported' });
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildReport(scan, doctor) {
  const patient = scan.patient;
  const now = new Date();

  const severityToRisk = {
    normal: 'Low Risk',
    mild: 'Low-Moderate Risk',
    moderate: 'Moderate Risk',
    severe: 'High Risk',
    critical: 'Critical Risk',
  };

  const keyFindings = scan.findings.map((f, i) => ({
    number: i + 1,
    category: f.category,
    description: f.finding,
    severity: f.severity,
    confidence: `${(f.confidence * 100).toFixed(1)}%`,
    recommendation: f.recommendation,
  }));

  const urgentFindings = keyFindings.filter(f => ['severe', 'critical'].includes(f.severity));

  return {
    reportId: `RPT-${scan._id.toString().slice(-8).toUpperCase()}`,
    generatedAt: now.toISOString(),
    reportDate: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    reportTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),

    patient: {
      name: patient.name,
      patientId: patient.patientId,
      age: patient.age,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      medicalHistory: patient.medicalHistory || [],
    },

    physician: {
      name: doctor.name,
      specialization: doctor.specialization || 'Radiology',
      hospital: doctor.hospital || 'Medical Center',
      licenseNumber: doctor.licenseNumber || 'N/A',
    },

    scanDetails: {
      scanId: scan._id,
      scanType: scan.scanType,
      bodyPart: scan.bodyPart,
      studyDate: scan.studyDate ? new Date(scan.studyDate).toLocaleDateString() : 'N/A',
      priority: scan.priority,
      contrastUsed: scan.contrastUsed ? 'Yes' : 'No',
      imageUrl: scan.imageUrl,
    },

    aiAnalysis: {
      source: scan.analysisSource === 'nvidia-vista3d' ? 'NVIDIA VISTA-3D (AI-powered)' : 'ScanSight AI (Fallback)',
      overallSeverity: scan.overallSeverity,
      riskLevel: severityToRisk[scan.overallSeverity] || 'Unknown',
      overallConfidence: `${(scan.overallConfidence * 100).toFixed(1)}%`,
      totalFindings: scan.findings.length,
      urgentFindings: urgentFindings.length,
      completedAt: scan.analysisCompletedAt
        ? new Date(scan.analysisCompletedAt).toLocaleString()
        : 'N/A',
      primaryDiagnosis: scan.primaryDiagnosis || '',
      detectedConditions: scan.detectedConditions || [],
    },

    summary: scan.aiSummary,
    keyFindings,

    clinicalNotes: scan.clinicalNotes || 'No additional clinical notes provided.',

    recommendations: [
      ...new Set(scan.findings.map(f => f.recommendation).filter(Boolean)),
    ],

    disclaimer: 'This report is generated with AI assistance (ScanSight) and is intended to support, not replace, clinical judgment. All findings should be reviewed and validated by a qualified radiologist or physician. In case of urgent or critical findings, immediate clinical action should be taken.',

    regions: scan.regions,
  };
}

module.exports = router;
