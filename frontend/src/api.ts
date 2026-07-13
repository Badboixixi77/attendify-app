import axios from 'axios';

export const api = axios.create({
  // Use localhost in dev, but use the real domain in production
  baseURL: import.meta.env.MODE === 'development' ? 'http://localhost:3001/api' : '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});