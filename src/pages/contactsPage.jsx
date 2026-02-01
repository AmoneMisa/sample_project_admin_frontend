import {useEffect, useMemo, useRef, useState} from "react";
import {v4 as uuid} from "uuid";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import {useTranslations} from "../hooks/useTranslations";
import LabeledInput from "../components/controls/LabeledInput";
import MultilangInput from "../components/controls/MultilangInput";
import {FiSave, FiTrash, FiChevronDown, FiChevronRight} from "react-icons/fi";
import PhoneInput from "react-phone-number-input";
import LabeledSelect from "../components/controls/LabeledSelect";
import apiFetch from "../utils/apiFetch";
import Toggle from "../components/controls/Toggle";

const LS_COLLAPSE_KEY = "contactsPage.collapsedGroups.v1";

export default function ContactsPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [contacts, setContacts] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);

    // новый элемент — сюда пишем id, затем скроллимся на него
    const [scrollToId, setScrollToId] = useState(null);

    // рефы карточек по id
    const cardRefs = useRef(new Map());

    // сворачивание блоков
    const [collapsedGroups, setCollapsedGroups] = useState(() => {
        try {
            const raw = localStorage.getItem(LS_COLLAPSE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });

    const SOCIAL_TYPES = [
        "facebook", "instagram", "telegram", "whatsapp",
        "linkedin", "youtube", "pinterest", "github", "headhunter"
    ];

    const {
        languages,
        loadLanguages,
        translationMaps,
        updateTranslation,
        loadAllTranslations,
        createKeysBatch,
        updateKeysBatch,
        deleteKeys
    } = useTranslations({});

    function makeLabelKey(type, id) {
        return `contacts.${type}.${id}.label`;
    }
    function createContact(type) {
        const id = uuid();
        return {
            id,
            type,
            value: "",
            isVisible: true,
            labelKey: makeLabelKey(type, id)
        };
    }
    function createSocialContact() {
        const id = uuid();
        return {
            id,
            type: "social",
            socialType: "instagram",
            value: "",
            isVisible: true,
            labelKey: makeLabelKey("social", id)
        };
    }
    function createFooterInfo() {
        const id = uuid();
        return {
            id,
            type: "other",
            value: "",
            isVisible: true,
            labelKey: makeLabelKey("other", id)
        };
    }

    function normalizeContact(c) {
        const fixed = {...c};
        if (!fixed.labelKey) fixed.labelKey = makeLabelKey(fixed.type, fixed.id);

        if ("label" in fixed) delete fixed.label;

        if (fixed.type === "social" && !fixed.socialType) fixed.socialType = "instagram";
        return fixed;
    }

    async function loadContacts() {
        return apiFetch(`${API_URL}/contacts?all=true`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
    }

    useEffect(() => {
        if (!accessToken) return;

        (async () => {
            setLoading(true);

            await loadAllTranslations();
            await loadLanguages();

            let loaded = await loadContacts();

            if (initialLoad) {
                if (!loaded.some(c => c.type === "phone")) loaded.push(createContact("phone"));
                if (!loaded.some(c => c.type === "email")) loaded.push(createContact("email"));
                if (!loaded.some(c => c.type === "address")) loaded.push(createContact("address"));
                if (!loaded.some(c => c.type === "other")) loaded.push(createFooterInfo());
                setInitialLoad(false);
            }

            loaded = loaded.map(normalizeContact);
            setContacts(loaded);

            const next = {};
            for (const c of loaded) {
                const key = c.labelKey;
                next[key] = translationMaps[key] || Object.fromEntries(
                    languages.map(l => [l.code, ""])
                );
            }

            for (const [key, map] of Object.entries(next)) {
                updateTranslation(key, map);
            }

            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, loadAllTranslations]);

    // сохраняем сворачивание блоков
    useEffect(() => {
        try {
            localStorage.setItem(LS_COLLAPSE_KEY, JSON.stringify(collapsedGroups));
        } catch {}
    }, [collapsedGroups]);

    // автоскролл к новому элементу
    useEffect(() => {
        if (!scrollToId) return;

        const el = cardRefs.current.get(scrollToId);
        if (!el) return;

        el.scrollIntoView({behavior: "smooth", block: "start"});
        setScrollToId(null);
    }, [scrollToId, contacts]);

    const grouped = useMemo(() => ({
        phone: contacts.filter(c => c.type === "phone"),
        email: contacts.filter(c => c.type === "email"),
        address: contacts.filter(c => c.type === "address"),
        social: contacts.filter(c => c.type === "social"),
        other: contacts.filter(c => c.type === "other")
    }), [contacts]);

    function toggleGroup(name) {
        setCollapsedGroups(prev => ({...prev, [name]: !prev[name]}));
    }

    function ensureGroupOpen(name) {
        setCollapsedGroups(prev => (prev[name] ? {...prev, [name]: false} : prev));
    }

    function addContact(type) {
        const newC =
            type === "social" ? createSocialContact() :
                type === "other" ? createFooterInfo() :
                    createContact(type);

        setContacts(prev => [...prev, newC]);

        const empty = Object.fromEntries(languages.map(l => [l.code, ""]));
        updateTranslation(newC.labelKey, empty);

        // раскрываем блок, куда добавили
        ensureGroupOpen(newC.type);

        // после рендера скроллимся
        setScrollToId(newC.id);
    }

    function validateContact(contact) {
        const errs = {};

        if (!contact.value || contact.value.trim() === "") {
            errs.value = "Поле обязательно";
        }

        const labelMap = translationMaps[contact.labelKey] || {};
        const empty = languages.some(l => !labelMap[l.code]?.trim());
        if (empty) errs.label = "Заполните все языки";

        return Object.keys(errs).length ? errs : null;
    }

    async function saveContact(contact) {
        const isNew = !contact.persisted;
        const method = isNew ? "POST" : "PATCH";
        const url = isNew ? `${API_URL}/contacts` : `${API_URL}/contacts/${contact.id}`;

        const data = await apiFetch(url, {
            method,
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(contact)
        });

        if (isNew && data.id) {
            setContacts(prev =>
                prev.map(c => (c.id === contact.id ? {...data, persisted: true} : c))
            );
        }
    }

    async function saveAll(contact) {
        const err = validateContact(contact);

        if (err) {
            setErrors(prev => ({...prev, [contact.id]: err}));
            showToast("Исправьте ошибки");
            return;
        }

        setErrors(prev => {
            const next = {...prev};
            delete next[contact.id];
            return next;
        });

        const labelKey = contact.labelKey;
        const values = translationMaps[labelKey];

        if (!contact.persisted) {
            await createKeysBatch([{key: labelKey, values}]);
        } else {
            const batch = Object.entries(values).map(([lang, value]) => ({
                key: labelKey,
                lang,
                value
            }));
            await updateKeysBatch(batch);
        }

        await saveContact(contact);
        const updated = await loadContacts();
        setContacts(updated);

        showToast("Контакт сохранён");
    }

    async function requestDelete(contact) {
        const group = grouped[contact.type];

        if (contact.type !== "social" && group.length === 1) {
            showToast("Нельзя удалить последний элемент этого блока");
            return;
        }

        await deleteKeys([contact.labelKey]);
        await apiFetch(`${API_URL}/contacts/${contact.id}`, {
            method: "DELETE",
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        setContacts(prev => prev.filter(c => c.id !== contact.id));
        showToast("Контакт удалён");
    }

    const groupTitle = (name) => {
        if (name === "phone") return "Телефоны";
        if (name === "email") return "Email";
        if (name === "address") return "Адреса";
        if (name === "social") return "Соцсети";
        if (name === "other") return "Прочее";
        return name;
    };

    if (loading) return null;

    return (
        <div className="page contacts-page">
            <div className="contacts-page__topbar">
                <h1 className="page__header">Контакты</h1>

                <div className="contacts-page__topbar-actions">
                    <button className="button" onClick={() => addContact("phone")}>Добавить телефон</button>
                    <button className="button" onClick={() => addContact("email")}>Добавить email</button>
                    <button className="button" onClick={() => addContact("address")}>Добавить адрес</button>
                    <button className="button" onClick={() => addContact("social")}>Добавить соцсеть</button>
                </div>
            </div>

            {Object.entries(grouped).map(([groupName, list]) => {
                const isCollapsed = collapsedGroups[groupName] === true;

                return (
                    <div key={groupName} className="page__block">
                        <div className="contacts-page__group-header">
                            <button
                                type="button"
                                className="contacts-page__group-toggle button button_icon"
                                onClick={() => toggleGroup(groupName)}
                                title={isCollapsed ? "Развернуть блок" : "Свернуть блок"}
                            >
                                {isCollapsed ? <FiChevronRight size={16}/> : <FiChevronDown size={16}/>}
                            </button>

                            <h2 className="contacts-page__group-title">
                                {groupTitle(groupName)}
                                <span className="contacts-page__group-count">{list.length}</span>
                            </h2>
                        </div>

                        {!isCollapsed && (
                            <div className="contacts-page__block">
                                {list.map(contact => {
                                    const labelMap = translationMaps[contact.labelKey] || {};
                                    const err = errors[contact.id] || {};

                                    return (
                                        <div
                                            key={contact.id}
                                            className="contacts-page__row"
                                            ref={(el) => {
                                                if (!el) cardRefs.current.delete(contact.id);
                                                else cardRefs.current.set(contact.id, el);
                                            }}
                                        >
                                            {contact.type !== "other" && (
                                                <div className="contacts-card__header">
                                                    <Toggle
                                                        label="Отображать"
                                                        checked={contact.isVisible}
                                                        onChange={() => {
                                                            contact.isVisible = !contact.isVisible;
                                                            setContacts([...contacts]);
                                                        }}
                                                    />

                                                    <div className="contacts-card__actions">
                                                        <button
                                                            className="button button_icon"
                                                            onClick={() => saveAll(contact)}
                                                            title="Сохранить"
                                                        >
                                                            <FiSave size={16}/>
                                                        </button>

                                                        <button
                                                            className="button button_icon"
                                                            onClick={() => requestDelete(contact)}
                                                            title="Удалить"
                                                        >
                                                            <FiTrash size={16}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {contact.type === "phone" ? (
                                                <>
                                                    <PhoneInput
                                                        international
                                                        withCountryCallingCode
                                                        value={contact.value}
                                                        className="contacts-page__field contacts-page__field_phone"
                                                        placeholder="+1 555 123 45 67"
                                                        onChange={v => {
                                                            contact.value = v || "";
                                                            setContacts([...contacts]);
                                                        }}
                                                    />
                                                    {err.value && <div className="field-holder__error">{err.value}</div>}
                                                </>
                                            ) : contact.type === "social" ? (
                                                <>
                                                    <LabeledSelect
                                                        label="Тип соцсети"
                                                        value={contact.socialType}
                                                        options={SOCIAL_TYPES.map(s => ({value: s, label: s}))}
                                                        onChange={v => {
                                                            contact.socialType = v;
                                                            setContacts([...contacts]);
                                                        }}
                                                    />

                                                    <LabeledInput
                                                        label="Ссылка"
                                                        placeholder="https://..."
                                                        value={contact.value}
                                                        error={err.value}
                                                        onChange={v => {
                                                            contact.value = v;
                                                            setContacts([...contacts]);
                                                        }}
                                                    />
                                                </>
                                            ) : (
                                                <LabeledInput
                                                    label="Значение"
                                                    placeholder={
                                                        contact.type === "email" ? "support@site.com" :
                                                            contact.type === "address" ? "Город, улица, дом" :
                                                                "Введите значение"
                                                    }
                                                    value={contact.value}
                                                    error={err.value}
                                                    onChange={v => {
                                                        contact.value = v;
                                                        setContacts([...contacts]);
                                                    }}
                                                />
                                            )}

                                            <MultilangInput
                                                label="Label"
                                                languages={languages.map(l => l.code)}
                                                valueMap={labelMap}
                                                errors={err.label}
                                                onChange={next => updateTranslation(contact.labelKey, next)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
