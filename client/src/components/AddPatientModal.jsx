import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Calendar, Droplets, Phone, Mail, MapPin, Plus } from 'lucide-react';
import { patientsAPI } from '../services/api';
import toast from 'react-hot-toast';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export default function AddPatientModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '', age: '', gender: 'Male', bloodGroup: 'Unknown',
    contactNumber: '', email: '', address: '',
    medicalHistory: '', allergies: '', status: 'active',
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.age) return toast.error('Name and age are required');
    setLoading(true);
    try {
      await patientsAPI.create({
        ...form,
        age: Number(form.age),
        medicalHistory: form.medicalHistory ? form.medicalHistory.split(',').map(s => s.trim()).filter(Boolean) : [],
        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      toast.success('Patient added successfully');
      setForm({ name: '', age: '', gender: 'Male', bloodGroup: 'Unknown', contactNumber: '', email: '', address: '', medicalHistory: '', allergies: '', status: 'active' });
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative glass rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10"
          >
            <div className="sticky top-0 glass border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-cyan-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Add New Patient</h2>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Basic Info */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Full Name *</label>
                    <input required value={form.name} onChange={set('name')} className="input" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="label">Age *</label>
                    <input type="number" required min="0" max="130" value={form.age} onChange={set('age')} className="input" placeholder="45" />
                  </div>
                  <div>
                    <label className="label">Gender *</label>
                    <select value={form.gender} onChange={set('gender')} className="input">
                      {['Male', 'Female', 'Other'].map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Blood Group</label>
                    <select value={form.bloodGroup} onChange={set('bloodGroup')} className="input">
                      {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select value={form.status} onChange={set('status')} className="input">
                      {['active', 'stable', 'critical', 'discharged'].map(s => (
                        <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Phone</label>
                    <input value={form.contactNumber} onChange={set('contactNumber')} className="input" placeholder="+1 234 567 8900" />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" value={form.email} onChange={set('email')} className="input" placeholder="patient@email.com" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Address</label>
                    <input value={form.address} onChange={set('address')} className="input" placeholder="123 Main St, City, State" />
                  </div>
                </div>
              </div>

              {/* Medical */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Medical History</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Medical History (comma-separated)</label>
                    <input value={form.medicalHistory} onChange={set('medicalHistory')} className="input" placeholder="Diabetes, Hypertension, Asthma" />
                  </div>
                  <div>
                    <label className="label">Allergies (comma-separated)</label>
                    <input value={form.allergies} onChange={set('allergies')} className="input" placeholder="Penicillin, Sulfa drugs" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Adding...</>
                  ) : (
                    <><Plus className="w-4 h-4" />Add Patient</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
