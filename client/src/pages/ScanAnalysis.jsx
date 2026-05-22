import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanLine, Upload, X, CheckCircle2, AlertCircle, Clock,
  ChevronRight, RefreshCw, Cpu, Zap, Filter, AlertTriangle,
  Activity, Eye, TrendingUp, Target,
} from 'lucide-react';
import { scansAPI, patientsAPI } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

const BODY_PARTS = {
  CT:         ['Chest', 'Abdomen', 'Brain', 'Pelvis', 'Spine', 'Neck', 'Extremities', 'Full Body'],
  MRI:        ['Brain', 'Spine', 'Knee', 'Shoulder', 'Hip', 'Abdomen', 'Pelvis', 'Wrist'],
  'X-Ray':    ['Chest', 'Bone', 'Abdomen', 'Spine', 'Hand', 'Foot', 'Knee', 'Shoulder'],
  PET:        ['Full Body', 'Brain', 'Chest', 'Abdomen'],
  Ultrasound: ['Abdomen', 'Pelvis', 'Thyroid', 'Breast', 'Heart', 'Kidney'],
};

const SEVERITY_COLORS = {
  normal:   { dot: '#10b981', badge: 'severity-normal' },
  mild:     { dot: '#f59e0b', badge: 'severity-mild' },
  moderate: { dot: '#f97316', badge: 'severity-moderate' },
  severe:   { dot: '#ef4444', badge: 'severity-severe' },
  critical: { dot: '#dc2626', badge: 'severity-critical' },
};

const StatusIcon = ({ status }) => {
  if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === 'analyzing') return <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />;
  if (status === 'failed')    return <AlertCircle className="w-4 h-4 text-red-400" />;
  return <Clock className="w-4 h-4 text-slate-500" />;
};

export default function ScanAnalysis() {
  const [scans, setScans] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkReanalyzing, setBulkReanalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewUrl, setPreviewUrl] = useState(null);

  const [form, setForm] = useState({
    patientId: '',
    scanType: 'CT',
    bodyPart: 'Chest',
    priority: 'routine',
    clinicalNotes: '',
    contrastUsed: false,
  });
  const [file, setFile] = useState(null);

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: typeof v === 'object' && v.target ? v.target.value : v }));

  const fetchScans = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.analysisStatus = statusFilter;
      const res = await scansAPI.getAll(params);
      setScans(res.data.scans || []);
    } catch {
      toast.error('Failed to load scans');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchScans(); }, [fetchScans]);

  useEffect(() => {
    patientsAPI.getAll({ limit: 100 }).then(res => setPatients(res.data.patients || [])).catch(() => {});
  }, []);

  // Auto-refresh analyzing scans
  useEffect(() => {
    const analyzing = scans.filter(s => s.analysisStatus === 'analyzing' || s.analysisStatus === 'pending');
    if (analyzing.length === 0) return;
    const t = setInterval(fetchScans, 5000);
    return () => clearInterval(t);
  }, [scans, fetchScans]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.tiff'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    onDrop: (accepted, rejected) => {
      if (rejected.length) return toast.error('File rejected. Max 50MB, images only.');
      if (accepted.length) {
        const f = accepted[0];
        setFile(f);
        setPreviewUrl(URL.createObjectURL(f));
      }
    },
  });

  const clearFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a scan image');
    if (!form.patientId) return toast.error('Please select a patient');
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append('scan', file);
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      await scansAPI.upload(fd, setUploadProgress);
      toast.success('🔬 Scan uploaded! AI analysis started…');
      clearFile();
      setShowUpload(false);
      setForm(p => ({ ...p, patientId: '', clinicalNotes: '', contrastUsed: false }));
      fetchScans();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleBulkReanalyze = async () => {
    const toRefresh = scans.filter((scan) => ['completed', 'failed'].includes(scan.analysisStatus));
    if (!toRefresh.length) {
      toast('No completed or failed scans to re-analyze');
      return;
    }

    if (!window.confirm(`Re-analyze ${toRefresh.length} scans with the latest model logic?`)) return;

    setBulkReanalyzing(true);
    try {
      const res = await scansAPI.reanalyzeBulk(['completed', 'failed']);
      const queued = res.data?.queued || 0;
      toast.success(`Bulk re-analysis started for ${queued} scan${queued === 1 ? '' : 's'}`);
      fetchScans();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start bulk re-analysis');
    } finally {
      setBulkReanalyzing(false);
    }
  };

  const stats = {
    total:     scans.length,
    analyzing: scans.filter(s => s.analysisStatus === 'analyzing').length,
    completed: scans.filter(s => s.analysisStatus === 'completed').length,
    urgent:    scans.filter(s => ['severe','critical'].includes(s.overallSeverity)).length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Scan Analysis</h1>
          <p className="text-slate-400 text-sm mt-0.5">AI-powered medical imaging analysis platform</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchScans} className="btn-icon" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleBulkReanalyze}
            className="btn-secondary text-sm"
            disabled={bulkReanalyzing}
          >
            <RefreshCw className={`w-4 h-4 ${bulkReanalyzing ? 'animate-spin' : ''}`} />
            Re-analyze All
          </button>
          <button onClick={() => setShowUpload(p => !p)} className="btn-primary text-sm">
            <Upload className="w-4 h-4" /> Upload Scan
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {scans.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: ScanLine, color: '#06b6d4' },
            { label: 'Analyzing', value: stats.analyzing, icon: Cpu, color: '#8b5cf6' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: '#10b981' },
            { label: 'Urgent', value: stats.urgent, icon: AlertTriangle, color: '#ef4444' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card-sm flex items-center gap-3 border border-white/5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Panel */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleUpload} className="card border border-cyan-500/20 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-semibold text-white">Upload & Analyze Scan</h2>
                  <span className="badge-sm bg-violet-500/15 text-violet-400 border border-violet-500/20">
                    <Zap className="w-2.5 h-2.5" /> AI Powered
                  </span>
                </div>
                <button type="button" onClick={() => { setShowUpload(false); clearFile(); }} className="btn-ghost">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Dropzone */}
                <div>
                  <label className="label">Scan Image *</label>
                  <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                      isDragActive
                        ? 'border-cyan-400 bg-cyan-500/10'
                        : file
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-white/15 hover:border-cyan-500/40 hover:bg-white/3'
                    }`}
                    style={{ minHeight: 200 }}
                  >
                    <input {...getInputProps()} />
                    {file && previewUrl ? (
                      <div className="space-y-2">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="w-full h-36 object-contain rounded-xl"
                        />
                        <p className="text-xs font-medium text-white truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); clearFile(); }}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 py-4">
                        <Upload className="w-10 h-10 text-slate-600 mx-auto" />
                        <div>
                          <p className="text-sm text-slate-400 font-medium">
                            {isDragActive ? 'Drop your scan here…' : 'Drag & drop scan or click to browse'}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">JPEG, PNG, WebP, TIFF · Max 50MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-3.5">
                  <div>
                    <label className="label">Patient *</label>
                    <select value={form.patientId} onChange={set('patientId')} className="input" required>
                      <option value="">— Select Patient —</option>
                      {patients.map(p => (
                        <option key={p._id} value={p._id}>{p.name} ({p.patientId})</option>
                      ))}
                    </select>
                    {patients.length === 0 && (
                      <p className="text-xs text-orange-400 mt-1">
                        <Link to="/patients" className="underline">Add a patient</Link> first
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Scan Type *</label>
                      <select
                        value={form.scanType}
                        onChange={(e) => {
                          const type = e.target.value;
                          setForm(p => ({ ...p, scanType: type, bodyPart: BODY_PARTS[type][0] }));
                        }}
                        className="input"
                      >
                        {Object.keys(BODY_PARTS).map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Body Part *</label>
                      <select value={form.bodyPart} onChange={set('bodyPart')} className="input">
                        {(BODY_PARTS[form.scanType] || []).map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Priority</label>
                      <select value={form.priority} onChange={set('priority')} className="input">
                        {['routine', 'urgent', 'stat'].map(p => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.contrastUsed}
                          onChange={e => setForm(p => ({ ...p, contrastUsed: e.target.checked }))}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/30"
                        />
                        <span className="text-sm text-slate-400">Contrast used</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="label">Clinical Notes</label>
                    <textarea
                      value={form.clinicalNotes}
                      onChange={set('clinicalNotes')}
                      className="input resize-none h-20"
                      placeholder="Relevant clinical history, symptoms, reason for scan…"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Uploading & starting AI analysis…</span>
                    <span className="tabular-nums">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-600 to-violet-500 rounded-full"
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowUpload(false); clearFile(); }} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button type="submit" disabled={uploading || !file} className="btn-primary flex-1 justify-center">
                  {uploading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading…</>
                  ) : (
                    <><Cpu className="w-4 h-4" />Analyze Scan</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-600" />
        {['all', 'pending', 'analyzing', 'completed', 'failed'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize border transition-all ${
              statusFilter === s
                ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/35'
                : 'bg-white/3 text-slate-400 border-white/8 hover:border-white/18'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Scan Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card space-y-4">
              <div className="h-36 skeleton rounded-xl" />
              <div className="space-y-2">
                <div className="h-3 skeleton w-3/4" />
                <div className="h-2.5 skeleton w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : scans.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center mx-auto mb-5">
            <ScanLine className="w-10 h-10 text-slate-700" />
          </div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No scans found</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
            {statusFilter !== 'all' ? `No ${statusFilter} scans. ` : ''}
            Upload a scan to start AI-powered analysis.
          </p>
          <button onClick={() => setShowUpload(true)} className="btn-primary mx-auto">
            <Upload className="w-4 h-4" /> Upload First Scan
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scans.map((scan, i) => {
            const sevInfo = SEVERITY_COLORS[scan.overallSeverity] || SEVERITY_COLORS.normal;
            return (
              <motion.div
                key={scan._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/scans/${scan._id}`} className="card-hover block group">
                  {/* Thumbnail */}
                  <div className="relative w-full h-36 rounded-xl bg-black border border-white/5 overflow-hidden mb-4">
                    {scan.imageUrl ? (
                      <img
                        src={scan.thumbnailUrl || scan.imageUrl}
                        alt="scan"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ScanLine className="w-10 h-10 text-slate-700" />
                      </div>
                    )}

                    {/* Priority badge */}
                    <div className="absolute top-2 left-2">
                      <span className={`badge-sm priority-${scan.priority}`}>{scan.priority}</span>
                    </div>

                    {/* Severity badge (top right) */}
                    {scan.analysisStatus === 'completed' && (
                      <div className="absolute top-2 right-2">
                        <span className={`badge-sm ${sevInfo.badge}`}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: sevInfo.dot }} />
                          {scan.overallSeverity}
                        </span>
                      </div>
                    )}

                    {/* Analyzing overlay */}
                    {(scan.analysisStatus === 'analyzing' || scan.analysisStatus === 'pending') && (
                      <div className="absolute inset-0 bg-slate-900/65 flex flex-col items-center justify-center gap-2">
                        <div className="scan-beam" />
                        <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                        <p className="text-xs text-cyan-400 font-semibold">Analyzing…</p>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white group-hover:text-cyan-300 transition-colors text-sm leading-tight">
                          {scan.patient?.name || 'Unknown Patient'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{scan.scanType} · {scan.bodyPart}</p>
                        {/* Disease names — KEY ADDITION */}
                        {scan.analysisStatus === 'completed' && scan.detectedConditions?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {scan.detectedConditions.slice(0, 2).map((d, i) => {
                              const finding = scan.findings?.find(f => f.diseaseName === d);
                              const color = finding?.severity === 'severe' ? '#ef4444' : finding?.severity === 'moderate' ? '#f97316' : '#f59e0b';
                              return (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border truncate max-w-full"
                                  style={{ background: `${color}15`, borderColor: `${color}30`, color }}
                                >
                                  {d}
                                </span>
                              );
                            })}
                            {scan.detectedConditions.length > 2 && (
                              <span className="text-[9px] text-slate-600">+{scan.detectedConditions.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 mt-0.5" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={scan.analysisStatus} />
                        <span className="text-xs text-slate-500 capitalize">{scan.analysisStatus}</span>
                      </div>
                      {scan.analysisStatus === 'completed' && scan.findings && (
                        <span className="text-[10px] text-slate-600 flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {scan.findings?.length || 0} findings
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(scan.createdAt), 'MMM d, yyyy · h:mm a')}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
