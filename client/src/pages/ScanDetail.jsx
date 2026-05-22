import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, RefreshCw, Trash2, Eye, EyeOff,
  ZoomIn, ZoomOut, Maximize2, Info, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Cpu, X, Activity, ShieldAlert,
  Target, Brain, Clock, Stethoscope, Microscope, BookOpen,
  TriangleAlert, Siren, Pill, ChevronRight, MapPin, TrendingUp,
} from 'lucide-react';
import { scansAPI, reportsAPI } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ReportModal from '../components/ReportModal';

// ─── Color helpers ────────────────────────────────────────────────────────────
const SEVERITY_META = {
  normal:   { bg: '#10b981', badge: 'severity-normal',   label: 'Normal',   ring: '#10b981' },
  mild:     { bg: '#f59e0b', badge: 'severity-mild',     label: 'Mild',     ring: '#f59e0b' },
  moderate: { bg: '#f97316', badge: 'severity-moderate', label: 'Moderate', ring: '#f97316' },
  severe:   { bg: '#ef4444', badge: 'severity-severe',   label: 'Severe',   ring: '#ef4444' },
  critical: { bg: '#dc2626', badge: 'severity-critical', label: 'Critical', ring: '#dc2626' },
  high:     { bg: '#ef4444', badge: 'severity-severe',   label: 'High',     ring: '#ef4444' },
};

// ─── Risk Gauge ───────────────────────────────────────────────────────────────
function RiskGauge({ severity, confidence }) {
  const pct = Math.round((confidence || 0) * 100);
  const meta = SEVERITY_META[severity] || SEVERITY_META.normal;
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9" />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={meta.bg} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            className="gauge-circle"
            style={{ filter: `drop-shadow(0 0 10px ${meta.bg}70)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-black text-white leading-none">{pct}%</p>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">confidence</p>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm font-bold" style={{ color: meta.bg }}>{meta.label} Severity</p>
      </div>
    </div>
  );
}

// ─── Confidence Bar ───────────────────────────────────────────────────────────
function ConfidenceBar({ value, color }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full confidence-bar"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}60` }}
        />
      </div>
      <span className="text-[10px] text-slate-400 w-9 text-right tabular-nums font-mono">{pct}%</span>
    </div>
  );
}

// ─── Disease Badge (prominent pill) ──────────────────────────────────────────
function DiseasePill({ name, type, color }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border"
      style={{
        background: `${color}15`,
        borderColor: `${color}35`,
        color,
      }}
    >
      <Microscope className="w-3 h-3 shrink-0" />
      <span className="truncate max-w-36">{name || type}</span>
    </div>
  );
}

// ─── Finding Card ─────────────────────────────────────────────────────────────
function FindingCard({ finding, index, isSelected, onSelect }) {
  const [open, setOpen] = useState(true);
  const meta = SEVERITY_META[finding.severity] || SEVERITY_META.mild;
  const isUrgent = ['severe', 'critical'].includes(finding.severity);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className={`rounded-xl border transition-all duration-200 ${isSelected ? 'ring-1' : ''} ${isUrgent ? 'critical-glow' : ''}`}
      style={{
        borderColor: isSelected ? meta.bg : `${meta.bg}25`,
        background: `${meta.bg}08`,
        ...(isSelected ? { boxShadow: `0 0 0 1px ${meta.bg}50` } : {}),
      }}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); setOpen(p => !p); }}>
        {/* Severity indicator */}
        <div
          className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
          style={{ background: meta.bg }}
        />
        <div className="flex-1 min-w-0">
          {/* Disease Name — most prominent */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isUrgent && <Siren className="w-3.5 h-3.5 text-red-400 shrink-0" />}
            <p className="text-sm font-bold text-white leading-tight">
              {finding.diseaseName || finding.detectionType || finding.category}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge-sm ${meta.badge}`}>{meta.label}</span>
            {finding.detectionType && (
              <span className="badge-sm bg-white/5 text-slate-400 border border-white/10">
                {finding.detectionType}
              </span>
            )}
            {finding.icdCode && (
              <span className="badge-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                ICD: {finding.icdCode}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-slate-500 tabular-nums font-mono">
            {Math.round((finding.confidence || 0) * 100)}%
          </span>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5 border-t pt-2.5" style={{ borderColor: `${meta.bg}15` }}>
              {/* Category */}
              {finding.category && (
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {finding.category}
                </p>
              )}
              {/* Clinical description */}
              <p className="text-[11px] text-slate-300 leading-relaxed">{finding.finding}</p>
              {/* Confidence bar */}
              <ConfidenceBar value={finding.confidence} color={meta.bg} />
              {/* Recommendation */}
              {finding.recommendation && (
                <div
                  className="rounded-lg px-3 py-2.5"
                  style={{ background: `${meta.bg}12`, borderLeft: `2px solid ${meta.bg}60` }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Pill className="w-3 h-3" style={{ color: meta.bg }} />
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.bg }}>
                      Clinical Recommendation
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-200 leading-relaxed">{finding.recommendation}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('findings'); // findings | summary | details
  const imgRef = useRef(null);
  const pollingRef = useRef(null);

  const fetchScan = useCallback(async () => {
    try {
      const res = await scansAPI.getOne(id);
      setScan(res.data.scan);
      setNotes(res.data.scan.clinicalNotes || '');
      return res.data.scan;
    } catch {
      toast.error('Scan not found');
      navigate('/scans');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchScan().then(s => {
      if (s?.analysisStatus === 'analyzing' || s?.analysisStatus === 'pending') {
        pollingRef.current = setInterval(async () => {
          const updated = await fetchScan();
          if (updated?.analysisStatus === 'completed' || updated?.analysisStatus === 'failed') {
            clearInterval(pollingRef.current);
            if (updated.analysisStatus === 'completed') {
              toast.success('✅ AI Disease Detection Complete!');
            } else {
              toast.error('Analysis failed. Try re-analyzing.');
            }
          }
        }, 3500);
      }
    });
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [id]);

  const handleReanalyze = async () => {
    try {
      await scansAPI.reanalyze(id);
      toast.success('Re-analysis started');
      setScan(p => ({ ...p, analysisStatus: 'analyzing' }));
      pollingRef.current = setInterval(async () => {
        const updated = await fetchScan();
        if (updated?.analysisStatus !== 'analyzing') {
          clearInterval(pollingRef.current);
          if (updated?.analysisStatus === 'completed') toast.success('Disease Detection Complete!');
        }
      }, 3500);
    } catch { toast.error('Failed to start re-analysis'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this scan permanently?')) return;
    try {
      await scansAPI.delete(id);
      toast.success('Scan deleted');
      navigate('/scans');
    } catch { toast.error('Failed to delete'); }
  };

  const handleSaveNotes = async () => {
    try {
      await scansAPI.updateNotes(id, { clinicalNotes: notes });
      setScan(p => ({ ...p, clinicalNotes: notes }));
      setEditNotes(false);
      toast.success('Notes saved');
    } catch { toast.error('Failed to save notes'); }
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const res = await reportsAPI.get(id);
      setReport(res.data.report);
      setShowReport(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full" />
            <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin" />
            <Cpu className="absolute inset-0 m-auto w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-slate-400 text-sm">Loading scan data…</p>
        </div>
      </div>
    );
  }

  if (!scan) return null;

  const isAnalyzing = scan.analysisStatus === 'analyzing' || scan.analysisStatus === 'pending';
  const isComplete  = scan.analysisStatus === 'completed';
  const isFailed    = scan.analysisStatus === 'failed';
  const sevMeta     = SEVERITY_META[scan.overallSeverity] || SEVERITY_META.normal;
  const hasCritical = scan.findings?.some(f => ['severe', 'critical'].includes(f.severity));
  const urgentCount = scan.findings?.filter(f => ['severe', 'critical'].includes(f.severity)).length || 0;

  // Detected disease names list
  const detectedDiseases = isComplete
    ? [...new Set(scan.findings?.map(f => f.diseaseName || f.detectionType).filter(Boolean) || [])]
    : [];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">

      {/* ── CRITICAL ALERT BANNER ── */}
      <AnimatePresence>
        {isComplete && hasCritical && (
          <motion.div
            initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 rounded-2xl border border-red-500/40 bg-red-500/8 critical-glow flex gap-3"
          >
            <Siren className="w-6 h-6 text-red-400 shrink-0 animate-pulse" />
            <div className="flex-1">
              <p className="font-bold text-red-300 text-sm">
                ⚠️ {urgentCount} Urgent Finding{urgentCount > 1 ? 's' : ''} — Immediate Attention Required
              </p>
              <p className="text-xs text-red-400/70 mt-0.5">
                This scan contains severe pathological findings. Immediate clinical review and intervention may be necessary.
              </p>
              {detectedDiseases.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {detectedDiseases.map((d, i) => (
                    <span key={i} className="badge-sm bg-red-500/20 text-red-300 border border-red-500/30">
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/scans" className="btn-ghost shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">{scan.scanType} — {scan.bodyPart}</h1>
              {isComplete && (
                <span className={`badge-sm ${sevMeta.badge}`}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sevMeta.bg }} />
                  {sevMeta.label}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5">
              <span>{scan.patient?.name}</span>
              <span className="text-slate-700">·</span>
              <Clock className="w-3 h-3" />
              <span>{format(new Date(scan.createdAt), 'MMM d, yyyy · h:mm a')}</span>
            </p>
            {/* Detected diseases summary line */}
            {isComplete && detectedDiseases.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-1.5">
                {detectedDiseases.map((d, i) => (
                  <DiseasePill key={i} name={d} color={scan.findings?.find(f => f.diseaseName === d)?.severity === 'severe' ? '#ef4444' : '#f97316'} />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          {isComplete && (
            <button onClick={handleGenerateReport} disabled={reportLoading} className="btn-primary text-sm">
              {reportLoading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
                : <><FileText className="w-4 h-4" />Report</>}
            </button>
          )}
          <button onClick={handleReanalyze} disabled={isAnalyzing} className="btn-secondary text-sm">
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Re-analyze
          </button>
          <button onClick={handleDelete} className="btn-danger text-sm px-3 py-2">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* ─ Left: Scan Viewer ──────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-4">
          <div className="card p-3">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowOverlay(p => !p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    showOverlay
                      ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}
                >
                  {showOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  AI Overlay
                </button>
                {isComplete  && <span className="badge-sm status-completed"><CheckCircle2 className="w-2.5 h-2.5" /> Analyzed</span>}
                {isAnalyzing && <span className="badge-sm status-analyzing"><div className="w-2 h-2 border border-blue-400/30 border-t-blue-400 rounded-full animate-spin" /> Analyzing…</span>}
                {isFailed    && <span className="badge-sm status-failed"><AlertTriangle className="w-2.5 h-2.5" /> Failed</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom(p => Math.max(0.5, p - 0.25))} className="btn-ghost"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-xs text-slate-500 w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(p => Math.min(4, p + 0.25))} className="btn-ghost"><ZoomIn className="w-4 h-4" /></button>
                <button onClick={() => setZoom(1)} className="btn-ghost"><Maximize2 className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Image viewer */}
            <div className="relative w-full bg-black rounded-xl overflow-hidden border border-white/5" style={{ minHeight: 380 }}>
              {scan.imageUrl ? (
                <div className="overflow-auto" style={{ cursor: zoom > 1 ? 'grab' : 'default' }}>
                  <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease', position: 'relative' }}>
                    <img
                      ref={imgRef}
                      src={scan.imageUrl}
                      alt="Medical scan"
                      className="w-full object-contain block"
                      style={{ maxHeight: 540 }}
                    />
                    {/* AI overlays */}
                    {showOverlay && isComplete && scan.regions?.map((region, i) => {
                      const isSel = selectedRegion?.label === region.label;
                      return (
                        <div
                          key={i}
                          className={`absolute region-overlay cursor-pointer ${isSel ? 'selected' : ''}`}
                          style={{
                            left:   `${(region.x || 0) * 100}%`,
                            top:    `${(region.y || 0) * 100}%`,
                            width:  `${(region.width || 0.15) * 100}%`,
                            height: `${(region.height || 0.15) * 100}%`,
                            border: `2px solid ${region.color || '#ef4444'}`,
                            borderRadius: 6,
                            background: `${region.color || '#ef4444'}12`,
                            '--region-color': `${region.color || '#ef4444'}60`,
                            zIndex: isSel ? 20 : 10,
                          }}
                          onClick={() => setSelectedRegion(isSel ? null : region)}
                        >
                          {/* Disease name label */}
                          <div
                            className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap max-w-40 truncate"
                            style={{ background: region.color || '#ef4444', color: '#fff' }}
                          >
                            {region.diseaseName || region.label}
                          </div>
                          {/* Confidence chip */}
                          <div
                            className="absolute bottom-0 right-0 px-1.5 py-0.5 rounded-tl text-[8px] font-bold"
                            style={{ background: `${region.color || '#ef4444'}cc`, color: '#fff' }}
                          >
                            {Math.round((region.confidence || 0) * 100)}%
                          </div>
                          {/* Detection type chip */}
                          {region.detectionType && (
                            <div
                              className="absolute top-0 right-0 px-1.5 py-0.5 rounded-bl text-[8px] font-semibold"
                              style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
                            >
                              {region.detectionType}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="w-full h-80 flex items-center justify-center text-slate-600">No image</div>
              )}

              {/* Analyzing overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
                  <div className="scan-beam" />
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full" />
                    <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin" />
                    <Brain className="absolute inset-0 m-auto w-7 h-7 text-cyan-400 animate-pulse" />
                  </div>
                  <p className="text-cyan-400 font-semibold">Disease Detection AI Running</p>
                  <p className="text-slate-400 text-xs">Analyzing pathologies in image…</p>
                </div>
              )}

              {/* Selected region info card */}
              <AnimatePresence>
                {selectedRegion && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-3 left-3 right-3 glass-elevated rounded-xl p-3.5 border z-30"
                    style={{ borderColor: `${selectedRegion.color}40` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: selectedRegion.color }} />
                          <p className="text-sm font-bold text-white">{selectedRegion.diseaseName || selectedRegion.label}</p>
                          {selectedRegion.detectionType && (
                            <span className="badge-sm bg-white/8 text-slate-300 border border-white/10">
                              {selectedRegion.detectionType}
                            </span>
                          )}
                          {selectedRegion.icdCode && (
                            <span className="badge-sm bg-blue-500/15 text-blue-300 border border-blue-500/20 font-mono text-[9px]">
                              ICD-10: {selectedRegion.icdCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed mb-2">{selectedRegion.description}</p>
                        <ConfidenceBar value={selectedRegion.confidence} color={selectedRegion.color} />
                        {selectedRegion.recommendation && (
                          <div className="mt-2 text-[10px] text-slate-400 leading-relaxed border-t border-white/5 pt-2">
                            <span className="text-orange-400 font-semibold">Rec: </span>
                            {selectedRegion.recommendation.length > 120
                              ? selectedRegion.recommendation.slice(0, 120) + '…'
                              : selectedRegion.recommendation}
                          </div>
                        )}
                      </div>
                      <button onClick={() => setSelectedRegion(null)} className="text-slate-500 hover:text-white transition-colors shrink-0 mt-0.5">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Region legend / clickable pills */}
            {isComplete && scan.regions?.length > 0 && showOverlay && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider w-full mb-1">Click to highlight</p>
                {scan.regions.map((r, i) => {
                  const isSel = selectedRegion?.label === r.label;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedRegion(isSel ? null : r)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border transition-all ${
                        isSel ? 'border-white/25 bg-white/10' : 'border-white/8 bg-white/3 hover:border-white/18'
                      }`}
                      title={r.description}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                      <span className="text-slate-300 font-medium max-w-32 truncate">{r.diseaseName || r.label}</span>
                      <span className="text-slate-600 tabular-nums font-mono">{Math.round((r.confidence || 0) * 100)}%</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Clinical Notes */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                Clinical Notes
              </h3>
              {!editNotes ? (
                <button onClick={() => setEditNotes(true)} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">Edit</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditNotes(false)} className="text-xs text-slate-500">Cancel</button>
                  <button onClick={handleSaveNotes} className="text-xs text-emerald-400 font-semibold">Save</button>
                </div>
              )}
            </div>
            {editNotes ? (
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input resize-none h-24 w-full text-sm"
                placeholder="Add clinical notes, differential diagnoses, follow-up instructions…"
                autoFocus
              />
            ) : (
              <p className="text-sm text-slate-400 leading-relaxed">
                {scan.clinicalNotes || <span className="text-slate-600 italic">No notes added yet.</span>}
              </p>
            )}
          </div>
        </div>

        {/* ─ Right: Disease Detection Panel ────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Tab navigation */}
          <div className="flex gap-1 p-1 bg-white/3 rounded-xl border border-white/5">
            {[
              { id: 'findings', label: 'Diseases', icon: Microscope },
              { id: 'summary',  label: 'Summary',  icon: Brain },
              { id: 'details',  label: 'Details',  icon: Info },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === id
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* ── DISEASES TAB ── */}
          {activeTab === 'findings' && (
            <div className="space-y-3">
              {/* Risk gauge */}
              {isComplete && (
                <div className="card flex items-center gap-5 p-4">
                  <RiskGauge severity={scan.overallSeverity} confidence={scan.overallConfidence} />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Detected Conditions</p>
                    {detectedDiseases.length > 0 ? (
                      <div className="space-y-1.5">
                        {detectedDiseases.map((d, i) => {
                          const finding = scan.findings?.find(f => f.diseaseName === d);
                          const color = finding?.severity === 'severe' ? '#ef4444'
                            : finding?.severity === 'moderate' ? '#f97316'
                            : '#f59e0b';
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                              <p className="text-xs font-semibold text-slate-200 leading-tight">{d}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No pathologies detected</p>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              {isComplete && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Findings', value: scan.findings?.length || 0, color: '#06b6d4' },
                    { label: 'Regions',  value: scan.regions?.length  || 0, color: '#8b5cf6' },
                    { label: 'Urgent',   value: urgentCount,                color: '#ef4444' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white/3 rounded-xl p-3 text-center border border-white/5">
                      <p className="text-xl font-black text-white">{value}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Finding cards */}
              {isAnalyzing ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 skeleton rounded-xl" />
                  ))}
                </div>
              ) : isComplete && scan.findings?.length > 0 ? (
                <div className="space-y-2">
                  {scan.findings.map((f, i) => (
                    <FindingCard
                      key={i}
                      finding={f}
                      index={i}
                      isSelected={selectedRegion?.label === (f.diseaseName || f.category)}
                      onSelect={() => {
                        const region = scan.regions?.find(r =>
                          r.diseaseName === f.diseaseName || r.label === f.category
                        );
                        setSelectedRegion(
                          selectedRegion?.label === (f.diseaseName || f.category) ? null : (region || null)
                        );
                      }}
                    />
                  ))}
                </div>
              ) : isComplete ? (
                <div className="card text-center py-10">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-slate-300 font-semibold">No significant pathology detected</p>
                  <p className="text-slate-500 text-xs mt-1">Scan appears within normal limits</p>
                </div>
              ) : isFailed ? (
                <div className="card text-center py-10">
                  <AlertTriangle className="w-10 h-10 text-red-500/60 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Analysis failed</p>
                  <button onClick={handleReanalyze} className="btn-primary mx-auto mt-3 text-xs py-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* ── SUMMARY TAB ── */}
          {activeTab === 'summary' && (
            <div className="space-y-3">
              {isComplete && scan.aiSummary ? (
                <>
                  <div className="card">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-semibold text-white">AI Diagnostic Summary</h3>
                      <span className="text-[10px] ml-auto text-slate-600 mono">
                        {scan.analysisSource === 'nvidia-vista3d' ? 'NVIDIA VISTA-3D' : 'ScanSight AI'}
                      </span>
                    </div>
                    {/* Highlight detected diseases */}
                    {detectedDiseases.length > 0 && (
                      <div className="mb-4 p-3 rounded-xl border border-white/8 bg-white/3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Identified Pathologies</p>
                        <div className="space-y-2">
                          {scan.findings?.map((f, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <div
                                className="w-2 h-2 rounded-full shrink-0 mt-1"
                                style={{ background: SEVERITY_META[f.severity]?.bg || '#f97316' }}
                              />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-white">{f.diseaseName}</p>
                                {f.icdCode && (
                                  <p className="text-[10px] text-slate-500 font-mono">ICD-10: {f.icdCode}</p>
                                )}
                              </div>
                              <span className={`badge-sm ${SEVERITY_META[f.severity]?.badge}`}>
                                {f.severity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {scan.aiSummary.replace(/\*\*(.*?)\*\*/g, '$1')}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/8">
                    <div className="flex gap-2">
                      <TriangleAlert className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-yellow-300/80 leading-relaxed">
                        This AI analysis is a <strong>decision-support tool only</strong>. All findings must be validated by a qualified radiologist or specialist physician before any clinical action is taken.
                      </p>
                    </div>
                  </div>
                </>
              ) : isAnalyzing ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 skeleton rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
                  ))}
                </div>
              ) : (
                <div className="card text-center py-12 text-slate-500">
                  No summary available yet
                </div>
              )}
            </div>
          )}

          {/* ── DETAILS TAB ── */}
          {activeTab === 'details' && (
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-slate-500" />
                Scan Metadata
              </h3>
              <div className="space-y-0">
                {[
                  ['Scan Type',    scan.scanType],
                  ['Body Part',    scan.bodyPart],
                  ['Priority',     <span key="p" className={`badge-sm priority-${scan.priority} capitalize`}>{scan.priority}</span>],
                  ['Contrast',     scan.contrastUsed ? 'Yes' : 'No'],
                  ['Status',       <span key="s" className="badge-sm bg-slate-500/15 text-slate-300 capitalize border border-slate-500/20">{scan.status}</span>],
                  ['Patient',      <Link key="pt" to={`/patients/${scan.patient?._id}`} className="text-cyan-400 hover:text-cyan-300 transition-colors text-[11px]">{scan.patient?.name}</Link>],
                  ['Patient ID',   scan.patient?.patientId],
                  ['Age / Gender', `${scan.patient?.age || '—'} / ${scan.patient?.gender || '—'}`],
                  ['Uploaded',     format(new Date(scan.createdAt), 'MMM d, yyyy h:mm a')],
                  ['File Size',    scan.fileSize ? `${(scan.fileSize / 1024 / 1024).toFixed(2)} MB` : '—'],
                  ['AI Engine',    scan.analysisSource === 'nvidia-vista3d' ? 'NVIDIA VISTA-3D' : 'ScanSight AI'],
                  ['Primary Dx',   scan.primaryDiagnosis || (isComplete ? (detectedDiseases[0] || 'None detected') : '—')],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-xs text-slate-200 font-medium text-right max-w-44 truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ReportModal open={showReport} onClose={() => setShowReport(false)} report={report} />
    </div>
  );
}
