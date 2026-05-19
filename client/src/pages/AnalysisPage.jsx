import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Brain, AlertTriangle, CheckCircle, Clock, Eye, FileText,
  Activity, Zap, Target, RefreshCw, ChevronRight
} from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import './AnalysisPage.css';

export default function AnalysisPage() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [scan, setScan] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScanAndAnalysis();
  }, [scanId]);

  const loadScanAndAnalysis = async () => {
    try {
      const { data } = await api.get(`/scans/${scanId}`);
      setScan(data.data.scan);
      if (data.data.analysis) {
        setAnalysis(data.data.analysis);
        setStatus(data.data.analysis.status);
        setProgress(data.data.analysis.progress || 0);

        // Connect to socket for ongoing analyses
        if (data.data.analysis.status === 'processing' || data.data.analysis.status === 'pending') {
          connectSocket(data.data.analysis._id);
        }
      } else {
        setStatus('not_started');
      }
    } catch {
      toast.error('Failed to load scan data');
    } finally {
      setLoading(false);
    }
  };

  const connectSocket = (analysisId) => {
    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('join-analysis', analysisId);

    socket.on('analysis-progress', ({ progress: p, message, status: s }) => {
      setProgress(p);
      setProgressMsg(message);
      setStatus(s);
    });

    socket.on('analysis-complete', ({ results }) => {
      setProgress(100);
      setStatus('completed');
      setProgressMsg('Analysis complete!');
      loadScanAndAnalysis(); // reload full results
      toast.success('AI analysis completed!');
    });

    return () => socket.disconnect();
  };

  useEffect(() => {
    return () => socketRef.current?.disconnect();
  }, []);

  const startAnalysis = async () => {
    try {
      const { data } = await api.post(`/analysis/start/${scanId}`, { analysisType: 'full' });
      setStatus('pending');
      setProgress(0);
      setProgressMsg('Initializing...');
      connectSocket(data.data.analysisId);
      toast.info('AI analysis started!');
      loadScanAndAnalysis();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start analysis');
    }
  };

  const generateReport = async () => {
    if (!analysis?._id) return;
    try {
      await api.post(`/reports/generate/${analysis._id}`, {
        clinicalHistory: scan?.notes || '',
      });
      toast.success('Report generated!');
      navigate('/reports');
    } catch {
      toast.error('Failed to generate report');
    }
  };

  if (loading) {
    return (
      <div className="analysis-page flex-center" style={{ minHeight: '70vh' }}>
        <div className="flex-col flex-center gap-4">
          <div className="spinner spinner-lg" />
          <p style={{ color: 'var(--text-secondary)' }}>Loading scan data...</p>
        </div>
      </div>
    );
  }

  const results = analysis?.results;
  const isProcessing = status === 'processing' || status === 'pending';
  const isCompleted = status === 'completed';
  const assessment = results?.overallAssessment;
  const tumorData = results?.tumorDetection;

  const severityColor = {
    normal: 'var(--green)', mild: 'var(--cyan)', moderate: 'var(--yellow)',
    severe: 'var(--orange)', critical: 'var(--red)',
  };

  return (
    <div className="analysis-page">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">AI Analysis</h1>
          <p className="page-subtitle">
            {scan?.scanType} · {scan?.bodyPart} ·{' '}
            {scan?.patientInfo?.name || 'Anonymous Patient'}
          </p>
        </div>
        <div className="flex gap-3">
          {isCompleted && (
            <>
              <button className="btn btn-secondary" onClick={() => navigate(`/viewer/${analysis._id}`)}>
                <Eye size={16} /> 3D Viewer
              </button>
              <button className="btn btn-primary" onClick={generateReport}>
                <FileText size={16} /> Generate Report
              </button>
            </>
          )}
          {status === 'not_started' && (
            <button className="btn btn-primary" onClick={startAnalysis}>
              <Brain size={16} /> Start AI Analysis
            </button>
          )}
          {status === 'failed' && (
            <button className="btn btn-secondary" onClick={startAnalysis}>
              <RefreshCw size={16} /> Retry Analysis
            </button>
          )}
        </div>
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div className="card analysis-processing-card">
          <div className="processing-header">
            <div className="processing-icon">
              <Brain size={32} />
            </div>
            <div>
              <h2>NVIDIA VISTA-3D Processing</h2>
              <p>AI segmentation and tumor detection in progress...</p>
            </div>
            <div className="processing-badge">
              <div className="ai-status-dot" />
              <span>Running</span>
            </div>
          </div>

          <div style={{ margin: '24px 0' }}>
            <div className="flex-between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{progressMsg || 'Processing...'}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--cyan)' }}>{progress}%</span>
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="processing-steps">
            {[
              { step: 'Initialize Model', done: progress >= 10 },
              { step: 'Preprocess Data', done: progress >= 25 },
              { step: 'Run Segmentation', done: progress >= 65 },
              { step: 'Detect Findings', done: progress >= 80 },
              { step: 'Generate 3D Mesh', done: progress >= 95 },
              { step: 'Finalize Results', done: progress >= 100 },
            ].map(({ step, done }) => (
              <div key={step} className={`processing-step ${done ? 'done' : ''}`}>
                <div className="step-indicator">
                  {done ? <CheckCircle size={14} /> : <div className="step-dot" />}
                </div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not Started */}
      {status === 'not_started' && (
        <div className="card analysis-start-card">
          <div className="start-icon"><Brain size={64} /></div>
          <h2>Ready for Analysis</h2>
          <p>Click "Start AI Analysis" to process this scan with NVIDIA VISTA-3D.</p>
          <div className="start-features">
            {['3D Organ Segmentation', 'Tumor Detection & Sizing', 'Anatomy Mapping', 'AI Medical Report'].map((f) => (
              <div key={f} className="start-feature">
                <Zap size={14} style={{ color: 'var(--cyan)' }} />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-lg" onClick={startAnalysis}>
            <Brain size={20} /> Start AI Analysis
          </button>
        </div>
      )}

      {/* Results */}
      {isCompleted && results && (
        <div className="analysis-results">
          {/* Overall Assessment */}
          <div className="card assessment-card">
            <div className="assessment-header">
              <div>
                <h3>Overall Assessment</h3>
                <p>NVIDIA VISTA-3D AI Analysis</p>
              </div>
              <div className="assessment-severity" style={{ color: severityColor[assessment?.severity] || 'var(--text-primary)' }}>
                <div className="severity-dot" style={{ background: severityColor[assessment?.severity] }} />
                <span>{assessment?.severity?.toUpperCase() || 'N/A'}</span>
              </div>
            </div>

            <p className="assessment-summary">{assessment?.summary}</p>

            <div className="assessment-metrics">
              <div className="metric-item">
                <span className="metric-label">Urgency</span>
                <span className={`badge badge-${assessment?.urgency === 'routine' ? 'success' : assessment?.urgency === 'urgent' ? 'warning' : 'danger'}`}>
                  {assessment?.urgency}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">AI Confidence</span>
                <span className="metric-value">{Math.round((assessment?.aiConfidence || 0) * 100)}%</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Processing Time</span>
                <span className="metric-value">
                  {analysis.processingDurationMs ? `${Math.round(analysis.processingDurationMs / 1000)}s` : 'N/A'}
                </span>
              </div>
            </div>

            {assessment?.recommendations?.length > 0 && (
              <div className="recommendations">
                <h4>Recommendations</h4>
                {assessment.recommendations.map((rec, i) => (
                  <div key={i} className="recommendation-item">
                    <ChevronRight size={14} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="results-grid">
            {/* Tumor Detection */}
            <div className={`card tumor-card ${tumorData?.detected ? 'tumor-detected' : 'no-tumor'}`}>
              <div className="tumor-header">
                <div className="tumor-icon">
                  <Target size={24} />
                </div>
                <div>
                  <h3>Tumor Detection</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>AI-powered pathology analysis</p>
                </div>
                <span className={`badge ${tumorData?.detected ? 'badge-danger' : 'badge-success'}`}>
                  {tumorData?.detected ? 'DETECTED' : 'NOT DETECTED'}
                </span>
              </div>

              {tumorData?.detected && (
                <div className="tumor-details">
                  <div className="tumor-metric">
                    <span>Count</span><strong>{tumorData.count}</strong>
                  </div>
                  <div className="tumor-metric">
                    <span>Largest Diameter</span>
                    <strong>{tumorData.largestDiameter?.toFixed(1)}mm</strong>
                  </div>
                  <div className="tumor-metric">
                    <span>Total Volume</span>
                    <strong>{tumorData.totalVolume?.toFixed(2)} cm³</strong>
                  </div>
                  <div className="tumor-metric">
                    <span>Malignancy Score</span>
                    <strong style={{ color: tumorData.malignancyScore > 0.6 ? 'var(--red)' : 'var(--yellow)' }}>
                      {Math.round((tumorData.malignancyScore || 0) * 100)}%
                    </strong>
                  </div>
                </div>
              )}

              {tumorData?.classification && (
                <div className="tumor-classification">
                  <span>{tumorData.classification}</span>
                </div>
              )}
            </div>

            {/* Segmentation */}
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Segmentation Results</h3>
              <div className="segments-list">
                {(results.segmentation?.masks || []).slice(0, 8).map((mask, i) => (
                  <div key={i} className="segment-item">
                    <div className="segment-color" style={{ background: mask.color }} />
                    <span className="segment-label">{mask.label}</span>
                    {mask.volumeCC && (
                      <span className="segment-volume">{mask.volumeCC} cm³</span>
                    )}
                    <div className="progress-bar" style={{ flex: 1, margin: '0 8px' }}>
                      <div className="progress-fill"
                        style={{ width: `${Math.min(100, (mask.volumeCC || 500) / 15)}%`, background: mask.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
                {results.segmentation?.totalSegments} structures identified
              </p>
            </div>

            {/* Findings */}
            {(results.findings || []).length > 0 && (
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: 16 }}>Identified Findings</h3>
                <div className="findings-list">
                  {results.findings.map((f, i) => (
                    <div key={i} className="finding-item">
                      <div className="finding-dot" style={{ background: f.color || 'var(--red)' }} />
                      <div className="finding-info">
                        <span className="finding-label">{f.label || f.type}</span>
                        <span className="finding-desc">{f.description}</span>
                      </div>
                      <div className="finding-meta">
                        <span className={`badge badge-${
                          f.severity === 'high' || f.severity === 'critical' ? 'danger' :
                          f.severity === 'medium' ? 'warning' : 'info'
                        }`}>{f.severity}</span>
                        <span className="finding-confidence">
                          {Math.round((f.confidence || 0) * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organs */}
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Organ Analysis</h3>
              <div className="organs-grid">
                {(results.anatomy?.organs || []).slice(0, 12).map((organ, i) => (
                  <div key={i} className={`organ-item ${organ.anomalies?.length > 0 ? 'has-anomaly' : ''}`}>
                    <span className="organ-dot">
                      {organ.anomalies?.length > 0 ? '⚠️' : '✓'}
                    </span>
                    <div className="organ-info">
                      <span className="organ-name">{organ.name}</span>
                      {organ.volume && <span className="organ-vol">{organ.volume} cm³</span>}
                      {organ.anomalies?.length > 0 && (
                        <span className="organ-anomaly">{organ.anomalies[0]}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="analysis-actions card">
            <div className="flex-between">
              <div>
                <h3>Analysis Complete</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Powered by NVIDIA VISTA-3D · {new Date(analysis.completedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-3">
                <button className="btn btn-secondary" onClick={() => navigate(`/viewer/${analysis._id}`)}>
                  <Eye size={16} /> Open 3D Viewer
                </button>
                <button className="btn btn-primary" onClick={generateReport}>
                  <FileText size={16} /> Generate PDF Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
