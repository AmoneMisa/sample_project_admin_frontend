import {useEffect, useState} from "react";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/ToastContext";
import LabeledInput from "../components/LabeledInput";
import Checkbox from "../components/Checkbox";

export default function ContactsPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [contacts, setContacts] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [expanded, setExpanded] = useState(null); // id контакта
    const [translations, setTranslations] = useState({}); // { contactId: { label: {...}, value: {...} } }
    const [loading, setLoading] = useState(true);

    // -----------------------------
    // LOAD LANGUAGES
    // -----------------------------
    async function loadLanguages() {
        const res = await fetch(`${API_URL}/languages`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        const data = await res.json();
        setLanguages(data);
        return data;
    }

    // -----------------------------
    // LOAD CONTACTS
    // -----------------------------
    async function loadContacts() {
        const res = await fetch(`${API_URL}/contacts?all=true`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        const data = await res.json();
        setContacts(data);
        return data;
    }

    // -----------------------------
    // LOAD TRANSLATIONS FOR CONTACT
    // -----------------------------
    async function loadContactTranslations(contact, langs) {
        const labelKey = contact.labelKey;
        const valueKey = `contacts.${contact.id}.value`;

        const loadKey = async (key) => {
            const res = await fetch(`${API_URL}/translations?key=${encodeURIComponent(key)}`, {
                headers: {Authorization: `Bearer ${accessToken}`}
            });
            const data = await res.json();

            const map = {};
            langs.forEach(lang => {
                map[lang] = data[lang] || "";
            });
            return map;
        };

        const labelTranslations = await loadKey(labelKey);
        const valueTranslations = await loadKey(valueKey);

        setTranslations(prev => ({
            ...prev,
            [contact.id]: {
                label: labelTranslations,
                value: valueTranslations
            }
        }));
    }

    // -----------------------------
    // INITIAL LOAD
    // -----------------------------
    useEffect(() => {
        (async () => {
            setLoading(true);
            const langs = await loadLanguages();
            const contacts = await loadContacts();

            for (const c of contacts) {
                await loadContactTranslations(c, langs);
            }

            setLoading(false);
        })();
    }, []);

    // -----------------------------
    // SAVE CONTACT
    // -----------------------------
    async function saveContact(contact) {
        await fetch(`${API_URL}/contacts/${contact.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(contact)
        });
    }

    // -----------------------------
    // SAVE TRANSLATIONS
    // -----------------------------
    async function saveTranslations(key, translations) {
        await fetch(`${API_URL}/translations`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({key, translations})
        });
    }

    // -----------------------------
    // SAVE ALL
    // -----------------------------
    async function saveAll(contact) {
        const t = translations[contact.id];

        await saveContact(contact);
        await saveTranslations(contact.labelKey, t.label);
        await saveTranslations(`contacts.${contact.id}.value`, t.value);

        showToast("Контакт сохранён");
    }

    if (loading) {
        return <div className="page"><h2>Загрузка…</h2></div>;
    }

    return (
        <div className="page" style={{padding: 24}}>
            <h1>Контакты</h1>

            <div className="contacts-list">
                {contacts.map(contact => (
                    <div key={contact.id} className="contact-item">
                        <div
                            className="contact-header"
                            onClick={() => setExpanded(expanded === contact.id ? null : contact.id)}
                        >
                            <strong>{contact.type}</strong>
                            <span>{contact.value}</span>
                        </div>

                        {expanded === contact.id && (
                            <div className="contact-body">
                                {/* BASIC FIELDS */}
                                <LabeledInput
                                    label="Тип"
                                    value={contact.type}
                                    onChange={(v) => {
                                        contact.type = v;
                                        setContacts([...contacts]);
                                    }}
                                />

                                <LabeledInput
                                    label="Значение"
                                    value={contact.value}
                                    onChange={(v) => {
                                        contact.value = v;
                                        setContacts([...contacts]);
                                    }}
                                />

                                <Checkbox
                                    label="Отображать"
                                    checked={contact.isVisible}
                                    onChange={() => {
                                        contact.isVisible = !contact.isVisible;
                                        setContacts([...contacts]);
                                    }}
                                />

                                {/* TABS FOR TRANSLATIONS */}
                                <div className="tabs">
                                    {languages.map(lang => (
                                        <div key={lang} className="tab">
                                            <h3>{lang.toUpperCase()}</h3>

                                            <LabeledInput
                                                label="Label"
                                                value={translations[contact.id]?.label?.[lang] || ""}
                                                onChange={(v) => {
                                                    translations[contact.id].label[lang] = v;
                                                    setTranslations({...translations});
                                                }}
                                            />

                                            <LabeledInput
                                                label="Value"
                                                value={translations[contact.id]?.value?.[lang] || ""}
                                                onChange={(v) => {
                                                    translations[contact.id].value[lang] = v;
                                                    setTranslations({...translations});
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <button
                                    className="button"
                                    onClick={() => saveAll(contact)}
                                >
                                    Сохранить
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
