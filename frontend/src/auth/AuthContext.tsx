import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AUTH_STORAGE_KEY, readStoredAuth } from '../api/client';
import type { LoginResponse, Role } from '../api/types';

export interface AuthUser {
  username: string;
  role: Role;
  customerId: string | null;
  displayName: string;
  token: string;
}

export interface AuthValue {
  user: AuthUser | null;
  login: (res: LoginResponse, username: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredAuth<AuthUser>());
  const queryClient = useQueryClient();

  const login = (res: LoginResponse, username: string) => {
    const authUser: AuthUser = {
      username,
      role: res.role,
      customerId: res.customerId,
      displayName: res.displayName,
      token: res.token,
    };
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
    } catch {
      // ignore localstorage errors
    }
    setUser(authUser);
  };

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
    setUser(null);
    queryClient.clear();
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('ll:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('ll:unauthorized', handleUnauthorized);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
