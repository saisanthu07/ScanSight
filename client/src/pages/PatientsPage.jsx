import { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Activity, Calendar, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    personalInfo: { firstName: '', lastName: '', gender: 'male', dateOfBirth: '' },
    contact: { phone: '', email: '' }
  });
  const navigate = useNavigate();

  const handleAddPatient = async (e) => {
    e.preventDefault();
    try {
      await api.post('/patients', formData);
      toast.success('Patient added successfully');
      setShowModal(false);
      setFormData({
        personalInfo: { firstName: '', lastName: '', gender: 'male', dateOfBirth: '' },
        contact: { phone: '', email: '' }
      });
      fetchPatients();
    } catch {
      toast.error('Failed to add patient');
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [pagination.page]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/patients', {
        params: { page: pagination.page, limit: pagination.limit, search },
      });
      setPatients(data.data.patients);
      setPagination(data.data.pagination);
    } catch {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchPatients();
  };

  return (
    <div className="patients-page">
      <div className="page-header flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Patient Directory</h1>
          <p className="page-subtitle">Manage your patients and their medical records</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={16} /> Add Patient
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 16 }}>
        <form className="flex gap-4" onSubmit={handleSearch}>
          <div className="input-wrapper" style={{ flex: 1 }}>
            <Search size={16} className="input-icon" />
            <input
              type="text"
              className="form-input input-with-icon"
              placeholder="Search by name, ID, or phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>ID</th>
              <th>Gender / Age</th>
              <th>Contact</th>
              <th>Total Scans</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                  No patients found.
                </td>
              </tr>
            ) : (
              patients.map((patient) => (
                <tr key={patient._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                        background: 'rgba(139, 92, 246, 0.1)', color: 'var(--purple)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700
                      }}>
                        {patient.personalInfo?.firstName?.[0]}{patient.personalInfo?.lastName?.[0]}
                      </div>
                      <span style={{ fontWeight: 600 }}>
                        {patient.personalInfo?.firstName} {patient.personalInfo?.lastName}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                      {patient.patientId}
                    </span>
                  </td>
                  <td>
                    <span style={{ textTransform: 'capitalize' }}>
                      {patient.personalInfo?.gender || 'N/A'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 8 }}>
                      {patient.personalInfo?.dateOfBirth ? (
                        `${new Date().getFullYear() - new Date(patient.personalInfo.dateOfBirth).getFullYear()} yrs`
                      ) : 'N/A'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{patient.contact?.phone || 'N/A'}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {patient.contact?.email || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info">{patient.totalScans || 0} Scans</span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-secondary">
                      View Profile <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex-center gap-2" style={{ marginTop: 24 }}>
          <button
            className="btn btn-ghost btn-sm"
            disabled={pagination.page === 1}
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={pagination.page === pagination.pages}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
          >
            Next
          </button>
        </div>
      )}
      {/* Add Patient Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 500, padding: 24, margin: 20
          }}>
            <h2 style={{ marginBottom: 20 }}>Add New Patient</h2>
            <form onSubmit={handleAddPatient}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">First Name *</label>
                <input required type="text" className="form-input" value={formData.personalInfo.firstName} onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, firstName: e.target.value}})} />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Last Name *</label>
                <input required type="text" className="form-input" value={formData.personalInfo.lastName} onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, lastName: e.target.value}})} />
              </div>
              <div className="form-group" style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Gender</label>
                  <select className="form-input" value={formData.personalInfo.gender} onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, gender: e.target.value}})}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Date of Birth</label>
                  <input type="date" className="form-input" value={formData.personalInfo.dateOfBirth} onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, dateOfBirth: e.target.value}})} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Phone Number</label>
                <input type="tel" className="form-input" value={formData.contact.phone} onChange={(e) => setFormData({...formData, contact: {...formData.contact, phone: e.target.value}})} />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" value={formData.contact.email} onChange={(e) => setFormData({...formData, contact: {...formData.contact, email: e.target.value}})} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
