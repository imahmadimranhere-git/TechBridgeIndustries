import axios from 'axios';

// Fired when an API call returns 401: AuthContext listens and sends the user to /login
export const AUTH_EXPIRED_EVENT = 'auth:expired';

/** Every failed request becomes one of these, with the server's { message, errors, meta } */
export class ApiRequestError extends Error {
  constructor({ message, status = 0, errors = {}, meta = null }) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.errors = errors;
    this.meta = meta;
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  // Send and receive the httpOnly login cookie
  withCredentials: true,
  timeout: 60_000,
});

function messageFor(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (!error.response) return 'Cannot reach the server. Check that it is running and try again.';
  return error.message || 'Something went wrong';
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data ?? {};
    const url = error.config?.url ?? '';

    // A logged-in session has expired (but not while logging in or checking the session)
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/me')) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }

    return Promise.reject(
      new ApiRequestError({
        message: messageFor(error),
        status,
        errors: data.errors ?? {},
        meta: data.meta ?? null,
      })
    );
  }
);

export default api;