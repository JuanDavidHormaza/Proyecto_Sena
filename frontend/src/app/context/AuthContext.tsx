import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin, register as apiRegister, getMe, ApiUser, LoginCredentials, RegisterData } from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
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

  // Verificar token al montar
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setIsLoading(false);
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
      } catch (error) {
        // Token invalido, limpiar storage
        localStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await apiLogin(credentials);
      
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
