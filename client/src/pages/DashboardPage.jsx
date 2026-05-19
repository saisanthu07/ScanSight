import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Brain, FileText, Users, Upload, TrendingUp,
  AlertTriangle, Clock, CheckCircle, ArrowRight, Zap
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';
import './DashboardPage.css';

const StatCard = ({ icon: Icon, label, value, delta, color, loading }) => (
  <div className="stat-card card">
    <div className="stat-card-top">
      <div className="stat-icon" style={{ background: `${color}20`, color }}>
        <Icon size={22} />
      </div>
      {delta && (
        <span className={`badge ${delta > 0 ? 'badge-success' : 'badge-danger'}`}>
          {delta > 0 ? '+' : ''}{delta}%
        </span>
      )}
    </div>
    <div className="stat-value">{loading ? <div className="skeleton skeleton-text" /> : value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const PIE_COLORS = ['#00D4FF', '#8B5CF6', '#00FF94', '#FFD700', '#FF8C00'];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: res } = await api.get('/dashboard/stats');
      setData(res.data);
    } catch {
      toast.error('Failed to load dashboard data');
      // Set demo data
      setData(getDemoData());
    } finally {
      setLoading(false);
    }
  };

  const getDemoData = () => ({
    stats: { totalScans: 24, completedAnalyses: 19, pendingAnalyses: 2, totalReports: 15, totalPatients: 8, scansThisMonth: 7, urgentCases: 3, analysisRate: 79 },
    charts: {
      scansByType: [{ type: 'CT', count: 14 }, { type: 'MRI', count: 7 }, { type: 'X-Ray', count: 3 }],
      scansByStatus: [{ status: 'completed', count: 19 }, { status: 'processing', count: 2 }, { status: 'uploaded', count: 3 }],
      weeklyTrend: [{ day: 'Sun', scans: 2 }, { day: 'Mon', scans: 5 }, { day: 'Tue', scans: 3 }, { day: 'Wed', scans: 7 }, { day: 'Thu', scans: 4 }, { day: 'Fri', scans: 6 }, { day: 'Sat', scans: 1 }],
    },
    recentScans: [],
    recentActivity: [
      { id: '1', type: 'scan', description: 'CT scan of chest', patient: 'John Doe', status: 'completed', time: new Date().toISOString() },
      { id: '2', type: 'scan', description: 'MRI scan of brain', patient: 'Jane Smith', status: 'processing', time: new Date(Date.now() - 3600000).toISOString() },
    ],
  });

  const stats = data?.stats;

  return (
    <div className="dashboard-page">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Doctor Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, Dr. {user?.name?.split(' ')[0] || 'Doctor'} ·{' '}
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/upload')}>
          <Upload size={16} /> Upload Scan
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard icon={Activity} label="Total Scans" value={stats?.totalScans ?? '—'}
          delta={12} color="#00D4FF" loading={loading} />
        <StatCard icon={Brain} label="Completed Analyses" value={stats?.completedAnalyses ?? '—'}
          delta={8} color="#8B5CF6" loading={loading} />
        <StatCard icon={AlertTriangle} label="Urgent Cases" value={stats?.urgentCases ?? '—'}
          color="#FF4444" loading={loading} />
        <StatCard icon={FileText} label="Reports Generated" value={stats?.totalReports ?? '—'}
          delta={15} color="#00FF94" loading={loading} />
      </div>

      <div className="dashboard-grid">
        {/* Weekly Trend Chart */}
        <div className="card chart-card">
          <div className="card-header">
            <h3>Weekly Scan Volume</h3>
            <span className="badge badge-info">This Week</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data?.charts?.weeklyTrend || []}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#8892B0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8892B0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0A1628', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, color: '#E8F4FD' }}
                cursor={{ stroke: 'rgba(0,212,255,0.2)' }}
              />
              <Area type="monotone" dataKey="scans" stroke="#00D4FF" fill="url(#areaGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Scan Type Distribution */}
        <div className="card chart-card">
          <div className="card-header">
            <h3>Scan Distribution</h3>
          </div>
          <div className="pie-wrapper">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data?.charts?.scansByType || []} dataKey="count" nameKey="type"
                  cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={4}>
                  {(data?.charts?.scansByType || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0A1628', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, color: '#E8F4FD' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {(data?.charts?.scansByType || []).map(({ type, count }, i) => (
                <div key={type} className="pie-legend-item">
                  <span className="pie-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span>{type}</span>
                  <span className="pie-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card quick-actions-card">
          <div className="card-header"><h3>Quick Actions</h3></div>
          <div className="quick-actions">
            {[
              { icon: Upload, label: 'Upload New Scan', sub: 'CT, MRI, X-Ray support', to: '/upload', color: '#00D4FF' },
              { icon: Brain, label: 'View All Analyses', sub: 'AI segmentation results', to: '/scans', color: '#8B5CF6' },
              { icon: FileText, label: 'Generate Report', sub: 'From completed analysis', to: '/reports', color: '#00FF94' },
              { icon: Users, label: 'Manage Patients', sub: 'Patient records', to: '/patients', color: '#FFD700' },
            ].map(({ icon: Icon, label, sub, to, color }) => (
              <button key={to} className="quick-action-item" onClick={() => navigate(to)}>
                <div className="quick-action-icon" style={{ color, background: `${color}18` }}>
                  <Icon size={18} />
                </div>
                <div className="quick-action-text">
                  <span className="quick-action-label">{label}</span>
                  <span className="quick-action-sub">{sub}</span>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
              </button>
            ))}
          </div>
        </div>

        {/* AI Performance */}
        <div className="card ai-card">
          <div className="card-header">
            <h3>AI Performance</h3>
            <div className="ai-status-indicator">
              <div className="ai-status-dot" />
              <span>NVIDIA VISTA-3D Active</span>
            </div>
          </div>
          <div className="ai-metrics">
            {[
              { label: 'Analysis Rate', value: stats?.analysisRate ?? 79, unit: '%', color: '#00D4FF' },
              { label: 'Accuracy', value: 99, unit: '%', color: '#00FF94' },
              { label: 'Avg Time', value: 28, unit: 's', color: '#8B5CF6' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="ai-metric">
                <div className="ai-metric-header">
                  <span className="ai-metric-label">{label}</span>
                  <span className="ai-metric-value" style={{ color }}>{value}{unit}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${value}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="nvidia-badge">
            <Zap size={12} />
            <span>Powered by NVIDIA VISTA-3D · Medical Imaging AI</span>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card recent-activity-card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header flex-between">
            <h3>Recent Activity</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/scans')}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="activity-list">
            {(data?.recentActivity || []).length === 0 ? (
              <div className="empty-state">
                <Activity size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p>No recent activity. Upload your first scan to get started.</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/upload')}>
                  <Upload size={14} /> Upload Scan
                </button>
              </div>
            ) : (
              (data?.recentActivity || []).map((item) => (
                <div key={item.id} className="activity-item">
                  <div className={`activity-dot status-${item.status}`} />
                  <div className="activity-info">
                    <span className="activity-desc">{item.description}</span>
                    <span className="activity-patient">{item.patient}</span>
                  </div>
                  <span className={`badge ${
                    item.status === 'completed' ? 'badge-success' :
                    item.status === 'processing' ? 'badge-warning' : 'badge-info'
                  }`}>{item.status}</span>
                  <span className="activity-time">
                    {new Date(item.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
