import api from './client.js';

// Drops empty filters so "?status=" is never sent
export const cleanParams = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null));

/** list / get / create / update / remove for a REST resource like /clients */
export function createCrud(path) {
  return {
    list: (params) => api.get(path, { params: cleanParams(params) }).then((response) => response.data),
    get: (id, params) => api.get(`${path}/${id}`, { params: cleanParams(params) }).then((response) => response.data),
    create: (data) => api.post(path, data).then((response) => response.data),
    update: (id, data) => api.put(`${path}/${id}`, data).then((response) => response.data),
    remove: (id) => api.delete(`${path}/${id}`).then((response) => response.data),
  };
}

/** Image upload as multipart/form-data (the server expects the file in "image") */
export function uploadFile(url, file, field = 'image') {
  const form = new FormData();
  form.append(field, file);
  return api.post(url, form).then((response) => response.data);
}