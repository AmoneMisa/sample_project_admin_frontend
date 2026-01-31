import {useEffect, useState} from "react";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import CustomTable from "../components/customElems/CustomTable";
import LabeledFileInput from "../components/controls/LabeledFileInput";
import LabeledInput from "../components/controls/LabeledInput";
import {useTranslations} from "../hooks/useTranslations";
import apiFetch from "../utils/apiFetch";
import Toggle from "../components/controls/Toggle";

const ISO_LANGUAGES = {
    en: "English",
    ru: "Russian",
    kk: "Kazakh",
    fr: "French",
    de: "German",
    es: "Spanish",
    it: "Italian",
    zh: "Chinese",
    ja: "Japanese",
    uk: "Ukrainian",
    pl: "Polish",
    pt: "Portuguese",
    ar: "Arabic",
    tr: "Turkish",
    sv: "Swedish",
    fi: "Finnish",
    nl: "Dutch",
    cs: "Czech",
    bg: "Bulgarian",
    ro: "Romanian",
    hu: "Hungarian",
    el: "Greek",
    he: "Hebrew",
    hi: "Hindi",
    id: "Indonesian"
};

export default function AdminPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {user, accessToken } = useAuth();
    const {showToast} = useToast();

    const {
        languages,
        loadLanguages,
        updateLanguage,
        createLanguage,
        importTranslations,
        initLanguages
    } = useTranslations();

    const [newCode, setNewCode] = useState("");
    const [newName, setNewName] = useState("");
    const [suggestions, setSuggestions] = useState([]);

    async function cleanup(mode) {
        const params = new URLSearchParams({ translations: 1 });
        if (mode) params.append("mode", mode);

        const data = await apiFetch(`${API_URL}/cleanup?${params.toString()}`, {
            method: "POST"
        });

        showToast(`Удалено ключей: ${data.removed}`);
    }

    useEffect(() => {
        loadLanguages();
    }, [loadLanguages]);

    useEffect(() => {
        const code = newCode.trim().toLowerCase();
        if (!code) {
            setNewName("");
            setSuggestions([]);
            return;
        }

        if (ISO_LANGUAGES[code]) {
            setNewName(ISO_LANGUAGES[code]);
            setSuggestions([]);
        } else {
            const candidates = Object.keys(ISO_LANGUAGES)
                .filter(c =>
                    c.startsWith(code) ||
                    ISO_LANGUAGES[c].toLowerCase().includes(code)
                )
                .slice(0, 3);

            setSuggestions(candidates);
            setNewName("");
        }
    }, [newCode]);

    async function toggleLanguage(code, enabled) {
        await updateLanguage(code, {enabled});
        showToast(`Язык ${code} ${enabled ? "включён" : "выключен"}`);
    }

    async function uploadFiles(files) {
        await importTranslations(files);
        showToast("Файлы успешно загружены");
    }

    async function handleInitLanguages() {
        await initLanguages();
        showToast("Языки инициализированы");
        await loadLanguages();
    }

    async function addLanguage() {
        if (!ISO_LANGUAGES[newCode]) {
            showToast("Некорректный код языка");
            return;
        }

        await createLanguage({
            code: newCode,
            name: newName,
            enabled: true
        });

        showToast("Язык добавлен");
        setNewCode("");
        setNewName("");
        await loadLanguages();
    }

    if (!user || !["admin", "moderator"].includes(user.role)) {
        return <div>Нет доступа</div>;
    }

    return (
        <div className="page" style={{padding: 24}}>
            <div className="page__header">
                <h1>Админка</h1>
                <div className={"page__block"}>
                    <h2>Загрузка переводов</h2>
                    <LabeledFileInput
                        label="Загрузить файлы переводов"
                        multiple
                        accept="application/json"
                        onChange={uploadFiles}
                    />

                    {user.role === "admin" && languages.length === 0 && (
                        <button
                            className="button button_accept"
                            onClick={handleInitLanguages}
                            style={{marginTop: 12, maxWidth: "300px"}}
                        >
                            Инициализировать языки
                        </button>
                    )}
                </div>
            </div>
            <div className={"page__block"}>

                <h2>Очистка переводов</h2>

                <div style={{display: "flex", gap: 12, flexWrap: "wrap"}}>
                    <button className="button button_border" onClick={() => cleanup()}>
                        Очистить битые ключи
                    </button>

                    <button className="button button_border" onClick={() => cleanup("headerMenu")}>
                        Очистить ключи headerMenu
                    </button>

                    <button className="button button_border" onClick={() => cleanup("contacts")}>
                        Очистить ключи contacts
                    </button>

                    <button className="button button_border" onClick={() => cleanup("featureCard")}>
                        Очистить ключи featureCard
                    </button>
                </div>
            </div>
            <h2>Языки</h2>
            <CustomTable
                columns={[
                    {
                        key: "code",
                        title: "Код",
                        render: (_, row) => (
                            <div style={{display: "flex", flexDirection: "column", gap: 6}}>
                                <span>{row.code}</span>
                                <Toggle
                                    checked={row.enabled}
                                    onChange={(e) => toggleLanguage(row.code, e.target.checked)}
                                    title="Выключить / включить язык"
                                />
                            </div>
                        )
                    },
                    {key: "name", title: "Название"},
                ]}
                data={languages}
            />

            {user.role === "admin" && (
                <div style={{marginTop: 36}}>
                    <h3 style={{marginBottom: 20}}>Добавить язык</h3>

                    <div style={{display: "flex", gap: 12}}>
                        <LabeledInput
                            label="Код"
                            value={newCode}
                            onChange={setNewCode}
                            placeholder="en"
                        />
                        <LabeledInput
                            label="Название"
                            value={newName}
                            onChange={setNewName}
                            placeholder="English"
                        />
                    </div>

                    {suggestions.length > 0 && (
                        <div style={{marginTop: 8}}>
                            <span style={{fontSize: 14}}>Возможные варианты:</span>
                            <div style={{display: "flex", gap: 8, marginTop: 4}}>
                                {suggestions.map(code => (
                                    <button
                                        key={code}
                                        className="button button_border"
                                        onClick={() => {
                                            setNewCode(code);
                                            setNewName(ISO_LANGUAGES[code]);
                                            setSuggestions([]);
                                        }}
                                    >
                                        {code} — {ISO_LANGUAGES[code]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        className="button"
                        onClick={addLanguage}
                        style={{marginTop: 12}}
                    >
                        Добавить
                    </button>
                </div>
            )}
        </div>
    );
}
