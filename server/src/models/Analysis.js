const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['tumor', 'lesion', 'nodule', 'mass', 'calcification', 'effusion', 'hemorrhage', 'other'],
    required: true,
  },
  label: String,
  confidence: { type: Number, min: 0, max: 1 },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  location: {
    region: String,
    coordinates: {
      x: Number,
      y: Number,
      z: Number,
    },
    boundingBox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
  },
  measurements: {
    volume: Number, // cm³
    diameter: Number, // mm
    area: Number, // mm²
    hounsfield: Number, // HU for CT
  },
  description: String,
  segmentationMask: String, // path to mask file
  color: String, // visualization color
});

const analysisSchema = new mongoose.Schema(
  {
    scanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scan',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    analysisType: {
      type: String,
      enum: ['segmentation', 'detection', 'classification', 'full'],
      default: 'full',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    nvidiaJobId: String,
    nvidiaRequestId: String,
    model: {
      name: { type: String, default: 'NVIDIA VISTA-3D' },
      version: String,
      endpoint: String,
    },
    results: {
      segmentation: {
        masks: [
          {
            label: String,
            maskPath: String,
            color: String,
            opacity: Number,
            volumeCC: Number,
          },
        ],
        totalSegments: Number,
        processingTime: Number,
      },
      findings: [findingSchema],
      tumorDetection: {
        detected: Boolean,
        count: Number,
        totalVolume: Number,
        largestDiameter: Number,
        malignancyScore: Number,
        classification: String,
      },
      anatomy: {
        organs: [
          {
            name: String,
            present: Boolean,
            volume: Number,
            anomalies: [String],
          },
        ],
      },
      overallAssessment: {
        severity: { type: String, enum: ['normal', 'mild', 'moderate', 'severe', 'critical'] },
        urgency: { type: String, enum: ['routine', 'urgent', 'emergency'] },
        summary: String,
        recommendations: [String],
        aiConfidence: Number,
      },
    },
    visualizationData: {
      meshFiles: [String], // 3D mesh .obj/.ply files
      slices: [String],
      thumbnailPath: String,
      colorMap: mongoose.Schema.Types.Mixed,
    },
    rawResponse: mongoose.Schema.Types.Mixed,
    errorMessage: String,
    errorCode: String,
    startedAt: Date,
    completedAt: Date,
    processingDurationMs: Number,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewNotes: String,
    isReviewed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


analysisSchema.index({ userId: 1, createdAt: -1 });
analysisSchema.index({ status: 1 });

const Analysis = mongoose.model('Analysis', analysisSchema);
module.exports = Analysis;
