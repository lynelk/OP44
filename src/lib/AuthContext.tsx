import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { queryClientInstance } from '@/lib/query-client';

interface AuthError {
  type: string;
  message: string;
}

interface User {
  id: string;
  admin_tier?: number | null;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: AuthError | null;
  appPublicSettings: unknown;
  authChecked: boolean;
  logout: (shouldRedirect?: boolean) => void;
  navigateToLogin: () => void;
  checkUserAuth: () => Promise<void>;
  checkAppState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState<unknown>(null);

  useEffect(() => {
    checkAppState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId ?? '' },
        token: appParams.token ?? undefined,
        interceptResponses: true,
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);

        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError: unknown) {
        console.error('App state check failed:', appError);
        const e = appError as { status?: number; data?: { extra_data?: { reason?: string } }; message?: string };
        if (e.status === 403 && e.data?.extra_data?.reason) {
          const reason = e.data.extra_data.reason;
          setAuthError({ type: reason, message: e.message ?? reason });
        } else {
          setAuthError({ type: 'unknown', message: e.message ?? 'Failed to load app' });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error: unknown) {
      const e = error as { message?: string };
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: e.message ?? 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser as User);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string };
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      if (e.status === 401 || e.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    try {
      queryClientInstance.clear();
    } catch (e) {
      console.error('Failed to clear query cache on logout:', e);
    }
    import('@/lib/offlineDb')
      .then((mod) => (mod as { clearAllData?: () => void }).clearAllData?.())
      .catch(() => undefined);

    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
