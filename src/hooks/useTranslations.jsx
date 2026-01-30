import {useCallback, useState} from "react";
import {useAuth} from "./authContext";
import {useToast} from "../components/layout/ToastContext";

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

    const loadAllTranslations = useCallback(async () => {
        if (!accessToken || loaded) return;

        const langsRes = await fetch(`${API_URL}/languages`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        const langs = await langsRes.json();
        setLanguages(langs);

        const res = await fetch(`${API_URL}/translations`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        const data = await res.json();

        setTranslationMaps(data);
        setLoaded(true);
    }, [accessToken, loaded]);

    const createKeysBatch = useCallback(async (items) => {
        await fetch(`${API_URL}/translations`, {
            method: "POST",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
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
        await fetch(`${API_URL}/translations`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
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

        await fetch(`${API_URL}/translations`, {
            method: "DELETE",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
            body: JSON.stringify({keys})
        });

        showToast("Ключи удалены");
    }, [accessToken, API_URL, showToast]);

    return {
        languages,
        translationMaps,
        updateTranslation,
        loadAllTranslations,
        createKeysBatch,
        updateKeysBatch,
        deleteKeys
    };
}
