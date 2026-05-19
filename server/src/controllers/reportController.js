const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Report = require('../models/Report');
const Analysis = require('../models/Analysis');
const Scan = require('../models/Scan');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @route   POST /api/reports/generate/:analysisId
 * @desc    Generate a medical report from analysis
 * @access  Private
 */
const generateReport = asyncHandler(async (req, res) => {
  const { analysisId } = req.params;
  const { clinicalHistory, symptoms, referringPhysician, additionalNotes } = req.body;

  const analysis = await Analysis.findById(analysisId).populate('scanId');
  if (!analysis) {
    return res.status(404).json({ success: false, message: 'Analysis not found.' });
  }

  if (analysis.status !== 'completed') {
    return res.status(400).json({ success: false, message: 'Analysis must be completed before generating report.' });
  }

  const scan = analysis.scanId;
  const results = analysis.results;

  // Build report sections from AI results
  const findings = buildFindingsText(results);
  const impression = buildImpressionText(results);

  const report = await Report.create({
    scanId: scan._id,
    analysisId: analysis._id,
    generatedBy: req.user.id,
    patientInfo: {
      name: scan.patientInfo?.name || 'Unknown',
      age: scan.patientInfo?.age,
      gender: scan.patientInfo?.gender,
      patientId: scan.patientInfo?.patientId,
    },
    reportType: 'preliminary',
    status: 'draft',
    sections: {
      clinicalHistory: clinicalHistory || 'Patient presented for imaging evaluation.',
      technique: `${scan.scanType} scan of the ${scan.bodyPart} was performed. AI-assisted segmentation and analysis performed using NVIDIA VISTA-3D.`,
      findings,
      impression,
      recommendations: results?.overallAssessment?.recommendations?.join('\n') || '',
      additionalNotes,
    },
    clinicalData: {
      symptoms: symptoms ? symptoms.split(',').map((s) => s.trim()) : [],
      referringPhysician,
    },
    measurements: buildMeasurements(results),
    criticalFindings: buildCriticalFindings(results),
  });

  // Generate PDF
  const pdfPath = await generatePDF(report, analysis, scan, req.user);
  await Report.findByIdAndUpdate(report._id, { pdfPath, pdfGeneratedAt: new Date() });

  // Log access
  await Report.findByIdAndUpdate(report._id, {
    $push: {
      accessLog: {
        userId: req.user.id,
        action: 'viewed',
        ip: req.ip,
      },
    },
  });

  logger.info(`Report generated: ${report._id} for scan ${scan._id}`);

  res.status(201).json({
    success: true,
    message: 'Medical report generated successfully.',
    data: { report: { ...report.toObject(), pdfPath } },
  });
});

/**
 * @route   GET /api/reports
 * @desc    Get all reports for user
 * @access  Private
 */
const getReports = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const query = { generatedBy: req.user.id };
  if (status) query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reports, total] = await Promise.all([
    Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('scanId', 'scanType bodyPart patientInfo')
      .lean(),
    Report.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      reports,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    },
  });
});

/**
 * @route   GET /api/reports/:id
 * @desc    Get single report
 * @access  Private
 */
const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate('generatedBy', 'name email role specialization')
    .populate('scanId', 'scanType bodyPart patientInfo createdAt')
    .populate('analysisId', 'results status');

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found.' });
  }

  // Log access
  await Report.findByIdAndUpdate(req.params.id, {
    $push: { accessLog: { userId: req.user.id, action: 'viewed', ip: req.ip } },
  });

  res.status(200).json({ success: true, data: { report } });
});

/**
 * @route   GET /api/reports/:id/pdf
 * @desc    Download report PDF
 * @access  Private
 */
const downloadPDF = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found.' });
  }

  if (!report.pdfPath || !fs.existsSync(report.pdfPath)) {
    return res.status(404).json({ success: false, message: 'PDF not found. Please regenerate.' });
  }

  await Report.findByIdAndUpdate(req.params.id, {
    $push: { accessLog: { userId: req.user.id, action: 'downloaded', ip: req.ip } },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-${report._id}.pdf"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const stream = fs.createReadStream(report.pdfPath);
  stream.pipe(res);
});

/**
 * @route   PUT /api/reports/:id
 * @desc    Update report sections
 * @access  Private
 */
const updateReport = asyncHandler(async (req, res) => {
  const allowedUpdates = ['sections', 'clinicalData', 'measurements', 'reportType', 'status'];
  const updates = {};
  allowedUpdates.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const report = await Report.findOneAndUpdate(
    { _id: req.params.id, generatedBy: req.user.id },
    updates,
    { new: true, runValidators: true }
  );

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found.' });
  }

  // Regenerate PDF
  const analysis = await Analysis.findById(report.analysisId);
  const scan = await Scan.findById(report.scanId);
  const pdfPath = await generatePDF(report, analysis, scan, req.user);
  await Report.findByIdAndUpdate(report._id, { pdfPath, pdfGeneratedAt: new Date() });

  res.status(200).json({ success: true, data: { report } });
});

// ─── PDF Generation ───────────────────────────────────────────────────────────
async function generatePDF(report, analysis, scan, user) {
  const reportsDir = path.join(process.env.UPLOAD_PATH || './uploads', 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const pdfPath = path.join(reportsDir, `report-${report._id}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // ── Header ──
    doc.rect(0, 0, 595, 80).fill('#0A0E1A');
    doc.fillColor('#00D4FF').fontSize(22).font('Helvetica-Bold')
      .text('AI Medical Scan Analyzer', 50, 20, { align: 'left' });
    doc.fillColor('#8892B0').fontSize(10)
      .text('Powered by NVIDIA VISTA-3D', 50, 48);
    doc.fillColor('#FFFFFF').fontSize(10)
      .text(`Report #${report._id.toString().slice(-8).toUpperCase()}`, 400, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 400, 45);

    doc.fillColor('#000000').fontSize(10);
    let y = 100;

    // ── Patient Info ──
    doc.rect(50, y, 495, 80).fillAndStroke('#F8F9FA', '#E9ECEF');
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('PATIENT INFORMATION', 60, y + 10);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${report.patientInfo?.name || 'N/A'}`, 60, y + 28);
    doc.text(`Age: ${report.patientInfo?.age || 'N/A'}`, 250, y + 28);
    doc.text(`Gender: ${report.patientInfo?.gender || 'N/A'}`, 380, y + 28);
    doc.text(`Patient ID: ${report.patientInfo?.patientId || 'N/A'}`, 60, y + 45);
    doc.text(`Scan Type: ${scan?.scanType || 'N/A'}`, 250, y + 45);
    doc.text(`Body Part: ${scan?.bodyPart || 'N/A'}`, 380, y + 45);

    y += 100;

    // ── AI Analysis Summary ──
    const assessment = analysis?.results?.overallAssessment;
    if (assessment) {
      const bgColor = assessment.severity === 'normal' ? '#E8F5E9' :
        assessment.severity === 'severe' || assessment.severity === 'critical' ? '#FFEBEE' : '#FFF8E1';
      doc.rect(50, y, 495, 60).fillAndStroke(bgColor, '#DEE2E6');
      doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('AI ANALYSIS SUMMARY', 60, y + 10);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Overall Assessment: ${assessment.severity?.toUpperCase() || 'N/A'}`, 60, y + 28);
      doc.text(`Urgency: ${assessment.urgency?.toUpperCase() || 'N/A'}`, 250, y + 28);
      doc.text(`AI Confidence: ${Math.round((assessment.aiConfidence || 0) * 100)}%`, 400, y + 28);
      y += 80;
    }

    // ── Sections ──
    const sections = [
      { title: 'CLINICAL HISTORY', content: report.sections?.clinicalHistory },
      { title: 'TECHNIQUE', content: report.sections?.technique },
      { title: 'FINDINGS', content: report.sections?.findings },
      { title: 'IMPRESSION', content: report.sections?.impression },
      { title: 'RECOMMENDATIONS', content: report.sections?.recommendations },
    ];

    sections.forEach(({ title, content }) => {
      if (!content) return;
      if (y > 700) { doc.addPage(); y = 50; }

      doc.fillColor('#1A237E').fontSize(11).font('Helvetica-Bold').text(title, 50, y);
      y += 16;
      doc.fillColor('#000').fontSize(10).font('Helvetica')
        .text(content, 50, y, { width: 495, lineGap: 4 });
      y += doc.heightOfString(content, { width: 495 }) + 20;
    });

    // ── Findings Table ──
    const findings = analysis?.results?.findings || [];
    if (findings.length > 0) {
      if (y > 650) { doc.addPage(); y = 50; }
      doc.fillColor('#1A237E').fontSize(11).font('Helvetica-Bold').text('IDENTIFIED FINDINGS', 50, y);
      y += 16;

      findings.forEach((f, i) => {
        if (y > 720) { doc.addPage(); y = 50; }
        doc.rect(50, y, 495, 28).fillAndStroke(i % 2 === 0 ? '#F5F5F5' : '#FFFFFF', '#E0E0E0');
        doc.fillColor('#000').fontSize(9).font('Helvetica');
        doc.text(`${i + 1}. ${f.label || f.type}`, 55, y + 5);
        doc.text(`Severity: ${f.severity || 'N/A'}`, 220, y + 5);
        doc.text(`Confidence: ${Math.round((f.confidence || 0) * 100)}%`, 340, y + 5);
        doc.text(`Region: ${f.location?.region || 'N/A'}`, 55, y + 16);
        y += 30;
      });
      y += 10;
    }

    // ── Footer ──
    const pageCount = doc.bufferedPageRange().count || 1;
    doc.page.margins.bottom = 30;
    doc.fillColor('#666').fontSize(8)
      .text(
        `Generated by AI Medical Scan Analyzer | Doctor: ${user.name} | ${new Date().toISOString()} | CONFIDENTIAL MEDICAL DOCUMENT`,
        50, 780, { align: 'center', width: 495 }
      );

    // ── Signature ──
    if (y < 700) {
      doc.fillColor('#000').fontSize(10).font('Helvetica-Bold').text('PHYSICIAN SIGNATURE:', 50, y + 20);
      doc.font('Helvetica').text(`Dr. ${user.name}`, 50, y + 38);
      if (user.specialization) doc.text(user.specialization, 50, y + 52);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, y + 66);
    }

    doc.end();
    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
  });
}

// ─── Helper builders ─────────────────────────────────────────────────────────
function buildFindingsText(results) {
  if (!results) return 'No significant findings.';
  const lines = [];

  if (results.findings?.length > 0) {
    results.findings.forEach((f, i) => {
      lines.push(`${i + 1}. ${f.label || f.type}: ${f.description || ''} (Confidence: ${Math.round((f.confidence || 0) * 100)}%, Severity: ${f.severity || 'N/A'})`);
    });
  }

  if (results.anatomy?.organs?.length > 0) {
    const abnormal = results.anatomy.organs.filter((o) => o.anomalies?.length > 0);
    if (abnormal.length > 0) {
      lines.push('\nAnatomical Observations:');
      abnormal.forEach((o) => {
        lines.push(`- ${o.name}: ${o.anomalies.join(', ')}`);
      });
    }
  }

  if (results.tumorDetection?.detected) {
    lines.push(`\nTumor Detection: ${results.tumorDetection.count} lesion(s) identified. Largest diameter: ${results.tumorDetection.largestDiameter}mm. Classification: ${results.tumorDetection.classification}`);
  }

  return lines.join('\n') || 'No significant findings identified.';
}

function buildImpressionText(results) {
  if (!results?.overallAssessment) return 'No significant findings.';
  const { summary, severity, urgency } = results.overallAssessment;
  return `${summary}\n\nOverall Severity: ${severity?.toUpperCase()}\nClinical Urgency: ${urgency?.toUpperCase()}`;
}

function buildMeasurements(results) {
  const measurements = [];
  if (results?.findings) {
    results.findings.forEach((f) => {
      if (f.measurements?.diameter) {
        measurements.push({
          structure: f.label || f.type,
          measurement: f.measurements.diameter.toString(),
          unit: 'mm',
          normal: f.severity === 'low',
        });
      }
    });
  }
  return measurements;
}

function buildCriticalFindings(results) {
  const critical = [];
  if (results?.findings) {
    results.findings
      .filter((f) => f.severity === 'critical' || f.severity === 'high')
      .forEach((f) => {
        critical.push({
          finding: f.label || f.type,
          urgency: f.severity === 'critical' ? 'stat' : 'urgent',
          notified: false,
        });
      });
  }
  return critical;
}

module.exports = { generateReport, getReports, getReport, downloadPDF, updateReport };
