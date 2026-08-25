import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch (err) {
          console.error("Auth check failed:", err);
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = res.data;
      
      setToken(newToken);
      localStorage.setItem('token', newToken);
      setUser(userData);
      return true;
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || err.message || 'Login failed');
      return false;
    }
  };

  const register = async (name, email, password, companyName) => {
    try {
      const res = await api.post('/auth/register', { name, email, password, companyName });
      const { token: newToken, user: userData } = res.data;
      
      setToken(newToken);
      localStorage.setItem('token', newToken);
      setUser(userData);
      return true;
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || err.message || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
