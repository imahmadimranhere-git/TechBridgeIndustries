import api from './client.js';

export const publicApi = {
  getBranding: () => api.get('/public/branding').then((response) => response.data),
  verifyDocument: (code) =>
    api.get(`/public/verify/${encodeURIComponent(code)}`).then((response) => response.data.document),
};