import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  getMe,
  ApiUser,
  RegisterData,
  verifyLoginOTP,
  privilegedMe,
} from '../services/api';




// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<ApiUser>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: ApiUser) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Pre-hidratar usuario desde localStorage para evitar desconexiones o parpadeos al recargar
  const [user, setUser] = useState<ApiUser | null>(() => {
    try {
      const token = localStorage.getItem('accessToken');
      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('userName');
      const userRole = localStorage.getItem('userRole') as any;
      if (token && userId && userName) {
        return {
          id: userId,
          name: userName,
          email: localStorage.getItem('userEmail') || '',
          role: userRole || 'student',
          status: 'active',
          program: localStorage.getItem('userProgram') || null,
          enrolledPrograms: JSON.parse(localStorage.getItem('userEnrolledPrograms') || '[]'),
          permissions: JSON.parse(localStorage.getItem('userPermissions') || '{}'),
        } as ApiUser;
      }
    } catch {
      // Ignorar error al parsear storage
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Verificar token al montar, o sesión privilegiada si no hay token
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        try {
          const resp = await privilegedMe();
          setUser(resp.user);
          localStorage.setItem('userName', resp.user.name);
          localStorage.setItem('userRole', resp.user.role);
          localStorage.setItem('userId', resp.user.id);
          localStorage.setItem('userPermissions', JSON.stringify(resp.user.permissions));
          localStorage.setItem('userProgram', resp.user.program || '');
          if (resp.user.enrolledPrograms) {
            localStorage.setItem('userEnrolledPrograms', JSON.stringify(resp.user.enrolledPrograms));
          }
        } catch {
          // no autenticado
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        const userData = await getMe();
        const storedAvatar = localStorage.getItem('userAvatar') || '';
        setUser({ ...userData, avatar: userData.avatar || storedAvatar });

        // Actualizar localStorage para compatibilidad y persistencia
        localStorage.setItem('userName', userData.name);
        localStorage.setItem('userRole', userData.role);
        localStorage.setItem('userId', userData.id);
        localStorage.setItem('userEmail', userData.email || '');
        if (userData.avatar || storedAvatar) {
          localStorage.setItem('userAvatar', userData.avatar || storedAvatar);
        }
        localStorage.setItem('userPermissions', JSON.stringify(userData.permissions));
        localStorage.setItem('userProgram', userData.program || '');
        if (userData.enrolledPrograms) {
          localStorage.setItem('userEnrolledPrograms', JSON.stringify(userData.enrolledPrograms));
        }
      } catch (error: any) {
        console.warn("Validación de sesión con getMe:", error);
        // Solo invalidar si el token fue rechazado con 401 no recuperable
        if (error?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);


  // Soporta MFA: si vienen otp_email/otp_code llama al endpoint OTP
  const login = async (credentials: any) => {
    try {
      const response = (credentials?.otp_email && credentials?.otp_code)
        ? await verifyLoginOTP(credentials.otp_email, credentials.otp_code)
        : await apiLogin(credentials);

      localStorage.setItem('accessToken', response.access);
      localStorage.setItem('refreshToken', response.refresh);
       
      const storedAvatar = localStorage.getItem('userAvatar') || '';
      const userWithAvatar = { ...response.user, avatar: response.user.avatar || storedAvatar };
      setUser(userWithAvatar);

      localStorage.setItem('userName', response.user.name);
      localStorage.setItem('userRole', response.user.role);
      localStorage.setItem('userId', response.user.id);
      localStorage.setItem('userEmail', response.user.email || '');
      if (userWithAvatar.avatar) {
        localStorage.setItem('userAvatar', userWithAvatar.avatar);
      }
      localStorage.setItem('userPermissions', JSON.stringify(response.user.permissions));
      localStorage.setItem('userProgram', response.user.program || '');
      if (response.user.enrolledPrograms) {
        localStorage.setItem('userEnrolledPrograms', JSON.stringify(response.user.enrolledPrograms));
      }
      return userWithAvatar;
    } catch (err) {
      console.log("AUTH CONTEXT ERROR:", err);
      throw err;
    }
  };

  const register = async (data: RegisterData) => {
    const response = await apiRegister(data);
    
    // Guardar tokens
    localStorage.setItem('accessToken', response.access);
    localStorage.setItem('refreshToken', response.refresh);
    
    // Guardar datos del usuario
    setUser(response.user);
    
    // Compatibilidad con el sistema existente
    localStorage.setItem('userName', response.user.name);
    localStorage.setItem('userRole', response.user.role);
    localStorage.setItem('userId', response.user.id);
    localStorage.setItem('userPermissions', JSON.stringify(response.user.permissions));
    localStorage.setItem('userProgram', response.user.program || '');
  };

  const logout = () => {
    setUser(null);
    localStorage.clear();
  };

  const updateUser = (updatedUser: ApiUser) => {
    const storedAvatar = localStorage.getItem('userAvatar') || '';
    const finalAvatar = updatedUser.avatar !== undefined ? updatedUser.avatar : storedAvatar;
    const mergedUser = { ...updatedUser, avatar: finalAvatar };

    setUser(mergedUser);
    localStorage.setItem('userName', updatedUser.name);
    localStorage.setItem('userRole', updatedUser.role);
    localStorage.setItem('userId', updatedUser.id);
    if (finalAvatar) {
      localStorage.setItem('userAvatar', finalAvatar);
    } else {
      localStorage.removeItem('userAvatar');
    }
    localStorage.setItem('userPermissions', JSON.stringify(updatedUser.permissions));
    localStorage.setItem('userProgram', updatedUser.program || '');
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
