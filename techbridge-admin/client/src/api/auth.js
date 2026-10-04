import api from './client.js';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials).then((response) => response.data.user),

  logout: () => api.post('/auth/logout'),

  // Not logged in is a normal state, not an error: return null instead of throwing
  me: () =>
    api
      .get('/auth/me')
      .then((response) => response.data.user)
      .catch((error) => {
        if (error.status === 401) return null;
        throw error;
      }),
};