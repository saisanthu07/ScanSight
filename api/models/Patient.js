const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  dateOfBirth: { type: Date },
  bloodGroup: { type: String, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'], default: 'Unknown' },
  contactNumber: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  medicalHistory: [{ type: String }],
  allergies: [{ type: String }],
  currentMedications: [{ type: String }],
  emergencyContact: {
    name: String,
    phone: String,
    relation: String,
  },
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'discharged', 'critical', 'stable'], default: 'active' },
  notes: { type: String, default: '' },
}, { timestamps: true });

PatientSchema.index({ assignedDoctor: 1, createdAt: -1 });

module.exports = mongoose.model('Patient', PatientSchema);
