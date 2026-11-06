import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pulsechat_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('pulsechat_token'));
  const [loading, setLoading] = useState(true);

  // Verify auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('pulsechat_token');
      if (savedToken) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('pulsechat_user', JSON.stringify(res.data));
          }
        } catch (err) {
          console.warn('Session expired or invalid:', err.message);
          localStorage.removeItem('pulsechat_token');
          localStorage.removeItem('pulsechat_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (emailOrUsername, password) => {
    const res = await authApi.login({ emailOrUsername, password });
    if (res.success && res.data) {
      const { token: receivedToken, ...userData } = res.data;
      localStorage.setItem('pulsechat_token', receivedToken);
      localStorage.setItem('pulsechat_user', JSON.stringify(userData));
      setToken(receivedToken);
      setUser(userData);
      return userData;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (username, email, password) => {
    const res = await authApi.register({ username, email, password });
    if (res.success && res.data) {
      const { token: receivedToken, ...userData } = res.data;
      localStorage.setItem('pulsechat_token', receivedToken);
      localStorage.setItem('pulsechat_user', JSON.stringify(userData));
      setToken(receivedToken);
      setUser(userData);
      return userData;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('pulsechat_token');
      localStorage.removeItem('pulsechat_user');
      setUser(null);
      setToken(null);
    }
  };

  const updateUserState = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('pulsechat_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        updateUserState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
