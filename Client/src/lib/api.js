// src/lib/api.js
import axios from "axios";

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Priority:
// 1) explicit env (supports both VITE_API_URL and VITE_API_BASE)
// 2) localhost dev default (5001 avoids common macOS port-5000 conflicts)
// 3) same host on port 5000 (useful for EC2/docker deployments)
const explicitBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE;
const DEFAULT_BASE = explicitBase
  ? String(explicitBase).trim()
  : (isLocalHost
      ? 'http://localhost:5001'
      : `${window.location.protocol}//${window.location.hostname}:5000`);

if (import.meta.env.DEV) {
  // Useful for confirming the frontend is hitting the intended backend during local debugging.
  console.log('[api] baseURL:', DEFAULT_BASE);
}

export const api = axios.create({ baseURL: DEFAULT_BASE });

api.interceptors.request.use((config) => {
  const t = sessionStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
