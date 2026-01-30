import {createContext, useCallback, useContext, useEffect, useState} from "react";
import apiFetch from "../utils/apiFetch";

export const AuthContext = createContext(null);

export function AuthProvider({children}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";

    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [refreshToken, setRefreshToken] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: "POST",
                headers: {Authorization: `Bearer ${accessToken}`},
            });
        } catch {
        }

        localStorage.clear();
        sessionStorage.clear();

        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
    }, [API_URL, accessToken]);

    const handleRefresh = useCallback(async () => {
        if (!refreshToken) return logout();

        try {
            const data = await apiFetch(`${API_URL}/auth/refresh`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({refresh_token: refreshToken})
            });

            // Обновляем access_token в нужном хранилище
            if (localStorage.getItem("refresh_token")) {
                localStorage.setItem("access_token", data.access_token);
            } else {
                sessionStorage.setItem("access_token", data.access_token);
            }

            setAccessToken(data.access_token);

            await fetchUser(data.access_token);

            return data.access_token;
        } catch {
            await logout();
        }
    }, [API_URL, refreshToken, logout]);

    const fetchUser = useCallback(async (token) => {
        try {
            const data = await apiFetch(`${API_URL}/auth/me`, {
                headers: {Authorization: `Bearer ${token}`}
            });

            setUser(data);
        } catch (err) {
            await handleRefresh();
        }
    }, [API_URL, handleRefresh]);

    useEffect(() => {
        const storedAccess =
            localStorage.getItem("access_token") ||
            sessionStorage.getItem("access_token");

        const storedRefresh =
            localStorage.getItem("refresh_token") ||
            sessionStorage.getItem("refresh_token");

        if (storedAccess && storedRefresh) {
            setAccessToken(storedAccess);
            setRefreshToken(storedRefresh);

            fetchUser(storedAccess).finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [fetchUser]);

    useEffect(() => {
        if (!refreshToken) return;

        const interval = setInterval(() => {
            handleRefresh();
        }, 10 * 60 * 1000);

        return () => clearInterval(interval);
    }, [refreshToken, handleRefresh]);

    return (
        <AuthContext.Provider
            value={{
                user,
                accessToken,
                setAccessToken,
                setRefreshToken,
                setUser,
                logout,
                refresh: handleRefresh,
                loading
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
