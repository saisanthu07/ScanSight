import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
});

// Response interceptor for error handling
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('scansight_token');
      delete api.defaults.headers.common['Authorization'];
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const patientsAPI = {
  getAll: (params) => api.get('/patients', { params }),
  getOne: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.patch(`/patients/${id}`, data),
  delete: (id) => api.delete(`/patients/${id}`),
  getStats: () => api.get('/patients/stats/summary'),
};

export const scansAPI = {
  getAll: (params) => api.get('/scans', { params }),
  getOne: (id) => api.get(`/scans/${id}`),
  upload: (formData, onProgress) => api.post('/scans/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  }),
  reanalyze: (id) => api.post(`/scans/${id}/reanalyze`),
  reanalyzeBulk: (analysisStatus) => api.post('/scans/reanalyze/bulk', { analysisStatus }),
  updateNotes: (id, data) => api.patch(`/scans/${id}/notes`, data),
  delete: (id) => api.delete(`/scans/${id}`),
  getAnalytics: () => api.get('/scans/analytics/overview'),
};

export const reportsAPI = {
  get: (scanId) => api.get(`/reports/${scanId}`),
};

export default api;
