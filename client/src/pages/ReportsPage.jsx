import { useState, useEffect } from 'react';
import { FileText, Download, FilePlus, Search, Calendar } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import useAuthStore from '../store/authStore';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const { user } = useAuthStore();

  useEffect(() => {
    fetchReports();
  }, [pagination.page]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reports', {
        params: { page: pagination.page, limit: pagination.limit },
      });
      setReports(data.data.reports);
      setPagination(data.data.pagination);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reportId) => {
    try {
      const response = await api.get(`/reports/${reportId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  return (
    <div className="reports-page">
      <div className="page-header flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Medical Reports</h1>
          <p className="page-subtitle">View and download AI-generated medical reports</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 16 }}>
        <form className="flex gap-4">
          <div className="input-wrapper" style={{ flex: 1 }}>
            <Search size={16} className="input-icon" />
            <input
              type="text"
              className="form-input input-with-icon"
              placeholder="Search reports by patient or ID..."
            />
          </div>
          <button type="button" className="btn btn-secondary">Search</button>
        </form>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Patient Info</th>
              <th>Scan Type</th>
              <th>Status</th>
              <th>Date Generated</th>
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
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                  No reports generated yet.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 255, 148, 0.1)', color: 'var(--green)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <FileText size={18} />
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                        #{report._id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{report.patientInfo?.name || 'Anonymous'}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ID: {report.patientInfo?.patientId || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{report.scanId?.scanType || 'N/A'}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {report.scanId?.bodyPart || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${report.status === 'finalized' ? 'badge-success' : 'badge-warning'}`}>
                      {report.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {new Date(report.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => handleDownload(report._id)}>
                      <Download size={14} /> Download PDF
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
