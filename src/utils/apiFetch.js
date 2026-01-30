export default async function(url, options = {}) {
    try {
        const res = await fetch(url, options);

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
