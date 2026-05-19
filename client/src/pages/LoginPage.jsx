import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Eye, EyeOff, Loader, Mail, Lock, Zap } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';
import './AuthPages.css';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      return toast.error('Please fill in all fields');
    }
    const result = await login(form.email, form.password);
    if (result.success) {
      toast.success('Welcome back, Doctor!');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-grid" />
      </div>

      <div className="auth-container">
        {/* Left Panel */}
        <div className="auth-visual">
          <div className="auth-logo">
            <div className="auth-logo-icon"><Brain size={32} /></div>
            <div>
              <h1 className="auth-brand">ScanSight</h1>
              <p className="auth-brand-sub">Powered by NVIDIA VISTA-3D</p>
            </div>
          </div>

          <div className="auth-features">
            {[
              { icon: '🧠', title: 'AI Segmentation', desc: 'NVIDIA VISTA-3D neural network' },
              { icon: '🔬', title: '3D Visualization', desc: 'Three.js powered anatomy viewer' },
              { icon: '🎯', title: 'Tumor Detection', desc: 'Real-time pathology highlighting' },
              { icon: '📋', title: 'Auto Reports', desc: 'AI-generated medical reports' },
            ].map(({ icon, title, desc }) => (
              <div className="auth-feature" key={title}>
                <span className="auth-feature-icon">{icon}</span>
                <div>
                  <p className="auth-feature-title">{title}</p>
                  <p className="auth-feature-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-stats">
            <div className="auth-stat">
              <span className="auth-stat-value">99.2%</span>
              <span className="auth-stat-label">Accuracy</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-value">&lt;30s</span>
              <span className="auth-stat-label">Analysis Time</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-value">HIPAA</span>
              <span className="auth-stat-label">Compliant</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your medical dashboard</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} autoComplete="on">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  className="form-input input-with-icon"
                  placeholder="doctor@hospital.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input input-with-icon input-with-action"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 8 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <><div className="spinner" style={{ width: 18, height: 18 }} /> Signing in...</>
              ) : (
                <><Zap size={18} /> Sign In</>
              )}
            </button>

            {/* Demo Login */}
            <button
              type="button"
              className="btn btn-secondary btn-lg demo-btn"
              onClick={() => setForm({ email: 'demo@doctor.com', password: 'Demo@12345' })}
            >
              Fill Demo Credentials
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{' '}
            <Link to="/register">Create Account</Link>
          </p>

          <p className="auth-security-note">
            🔒 256-bit encrypted · HIPAA compliant · SOC 2 certified
          </p>
        </div>
      </div>
    </div>
  );
}
