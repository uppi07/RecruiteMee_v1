// src/lib/api.js
import axios from "axios";

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Priority: env var (Vercel), else prod fallback, else local dev
const DEFAULT_BASE =
  import.meta.env.VITE_API_BASE ||
  (!isLocalHost ? 'https://resumerepo.onrender.com' : 'http://localhost:5000');

export const api = axios.create({ baseURL: DEFAULT_BASE });

api.interceptors.request.use((config) => {
  const t = sessionStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
