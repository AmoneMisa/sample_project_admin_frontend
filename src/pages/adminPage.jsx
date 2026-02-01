import {useEffect, useState} from "react";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import CustomTable from "../components/customElems/CustomTable";
import LabeledFileInput from "../components/controls/LabeledFileInput";
import LabeledInput from "../components/controls/LabeledInput";
import {useTranslations} from "../hooks/useTranslations";
import apiFetch from "../utils/apiFetch";
import Toggle from "../components/controls/Toggle";
import {FiChevronDown, FiChevronRight} from "react-icons/fi";

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
    const {user} = useAuth();
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

    const [collapsed, setCollapsed] = useState(() => ({
        upload: false,
        cleanup: false,
        languages: false,
        addLang: false
    }));

    const toggleSection = (key) =>
        setCollapsed(prev => ({...prev, [key]: !prev[key]}));

    async function cleanup(mode) {
        const params = new URLSearchParams({translations: 1});
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
                    c.startsWith(code) || ISO_LANGUAGES[c].toLowerCase().includes(code)
                )
                .slice(0, 3);

            setSuggestions(candidates);
            setNewName("");
        }
    }, [newCode]);

    async function toggleLanguage(code, enabled) {
        await updateLanguage(code, {isEnabled: enabled});
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
            isEnabled: true
        });

        showToast("Язык добавлен");
        setNewCode("");
        setNewName("");
        await loadLanguages();
    }

    const canInit = user?.role === "admin" && languages.length === 0;

    if (!user || !["admin", "moderator"].includes(user.role)) {
        return <div>Нет доступа</div>;
    }

    return (
        <div className="page admin-page">
            <div className="admin-page__header">
                <h1 className="page__header">Админка</h1>
            </div>
            <div className="page__topbar page__topbar_wrap">
                <div className="page__topbar-col">
                    <div className="page__topbar-title">Загрузка переводов</div>
                    <div className="page__row page__row_wrap">
                        <LabeledFileInput
                            label="Загрузить файлы переводов"
                            multiple
                            accept="application/json"
                            onChange={uploadFiles}
                        />
                        {canInit && (
                            <button
                                className="button button_accept"
                                onClick={handleInitLanguages}
                            >
                                Инициализировать языки
                            </button>
                        )}
                    </div>
                </div>

                <div className="page__topbar-col">
                    <div className="page__topbar-title">Очистка переводов</div>
                    <div className="page__row page__row_wrap">
                        <button className="button button_border" onClick={() => cleanup()}>
                            Очистить битые ключи
                        </button>
                        <button className="button button_border" onClick={() => cleanup("headerMenu")}>
                            Очистить headerMenu
                        </button>
                        <button className="button button_border" onClick={() => cleanup("contacts")}>
                            Очистить contacts
                        </button>
                        <button className="button button_border" onClick={() => cleanup("featureCard")}>
                            Очистить featureCard
                        </button>
                    </div>
                </div>
            </div>

            {/* Languages section */}
            <div className="admin-page__card">
                <button
                    type="button"
                    className="admin-page__card-head"
                    onClick={() => toggleSection("languages")}
                >
                    <span className="admin-page__card-title gradient-text">Языки</span>
                    <span className="admin-page__chev" aria-hidden="true">
            {collapsed.languages ? <FiChevronRight size={18}/> : <FiChevronDown size={18}/>}
          </span>
                </button>

                {!collapsed.languages && (
                    <div className="admin-page__card-body">
                        <div className="admin-page__table-wrap">
                            <CustomTable
                                columns={[
                                    {
                                        key: "code",
                                        title: "Код",
                                        render: (_, row) => (
                                            <div className="admin-page__lang-cell">
                                                <span className="admin-page__lang-code">{row.code}</span>
                                                <Toggle
                                                    checked={row.isEnabled}
                                                    onChange={(e) => toggleLanguage(row.code, e.target.checked)}
                                                    title="Выключить / включить язык"
                                                />
                                            </div>
                                        )
                                    },
                                    {key: "name", title: "Название"}
                                ]}
                                data={languages}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Add language */}
            {user.role === "admin" && (
                <div className="admin-page__card">
                    <button
                        type="button"
                        className="admin-page__card-head"
                        onClick={() => toggleSection("addLang")}
                    >
                        <span className="admin-page__card-title gradient-text">Добавить язык</span>
                        <span className="admin-page__chev" aria-hidden="true">
              {collapsed.addLang ? <FiChevronRight size={18}/> : <FiChevronDown size={18}/>}
            </span>
                    </button>

                    {!collapsed.addLang && (
                        <div className="admin-page__card-body">
                            <div className="admin-page__grid-2">
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
                                <div className="admin-page__suggest">
                                    <div className="admin-page__suggest-title">Возможные варианты:</div>
                                    <div className="admin-page__suggest-list">
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

                            <div className="admin-page__actions">
                                <button className="button" onClick={addLanguage}>
                                    Добавить
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}