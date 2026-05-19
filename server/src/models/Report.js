const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    scanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scan',
      required: true,
    },
    analysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analysis',
      required: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    patientInfo: {
      name: String,
      age: Number,
      gender: String,
      patientId: String,
      dateOfBirth: Date,
    },
    reportType: {
      type: String,
      enum: ['preliminary', 'final', 'addendum', 'critical'],
      default: 'preliminary',
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'reviewed', 'finalized', 'amended'],
      default: 'draft',
    },
    sections: {
      clinicalHistory: String,
      technique: String,
      findings: String,
      impression: String,
      recommendations: String,
      followUp: String,
      additionalNotes: String,
    },
    clinicalData: {
      symptoms: [String],
      referringPhysician: String,
      clinicalIndication: String,
      relevantHistory: String,
    },
    measurements: [
      {
        structure: String,
        measurement: String,
        unit: String,
        normal: Boolean,
        reference: String,
      },
    ],
    criticalFindings: [
      {
        finding: String,
        urgency: { type: String, enum: ['urgent', 'stat', 'routine'] },
        notified: Boolean,
        notifiedAt: Date,
        notifiedTo: String,
      },
    ],
    signature: {
      radiologist: String,
      credentials: String,
      date: Date,
      digitalSignature: String,
    },
    pdfPath: String,
    pdfGeneratedAt: Date,
    isSigned: { type: Boolean, default: false },
    isAmended: { type: Boolean, default: false },
    amendmentReason: String,
    amendedAt: Date,
    version: { type: Number, default: 1 },
    accessLog: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        action: { type: String, enum: ['viewed', 'downloaded', 'shared', 'printed'] },
        timestamp: { type: Date, default: Date.now },
        ip: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reportSchema.index({ scanId: 1 });
reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ status: 1 });

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
