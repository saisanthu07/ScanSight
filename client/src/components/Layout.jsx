import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, ScanLine, FileText, Settings,
  LogOut, Menu, X, Activity, ChevronRight, Bell, AlertTriangle,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { scansAPI } from '../services/api';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/patients',   icon: Users,            label: 'Patients' },
  { path: '/scans',      icon: ScanLine,         label: 'Scan Analysis' },
  { path: '/reports',    icon: FileText,         label: 'Reports' },
  { path: '/settings',   icon: Settings,         label: 'Settings' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analyzingCount, setAnalyzingCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [analyzing, all] = await Promise.all([
          scansAPI.getAll({ analysisStatus: 'analyzing' }),
          scansAPI.getAll({ analysisStatus: 'completed', limit: 50 }),
        ]);
        setAnalyzingCount(analyzing.data.total || 0);
        const urgent = (all.data.scans || []).filter(s => ['severe', 'critical'].includes(s.overallSeverity)).length;
        setUrgentCount(urgent);
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/50">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">ScanSight</h1>
            <p className="text-[10px] text-cyan-400 font-semibold tracking-widest uppercase">Medical AI</p>
          </div>
        </div>

        {/* AI Status */}
        {analyzingCount > 0 && (
          <div className="mt-3 flex items-center gap-2 px-2.5 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] text-blue-300 font-medium">
              {analyzingCount} scan{analyzingCount > 1 ? 's' : ''} analyzing
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-cyan-500/12 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`transition-colors shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`}
                  style={{ width: 17, height: 17 }}
                />
                <span className="flex-1">{label}</span>
                {/* Scan Analysis: show analyzing count */}
                {path === '/scans' && analyzingCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {analyzingCount}
                  </span>
                )}
                {/* Reports: show urgent count */}
                {path === '/reports' && urgentCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {urgentCount > 9 ? '9+' : urgentCount}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3 h-3 text-cyan-500 shrink-0" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.specialization || 'Physician'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-navy-900 bg-grid-pattern overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-58 flex-shrink-0 flex-col glass border-r border-white/5 z-20" style={{ width: 232 }}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed left-0 top-0 bottom-0 w-72 glass border-r border-white/5 z-40 lg:hidden"
            >
              <div className="absolute top-4 right-4">
                <button onClick={() => setSidebarOpen(false)} className="btn-ghost">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 glass border-b border-white/5 z-10 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">ScanSight</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {(analyzingCount > 0 || urgentCount > 0) && (
              <div className="relative">
                <Bell className="w-4 h-4 text-slate-400" />
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {analyzingCount + urgentCount > 9 ? '9+' : analyzingCount + urgentCount}
                </div>
              </div>
            )}
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white">
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
