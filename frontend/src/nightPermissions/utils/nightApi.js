// src/nightPermissions/utils/nightApi.js
import axios from 'axios';
import { BACKEND_URL } from '../../utils/apiConfig';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api/night`,
  withCredentials: true,
});

// Students
export const fetchStudents = (params) => api.get('/students', { params });
export const fetchStudentByRollNo = (rollNo) => api.get(`/students/${rollNo}`);
export const upsertStudent = (data) => api.post('/students', data);
export const uploadStudentsExcel = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/students/upload-excel', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// Permission Lists
export const fetchLists = (params) => api.get('/lists', { params });
export const fetchListsForReview = () => api.get('/lists/review');
export const fetchListById = (id) => api.get(`/lists/${id}`);
export const createList = (data) => api.post('/lists', data);
export const sendListForward = (id, data) => api.post(`/lists/${id}/send`, data);
export const approveStudents = (id, data) => api.post(`/lists/${id}/approve`, data);
export const rejectStudents = (id, data) => api.post(`/lists/${id}/reject`, data);
export const cancelList = (id, data) => api.patch(`/lists/${id}/cancel`, data);

// Scan
export const processScan = (data) => api.post('/scan', data);
export const fetchScanLogs = (params) => api.get('/scan/logs', { params });

// Defaulters
export const fetchDefaulters = () => api.get('/defaulters');
export const rollbackDefaulter = (studentId, data) => api.post(`/defaulters/${studentId}/rollback`, data);

// Settings
export const fetchSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

// Calendar
export const fetchCalendar = (params) => api.get('/calendar', { params });

// Reports
export const downloadReport = (params) => api.get('/reports/download', {
  params, responseType: 'blob',
});

export default api;