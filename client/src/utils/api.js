import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const storage = localStorage.getItem('auth-storage');
    if (storage) {
      try {
        const { state } = JSON.parse(storage);
        if (state?.accessToken) {
          config.headers['Authorization'] = `Bearer ${state.accessToken}`;
        }
      } catch { }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const storage = localStorage.getItem('auth-storage');
        if (storage) {
          const { state } = JSON.parse(storage);
          if (state?.refreshToken) {
            const { data } = await axios.post('/api/auth/refresh', {
              refreshToken: state.refreshToken,
            });
            const { accessToken, refreshToken } = data.data;

            // Update storage
            const parsed = JSON.parse(storage);
            parsed.state.accessToken = accessToken;
            parsed.state.refreshToken = refreshToken;
            localStorage.setItem('auth-storage', JSON.stringify(parsed));

            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
      } catch {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
