import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth.js';
import { AUTH_EXPIRED_EVENT } from '../api/client.js';

const AuthContext = createContext(null);
const ME_KEY = ['auth', 'me'];

// Public data that may stay in memory after logout
const KEEP_AFTER_LOGOUT = new Set(['branding', 'auth']);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  // True while logging out: 401 answers during that moment are expected, not "session expired"
  const loggingOutRef = useRef(false);

  // Asks the server "who am I?" using the httpOnly cookie; null means not logged in
  const meQuery = useQuery({
    queryKey: ME_KEY,
    queryFn: authApi.me,
    retry: false,
    staleTime: Infinity,
  });

  /**
   * Leave the private area safely:
   *  1. stop requests that are still running
   *  2. mark the user as logged out (protected pages unmount)
   *  3. go to the login page
   *  4. only THEN forget private data, so no open page refetches it and gets a 401
   */
  const endSession = useCallback(
    async ({ redirectState } = {}) => {
      await queryClient.cancelQueries();
      queryClient.setQueryData(ME_KEY, null);
      navigate('/login', { replace: true, state: redirectState });

      setTimeout(() => {
        queryClient.removeQueries({ predicate: (query) => !KEEP_AFTER_LOGOUT.has(query.queryKey[0]) });
        loggingOutRef.current = false;
      }, 0);
    },
    [queryClient, navigate]
  );

  const login = useCallback(
    async (credentials) => {
      const user = await authApi.login(credentials);
      queryClient.setQueryData(ME_KEY, user);
      return user;
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    loggingOutRef.current = true;
    await authApi.logout().catch(() => {});
    await endSession();
    toast.success('You have been logged out', { id: 'logged-out' });
  }, [endSession]);

  // Called by pages after the profile changes (name, signature, ...)
  const setUser = useCallback((user) => queryClient.setQueryData(ME_KEY, user), [queryClient]);

  // A request came back 401 while logged in: the session really expired
  // (7 days passed, password changed on another device, account deactivated)
  useEffect(() => {
    const handleExpired = () => {
      const wasLoggedIn = Boolean(queryClient.getQueryData(ME_KEY));
      if (loggingOutRef.current || !wasLoggedIn) return;

      loggingOutRef.current = true;
      // After logging in again, come back to the page that was open
      endSession({ redirectState: { from: location } });
      toast.error('Your session has expired. Please log in again.', { id: 'session-expired' });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, [queryClient, endSession, location]);

  const value = useMemo(
    () => ({
      user: meQuery.data ?? null,
      isLoading: meQuery.isLoading,
      isAuthenticated: Boolean(meQuery.data),
      login,
      logout,
      setUser,
    }),
    [meQuery.data, meQuery.isLoading, login, logout, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
