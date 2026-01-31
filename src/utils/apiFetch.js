export default async function apiFetch(url, options = {}) {
    try {
        const token = localStorage.getItem("access_token");

        const headers = {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const res = await fetch(url, {
            ...options,
            headers,
        });

        if (!res.ok) {
            console.error(`Ошибка запроса: ${res.status}`);
        }

        try {
            return await res.json();
        } catch {
            return null;
        }

    } catch (err) {
        throw new Error(err.message || "Неизвестная ошибка");
    }
}
