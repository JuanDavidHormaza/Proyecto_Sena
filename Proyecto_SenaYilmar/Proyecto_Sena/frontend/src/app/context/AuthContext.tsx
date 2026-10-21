import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  getMe,
  ApiUser,
  RegisterData,
  verifyLoginOTP,
  privilegedMe,
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

// Motivo por el que una sesión previa (token vencido o inactividad > 15 min) fue descartada al cargar la app.
// Se calcula una sola vez, ANTES de hidratar el usuario desde sessionStorage.
type SessionDropReason = 'idle_timeout' | 'session_expired' | null;
let initialSessionDropReason: SessionDropReason = null;

function evaluateStoredSession(): SessionDropReason {
  // La sesión ya no debe persistir en localStorage: eliminar cualquier residuo heredado.
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
  logout: (reason?: string) => void;
  updateUser: (user: ApiUser) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Pre-hidratar usuario desde sessionStorage para evitar desconexiones o parpadeos al recargar
  const [user, setUser] = useState<ApiUser | null>(() => {
    try {
      // Rechazo inmediato si el JWT venció (exp) o si superó 15 minutos de inactividad
      const dropReason = evaluateStoredSession();
      if (dropReason) initialSessionDropReason = dropReason; // (StrictMode ejecuta el inicializador dos veces)
      if (dropReason) {
        clearAllTokens();
        return null;
      }
      const token = getValidAccessToken();
      const userId = sessionStorage.getItem('userId');
      const userName = sessionStorage.getItem('userName');
      const userRole = sessionStorage.getItem('userRole') as any;
      if (token && userId && userName) {
        const storedRoles = JSON.parse(sessionStorage.getItem('roles') || '[]');
        const isDual = sessionStorage.getItem('is_dual_role') === 'true' || sessionStorage.getItem('isDualRole') === 'true';
        return {
          id: userId,
          name: userName,
          email: sessionStorage.getItem('userEmail') || '',
          role: userRole || 'student',
          active_role: sessionStorage.getItem('active_role') || (userRole === 'teacher' ? 'INSTRUCTOR' : 'APRENDIZ'),
          activeRole: sessionStorage.getItem('activeRole') || (userRole === 'teacher' ? 'INSTRUCTOR' : 'APRENDIZ'),
          roles: storedRoles,
          is_dual_role: isDual,
          isDualRole: isDual,
          status: 'active',
          program: sessionStorage.getItem('userProgram') || null,
          enrolledPrograms: JSON.parse(sessionStorage.getItem('userEnrolledPrograms') || '[]'),
          permissions: JSON.parse(sessionStorage.getItem('userPermissions') || '{}'),
        } as ApiUser;
      }
    } catch {
      // Ignorar error al parsear storage
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Verificar token al montar, evitando llamadas innecesarias en rutas públicas si no hay token
  useEffect(() => {
    const checkAuth = async () => {
      // Sesión descartada al cargar (token vencido / inactividad): exigir autenticación de nuevo
      if (initialSessionDropReason) {
        const reason = initialSessionDropReason;
        initialSessionDropReason = null;
        clearAllTokens();
        setUser(null);
        setIsLoading(false);
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = `/login?reason=${reason}`;
        }
        return;
      }

      const token = typeof window !== 'undefined' ? getValidAccessToken() : null;

      // Rutas públicas que no deben chequear roles privilegiados de forma automática si no hay sesión
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const isPublicRoute = pathname === '/' || pathname === '/login' || pathname === '/register' || pathname === '/recover' || pathname.startsWith('/reset-password');

      // Si no hay token en el cliente (especialmente en rutas públicas), no ejecutar llamadas para evitar el 401 innecesario
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await getMe();
        const storedAvatar = sessionStorage.getItem('userAvatar') || '';
        setUser({ ...userData, avatar: userData.avatar || storedAvatar });

        // Actualizar sessionStorage para compatibilidad y persistencia
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
        if (userData.avatar || storedAvatar) {
          sessionStorage.setItem('userAvatar', userData.avatar || storedAvatar);
        }
        sessionStorage.setItem('userPermissions', JSON.stringify(userData.permissions));
        sessionStorage.setItem('userProgram', userData.program || '');
        if (userData.enrolledPrograms) {
          sessionStorage.setItem('userEnrolledPrograms', JSON.stringify(userData.enrolledPrograms));
        }
      } catch (error: any) {
        if (!isPublicRoute) {
          console.warn("Validación de sesión con getMe:", error);
        }

        // Solo en rutas protegidas se intenta fallback de sesión privilegiada si existe sesión
        if (!isPublicRoute) {
          try {
            const resp = await privilegedMe();
            if (resp?.user) {
              setUser(resp.user);
              sessionStorage.setItem('userName', resp.user.name);
              sessionStorage.setItem('userRole', resp.user.role);
              sessionStorage.setItem('userId', resp.user.id);
              sessionStorage.setItem('userPermissions', JSON.stringify(resp.user.permissions));
              sessionStorage.setItem('userProgram', resp.user.program || '');
              if (resp.user.enrolledPrograms) {
                sessionStorage.setItem('userEnrolledPrograms', JSON.stringify(resp.user.enrolledPrograms));
              }
              return;
            }
          } catch {
            // no autenticado
          }
        }

        // Si el token fue rechazado con 401 no recuperable, purgar almacenamiento
        if (error?.status === 401) {
          clearAllTokens();
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);
  // Detección y sincronización entre pestañas (storage event listener)
  useEffect(() => {
    const handleStorageEvent = async (e: StorageEvent) => {
      // Sincronización explícita mediante evento de canal auth_sync_event
      if (e.key === 'auth_sync_event') {
        if (!e.newValue) return;
        try {
          const syncData = JSON.parse(e.newValue);
          if (syncData.type === 'logout') {
            setUser(null);
            clearAllTokens();
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
              window.location.href = '/login';
            }
          } else if (syncData.type === 'idle_timeout') {
            setUser(null);
            clearAllTokens();
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
              window.location.href = '/login?reason=idle_timeout';
            }
          } else if (syncData.type === 'login') {
            if (syncData.userId && syncData.userId !== user?.id) {
              try {
                const refreshedUser = await getMe();
                setUser(refreshedUser);
              } catch {
                setUser(null);
                window.location.href = '/login';
              }
            }
          }
        } catch {
          // ignorar errores de parseo
        }
      }

      // Modificación o revocación de token en otra pestaña
      if (e.key === 'accessToken') {
        if (!e.newValue) {
          setUser(null);
          clearAllTokens();
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
            window.location.href = '/login';
          }
        } else if (e.newValue !== sessionStorage.getItem('accessToken')) {
          try {
            const refreshedUser = await getMe();
            setUser(refreshedUser);
          } catch {
            setUser(null);
            window.location.href = '/login';
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, [user]);

  // Soporta MFA: si vienen otp_email/otp_code llama al endpoint OTP
  const login = async (credentials: any) => {
    // Purga total del estado previo ANTES de autenticar y almacenar el nuevo token
    clearAllTokens();
    setUser(null);

    try {
      const response = (credentials?.otp_email && credentials?.otp_code)
        ? await verifyLoginOTP(credentials.otp_email, credentials.otp_code)
        : await apiLogin(credentials);

      // Limpieza preventiva adicional post-respuesta
      clearAllTokens();

      sessionStorage.setItem('accessToken', response.access);
      sessionStorage.setItem('refreshToken', response.refresh);
      touchActivity(); // inicia el conteo de inactividad de 15 minutos

      // Sobre-escritura total y limpia del usuario sin arrastrar propiedades residuales
      const cleanUser: ApiUser = {
        ...response.user,
        avatar: response.user.avatar || '',
      };
      setUser(cleanUser);

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

      // Notificar a otras pestañas del nuevo usuario
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
        // ignorar
      }

      return cleanUser;
    } catch (err) {
      console.log("AUTH CONTEXT ERROR:", err);
      throw err;
    }
  };

  const register = async (data: RegisterData) => {
    clearAllTokens();
    setUser(null);

    const response = await apiRegister(data);
    
    // Guardar tokens
    sessionStorage.setItem('accessToken', response.access);
    sessionStorage.setItem('refreshToken', response.refresh);
    touchActivity(); // inicia el conteo de inactividad de 15 minutos
    
    // Guardar datos del usuario
    setUser(response.user);
    
    // Compatibilidad con el sistema existente
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
      // ignorar
    }
  };

  const logout = useCallback((reason?: string) => {
    setUser(null);
    clearAllTokens();
    try {
      sessionStorage.setItem(
        'auth_sync_event',
        JSON.stringify({
          type: reason === 'idle_timeout' ? 'idle_timeout' : 'logout',
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignorar
    }
  }, []);

  // 1. Destrucción de sesión en beforeunload (cierre de pestaña / ventana / navegador)
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.clear();
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
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
      sessionStorage.clear();
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      purgeLegacyLocalStorageSession();
      logout('idle_timeout');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        try {
          window.location.href = '/login?reason=idle_timeout';
        } catch {
          // ignore
        }
      }
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
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
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
