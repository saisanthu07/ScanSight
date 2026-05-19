import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scan, Brain, Search, Filter, AlertTriangle, Eye, ChevronRight, FileText, Download } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';

export default function ScansPage() {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  useEffect(() => {
    fetchScans();
  }, [pagination.page, statusFilter, typeFilter]);

  const fetchScans = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/scans', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search,
          status: statusFilter,
          scanType: typeFilter,
        },
      });
      setScans(data.data.scans);
      setPagination(data.data.pagination);
    } catch {
      toast.error('Failed to load scans');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchScans();
  };

  return (
    <div className="scans-page">
      <div className="page-header flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">My Scans</h1>
          <p className="page-subtitle">Manage and analyze your medical imaging data</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/upload')}>
          Upload New Scan
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 16 }}>
        <form className="flex gap-4" onSubmit={handleSearch}>
          <div className="input-wrapper" style={{ flex: 1 }}>
            <Search size={16} className="input-icon" />
            <input
              type="text"
              className="form-input input-with-icon"
              placeholder="Search by patient name, ID, or file name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 160 }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination({ ...pagination, page: 1 }); }}
          >
            <option value="">All Statuses</option>
            <option value="uploaded">Uploaded</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <select
            className="form-select"
            style={{ width: 160 }}
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPagination({ ...pagination, page: 1 }); }}
          >
            <option value="">All Types</option>
            <option value="CT">CT</option>
            <option value="MRI">MRI</option>
            <option value="X-Ray">X-Ray</option>
            <option value="PET">PET</option>
            <option value="Ultrasound">Ultrasound</option>
          </select>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Scan Info</th>
              <th>Patient</th>
              <th>Type / Body Part</th>
              <th>Status</th>
              <th>Date</th>
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
            ) : scans.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                  No scans found.
                </td>
              </tr>
            ) : (
              scans.map((scan) => (
                <tr key={scan._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 212, 255, 0.1)', color: 'var(--cyan)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Scan size={18} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{scan.originalFilename}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {(scan.fileSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{scan.patientInfo?.name || 'Anonymous'}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ID: {scan.patientInfo?.patientId || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{scan.scanType}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {scan.bodyPart}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      scan.status === 'completed' ? 'badge-success' :
                      scan.status === 'processing' ? 'badge-warning' :
                      scan.status === 'failed' ? 'badge-danger' : 'badge-info'
                    }`}>
                      {scan.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/analysis/${scan._id}`)}>
                      {scan.status === 'completed' ? 'View Results' : 'Open'} <ChevronRight size={14} />
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
    </div>
  );
}
