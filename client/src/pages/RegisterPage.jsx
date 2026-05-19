import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Eye, EyeOff, Zap, User, Mail, Lock, Stethoscope } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';
import './AuthPages.css';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'doctor', specialization: '', hospital: '', licenseNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    const result = await register(form);
    if (result.success) {
      toast.success('Account created! Welcome to ScanSight');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-grid" />
      </div>

      <div className="auth-container">
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
              { icon: '🛡️', title: 'HIPAA Compliant', desc: 'Patient data fully protected' },
              { icon: '🔬', title: 'NVIDIA VISTA-3D', desc: 'Medical-grade AI segmentation' },
              { icon: '📊', title: 'Doctor Dashboard', desc: 'Real-time analytics & insights' },
              { icon: '🌐', title: 'Multi-modal', desc: 'CT, MRI, X-Ray, PET support' },
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
        </div>

        <div className="auth-form-panel" style={{ overflowY: 'auto' }}>
          <div className="auth-form-header">
            <h2>Create Account</h2>
            <p>Join the future of medical imaging</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input id="name" type="text" className="form-input input-with-icon"
                  placeholder="Dr. John Smith" value={form.name} onChange={update('name')} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input id="reg-email" type="email" className="form-input input-with-icon"
                  placeholder="doctor@hospital.com" value={form.email} onChange={update('email')} required />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={update('role')}>
                  <option value="doctor">Doctor</option>
                  <option value="radiologist">Radiologist</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <input type="text" className="form-input" placeholder="e.g. Oncology"
                  value={form.specialization} onChange={update('specialization')} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Hospital / Institution</label>
              <div className="input-wrapper">
                <Stethoscope size={16} className="input-icon" />
                <input type="text" className="form-input input-with-icon"
                  placeholder="City General Hospital" value={form.hospital} onChange={update('hospital')} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input id="reg-password" type={showPassword ? 'text' : 'password'}
                  className="form-input input-with-icon input-with-action"
                  placeholder="Min 8 chars, uppercase, number, symbol"
                  value={form.password} onChange={update('password')} required />
                <button type="button" className="input-action" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input type="password" className="form-input input-with-icon"
                  placeholder="Repeat password" value={form.confirmPassword}
                  onChange={update('confirmPassword')} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 8 }} disabled={isLoading}>
              {isLoading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Creating Account...</>
                : <><Zap size={18} /> Create Account</>}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
          <p className="auth-security-note">🔒 256-bit encrypted · HIPAA compliant · SOC 2 certified</p>
        </div>
      </div>
    </div>
  );
}
