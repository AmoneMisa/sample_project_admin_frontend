import {useEffect, useState} from "react";
import {v4 as uuid} from "uuid";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import {useAuditLog} from "../hooks/useAuditLog";
import {useTranslations} from "../hooks/useTranslations";

import Checkbox from "../components/controls/Checkbox";
import LabeledInput from "../components/controls/LabeledInput";
import MultilangInput from "../components/controls/MultilangInput";
import PhoneInput from "react-phone-number-input";
import LabeledSelect from "../components/controls/LabeledSelect";
import {FiSave, FiTrash} from "react-icons/fi";

import {validateContact} from "../utils/validators";

export default function ContactsPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [contacts, setContacts] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);

    const SOCIAL_TYPES = [
        "facebook", "instagram", "telegram", "whatsapp",
        "linkedin", "youtube", "pinterest", "github", "headhunter"
    ];

    const {
        translations,
        setTranslations,
        meta,
        setMeta,
        pushSnapshot,
        markDeleted
    } = useAuditLog();

    const {
        languages,
        loadAllTranslations,
        saveValue,
        deleteKeys
    } = useTranslations({
        translations,
        setTranslations,
        meta,
        setMeta,
        pushSnapshot,
        markDeleted
    });

    // -----------------------------
    // HELPERS
    // -----------------------------
    function createContact(type) {
        const id = uuid();
        return { id, type, value: "", isVisible: true };
    }

    function createSocialContact() {
        const id = uuid();
        return { id, type: "social", socialType: "instagram", value: "", isVisible: true };
    }

    function createFooterInfo() {
        return { id: "footer-info", type: "other", value: "", isVisible: true };
    }

    async function loadContacts() {
        const res = await fetch(`${API_URL}/contacts?all=true`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        return await res.json();
    }

    // -----------------------------
    // INITIAL LOAD
    // -----------------------------
    useEffect(() => {
        if (!accessToken) return;

        (async () => {
            setLoading(true);

            await loadAllTranslations();

            let loaded = await loadContacts();

            // Ensure required blocks exist
            if (!loaded.some(c => c.type === "phone")) {
                loaded.push(createContact("phone"));
            }
            if (!loaded.some(c => c.type === "email")) {
                loaded.push(createContact("email"));
            }
            if (!loaded.some(c => c.type === "address")) {
                loaded.push(createContact("address"));
            }
            if (!loaded.some(c => c.type === "other")) {
                loaded.push(createFooterInfo());
            }

            setContacts(loaded);

            // Create translations
            const next = {};
            for (const c of loaded) {
                next[c.id] = {
                    label: Object.fromEntries(languages.map(l => [l.code, ""]))
                };
            }

            setTranslations(prev => ({...next, ...prev}));
            setLoading(false);
        })();
    }, [accessToken, loadAllTranslations]);

    // -----------------------------
    // ADD CONTACT
    // -----------------------------
    function addContact(type) {
        const newC = type === "social" ? createSocialContact() : createContact(type);

        setContacts(prev => [...prev, newC]);

        const empty = {
            label: Object.fromEntries(languages.map(l => [l.code, ""]))
        };

        setTranslations(prev => ({...prev, [newC.id]: empty}));
    }

    // -----------------------------
    // SAVE CONTACT
    // -----------------------------
    async function saveContact(contact) {
        const isNew = !contact.persisted;
        const method = isNew ? "POST" : "PATCH";
        const url = isNew ? `${API_URL}/contacts` : `${API_URL}/contacts/${contact.id}`;

        const res = await fetch(url, {
            method,
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
            body: JSON.stringify(contact)
        });

        const data = await res.json();

        if (isNew && data.id) {
            setContacts(prev =>
                prev.map(c => (c.id === contact.id ? {...data, persisted: true} : c))
            );

            setTranslations(prev => {
                const t = prev[contact.id];
                const next = {...prev};
                delete next[contact.id];
                next[data.id] = t;
                return next;
            });
        }
    }

    async function saveAll(contact) {
        const err = validateContact(contact, translations, languages);

        if (err) {
            setErrors(prev => ({ ...prev, [contact.id]: err }));
            showToast("Исправьте ошибки");
            return;
        }

        setErrors(prev => {
            const next = {...prev};
            delete next[contact.id];
            return next;
        });

        const t = translations[contact.id];
        const labelKey = `contacts.${contact.id}.label`;

        for (const [lang, value] of Object.entries(t.label)) {
            await saveValue(labelKey, lang, value);
        }

        await saveContact(contact);
        showToast("Контакт сохранён");
    }

    // -----------------------------
    // DELETE CONTACT
    // -----------------------------
    async function requestDelete(contact) {
        const group = grouped[contact.type];

        if (contact.type !== "social" && group.length === 1) {
            showToast("Нельзя удалить последний элемент этого блока");
            return;
        }

        const labelKey = `contacts.${contact.id}.label`;

        deleteKeys([labelKey]);

        await fetch(`${API_URL}/contacts/${contact.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        setContacts(prev => prev.filter(c => c.id !== contact.id));
        showToast("Контакт удалён");
    }

    // -----------------------------
    // GROUPING
    // -----------------------------
    const grouped = {
        phone: contacts.filter(c => c.type === "phone"),
        email: contacts.filter(c => c.type === "email"),
        address: contacts.filter(c => c.type === "address"),
        social: contacts.filter(c => c.type === "social"),
        other: contacts.filter(c => c.type === "other")
    };

    if (loading) return null;

    // -----------------------------
    // RENDER
    // -----------------------------
    return (
        <div className="page" style={{padding: 24}}>
            <h1>Контакты</h1>

            <div style={{display: "flex", gap: 8, marginBottom: 24}}>
                <button className="button" onClick={() => addContact("phone")}>Добавить телефон</button>
                <button className="button" onClick={() => addContact("email")}>Добавить email</button>
                <button className="button" onClick={() => addContact("address")}>Добавить адрес</button>
                <button className="button" onClick={() => addContact("social")}>Добавить соцсеть</button>
            </div>

            {Object.entries(grouped).map(([groupName, list]) => (
                <div key={groupName} style={{marginBottom: 32}}>
                    <h2 style={{marginBottom: 16}}>
                        {groupName === "phone" && "Телефоны"}
                        {groupName === "email" && "Email"}
                        {groupName === "address" && "Адреса"}
                        {groupName === "social" && "Соцсети"}
                        {groupName === "other" && "Прочее"}
                    </h2>

                    <div className="contacts-page__block">
                        {list.map(contact => {
                            const t = translations[contact.id] || {label: {}};
                            const err = errors[contact.id] || {};

                            return (
                                <div key={contact.id} className="contacts-page__row">

                                    {contact.type !== "other" && (
                                        <Checkbox
                                            label="Отображать"
                                            checked={contact.isVisible}
                                            onChange={() => {
                                                contact.isVisible = !contact.isVisible;
                                                setContacts([...contacts]);
                                            }}
                                        />
                                    )}

                                    {contact.type === "phone" ? (
                                        <>
                                            <PhoneInput
                                                international
                                                withCountryCallingCode
                                                value={contact.value}
                                                className="contacts-page__field contacts-page__field_phone"
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
                                            {err.socialType && <div className="field-holder__error">{err.socialType}</div>}

                                            <LabeledInput
                                                label="Ссылка"
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
                                        valueMap={t.label}
                                        errors={err.label}
                                        onChange={next =>
                                            setTranslations(prev => ({
                                                ...prev,
                                                [contact.id]: {
                                                    ...prev[contact.id],
                                                    label: next
                                                }
                                            }))
                                        }
                                    />

                                    <div style={{display: "flex", justifyContent: "flex-end", gap: 8}}>
                                        <button className="button button_icon" onClick={() => saveAll(contact)}>
                                            <FiSave size={16}/>
                                        </button>

                                        <button
                                            className="button button_icon"
                                            onClick={() => requestDelete(contact)}
                                        >
                                            <FiTrash size={16}/>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
