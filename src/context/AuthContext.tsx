import React, { createContext, useContext, useMemo, useState } from 'react'
import api from '../api' // Importamos la instancia configurada de axios

type AuthContextType = {
  isAuthenticated: boolean
  login: (user: string, pass: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('auth') === '1'
  })

  const login = async (user: string, pass: string) => {
    try {
      const res = await api.post('/usuarios/login', {
        username: user,
        password: pass
      });
      
      if (res.status === 200) {
        setIsAuthenticated(true);
        localStorage.setItem('auth', '1');
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error en login:', error);
      return false;
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('auth')
  }

  const value = useMemo(() => ({ isAuthenticated, login, logout }), [isAuthenticated])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}