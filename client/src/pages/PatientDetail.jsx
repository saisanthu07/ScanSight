import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Heart, AlertCircle,
  ScanLine, Plus, Trash2, Edit3, Clock, ChevronRight
} from 'lucide-react';
import { patientsAPI, scansAPI } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  active: 'severity-normal', discharged: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  critical: 'severity-critical', stable: 'severity-mild',
};

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientsAPI.getOne(id)
      .then(res => { setPatient(res.data.patient); setScans(res.data.scans || []); })
      .catch(() => toast.error('Patient not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete patient "${patient?.name}"? This cannot be undone.`)) return;
    try {
      await patientsAPI.delete(id);
      toast.success('Patient deleted');
      navigate('/patients');
    } catch {
      toast.error('Failed to delete patient');
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse h-28" />
        ))}
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-400">Patient not found.</p>
        <Link to="/patients" className="text-cyan-400 hover:underline text-sm mt-2 inline-block">← Back to patients</Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/patients" className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{patient.name}</h1>
            <p className="text-slate-500 text-sm font-mono">{patient.patientId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/scans?patient=${patient._id}`}
            className="btn-primary text-sm"
          >
            <Plus className="w-4 h-4" /> New Scan
          </Link>
          <button onClick={handleDelete} className="btn-danger text-sm">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-900/60 to-blue-900/60 border border-cyan-500/20 flex items-center justify-center">
                <User className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">{patient.name}</h2>
                <span className={`badge ${STATUS_COLORS[patient.status] || STATUS_COLORS.active} capitalize mt-1`}>
                  {patient.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[['Age', patient.age], ['Gender', patient.gender[0]], ['Blood', patient.bloodGroup]].map(([label, val]) => (
                <div key={label} className="bg-navy-800/60 rounded-xl p-3 text-center">
                  <p className="text-base font-bold text-white">{val}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3 text-sm">
              {patient.contactNumber && (
                <div className="flex items-center gap-2.5 text-slate-400">
                  <Phone className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>{patient.contactNumber}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-2.5 text-slate-400">
                  <Mail className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="truncate">{patient.email}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-center gap-2.5 text-slate-400">
                  <MapPin className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>{patient.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-slate-400">
                <Clock className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Registered {format(new Date(patient.createdAt), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </motion.div>

          {/* Medical History */}
          {(patient.medicalHistory?.length > 0 || patient.allergies?.length > 0) && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
              {patient.medicalHistory?.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="w-4 h-4 text-red-400" />
                    <h3 className="text-sm font-semibold text-white">Medical History</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {patient.medicalHistory.map(h => (
                      <span key={h} className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">{h}</span>
                    ))}
                  </div>
                </div>
              )}
              {patient.allergies?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-semibold text-white">Allergies</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map(a => (
                      <span key={a} className="badge bg-orange-500/10 text-orange-400 border border-orange-500/20">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right: Scans */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="lg:col-span-2 card"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">Scan History ({scans.length})</h2>
            <Link to={`/scans?patient=${patient._id}`} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              + Upload New Scan
            </Link>
          </div>

          {scans.length === 0 ? (
            <div className="text-center py-12">
              <ScanLine className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 text-sm">No scans uploaded yet for this patient</p>
              <Link to={`/scans?patient=${patient._id}`} className="text-cyan-400 text-sm hover:text-cyan-300 mt-2 inline-block transition-colors">
                Upload first scan →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {scans.map((scan, i) => (
                <motion.div
                  key={scan._id}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/scans/${scan._id}`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group border border-transparent hover:border-white/10"
                  >
                    <div className="w-16 h-16 rounded-xl bg-navy-800 border border-white/10 overflow-hidden shrink-0">
                      {scan.thumbnailUrl
                        ? <img src={scan.thumbnailUrl} alt="scan" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ScanLine className="w-6 h-6 text-slate-600" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{scan.scanType}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400 text-sm">{scan.bodyPart}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`badge text-xs ${`severity-${scan.overallSeverity || 'normal'}`}`}>
                          {scan.overallSeverity || 'Pending'}
                        </span>
                        <span className={`badge text-xs priority-${scan.priority}`}>{scan.priority}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(scan.createdAt), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge text-xs ${
                        scan.analysisStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        scan.analysisStatus === 'analyzing' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        scan.analysisStatus === 'failed' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`}>
                        {scan.analysisStatus}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
