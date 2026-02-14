import {useCallback, useState} from "react";
import {useAuth} from "./authContext";
import {useToast} from "../components/layout/ToastContext";
import apiFetch from "../utils/apiFetch";

export function useTranslations() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [languages, setLanguages] = useState([]);
    const [translationMaps, setTranslationMaps] = useState({});
    const [loaded, setLoaded] = useState(false);

    const updateTranslation = useCallback((key, map) => {
        setTranslationMaps(prev => ({...prev, [key]: map}));
    }, []);

    const loadLanguages = useCallback(async () => {
        const langs = await apiFetch(`${API_URL}/languages`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        setLanguages(langs);
    }, [accessToken]);

    const loadAllTranslations = useCallback(async () => {
        if (!accessToken || loaded) return;

        const data = await apiFetch(`${API_URL}/translations`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const merged = {};
        for (const [lang, entries] of Object.entries(data)) {
            for (const [key, value] of Object.entries(entries)) {
                if (!merged[key]) merged[key] = {};
                merged[key][lang] = value;
            }
        }

        setTranslationMaps(merged);
        setLoaded(true);
    }, [accessToken, loaded]);

    const createKeysBatch = useCallback(async (items) => {
        await apiFetch(`${API_URL}/translations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(items)
        });

        setTranslationMaps(prev => {
            const next = {...prev};
            for (const {key, values} of items) {
                next[key] = {...values};
            }
            return next;
        });

        showToast("Ключи созданы");
    }, [API_URL, accessToken, showToast]);

    const updateKeysBatch = useCallback(async (items) => {
        await apiFetch(`${API_URL}/translations`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({items})
        });

        setTranslationMaps(prev => {
            const next = {...prev};
            for (const {key, lang, value} of items) {
                if (!next[key]) next[key] = {};
                next[key][lang] = value;
            }
            return next;
        });

        showToast("Переводы обновлены");
    }, [API_URL, accessToken, showToast]);

    const deleteKeys = useCallback(async (keys) => {
        if (!accessToken) return;

        setTranslationMaps(prev => {
            const next = {...prev};
            for (const key of keys) delete next[key];
            return next;
        });

        await apiFetch(`${API_URL}/translations`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({keys})
        });

        showToast("Ключи удалены");
    }, [accessToken, API_URL, showToast]);

    const updateLanguage = useCallback(async (code, payload) => {
        const updated = await apiFetch(`${API_URL}/languages/${code}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(payload)
        });

        setLanguages(prev =>
            prev.map(l => l.code === code ? updated : l)
        );

        showToast("Язык обновлён");
    }, [API_URL, accessToken, showToast]);

    const createLanguage = useCallback(async ({code, name, enabled}) => {
        const lang = await apiFetch(`${API_URL}/languages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({code, name, enabled})
        });

        setLanguages(prev => [...prev, lang]);

        showToast("Язык создан");
    }, [API_URL, accessToken, showToast]);

    const exportTranslations = useCallback(async ({ codes = [], enabledOnly = false } = {}) => {
        if (!accessToken) return;

        const list = (codes && codes.length ? codes : languages.map(l => l.code)).join(",");

        const params = new URLSearchParams({
            langKey: list
        });

        if (enabledOnly) params.set("enabledOnly", "true");

        const res = await fetch(`${API_URL}/translations/export?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(text || `Export failed (${res.status})`);
        }

        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition") || "";
        const match = cd.match(/filename="([^"]+)"/i);
        const filename = match?.[1] || "translations.zip";

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    }, [API_URL, accessToken, languages]);

    const importTranslations = useCallback(async (files) => {
        const formData = new FormData();

        for (const file of files) {
            formData.append("files", file);
        }

        const data = await apiFetch(`${API_URL}/translations/import`, {
            method: "POST",
            body: formData
        });

        setTranslationMaps(prev => {
            const next = {...prev};

            for (const [lang, entries] of Object.entries(data)) {
                for (const [key, value] of Object.entries(entries)) {
                    if (!next[key]) next[key] = {};
                    next[key][lang] = value;
                }
            }

            return next;
        });

        showToast("Файлы успешно загружены");
    }, [API_URL, accessToken, showToast]);

    return {
        languages,
        translationMaps,
        updateTranslation,
        loadAllTranslations,
        loadLanguages,
        createKeysBatch,
        updateKeysBatch,
        deleteKeys,
        updateLanguage,
        createLanguage,
        importTranslations,
        exportTranslations
    };
}
