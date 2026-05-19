import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Scan, Brain, FileText,
  Users, Settings, LogOut, Activity, ChevronRight, Zap
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';
import './Layout.css';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: null },
  { to: '/upload', icon: Upload, label: 'Upload Scan', badge: 'NEW' },
  { to: '/scans', icon: Scan, label: 'My Scans', badge: null },
  { to: '/reports', icon: FileText, label: 'Reports', badge: null },
  { to: '/patients', icon: Users, label: 'Patients', badge: null },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.info('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="page-wrapper">
      <div className="animated-bg" />

      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Brain size={22} />
          </div>
          <div className="logo-text">
            <span className="logo-name">ScanSight</span>
            <span className="logo-sub">NVIDIA VISTA-3D</span>
          </div>
        </div>

        {/* AI Status */}
        <div className="ai-status">
          <div className="ai-status-dot" />
          <span>AI Engine Active</span>
          <Zap size={12} className="ai-zap" />
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <span className="nav-group-label">Navigation</span>
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <div className="nav-icon"><Icon size={18} /></div>
              <span className="nav-label">{label}</span>
              {badge && <span className="nav-badge">{badge}</span>}
              <ChevronRight size={14} className="nav-arrow" />
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="user-avatar">
              {user?.name?.[0]?.toUpperCase() || 'D'}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'Doctor'}</span>
              <span className="user-role">{user?.role || 'doctor'}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" style={{ position: 'relative', zIndex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
