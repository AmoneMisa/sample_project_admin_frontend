import {useCallback, useState} from "react";
import {useAuth} from "./authContext";
import {useToast} from "../components/layout/ToastContext";

export function useTranslations({translations, setTranslations, meta, setMeta, pushSnapshot, markDeleted}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [languages, setLanguages] = useState([]);
    const [loaded, setLoaded] = useState(false);

    const loadLanguages = useCallback(async () => {
        if (languages.length > 0) return languages;

        const res = await fetch(`${API_URL}/languages/enabled`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const langs = await res.json();
        setLanguages(langs);
        return langs;
    }, [API_URL, accessToken, languages]);

    const loadAllTranslations = useCallback(async () => {
        if (!accessToken) return;
        if (loaded) return;

        const langs = await loadLanguages();
        const all = {};
        const nextMeta = {...meta};

        for (const lang of langs) {
            const res = await fetch(`${API_URL}/translations?lang=${lang.code}`, {
                headers: {Authorization: `Bearer ${accessToken}`}
            });
            const data = await res.json();

            for (const [key, value] of Object.entries(data)) {
                if (!all[key]) all[key] = {};

                let v = value;
                let isList = false;

                if (typeof v === "string" && v.trim().startsWith("[") && v.trim().endsWith("]")) {
                    try {
                        const parsed = JSON.parse(v);
                        if (Array.isArray(parsed)) {
                            v = parsed.join("; ");
                            isList = true;
                        }
                    } catch {}
                }

                all[key][lang.code] = v;

                nextMeta[key] = nextMeta[key] || {};
                if (isList) nextMeta[key].isList = true;
            }
        }

        setTranslations(all);
        setMeta(nextMeta);
        setLoaded(true);
    }, [accessToken, loaded, loadLanguages, meta, setMeta, setTranslations]);

    // -----------------------------
    // CREATE MULTIPLE KEYS (POST)
    // -----------------------------
    const createKeysBatch = useCallback(async (items) => {
        await fetch(`${API_URL}/translations`, {
            method: "POST",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
            body: JSON.stringify(items)
        });

        showToast("Ключи созданы");
    }, [API_URL, accessToken, showToast]);

    // -----------------------------
    // UPDATE MULTIPLE KEYS (PATCH)
    // -----------------------------
    const updateKeysBatch = useCallback(async (items) => {
        await fetch(`${API_URL}/translations`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
            body: JSON.stringify({items})
        });

        showToast("Переводы обновлены");
    }, [API_URL, accessToken, showToast]);

    // -----------------------------
    // DELETE KEYS
    // -----------------------------
    const deleteKeys = useCallback(async (keys) => {
        if (!accessToken) return;

        const prevTranslations = translations;
        const prevMeta = meta;

        const nextTranslations = {...prevTranslations};
        const nextMeta = {...prevMeta};

        for (const key of keys) {
            delete nextTranslations[key];
            delete nextMeta[key];
            markDeleted(key, prevTranslations[key], prevMeta[key]);
        }

        pushSnapshot(nextTranslations, nextMeta, `Удалены ключи: ${keys.join(", ")}`);

        setTranslations(nextTranslations);
        setMeta(nextMeta);

        await fetch(`${API_URL}/translations`, {
            method: "DELETE",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
            body: JSON.stringify({keys})
        });

        showToast("Ключи удалены");
    }, [translations, meta, markDeleted, pushSnapshot, setTranslations, setMeta, accessToken, API_URL, showToast]);

    return {
        languages,
        loadAllTranslations,

        createKeysBatch,
        updateKeysBatch,
        deleteKeys
    };
}
