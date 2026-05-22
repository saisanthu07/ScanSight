import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Cpu, Save, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const SPECIALIZATIONS = ['Radiology', 'Neurology', 'Cardiology', 'Oncology', 'Orthopedics', 'General Medicine', 'Emergency Medicine', 'Internal Medicine', 'Other'];

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    specialization: user?.specialization || 'Radiology',
    hospital: user?.hospital || '',
    licenseNumber: user?.licenseNumber || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setP = (k) => (e) => setProfile(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', profile);
      updateUser(res.data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <motion.form onSubmit={handleSave} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/5">
          <User className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-semibold text-white">Profile Information</h2>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-purple-900/40">
            {initials}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{user?.name}</h3>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <p className="text-xs text-slate-600 mt-1">{user?.specialization} · {user?.hospital || 'No hospital set'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Full Name</label>
            <input value={profile.name} onChange={setP('name')} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Email (read-only)</label>
            <input value={user?.email || ''} readOnly className="input opacity-50 cursor-not-allowed" />
          </div>
          <div>
            <label className="label">Specialization</label>
            <select value={profile.specialization} onChange={setP('specialization')} className="input">
              {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">License Number</label>
            <input value={profile.licenseNumber} onChange={setP('licenseNumber')} className="input" placeholder="MD-XXXXXX" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Hospital / Clinic</label>
            <input value={profile.hospital} onChange={setP('hospital')} className="input" placeholder="City General Hospital" />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button type="submit" disabled={saving} className="btn-primary">
            {saved ? (
              <><Check className="w-4 h-4 text-emerald-300" />Saved!</>
            ) : saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
            ) : (
              <><Save className="w-4 h-4" />Save Changes</>
            )}
          </button>
        </div>
      </motion.form>

      {/* AI Settings Info */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/5">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-semibold text-white">AI Analysis Configuration</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-start justify-between p-4 bg-navy-800/60 rounded-xl">
            <div>
              <p className="text-sm font-medium text-white">NVIDIA VISTA-3D</p>
              <p className="text-xs text-slate-400 mt-0.5">Primary AI analysis engine for medical imaging</p>
            </div>
            <span className={`badge text-xs ${process.env.NVIDIA_API_KEY ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
              {process.env.NVIDIA_API_KEY ? 'Active' : 'Configure in .env'}
            </span>
          </div>
          <div className="flex items-start justify-between p-4 bg-navy-800/60 rounded-xl">
            <div>
              <p className="text-sm font-medium text-white">ScanSight Fallback AI</p>
              <p className="text-xs text-slate-400 mt-0.5">Built-in analysis when NVIDIA API is unavailable</p>
            </div>
            <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">Always Active</span>
          </div>
          <p className="text-xs text-slate-500">
            Configure NVIDIA API key in your server <code className="bg-navy-800 px-1.5 py-0.5 rounded font-mono">.env</code> file as <code className="bg-navy-800 px-1.5 py-0.5 rounded font-mono">NVIDIA_API_KEY</code> to enable VISTA-3D. The fallback model activates automatically when the API is unavailable.
          </p>
        </div>
      </motion.div>

      {/* Security Info */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/5">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-semibold text-white">Security & Compliance</h2>
        </div>
        <div className="space-y-3">
          {[
            ['JWT Authentication', 'Secure token-based authentication with 7-day expiry', true],
            ['Data Encryption', 'All data encrypted in transit via TLS/HTTPS', true],
            ['Cloud Storage', 'Medical scans stored securely on Cloudinary CDN', true],
            ['Rate Limiting', 'API rate limiting to prevent abuse', true],
            ['HIPAA Guidelines', 'Platform follows HIPAA-compliant design patterns', true],
          ].map(([title, desc, active]) => (
            <div key={title} className="flex items-center justify-between p-3 bg-navy-800/40 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-200">{title}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              {active && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
