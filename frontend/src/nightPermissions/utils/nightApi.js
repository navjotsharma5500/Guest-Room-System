// src/nightPermissions/utils/nightApi.js
import axios from 'axios';
import { BACKEND_URL } from '../../utils/apiConfig';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api/night`,
  withCredentials: true,
});

// ── Students ──────────────────────────────────────────────────────────────────
export const fetchStudents        = (params) => api.get('/students', { params });
export const searchStudents       = (query)  => api.get('/students/search', { params: { query } });
export const fetchStudentByRollNo = (rollNo) => api.get(`/students/${rollNo}`);
export const upsertStudent        = (data)   => api.post('/students', data);
export const deleteStudent        = (id)     => api.delete(`/students/${id}`);
export const uploadStudentsExcel  = (file)   => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/students/upload-excel', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const downloadStudentTemplate = () =>
  api.get('/students/template', { responseType: 'blob' });

// ── Permission Lists ──────────────────────────────────────────────────────────
export const fetchLists         = (params) => api.get('/lists', { params });
export const fetchListsForReview = ()      => api.get('/lists/review');
export const fetchListById      = (id)     => api.get(`/lists/${id}`);
export const createList         = (data)   => api.post('/lists', data);
export const createStudentRequest = (data) => api.post('/requests', data);
export const sendListForward    = (id, d)  => api.post(`/lists/${id}/send`, d);
export const approveStudents    = (id, d)  => api.post(`/lists/${id}/approve`, d);
export const rejectStudents     = (id, d)  => api.post(`/lists/${id}/reject`, d);
export const cancelList         = (id, d)  => api.patch(`/lists/${id}/cancel`, d);

// ── Scan ──────────────────────────────────────────────────────────────────────
export const processScan   = (data)   => api.post('/scan', data);
export const fetchScanLogs = (params) => api.get('/scan/logs', { params });

// ── Defaulters ────────────────────────────────────────────────────────────────
export const fetchDefaulters    = ()         => api.get('/defaulters');
export const rollbackDefaulter  = (id, data) => api.post(`/defaulters/${id}/rollback`, data);

// ── Role Management ───────────────────────────────────────────────────────────
export const fetchRoles    = (params) => api.get('/roles', { params });
export const addRole       = (data)   => api.post('/roles', data);
export const deleteRole    = (id)     => api.delete(`/roles/${id}`);
export const fetchSocieties = ()      => api.get('/societies');
export const fetchEvents    = ()      => api.get('/events');

// ── Settings ──────────────────────────────────────────────────────────────────
export const fetchSettings  = ()     => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

// ── Calendar ──────────────────────────────────────────────────────────────────
export const fetchCalendar    = (params) => api.get('/calendar', { params });

// ── Reports ───────────────────────────────────────────────────────────────────
export const downloadReport = (params) =>
  api.get('/reports/download', { params, responseType: 'blob' });

// ── Society Budgets ───────────────────────────────────────────────────────────
const societyApi = axios.create({
  baseURL: `${BACKEND_URL}/api/societies`,
  withCredentials: true,
});

export const fetchAllBudgets        = ()                  => societyApi.get('/budgets');
export const fetchSocietyBudget     = (id, name)          => societyApi.get(`/${id}/budget`, { params: { name } });
export const allocateBudget         = (id, data)          => societyApi.post(`/${id}/budget/add`, data);
export const fetchSocietyExpenses   = (id)                => societyApi.get(`/${id}/expenses`);
export const addSocietyExpense      = (id, data)          => societyApi.post(`/${id}/expenses`, data);
export const fetchBudgetLogs        = (id)                => societyApi.get(`/${id}/budget/logs`);

// ── Chat Messenger ───────────────────────────────────────────────────────────
const chatApi = axios.create({
  baseURL: `${BACKEND_URL}/api/night/chat`,
  withCredentials: true,
});

export const fetchChatRooms          = ()                   => chatApi.get('/rooms');
export const fetchUnreadCount        = ()                   => chatApi.get('/unread');
export const getOrCreateSocietyRoom  = (data)              => chatApi.post('/rooms/society', data);
export const getOrCreateApprovalRoom = (data)              => chatApi.post('/rooms/approval', data);
export const getOrCreateRoleRoom     = (data)              => chatApi.post('/rooms/role', data);
export const fetchMessages           = (roomId, params)    => chatApi.get(`/rooms/${roomId}/messages`, { params });
export const sendChatMessage         = (roomId, data)      => chatApi.post(`/rooms/${roomId}/messages`, data);
export const lockChatRoom            = (roomId)            => chatApi.post(`/rooms/${roomId}/lock`);

export default api;