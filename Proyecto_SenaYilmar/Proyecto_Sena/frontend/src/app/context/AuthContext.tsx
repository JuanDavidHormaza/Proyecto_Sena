import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  getMe,
  ApiUser,
  RegisterData,
  verifyLoginOTP,
  clearAllTokens,
} from '../services/api';

import {
  getValidAccessToken,
  isSessionInactive,
  isTokenExpired,
  purgeLegacyLocalStorageSession,
  readRawAccessToken,
  getLastActivityTime,
  touchActivity,
} from '../utils/sessionManager';

export { clearAllTokens } from '../services/api';

/**
 * Protocolo estricto de Logout Total:
 * 1. Limpieza de todos los almacenamientos web (localStorage, sessionStorage).
 * 2. Desregistrar Service Workers activos si existen.
 * 3. Purgar Cache Storage del navegador.
 * 4. Invalidar cookies cliente.
 * 5. Redirección dura sin historial (window.location.replace('/login')).
 */
export const executeFullLogout = async (redirectUrl: string = '/login'): Promise<void> => {
  try {
    // 1. Limpieza de todos los almacenamientos web
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }

    // 2. Desregistrar Service Workers si existen
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      } catch {
        // ignore
      }
    }

    // 3. Purgar Cache Storage del navegador
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch {
        // ignore
      }
    }

    // 4. Invalidador de cookies cliente
    if (typeof document !== 'undefined' && document.cookie) {
      try {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      } catch {
        // ignore
      }
    }
  } finally {
    // 5. Redirección dura sin historial
    if (typeof window !== 'undefined') {
      window.location.replace(redirectUrl);
    }
  }
};

// Motivo por el que una sesión previa fue descartada al cargar la app.
type SessionDropReason = 'idle_timeout' | 'session_expired' | null;
let initialSessionDropReason: SessionDropReason = null;

function evaluateStoredSession(): SessionDropReason {
  purgeLegacyLocalStorageSession();
  const raw = readRawAccessToken();
  if (!raw) return null;
  if (isSessionInactive()) return 'idle_timeout';
  if (isTokenExpired(raw)) return 'session_expired';
  return null;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<ApiUser>;
  register: (data: RegisterData) => Promise<void>;
  logout: (reason?: string) => Promise<void>;
  updateUser: (user: ApiUser) => void;
  executeFullLogout: (redirectUrl?: string) => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // AUDITORÍA DE RE-HIDRATACIÓN: El estado inicial SIEMPRE es null y false.
  // PROHIBIDO asignar usuarios por defecto o estados simulados en memoria antes de validar.
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificación estricta de token y sesión contra el backend (/api/auth/me/)
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // Sesión descartada al cargar (token vencido / inactividad): purgar y redirigir
      const dropReason = evaluateStoredSession();
      if (dropReason || initialSessionDropReason) {
        initialSessionDropReason = null;
        clearAllTokens();
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = `/login?reason=${dropReason || 'session_expired'}`;
        }
        return;
      }

      const token = typeof window !== 'undefined' ? getValidAccessToken() : null;

      // Si no hay token en el cliente, finalizar carga como no autenticado (null, false)
      if (!token) {
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        // Validación obligatoria con el servidor
        const userData = await getMe();
        if (!userData || !userData.id) {
          throw new Error('Respuesta de usuario inválida desde /api/auth/me/');
        }

        if (isMounted) {
          const storedAvatar = sessionStorage.getItem('userAvatar') || '';
          setUser({ ...userData, avatar: userData.avatar || storedAvatar });
          setIsAuthenticated(true);
        }

        // Actualizar sessionStorage exclusivamente con los datos validados por Django
        sessionStorage.setItem('userName', userData.name);
        sessionStorage.setItem('userRole', userData.role);
        sessionStorage.setItem('userId', userData.id);
        sessionStorage.setItem('userEmail', userData.email || '');
        if (userData.active_role) {
          sessionStorage.setItem('active_role', userData.active_role);
          sessionStorage.setItem('activeRole', userData.active_role);
        }
        if (userData.roles) {
          sessionStorage.setItem('roles', JSON.stringify(userData.roles));
        }
        const isDual = Boolean(userData.is_dual_role || userData.isDualRole);
        sessionStorage.setItem('is_dual_role', String(isDual));
        sessionStorage.setItem('isDualRole', String(isDual));
        if (userData.avatar) {
          sessionStorage.setItem('userAvatar', userData.avatar);
        }
        sessionStorage.setItem('userPermissions', JSON.stringify(userData.permissions || {}));
        sessionStorage.setItem('userProgram', userData.program || '');
        if (userData.enrolledPrograms) {
          sessionStorage.setItem('userEnrolledPrograms', JSON.stringify(userData.enrolledPrograms));
        }
      } catch (error) {
        // AUDITORÍA DE RE-HIDRATACIÓN:
        // Si /api/auth/me/ devuelve 401 o falla por cualquier motivo, el estado de usuario DEBE ser null.
        // PROHIBIDO asignar usuarios por defecto o estados simulados en bloques catch.
        console.warn('[AuthContext] Validación de sesión con /api/auth/me/ falló. Purgando sesión cliente:', error);
        clearAllTokens();
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sincronización entre pestañas (storage event listener)
  useEffect(() => {
    const handleStorageEvent = async (e: StorageEvent) => {
      if (e.key === 'auth_sync_event') {
        if (!e.newValue) return;
        try {
          const syncData = JSON.parse(e.newValue);
          if (syncData.type === 'logout' || syncData.type === 'idle_timeout') {
            setUser(null);
            setIsAuthenticated(false);
            clearAllTokens();
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
              window.location.href = syncData.type === 'idle_timeout' ? '/login?reason=idle_timeout' : '/login';
            }
          } else if (syncData.type === 'login') {
            if (syncData.userId && syncData.userId !== user?.id) {
              try {
                const refreshedUser = await getMe();
                setUser(refreshedUser);
                setIsAuthenticated(true);
              } catch {
                setUser(null);
                setIsAuthenticated(false);
                window.location.href = '/login';
              }
            }
          }
        } catch {
          // ignore
        }
      }

      if (e.key === 'accessToken' && !e.newValue) {
        setUser(null);
        setIsAuthenticated(false);
        clearAllTokens();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, [user]);

  // Login institucional
  const login = async (credentials: any) => {
    clearAllTokens();
    setUser(null);
    setIsAuthenticated(false);

    try {
      const response = (credentials?.otp_email && credentials?.otp_code)
        ? await verifyLoginOTP(credentials.otp_email, credentials.otp_code)
        : await apiLogin(credentials);

      clearAllTokens();

      sessionStorage.setItem('accessToken', response.access);
      sessionStorage.setItem('refreshToken', response.refresh);
      touchActivity();

      const cleanUser: ApiUser = {
        ...response.user,
        avatar: response.user.avatar || '',
      };
      setUser(cleanUser);
      setIsAuthenticated(true);

      sessionStorage.setItem('userName', cleanUser.name);
      sessionStorage.setItem('userRole', cleanUser.role);
      sessionStorage.setItem('userId', cleanUser.id);
      sessionStorage.setItem('userEmail', cleanUser.email || '');
      if (cleanUser.avatar) {
        sessionStorage.setItem('userAvatar', cleanUser.avatar);
      }
      sessionStorage.setItem('userPermissions', JSON.stringify(cleanUser.permissions || {}));
      if (cleanUser.program) {
        sessionStorage.setItem('userProgram', cleanUser.program);
      }
      if (cleanUser.enrolledPrograms && cleanUser.enrolledPrograms.length > 0) {
        sessionStorage.setItem('userEnrolledPrograms', JSON.stringify(cleanUser.enrolledPrograms));
      }

      try {
        sessionStorage.setItem(
          'auth_sync_event',
          JSON.stringify({
            type: 'login',
            userId: cleanUser.id,
            timestamp: Date.now(),
          })
        );
      } catch {
        // ignore
      }

      return cleanUser;
    } catch (err) {
      console.error('[AuthContext] Error durante login:', err);
      throw err;
    }
  };

  // Registro institucional
  const register = async (data: RegisterData) => {
    clearAllTokens();
    setUser(null);
    setIsAuthenticated(false);

    const response = await apiRegister(data);

    sessionStorage.setItem('accessToken', response.access);
    sessionStorage.setItem('refreshToken', response.refresh);
    touchActivity();

    setUser(response.user);
    setIsAuthenticated(true);

    sessionStorage.setItem('userName', response.user.name);
    sessionStorage.setItem('userRole', response.user.role);
    sessionStorage.setItem('userId', response.user.id);
    sessionStorage.setItem('userPermissions', JSON.stringify(response.user.permissions || {}));
    sessionStorage.setItem('userProgram', response.user.program || '');

    try {
      sessionStorage.setItem(
        'auth_sync_event',
        JSON.stringify({
          type: 'login',
          userId: response.user.id,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  };

  // Logout con protocolo estricto de purga de sesión total
  const logout = useCallback(async (reason?: string) => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    setUser(null);
    setIsAuthenticated(false);

    try {
      sessionStorage.setItem(
        'auth_sync_event',
        JSON.stringify({
          type: reason === 'idle_timeout' ? 'idle_timeout' : 'logout',
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore
    }

    const targetUrl = reason === 'idle_timeout' ? '/login?reason=idle_timeout' : '/login';
    await executeFullLogout(targetUrl);
  }, []);

  // 1. Destrucción de sesión en beforeunload (cierre de pestaña / ventana / navegador)
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        sessionStorage.clear();
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      } catch {
        // ignore
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 2. Auto-logout por inactividad tras 15 minutos sin registrar eventos (mousedown, keydown, scroll)
  useEffect(() => {
    if (!user) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const performAutoLogout = () => {
      logout('idle_timeout');
    };

    const resetTimer = () => {
      touchActivity();
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(performAutoLogout, 15 * 60 * 1000); // 15 minutos
    };

    const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'scroll'];
    events.forEach((evt) => {
      window.addEventListener(evt, resetTimer, { passive: true });
    });

    const last = getLastActivityTime();
    const remaining = last ? Math.max(0, 15 * 60 * 1000 - (Date.now() - last)) : 15 * 60 * 1000;
    timeoutId = setTimeout(performAutoLogout, remaining);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((evt) => {
        window.removeEventListener(evt, resetTimer);
      });
    };
  }, [user, logout]);

  const updateUser = (updatedUser: ApiUser) => {
    const storedAvatar = sessionStorage.getItem('userAvatar') || '';
    const finalAvatar = updatedUser.avatar !== undefined ? updatedUser.avatar : storedAvatar;
    const mergedUser = { ...updatedUser, avatar: finalAvatar };

    setUser(mergedUser);
    setIsAuthenticated(true);
    sessionStorage.setItem('userName', updatedUser.name);
    sessionStorage.setItem('userRole', updatedUser.role);
    sessionStorage.setItem('userId', updatedUser.id);
    if (finalAvatar) {
      sessionStorage.setItem('userAvatar', finalAvatar);
    } else {
      sessionStorage.removeItem('userAvatar');
    }
    sessionStorage.setItem('userPermissions', JSON.stringify(updatedUser.permissions));
    sessionStorage.setItem('userProgram', updatedUser.program || '');
    if (updatedUser.enrolledPrograms) {
      sessionStorage.setItem('userEnrolledPrograms', JSON.stringify(updatedUser.enrolledPrograms));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        executeFullLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default AuthContext;
