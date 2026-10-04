import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth.js';
import { AUTH_EXPIRED_EVENT } from '../api/client.js';

const AuthContext = createContext(null);
const ME_KEY = ['auth', 'me'];

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  // Asks the server "who am I?" using the httpOnly cookie; null means not logged in
  const meQuery = useQuery({
    queryKey: ME_KEY,
    queryFn: authApi.me,
    retry: false,
    staleTime: Infinity,
  });

  // Forget all private data but keep public branding
  const clearSession = useCallback(() => {
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'branding' });
    queryClient.setQueryData(ME_KEY, null);
  }, [queryClient]);

  const login = useCallback(
    async (credentials) => {
      const user = await authApi.login(credentials);
      queryClient.setQueryData(ME_KEY, user);
      return user;
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    clearSession();
    toast.success('You have been logged out');
  }, [clearSession]);

  // Called by pages after the profile changes (name, signature, ...)
  const setUser = useCallback((user) => queryClient.setQueryData(ME_KEY, user), [queryClient]);

  // Any request that comes back 401 (session expired, password changed elsewhere)
  useEffect(() => {
    const handleExpired = () => {
      clearSession();
      toast.error('Your session has expired. Please log in again.', { id: 'session-expired' });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, [clearSession]);

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