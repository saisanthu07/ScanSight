const mongoose = require('mongoose');

const RegionSchema = new mongoose.Schema({
  label:          String,
  diseaseName:    String,   // e.g. "Glioblastoma Multiforme"
  detectionType:  String,   // e.g. "Brain Tumor", "Fracture", "Embolism"
  icdCode:        String,   // e.g. "C71.9"
  confidence:     Number,
  severity:       { type: String, enum: ['low', 'moderate', 'high', 'critical'] },
  description:    String,
  recommendation: String,
  x: Number, y: Number,
  width: Number, height: Number,
  color: String,
}, { _id: false });

const FindingSchema = new mongoose.Schema({
  category:       String,   // e.g. "Primary Brain Tumor"
  finding:        String,   // Detailed description
  diseaseName:    String,   // e.g. "Glioblastoma Multiforme (GBM)"
  detectionType:  String,   // e.g. "Brain Tumor (GBM)"
  icdCode:        String,   // ICD-10 code
  severity:       { type: String, enum: ['normal', 'mild', 'moderate', 'severe', 'critical'] },
  confidence:     Number,
  recommendation: String,
}, { _id: false });

const ScanSchema = new mongoose.Schema({
  patient:        { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  uploadedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  scanType:       { type: String, enum: ['CT', 'MRI', 'X-Ray', 'PET', 'Ultrasound'], required: true },
  bodyPart:       { type: String, required: true },
  imageUrl:       { type: String, required: true },
  imagePublicId:  { type: String },
  thumbnailUrl:   { type: String },
  originalFilename: { type: String },
  fileSize:       { type: Number },

  // AI Analysis Results
  analysisStatus: {
    type: String,
    enum: ['pending', 'analyzing', 'completed', 'failed'],
    default: 'pending',
  },
  analysisSource: {
    type: String,
    enum: ['nvidia-vista3d', 'fallback', 'manual'],
    default: 'fallback',
  },
  analysisCompletedAt: { type: Date },
  overallSeverity:  { type: String, enum: ['normal', 'mild', 'moderate', 'severe', 'critical'], default: 'normal' },
  overallConfidence: { type: Number, default: 0 },

  // Primary detected disease (summary)
  primaryDiagnosis:   { type: String, default: '' },  // Top disease name
  detectedConditions: [{ type: String }],             // All disease names

  regions:    [RegionSchema],
  findings:   [FindingSchema],
  aiSummary:  { type: String, default: '' },
  clinicalNotes: { type: String, default: '' },

  // Report
  reportGenerated: { type: Boolean, default: false },
  reportUrl: { type: String },

  // Metadata
  contrastUsed:   { type: Boolean, default: false },
  sliceThickness: { type: String },
  scannerModel:   { type: String },
  studyDate:      { type: Date, default: Date.now },
  priority: { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' },
  status:   { type: String, enum: ['pending', 'reviewed', 'reported', 'archived'], default: 'pending' },
}, { timestamps: true });

ScanSchema.index({ patient: 1, createdAt: -1 });
ScanSchema.index({ uploadedBy: 1, analysisStatus: 1 });
ScanSchema.index({ uploadedBy: 1, overallSeverity: 1 });

module.exports = mongoose.model('Scan', ScanSchema);
