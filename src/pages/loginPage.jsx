import {useState, useEffect} from "react";
import {useNavigate, Link} from "react-router-dom";
import {useAuth} from "../hooks/authContext";
import LabeledInput from "../components/controls/LabeledInput";
import Checkbox from "../components/controls/Checkbox";
import apiFetch from "../utils/apiFetch";

export default function LoginPage() {
    const {
        user,
        accessToken,
        loading,
        setAccessToken,
        setRefreshToken,
        setUser
    } = useAuth();

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");

    const API_URL = process.env.REACT_APP_API_URL || "/api";

    useEffect(() => {
        if (!loading && user && accessToken) {
            navigate("/", {replace: true});
        }
    }, [user, accessToken, loading, navigate]);

    async function handleLogin(e) {
        e.preventDefault();
        setError("");

        try {
            const data = await apiFetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    email,
                    password,
                    remember_me: rememberMe
                })
            });

            if (rememberMe) {
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
                permissions: data.permissions
            });

            navigate("/", {replace: true});

        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div style={{maxWidth: 400, margin: "80px auto"}}>
            <h2 className="gradient-text" style={{marginBottom: 24}}>
                Вход
            </h2>

            <form className="field-holder" onSubmit={handleLogin}>
                <LabeledInput
                    label="Email"
                    value={email}
                    onChange={setEmail}
                />

                <LabeledInput
                    label="Пароль"
                    type="password"
                    value={password}
                    onChange={setPassword}
                />

                <Checkbox
                    label="Запомнить меня"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="mt-2"
                />

                {error && (
                    <div style={{color: "var(--color-error)", marginTop: 8}}>
                        {error}
                    </div>
                )}

                <button className="button" style={{marginTop: 16}}>
                    Войти
                </button>
            </form>

            <p style={{marginTop: 16}}>
                Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
            </p>
        </div>
    );
}