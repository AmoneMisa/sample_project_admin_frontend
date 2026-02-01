import {useState, useEffect} from "react";
import {useNavigate, Link} from "react-router-dom";
import {useAuth} from "../hooks/authContext";
import LabeledInput from "../components/controls/LabeledInput";
import PasswordInput from "../components/controls/PasswordInput";
import apiFetch from "../utils/apiFetch";

export default function RegisterPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";

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
    const [password2, setPassword2] = useState("");
    const [fullName, setFullName] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!loading && user && accessToken) {
            navigate("/", {replace: true});
        }
    }, [user, accessToken, loading, navigate]);

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validateName(name) {
        return /^[A-Za-zА-Яа-яЁё\s\-]+$/.test(name);
    }

    async function handleRegister(e) {
        e.preventDefault();
        setError("");

        if (!validateEmail(email)) {
            return setError("Некорректный email");
        }

        if (!validateName(fullName)) {
            return setError("Имя может содержать только буквы, пробелы и тире");
        }

        if (password !== password2) {
            return setError("Пароли не совпадают");
        }

        try {
            await apiFetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    email,
                    password,
                    full_name: fullName
                })
            });

            const loginData = await apiFetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    email,
                    password,
                    remember_me: true
                })
            });

            localStorage.setItem("access_token", loginData.access_token);
            localStorage.setItem("refresh_token", loginData.refresh_token);

            setAccessToken(loginData.access_token);
            setRefreshToken(loginData.refresh_token);
            setUser({
                id: loginData.id,
                email: loginData.email,
                full_name: loginData.full_name,
                role: loginData.role,
                permissions: loginData.permissions
            });

            navigate("/", {replace: true});

        } catch (err) {
            if (err.message.includes("already exists")) {
                setError("Пользователь с таким email уже существует");
            } else {
                setError(err.message);
            }
        }
    }

    return (
        <div className={"page"} style={{maxWidth: 400, margin: "80px auto"}}>
            <h2 className="gradient-text" style={{marginBottom: 24}}>
                Регистрация
            </h2>

            <form className="field-holder" onSubmit={handleRegister}>
                <LabeledInput
                    label="Email"
                    placeholder="example@mail.com"
                    autoComplete="email"
                    value={email}
                    onChange={setEmail}
                />

                <PasswordInput
                    label="Пароль"
                    placeholder="Введите пароль"
                    autoComplete="new-password"
                    value={password}
                    onChange={setPassword}
                />

                <PasswordInput
                    label="Подтвердите пароль"
                    placeholder="Повторите пароль"
                    autoComplete="new-password"
                    value={password2}
                    onChange={setPassword2}
                />

                <LabeledInput
                    label="Полное имя"
                    placeholder="Иван Иванов"
                    value={fullName}
                    onChange={setFullName}
                />

                {error && (
                    <div style={{color: "var(--color-error)", marginTop: 8}}>
                        {error}
                    </div>
                )}

                <button className="button" style={{marginTop: 16}}>
                    Зарегистрироваться
                </button>
            </form>

            <p style={{marginTop: 16}}>
                Уже есть аккаунт? <Link to="/login">Войти</Link>
            </p>
        </div>
    );
}
