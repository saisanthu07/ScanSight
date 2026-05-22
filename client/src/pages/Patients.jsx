import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Filter, ChevronRight, User, Calendar, Activity } from 'lucide-react';
import { patientsAPI } from '../services/api';
import toast from 'react-hot-toast';
import AddPatientModal from '../components/AddPatientModal';
import { format } from 'date-fns';

const STATUS_COLORS = {
  active: 'bg-emerald-500/20 text-emerald-400',
  discharged: 'bg-slate-500/20 text-slate-400',
  critical: 'bg-red-500/20 text-red-400',
  stable: 'bg-blue-500/20 text-blue-400',
};

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientsAPI.getAll({ search, status: statusFilter });
      setPatients(res.data.patients);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchPatients, 300);
    return () => clearTimeout(t);
  }, [fetchPatients]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Patients</h1>
          <p className="text-slate-400 text-sm mt-0.5">{total} patients in your care</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Patient
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9 w-full" placeholder="Search by name or patient ID..."
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'critical', 'stable', 'discharged'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize border transition-all ${
                statusFilter === s
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                  : 'bg-navy-800 text-slate-400 border-white/10 hover:border-white/20'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-navy-700" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-navy-700 rounded w-3/4" />
                  <div className="h-2.5 bg-navy-700 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-navy-700 rounded w-full" />
                <div className="h-2 bg-navy-700 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-14 h-14 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No patients found</h3>
          <p className="text-slate-500 text-sm mb-6">
            {search ? 'Try a different search term' : 'Add your first patient to get started'}
          </p>
          {!search && (
            <button onClick={() => setShowAdd(true)} className="btn-primary mx-auto">
              <Plus className="w-4 h-4" /> Add Patient
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((patient, i) => (
            <motion.div
              key={patient._id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link to={`/patients/${patient._id}`} className="card-hover block group">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-900/60 to-blue-900/60 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">
                      {patient.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{patient.patientId}</p>
                  </div>
                  <span className={`badge capitalize text-xs ${STATUS_COLORS[patient.status] || STATUS_COLORS.active}`}>
                    {patient.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-navy-800/60 rounded-xl p-2">
                    <p className="text-sm font-bold text-white">{patient.age}</p>
                    <p className="text-[10px] text-slate-500">Age</p>
                  </div>
                  <div className="bg-navy-800/60 rounded-xl p-2">
                    <p className="text-sm font-bold text-white">{patient.gender[0]}</p>
                    <p className="text-[10px] text-slate-500">Gender</p>
                  </div>
                  <div className="bg-navy-800/60 rounded-xl p-2">
                    <p className="text-sm font-bold text-white">{patient.bloodGroup}</p>
                    <p className="text-[10px] text-slate-500">Blood</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(patient.createdAt), 'MMM d, yyyy')}
                  </span>
                  <span className="text-xs text-cyan-400 group-hover:text-cyan-300 flex items-center gap-0.5 transition-colors">
                    View <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <AddPatientModal open={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); fetchPatients(); }} />
    </div>
  );
}
