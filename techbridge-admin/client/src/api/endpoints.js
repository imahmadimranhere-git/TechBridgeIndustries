import api from './client.js';
import { cleanParams, createCrud, uploadFile } from './crud.js';

const data = (response) => response.data;

export const clientsApi = createCrud('/clients');

export const dealsApi = createCrud('/deals');

export const paymentsApi = createCrud('/payments');

export const notesApi = createCrud('/notes');

export const invoicesApi = {
  ...createCrud('/invoices'),
  duplicate: (id) => api.post(`/invoices/${id}/duplicate`).then(data),
  markSent: (id) => api.post(`/invoices/${id}/mark-sent`).then(data),
};

export const staffApi = {
  ...createCrud('/staff'),
  createPayout: (staffId, body) => api.post(`/staff/${staffId}/payouts`, body).then(data),
};

export const payoutsApi = {
  list: (params) => api.get('/payouts', { params: cleanParams(params) }).then(data),
  remove: (id) => api.delete(`/payouts/${id}`).then(data),
};

export const dashboardApi = {
  get: (params) => api.get('/dashboard', { params: cleanParams(params) }).then(data),
};

export const reportsApi = {
  get: (params) => api.get('/reports', { params: cleanParams(params) }).then(data),
  exportCsv: (params) => api.get('/reports/export', { params: cleanParams(params), responseType: 'blob' }),
};

export const usersApi = {
  ...createCrud('/users'),
  uploadImage: (id, kind, file) => uploadFile(`/users/${id}/${kind}`, file),
  removeImage: (id, kind) => api.delete(`/users/${id}/${kind}`).then(data),
};

export const profileApi = {
  get: () => api.get('/profile').then(data),
  update: (body) => api.put('/profile', body).then(data),
  changePassword: (body) => api.put('/profile/password', body).then(data),
  uploadImage: (kind, file) => uploadFile(`/profile/${kind}`, file),
  removeImage: (kind) => api.delete(`/profile/${kind}`).then(data),
};

export const settingsApi = {
  get: () => api.get('/settings').then(data),
  update: (body) => api.put('/settings', body).then(data),
  uploadLogo: (file) => uploadFile('/settings/logo', file),
  removeLogo: () => api.delete('/settings/logo').then(data),
  uploadStamp: (file) => uploadFile('/settings/stamp', file),
  removeStamp: () => api.delete('/settings/stamp').then(data),
  testEmail: (to) => api.post('/settings/test-email', { to }).then(data),
};