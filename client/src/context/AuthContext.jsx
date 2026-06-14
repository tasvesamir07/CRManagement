import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('cr_token');
            const cachedUserStr = localStorage.getItem('cr_user');
            
            if (token) {
                // Client-side JWT expiry check
                let expired = false;
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.exp && Date.now() >= payload.exp * 1000) {
                        expired = true;
                    }
                } catch (e) {
                    expired = true;
                }

                if (expired) {
                    localStorage.removeItem('cr_token');
                    localStorage.removeItem('cr_user');
                    setUser(null);
                    setLoading(false);
                    return;
                }

                // Restore user state from cache instantly
                if (cachedUserStr) {
                    try {
                        setUser(JSON.parse(cachedUserStr));
                    } catch (_) {}
                }
                
                // Immediately stop loading state
                setLoading(false);

                // Revalidate session silently in background
                try {
                    const data = await authAPI.me();
                    setUser(data.user);
                    localStorage.setItem('cr_user', JSON.stringify(data.user));
                } catch (err) {
                    console.error('Session restore failed:', err.message);
                    localStorage.removeItem('cr_token');
                    localStorage.removeItem('cr_user');
                    setUser(null);
                }
            } else {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = async (username, password) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authAPI.login(username, password);
            if (data.requiresTwoFactor) {
                setLoading(false);
                return data;
            }
            localStorage.setItem('cr_token', data.token);
            localStorage.setItem('cr_user', JSON.stringify(data.user));
            setUser(data.user);
            setLoading(false);
            return data;
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Login failed');
            setLoading(false);
            throw err;
        }
    };

    const register = async (username, email, password, displayName) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authAPI.register(username, email, password, displayName);
            localStorage.setItem('cr_token', data.token);
            localStorage.setItem('cr_user', JSON.stringify(data.user));
            setUser(data.user);
            setLoading(false);
            return data.user;
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Registration failed');
            setLoading(false);
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('cr_token');
        localStorage.removeItem('cr_user');
        setUser(null);
    };

    const refreshUser = useCallback(async () => {
        try {
            const data = await authAPI.me();
            setUser(data.user);
            localStorage.setItem('cr_user', JSON.stringify(data.user));
        } catch (err) {
            console.error('Failed to refresh user:', err.message);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, error, login, register, logout, refreshUser, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
