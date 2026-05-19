import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, FileUp, Brain, AlertCircle, CheckCircle, Loader, X, Zap } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import './UploadPage.css';

const SCAN_TYPES = ['CT', 'MRI', 'X-Ray', 'PET', 'Ultrasound', 'Other'];
const BODY_PARTS = ['brain', 'chest', 'abdomen', 'pelvis', 'spine', 'extremity', 'whole-body', 'other'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedScan, setUploadedScan] = useState(null);
  const [startingAnalysis, setStartingAnalysis] = useState(false);

  const [form, setForm] = useState({
    scanType: 'CT',
    bodyPart: 'chest',
    patientName: '',
    patientAge: '',
    patientGender: '',
    patientId: '',
    notes: '',
    priority: 'normal',
  });

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      toast.error(`Invalid file type. Accepted: .dcm, .nii, .nii.gz, .png, .jpg, .jpeg`);
      return;
    }
    if (acceptedFiles[0]) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
    accept: {
      'application/octet-stream': ['.dcm', '.nii', '.gz'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
  });

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file to upload');
    if (!form.scanType) return toast.error('Scan type is required');

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('scan', file);
    Object.entries(form).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    try {
      const { data } = await api.post('/scans', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setUploadProgress(pct);
        },
      });

      setUploadedScan(data.data.scan);
      toast.success('Scan uploaded successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
      setUploading(false);
    } finally {
      if (!uploadedScan) setUploading(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!uploadedScan) return;
    setStartingAnalysis(true);
    try {
      const { data } = await api.post(`/analysis/start/${uploadedScan._id}`, {
        analysisType: 'full',
      });
      toast.success('AI analysis started!');
      navigate(`/analysis/${uploadedScan._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start analysis');
      setStartingAnalysis(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const formatSize = (bytes) => bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;

  if (uploadedScan) {
    return (
      <div className="upload-page">
        <div className="page-header">
          <h1 className="page-title">Upload Complete!</h1>
          <p className="page-subtitle">Your scan is ready for AI analysis</p>
        </div>
        <div className="upload-success-card card">
          <div className="success-icon"><CheckCircle size={48} /></div>
          <h2>Scan Uploaded Successfully</h2>
          <div className="success-details">
            <div className="detail-row">
              <span>File Name</span>
              <strong>{uploadedScan.originalFilename}</strong>
            </div>
            <div className="detail-row">
              <span>Scan Type</span>
              <strong>{uploadedScan.scanType}</strong>
            </div>
            <div className="detail-row">
              <span>Body Part</span>
              <strong style={{ textTransform: 'capitalize' }}>{uploadedScan.bodyPart}</strong>
            </div>
            <div className="detail-row">
              <span>Status</span>
              <span className="badge badge-info">Uploaded</span>
            </div>
          </div>

          <div className="nvidia-info">
            <Zap size={16} />
            <span>NVIDIA VISTA-3D will perform 3D segmentation, tumor detection, and anatomy mapping.</span>
          </div>

          <div className="success-actions">
            <button className="btn btn-primary btn-lg" onClick={handleStartAnalysis} disabled={startingAnalysis}>
              {startingAnalysis ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Starting...</>
                : <><Brain size={18} /> Start AI Analysis</>}
            </button>
            <button className="btn btn-secondary" onClick={() => { setUploadedScan(null); setFile(null); setUploading(false); }}>
              Upload Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page">
      <div className="page-header">
        <h1 className="page-title">Upload CT Scan</h1>
        <p className="page-subtitle">Upload DICOM, NIfTI, or image files for AI analysis</p>
      </div>

      <div className="upload-layout">
        {/* Drop Zone */}
        <div className="upload-section">
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          >
            <input {...getInputProps()} />

            {file ? (
              <div className="file-preview">
                <div className="file-icon">📁</div>
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatSize(file.size)}</span>
                </div>
                <button className="btn btn-icon btn-ghost" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="dropzone-icon">
                  {isDragActive ? <FileUp size={48} /> : <Upload size={48} />}
                </div>
                <h3>{isDragActive ? 'Drop your scan here' : 'Drag & Drop your scan'}</h3>
                <p>or click to browse files</p>
                <div className="supported-formats">
                  <span>.dcm</span><span>.nii</span><span>.nii.gz</span>
                  <span>.png</span><span>.jpg</span>
                </div>
                <p className="max-size">Maximum file size: 100MB</p>
              </>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="upload-progress">
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Uploading...</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--cyan)', fontWeight: 700 }}>{uploadProgress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Security Note */}
          <div className="security-note">
            <AlertCircle size={14} />
            <span>All scans are encrypted in transit (TLS 1.3) and at rest. HIPAA compliant storage.</span>
          </div>
        </div>

        {/* Scan Info Form */}
        <div className="upload-form card">
          <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Scan Information</h3>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Scan Type *</label>
              <select className="form-select" value={form.scanType} onChange={update('scanType')}>
                {SCAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Body Part</label>
              <select className="form-select" value={form.bodyPart} onChange={update('bodyPart')}>
                {BODY_PARTS.map((b) => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={update('priority')}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Patient ID</label>
              <input type="text" className="form-input" placeholder="e.g. PT-001"
                value={form.patientId} onChange={update('patientId')} />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Patient Name</label>
              <input type="text" className="form-input" placeholder="Patient full name"
                value={form.patientName} onChange={update('patientName')} />
            </div>

            <div className="form-group">
              <label className="form-label">Age</label>
              <input type="number" className="form-input" placeholder="Age" min="0" max="150"
                value={form.patientAge} onChange={update('patientAge')} />
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-select" value={form.patientGender} onChange={update('patientGender')}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Clinical Notes</label>
              <textarea className="form-input form-textarea" placeholder="Clinical history, symptoms, indication for scan..."
                value={form.notes} onChange={update('notes')} />
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8 }}
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? <><Loader size={18} className="spin-icon" /> Uploading {uploadProgress}%</>
              : <><Upload size={18} /> Upload Scan</>}
          </button>
        </div>
      </div>
    </div>
  );
}
