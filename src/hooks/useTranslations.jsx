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
        if (languages.length > 0) {
            return languages;
        }

        const res = await fetch(`${API_URL}/languages/enabled`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        const langs = await res.json();
        setLanguages(langs);
        return langs;
    }, [API_URL, accessToken]);

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
    }, [accessToken, loadLanguages]);

    const saveAll = useCallback(async () => {
        if (!accessToken) return;

        const items = [];

        for (const [key, values] of Object.entries(translations)) {
            const metaForKey = meta[key] || {};
            const isList = !!metaForKey.isList;

            for (const lang of languages) {
                const rawValue = values[lang.code];
                const payloadValue = isList
                    ? String(rawValue).split(";").map(s => s.trim()).filter(Boolean)
                    : rawValue;

                items.push({key, lang: lang.code, value: payloadValue});
            }
        }

        await fetch(`${API_URL}/translations`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
            body: JSON.stringify({items})
        });

        showToast("Переводы сохранены");
    }, [translations, languages, meta, accessToken, API_URL, showToast]);

    const saveValue = useCallback(async (key, lang, newValue) => {
        if (!accessToken) return;

        const prevTranslations = translations;
        const prevMeta = meta;

        const nextTranslations = {
            ...prevTranslations,
            [key]: {
                ...prevTranslations[key],
                [lang]: newValue
            }
        };

        pushSnapshot(nextTranslations, prevMeta, `Изменён ${lang} перевод у ключа '${key}'`);
        setTranslations(nextTranslations);

        const metaForKey = meta[key] || {};
        const isList = !!metaForKey.isList;

        const payloadValue = isList
            ? newValue.split(";").map(s => s.trim()).filter(Boolean)
            : newValue;

        const items = [{key, lang, value: payloadValue}];

        await fetch(`${API_URL}/translations`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
            body: JSON.stringify({items})
        });

        showToast("Перевод сохранён");
    }, [translations, meta, pushSnapshot, setTranslations, accessToken, API_URL, showToast]);

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
        saveAll,
        saveValue,
        deleteKeys
    };
}
