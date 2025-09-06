export function getSessionUser() {
  try { return JSON.parse(sessionStorage.getItem('user') || '{}'); }
  catch { return {}; }
}