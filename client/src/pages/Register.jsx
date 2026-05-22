import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Eye, EyeOff, User, Mail, Lock, Building, Award, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SPECIALIZATIONS = ['Radiology', 'Neurology', 'Cardiology', 'Oncology', 'Orthopedics', 'General Medicine', 'Emergency Medicine', 'Internal Medicine', 'Other'];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', specialization: 'Radiology', hospital: '', licenseNumber: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to ScanSight.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 bg-grid-pattern flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-900/50">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ScanSight</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Create your account</h2>
          <p className="text-slate-400 mt-1 text-sm">Join thousands of medical professionals</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input required value={form.name} onChange={set('name')} className="input pl-10" placeholder="Dr. Jane Smith" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" required value={form.email} onChange={set('email')} className="input pl-10" placeholder="doctor@hospital.com" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type={showPwd ? 'text' : 'password'} required minLength={6} value={form.password} onChange={set('password')} className="input pl-10 pr-10" placeholder="Min. 6 characters" />
                <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Specialization *</label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <select value={form.specialization} onChange={set('specialization')} className="input pl-10 appearance-none">
                  {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">License Number</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input value={form.licenseNumber} onChange={set('licenseNumber')} className="input pl-10" placeholder="MD-XXXXXX" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Hospital / Clinic</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input value={form.hospital} onChange={set('hospital')} className="input pl-10" placeholder="General Hospital, City" />
              </div>
            </div>
          </div>

          <div className="pt-1">
            <p className="text-xs text-slate-500 mb-3">
              By creating an account you agree to our Terms of Service and Privacy Policy. This platform is for licensed medical professionals only.
            </p>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</>
              ) : 'Create Account'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
