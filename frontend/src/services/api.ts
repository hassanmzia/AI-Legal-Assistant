import axios from 'axios';

const DJANGO_API_URL = process.env.REACT_APP_API_URL || 'http://172.168.1.95:3048/api';
const ORCHESTRATOR_URL = process.env.REACT_APP_ORCHESTRATOR_URL || 'http://172.168.1.95:3048/orchestrator/api';

export const api = axios.create({
  baseURL: DJANGO_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const orchestratorApi = axios.create({
  baseURL: ORCHESTRATOR_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const tokens = localStorage.getItem('auth_tokens');
    if (tokens) {
      const { access } = JSON.parse(tokens);
      if (access) {
        config.headers.Authorization = `Bearer ${access}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

orchestratorApi.interceptors.request.use(
  (config) => {
    const tokens = localStorage.getItem('auth_tokens');
    if (tokens) {
      const { access } = JSON.parse(tokens);
      if (access) {
        config.headers.Authorization = `Bearer ${access}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokens = localStorage.getItem('auth_tokens');
        if (tokens) {
          const { refresh } = JSON.parse(tokens);
          const response = await axios.post(`${DJANGO_API_URL}/auth/token/refresh/`, {
            refresh,
          });

          const newTokens = {
            access: response.data.access,
            refresh: refresh,
          };
          localStorage.setItem('auth_tokens', JSON.stringify(newTokens));

          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
