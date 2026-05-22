import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, ScanLine, Clock, ExternalLink, AlertTriangle,
  Search, Download, Filter, CheckCircle2, TrendingUp,
} from 'lucide-react';
import { scansAPI, reportsAPI } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ReportModal from '../components/ReportModal';

const SEVERITY_COLORS = {
  normal:   'severity-normal',
  mild:     'severity-mild',
  moderate: 'severity-moderate',
  severe:   'severity-severe',
  critical: 'severity-critical',
};

export default function Reports() {
  const [scans, setScans] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    scansAPI.getAll({ analysisStatus: 'completed' })
      .then(res => {
        const data = res.data.scans || [];
        setScans(data);
        setFiltered(data);
      })
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = [...scans];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.patient?.name?.toLowerCase().includes(q) ||
        s.scanType?.toLowerCase().includes(q) ||
        s.bodyPart?.toLowerCase().includes(q)
      );
    }
    if (severityFilter !== 'all') {
      result = result.filter(s => s.overallSeverity === severityFilter);
    }
    setFiltered(result);
  }, [search, severityFilter, scans]);

  const handleOpenReport = async (scan) => {
    setReportLoading(scan._id);
    try {
      const res = await reportsAPI.get(scan._id);
      setSelectedReport(res.data.report);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load report');
    } finally {
      setReportLoading(null);
    }
  };

  const urgentCount = scans.filter(s => ['severe', 'critical'].includes(s.overallSeverity)).length;
  const generatedCount = scans.filter(s => s.reportGenerated).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-slate-400 text-sm mt-0.5">AI-generated medical imaging reports</p>
        </div>
        <div className="flex items-center gap-3">
          {urgentCount > 0 && (
            <span className="badge severity-severe">
              <AlertTriangle className="w-3 h-3" />
              {urgentCount} urgent
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      {!loading && scans.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Analyses', value: scans.length, icon: ScanLine, color: '#06b6d4' },
            { label: 'Reports Generated', value: generatedCount, icon: FileText, color: '#10b981' },
            { label: 'Urgent Cases', value: urgentCount, icon: AlertTriangle, color: '#ef4444' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card-sm flex items-center gap-3 border border-white/5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon className="w-4.5 h-4.5" style={{ color, width: 18, height: 18 }} />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {!loading && scans.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
              placeholder="Search by patient, scan type, body part…"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'normal', 'mild', 'moderate', 'severe', 'critical'].map(s => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-medium capitalize border transition-all ${
                  severityFilter === s
                    ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/35'
                    : 'bg-white/3 text-slate-400 border-white/8 hover:border-white/18'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card h-20">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 skeleton rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 skeleton w-48" />
                  <div className="h-2.5 skeleton w-32" />
                </div>
                <div className="w-24 h-8 skeleton rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : scans.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center mx-auto mb-5">
            <FileText className="w-10 h-10 text-slate-700" />
          </div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No completed analyses yet</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Upload and analyze scans to generate detailed medical imaging reports with AI insights.
          </p>
          <Link to="/scans" className="btn-primary mx-auto">
            <ScanLine className="w-4 h-4" /> Go to Scan Analysis
          </Link>
        </motion.div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500 text-sm">No results matching your filters.</p>
          <button onClick={() => { setSearch(''); setSeverityFilter('all'); }} className="text-cyan-400 text-xs mt-2 hover:text-cyan-300 transition-colors">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((scan, i) => (
            <motion.div
              key={scan._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card-hover flex items-center gap-4 p-4"
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-xl bg-black border border-white/5 overflow-hidden shrink-0">
                {scan.thumbnailUrl
                  ? <img src={scan.thumbnailUrl} alt="scan" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><ScanLine className="w-5 h-5 text-slate-600" /></div>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="font-semibold text-white text-sm">{scan.patient?.name}</p>
                  <span className="text-slate-700">·</span>
                  <span className="text-xs text-slate-400">{scan.scanType} — {scan.bodyPart}</span>
                </div>
                {/* Detected Diseases */}
                {scan.detectedConditions?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {scan.detectedConditions.slice(0, 3).map((d, i) => {
                      const finding = scan.findings?.find(f => f.diseaseName === d);
                      const color = finding?.severity === 'severe' ? '#ef4444' : finding?.severity === 'moderate' ? '#f97316' : '#f59e0b';
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border"
                          style={{ background: `${color}12`, borderColor: `${color}30`, color }}
                        >
                          {d}
                        </span>
                      );
                    })}
                    {scan.detectedConditions.length > 3 && (
                      <span className="text-[10px] text-slate-600">+{scan.detectedConditions.length - 3} more</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge-sm ${SEVERITY_COLORS[scan.overallSeverity] || SEVERITY_COLORS.normal}`}>
                    {scan.overallSeverity || 'Normal'}
                  </span>
                  {scan.reportGenerated && (
                    <span className="badge-sm bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Generated
                    </span>
                  )}
                  {['severe', 'critical'].includes(scan.overallSeverity) && (
                    <span className="badge-sm bg-red-500/15 text-red-400 border border-red-500/25">
                      <AlertTriangle className="w-2.5 h-2.5" /> Urgent
                    </span>
                  )}
                  <span className="text-[10px] text-slate-600 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {format(new Date(scan.createdAt), 'MMM d, yyyy')}
                  </span>
                  {scan.overallConfidence > 0 && (
                    <span className="text-[10px] text-slate-600 flex items-center gap-1">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {(scan.overallConfidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/scans/${scan._id}`}
                  className="btn-ghost"
                  title="View Scan"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleOpenReport(scan)}
                  disabled={reportLoading === scan._id}
                  className="btn-primary text-xs py-2"
                >
                  {reportLoading === scan._id ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  {reportLoading === scan._id ? 'Loading…' : 'View Report'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ReportModal
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        report={selectedReport}
      />
    </div>
  );
}
