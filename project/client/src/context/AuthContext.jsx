import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

const API_BASE = '/api/auth';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef(null);

    const connectSocket = useCallback((userData) => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        const socket = io('http://localhost:5000', { withCredentials: true });
        socket.on('connect', () => {
            socket.emit('joinRoom', userData.id || userData._id);
        });
        socketRef.current = socket;
    }, []);

    const disconnectSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, []);

    const fetchUser = useCallback(async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                connectSocket(data.user);
            } else if (res.status === 401) {
                const refreshed = await tryRefresh();
                if (!refreshed) {
                    logout();
                }
            }
        } catch {
            logout();
        } finally {
            setLoading(false);
        }
    }, [connectSocket]);

    const tryRefresh = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return false;

        try {
            const res = await fetch(`${API_BASE}/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('accessToken', data.accessToken);

                const userRes = await fetch(`${API_BASE}/me`, {
                    headers: { Authorization: `Bearer ${data.accessToken}` },
                });

                if (userRes.ok) {
                    const userData = await userRes.json();
                    setUser(userData.user);
                    connectSocket(userData.user);
                    return true;
                }
            }
        } catch {
        }

        return false;
    };

    useEffect(() => {
        fetchUser();
        return () => disconnectSocket();
    }, [fetchUser, disconnectSocket]);

    const register = async (formData) => {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        setUser(data.user);
        connectSocket(data.user);
        return data;
    };

    const login = async (email, password) => {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Login failed');
        }

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        setUser(data.user);
        connectSocket(data.user);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        disconnectSocket();
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, socket: socketRef }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
