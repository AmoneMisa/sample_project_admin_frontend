import {createContext, useCallback, useContext, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({children}) {
    const navigate = useNavigate();
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [refreshToken, setRefreshToken] = useState(null);
    const [loading, setLoading] = useState(true);


    // -----------------------------
    //  Logout
    // -----------------------------
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

        navigate("/login");
    }, [API_URL, accessToken, navigate]);

    // -----------------------------
    //  Refresh token
    // -----------------------------
    const handleRefresh = useCallback(async () => {
        if (!refreshToken) return logout();

        const res = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({refresh_token: refreshToken}),
        });

        const data = await res.json();

        if (!res.ok) {
            return logout();
        }

        if (localStorage.getItem("refresh_token")) {
            localStorage.setItem("access_token", data.access_token);
        } else {
            sessionStorage.setItem("access_token", data.access_token);
        }

        setAccessToken(data.access_token);

        await fetchUser(data.access_token);

        return data.access_token;
        // eslint-disable-next-line no-use-before-define
    }, [API_URL, refreshToken, logout, fetchUser]);

    // -----------------------------
    //  Получение профиля
    // -----------------------------
    const fetchUser = useCallback(async (token) => {
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: {Authorization: `Bearer ${token}`},
            });

            if (!res.ok) throw new Error("Unauthorized");

            const data = await res.json();
            setUser(data);
        } catch {
            await handleRefresh();
        }
    }, [API_URL, handleRefresh]);

    // -----------------------------
    //  Загрузка токенов при старте
    // -----------------------------
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

    // -----------------------------
    //  Логин
    // -----------------------------
    async function login(email, password, remember) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, password, remember_me: remember}),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || "Ошибка входа");
        }

        if (remember) {
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("refresh_token", data.refresh_token);
        } else {
            sessionStorage.setItem("access_token", data.access_token);
            sessionStorage.setItem("refresh_token", data.refresh_token);
        }

        setAccessToken(data.access_token);
        setRefreshToken(data.refresh_token);
        setUser({
            id: data.id,
            email: data.email,
            full_name: data.full_name,
            role: data.role,
            permissions: data.permissions,
        });

        navigate("/");
    }

    // -----------------------------
    //  Авто‑refresh каждые 10 минут
    // -----------------------------
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
                login,
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
