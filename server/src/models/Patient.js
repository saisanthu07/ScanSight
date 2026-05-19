const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      unique: true,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    personalInfo: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      dateOfBirth: Date,
      gender: { type: String, enum: ['male', 'female', 'other'] },
      bloodType: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''] },
    },
    contact: {
      phone: String,
      email: String,
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String,
      },
      emergencyContact: {
        name: String,
        relation: String,
        phone: String,
      },
    },
    medicalHistory: {
      allergies: [String],
      currentMedications: [String],
      chronicConditions: [String],
      previousSurgeries: [String],
      familyHistory: [String],
      smokingStatus: { type: String, enum: ['never', 'former', 'current', ''] },
      alcoholConsumption: { type: String, enum: ['never', 'occasional', 'regular', 'heavy', ''] },
    },
    scans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Scan' }],
    totalScans: { type: Number, default: 0 },
    lastScanDate: Date,
    assignedDoctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


patientSchema.index({ createdBy: 1 });
patientSchema.index({ 'personalInfo.lastName': 1, 'personalInfo.firstName': 1 });

patientSchema.virtual('fullName').get(function () {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

patientSchema.virtual('age').get(function () {
  if (!this.personalInfo.dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(this.personalInfo.dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
});

const Patient = mongoose.model('Patient', patientSchema);
module.exports = Patient;
