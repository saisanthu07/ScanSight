import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, ScanLine, AlertTriangle, CheckCircle2, TrendingUp,
  Clock, ArrowRight, Activity, Brain, Target, Zap, Shield,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { patientsAPI, scansAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';

const SEVERITY_COLORS = {
  normal:   '#10b981',
  mild:     '#f59e0b',
  moderate: '#f97316',
  severe:   '#ef4444',
  critical: '#dc2626',
};
const SCAN_COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-elevated rounded-xl px-3 py-2 text-sm border border-white/10">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-white font-bold">{payload[0].value} scan{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, color, delay, glow }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="stat-card group"
    style={glow ? { boxShadow: `0 0 25px ${color}25` } : {}}
  >
    {/* bg glow */}
    <div
      className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl pointer-events-none"
      style={{ background: color, transform: 'translate(30%, -30%)' }}
    />
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
      style={{ background: `${color}20`, border: `1px solid ${color}30` }}
    >
      <Icon style={{ color }} className="w-5 h-5" />
    </div>
    <div className="relative">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-sm font-medium text-slate-300 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([patientsAPI.getStats(), scansAPI.getAnalytics()])
      .then(([sRes, aRes]) => {
        setStats(sRes.data);
        setAnalytics(aRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const severityData = (analytics?.bySeverity || [])
    .filter(d => d._id)
    .map(d => ({
      name:  d._id,
      value: d.count,
      fill:  SEVERITY_COLORS[d._id] || '#6366f1',
    }));

  const scanTypeData = (analytics?.byScanType || [])
    .filter(d => d._id)
    .map(d => ({ name: d._id, count: d.count }));

  const activityData = (analytics?.recentActivity || [])
    .slice(-14)
    .map(d => {
      try {
        return { date: format(parseISO(d._id), 'MMM d'), scans: d.count };
      } catch {
        return { date: d._id, scans: d.count };
      }
    });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const totalSevere = (analytics?.bySeverity || []).filter(d => ['severe','critical'].includes(d._id)).reduce((s, d) => s + d.count, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-bold text-white">
            {greeting}, Dr. {user?.name?.split(' ')[0] || 'Doctor'} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
          <Link to="/scans" className="btn-primary text-sm">
            <Zap className="w-4 h-4" /> New Analysis
          </Link>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users} label="Total Patients" color="#06b6d4" delay={0.05}
          value={loading ? '—' : stats?.total ?? 0}
          sub={loading ? null : `${stats?.active ?? 0} active`}
        />
        <StatCard
          icon={ScanLine} label="Scans Analyzed" color="#8b5cf6" delay={0.10}
          value={loading ? '—' : stats?.totalScans ?? 0}
          sub={loading ? null : `${stats?.pendingScans ?? 0} pending`}
        />
        <StatCard
          icon={AlertTriangle} label="Urgent Cases" color="#ef4444" delay={0.15} glow={!loading && totalSevere > 0}
          value={loading ? '—' : totalSevere}
          sub="Severe or critical"
        />
        <StatCard
          icon={CheckCircle2} label="Reports Ready" color="#10b981" delay={0.20}
          value={loading ? '—' : stats?.totalScans ?? 0}
          sub="Available for download"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="card lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-white">Scan Activity</h2>
              <p className="text-xs text-slate-500 mt-0.5">Last 14 days</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-xs text-slate-500">Daily scans</span>
            </div>
          </div>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={activityData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ stroke: 'rgba(6,182,212,0.2)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="scans" stroke="#06b6d4" strokeWidth={2} fill="url(#scanGradient)" dot={{ fill: '#06b6d4', r: 3 }} activeDot={{ r: 5, fill: '#06b6d4' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center gap-3">
              <Activity className="w-10 h-10 text-slate-700" />
              <div className="text-center">
                <p className="text-slate-500 text-sm">No scan activity yet</p>
                <Link to="/scans" className="text-cyan-400 text-xs hover:text-cyan-300 transition-colors mt-1 inline-block">
                  Upload your first scan →
                </Link>
              </div>
            </div>
          )}
        </motion.div>

        {/* Severity Pie */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Severity Distribution</h2>
            <Shield className="w-4 h-4 text-slate-500" />
          </div>
          {severityData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie
                    data={severityData} cx="50%" cy="50%"
                    innerRadius={38} outerRadius={60}
                    paddingAngle={3} dataKey="value"
                  >
                    {severityData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={{
                      background: '#080F20',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-1">
                {severityData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                      <span className="text-slate-400 capitalize">{d.name}</span>
                    </div>
                    <span className="text-slate-300 font-semibold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center gap-3">
              <Target className="w-10 h-10 text-slate-700" />
              <p className="text-slate-500 text-sm text-center">Analyze scans to see<br />severity distribution</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Scan Types + Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scan Types */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="card"
        >
          <h2 className="text-base font-semibold text-white mb-5">Scan Types</h2>
          {scanTypeData.length > 0 ? (
            <div className="space-y-4">
              {scanTypeData.map((d, i) => {
                const max = Math.max(...scanTypeData.map(x => x.count));
                const pct = max > 0 ? (d.count / max) * 100 : 0;
                return (
                  <div key={d.name}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400 font-medium">{d.name}</span>
                      <span className="text-slate-300 font-bold tabular-nums">{d.count}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.4 + i * 0.08 }}
                        className="h-full rounded-full"
                        style={{
                          background: SCAN_COLORS[i % SCAN_COLORS.length],
                          boxShadow: `0 0 8px ${SCAN_COLORS[i % SCAN_COLORS.length]}60`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-slate-500 text-sm text-center py-8">
              <Brain className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              No scan data yet
            </div>
          )}
        </motion.div>

        {/* Recent Scans */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.40 }}
          className="card lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">Recent Scans</h2>
            <Link to="/scans" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats?.recentScans?.length > 0 ? (
            <div className="space-y-1">
              {stats.recentScans.map((scan, i) => (
                <Link
                  key={scan._id}
                  to={`/scans/${scan._id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-black border border-white/8 overflow-hidden shrink-0">
                    {scan.thumbnailUrl
                      ? <img src={scan.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><ScanLine className="w-4 h-4 text-slate-600" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                      {scan.patient?.name || 'Unknown Patient'}
                    </p>
                    <p className="text-xs text-slate-500">{scan.scanType} · {scan.bodyPart}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`badge-sm ${`severity-${scan.overallSeverity || 'normal'}`}`}>
                      {scan.overallSeverity || 'Pending'}
                    </span>
                    <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1 justify-end">
                      <Clock className="w-2.5 h-2.5" />
                      {format(new Date(scan.createdAt), 'MMM d')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ScanLine className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No scans yet</p>
              <Link to="/scans" className="text-cyan-400 text-sm hover:text-cyan-300 mt-1.5 inline-block transition-colors">
                Upload your first scan →
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
