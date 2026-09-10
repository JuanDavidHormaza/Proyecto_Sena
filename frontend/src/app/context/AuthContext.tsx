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
  login: (credentials: any) => Promise<void>;
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
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar token al montar, o sesión privilegiada si no hay token
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        try {
          const resp = await privilegedMe();
          setUser(resp.user);
          // compatibilidad local
          localStorage.setItem('userName', resp.user.name);
          localStorage.setItem('userRole', resp.user.role);
          localStorage.setItem('userId', resp.user.id);
          localStorage.setItem('userPermissions', JSON.stringify(resp.user.permissions));
          localStorage.setItem('userProgram', resp.user.program || '');
        } catch {
          // no autenticado
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        const userData = await getMe();
        setUser(userData);

        // Actualizar localStorage para compatibilidad con componentes existentes
        localStorage.setItem('userName', userData.name);
        localStorage.setItem('userRole', userData.role);
        localStorage.setItem('userId', userData.id);
        localStorage.setItem('userPermissions', JSON.stringify(userData.permissions));
        localStorage.setItem('userProgram', userData.program || '');
      } catch (error) {
        // Token invalido, limpiar storage
        localStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);


  // Soporta MFA: si vienen otp_email/otp_code llama al endpoint OTP.
  // Si viene "prefetched" (respuesta de login directo sin OTP para roles
  // privilegiados) se usa esa respuesta tal cual.
  const login = async (credentials: any) => {
    try {
      const response = credentials?.prefetched
        ? credentials.prefetched
        : (credentials?.otp_email && credentials?.otp_code)
        ? await verifyLoginOTP(credentials.otp_email, credentials.otp_code)
        : await apiLogin(credentials);

      localStorage.setItem('accessToken', response.access);
      localStorage.setItem('refreshToken', response.refresh);
       
      setUser(response.user);

      localStorage.setItem('userName', response.user.name);
      localStorage.setItem('userRole', response.user.role);
      localStorage.setItem('userId', response.user.id);
      localStorage.setItem('userPermissions', JSON.stringify(response.user.permissions));
      localStorage.setItem('userProgram', response.user.program || '');
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
    setUser(updatedUser);
    localStorage.setItem('userName', updatedUser.name);
    localStorage.setItem('userRole', updatedUser.role);
    localStorage.setItem('userId', updatedUser.id);
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
