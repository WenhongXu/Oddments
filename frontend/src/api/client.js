import { getToken, clearSession } from './auth.js';

const BASE = '/api';

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Auto-logout on 401
    if (res.status === 401) {
      clearSession();
      window.location.href = '/login';
    }
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.code = data.code;
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  // Journal
  getTodayJournal: () => request('/journal/today'),
  saveJournal: (date, body) => request(`/journal/${date}`, { method: 'PUT', body }),
  getJournalHistory: (limit = 7) => request(`/journal/history?limit=${limit}`),
  getWeekMood: () => request('/journal/week-mood'),

  // Projects
  getProjects: (status) => request(`/projects${status ? `?status=${status}` : ''}`),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: data }),
  checkinProject: (id, note, date) => request(`/projects/${id}/checkin`, { method: 'POST', body: { note, date } }),
  updateProjectStatus: (id, status, abandon_reason) =>
    request(`/projects/${id}/status`, { method: 'PUT', body: { status, abandon_reason } }),
  getProjectCalendar: (id) => request(`/projects/${id}/calendar`),

  // Pattern
  getCurrentPattern: () => request('/pattern/current'),
  getPatternHistory: () => request('/pattern/history'),
  recalculatePattern: () => request('/pattern/recalculate', { method: 'POST' }),
  updateDimensionScore: (code, score) =>
    request(`/pattern/dimension/${code}`, { method: 'PUT', body: { score } }),

  // AI
  chat: (message) => request('/ai/chat', { method: 'POST', body: { message } }),
  generateWeeklyReport: () => request('/ai/weekly-report', { method: 'POST' }),
  getChatHistory: () => request('/ai/history'),
  clearChatHistory: () => request('/ai/history', { method: 'DELETE' }),
  getWeeklyReports: () => request('/ai/weekly-reports'),

  // Confidence
  getConfidence: (limit = 50) => request(`/confidence?limit=${limit}`),
  addConfidence: (content, date) => request('/confidence', { method: 'POST', body: { content, date } }),
  deleteConfidence: (id) => request(`/confidence/${id}`, { method: 'DELETE' }),
  getRandomConfidence: () => request('/confidence/random'),

  // Admin
  getAdminConfig: () => request('/admin/config'),
  updateAdminConfig: (data) => request('/admin/config', { method: 'PUT', body: data }),
  getStats: () => request('/admin/stats'),
  getQuestions: (dimension) => request(`/admin/questions${dimension ? `?dimension=${dimension}` : ''}`),
};
