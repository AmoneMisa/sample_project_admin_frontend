export default async function(url, options = {}) {
    try {
        const res = await fetch(url, options);

        if (!res.ok) {
            let message = `Ошибка запроса: ${res.status}`;

            try {
                const data = await res.json();
                if (data?.message) message = data.message;
            } catch (e) {
                console.log("Error:", e);
            }

            throw new Error(message);
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
