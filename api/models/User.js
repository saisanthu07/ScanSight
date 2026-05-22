const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['doctor', 'admin', 'radiologist'], default: 'doctor' },
  specialization: { type: String, default: 'General' },
  hospital: { type: String, default: '' },
  licenseNumber: { type: String, default: '' },
  avatar: { type: String, default: '' },
  isVerified: { type: Boolean, default: true },
  lastLogin: { type: Date },
  settings: {
    emailNotifications: { type: Boolean, default: true },
    darkMode: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
  },
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
