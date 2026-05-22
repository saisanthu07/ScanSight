import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Activity, Shield, Zap, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => setForm({ email: 'demo@scansight.ai', password: 'demo1234' });

  return (
    <div className="min-h-screen bg-navy-900 bg-grid-pattern flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-navy-900 to-blue-900/20" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-900/50">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ScanSight</h1>
              <p className="text-xs text-cyan-400 font-medium tracking-widest">MEDICAL AI PLATFORM</p>
            </div>
          </div>
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="glass-light rounded-2xl p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">NVIDIA VISTA-3D Powered</h3>
                <p className="text-sm text-slate-400">Industry-leading 3D medical image segmentation with sub-second analysis of CT & MRI scans.</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
              className="glass-light rounded-2xl p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">HIPAA-Compliant Security</h3>
                <p className="text-sm text-slate-400">End-to-end encrypted storage and transmission. Patient data stays protected at every level.</p>
              </div>
            </motion.div>
          </div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-8">
            {[['99.2%', 'Detection Accuracy'], ['< 5s', 'Analysis Time'], ['50K+', 'Scans Analyzed']].map(([val, label]) => (
              <div key={label}>
                <p className="text-2xl font-bold text-cyan-400">{val}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">ScanSight</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-slate-400 mt-1 text-sm">Sign in to your medical dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-5">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email" required
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="input pl-10"
                  placeholder="doctor@hospital.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPwd ? 'text' : 'password'} required
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
              ) : 'Sign In'}
            </button>

            <button
              type="button" onClick={fillDemo}
              className="btn-secondary w-full justify-center text-xs"
            >
              Use Demo Account
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            New to ScanSight?{' '}
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
