import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';
import type { User, LoginRequest, RegisterRequest, Subscription } from '../types/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  subscription: Subscription | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<any>;
  verifyEmail: (email: string, code: string) => Promise<any>;
  resendCode: (email: string) => Promise<any>;
  requestPasswordChange: () => Promise<any>;
  requestEmailChange: (newEmail: string, currentPassword: string) => Promise<any>;
  verifyNewEmail: (code: string) => Promise<User>;
  changePasswordWithCode: (newPassword: string, code: string) => Promise<any>;
  requestAccountDeletion: () => Promise<any>;
  deleteAccount: (currentPassword: string, code: string) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {

          removeAuthToken();
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authApi.login(credentials);
      setAuthToken(response.access_token);

      // Get user data
      const userData = await authApi.getMe();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authApi.register(data);
      // No token returned — user needs to verify email first
      return response;
    } catch (error) {
      throw error;
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    try {
      const response = await authApi.verifyEmail({ email, code });
      setAuthToken(response.access_token);
      const userData = await authApi.getMe();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return response;
    } catch (error) {
      throw error;
    }
  };

  const resendCode = async (email: string) => {
    try {
      return await authApi.resendCode(email);
    } catch (error) {
      throw error;
    }
  };

  const requestPasswordChange = async () => {
    try {
      return await authApi.requestPasswordChange();
    } catch (error) {
      throw error;
    }
  };

  const requestEmailChange = async (newEmail: string, currentPassword: string) => {
    try {
      return await authApi.requestEmailChange(newEmail, currentPassword);
    } catch (error) {
      throw error;
    }
  };

  const verifyNewEmail = async (code: string) => {
    try {
      const userData = await authApi.verifyNewEmail(code);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const changePasswordWithCode = async (newPassword: string, code: string) => {
    try {
      return await authApi.changePasswordWithCode(newPassword, code);
    } catch (error) {
      throw error;
    }
  };

  const requestAccountDeletion = async () => {
    try {
      return await authApi.requestAccountDeletion();
    } catch (error) {
      throw error;
    }
  };

  const deleteAccount = async (currentPassword: string, code: string) => {
    try {
      return await authApi.deleteAccount(currentPassword, code);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const refreshSubscription = async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch {
      // ignore
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch {
      // ignore
    }
  };

  const subscription = user?.subscription ?? null;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    subscription,
    login,
    register,
    verifyEmail,
    resendCode,
    requestPasswordChange,
    requestEmailChange,
    verifyNewEmail,
    changePasswordWithCode,
    requestAccountDeletion,
    deleteAccount,
    logout,
    refreshUser,
    refreshSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
