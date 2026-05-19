const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    patientInfo: {
      name: { type: String, trim: true },
      age: Number,
      gender: { type: String, enum: ['male', 'female', 'other', ''] },
      patientId: String,
    },
    scanType: {
      type: String,
      enum: ['CT', 'MRI', 'X-Ray', 'PET', 'Ultrasound', 'Other'],
      required: [true, 'Scan type is required'],
    },
    bodyPart: {
      type: String,
      enum: ['brain', 'chest', 'abdomen', 'pelvis', 'spine', 'extremity', 'whole-body', 'other'],
      default: 'other',
    },
    originalFilename: {
      type: String,
      required: true,
    },
    storedFilename: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: String,
    status: {
      type: String,
      enum: ['uploaded', 'queued', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'uploaded',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    tags: [String],
    metadata: {
      modality: String,
      studyDate: Date,
      institutionName: String,
      manufacturer: String,
      sliceThickness: Number,
      pixelSpacing: [Number],
      dimensions: {
        width: Number,
        height: Number,
        depth: Number,
      },
    },
    processingStartedAt: Date,
    processingCompletedAt: Date,
    processingDuration: Number, // milliseconds
    isArchived: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        permission: { type: String, enum: ['view', 'edit'], default: 'view' },
        sharedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

scanSchema.index({ userId: 1, createdAt: -1 });
scanSchema.index({ status: 1 });
scanSchema.index({ scanType: 1 });
scanSchema.index({ bodyPart: 1 });

scanSchema.virtual('processingTime').get(function () {
  if (this.processingStartedAt && this.processingCompletedAt) {
    return this.processingCompletedAt - this.processingStartedAt;
  }
  return null;
});

const Scan = mongoose.model('Scan', scanSchema);
module.exports = Scan;
