import {useEffect, useState} from "react";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/ToastContext";
import LabeledInput from "../components/LabeledInput";
import Checkbox from "../components/Checkbox";
import MultilangInput from "../components/MultilangInput";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {isValidPhoneNumber} from "libphonenumber-js";

export default function ContactsPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [contacts, setContacts] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [translations, setTranslations] = useState({});
    const [errors, setErrors] = useState({});
    const [expanded, setExpanded] = useState(null);
    const [loading, setLoading] = useState(true);
    const [geoCountry, setGeoCountry] = useState("RO");

    const FIXED_SOCIALS = [
        "facebook",
        "instagram",
        "telegram",
        "whatsapp",
        "linkedin",
        "youtube",
    ];

    // -----------------------------
    // HELPERS
    // -----------------------------
    function createContact(type) {
        const id = `${type}-${Date.now()}`;
        return {
            id,
            type,
            value: "",
            isVisible: true,
            labelKey: `contacts.${type}.${id}.label`,
        };
    }

    function createDefaultContacts() {
        const defaults = [];

        defaults.push(createContact("phone"));
        defaults.push(createContact("email"));
        defaults.push(createContact("address"));

        FIXED_SOCIALS.forEach(s => {
            defaults.push({
                id: `social-${s}`,
                type: `social.${s}`,
                value: "",
                isVisible: true,
                labelKey: `contacts.social.${s}.label`,
            });
        });

        defaults.push({
            id: "copyright",
            type: "copyright",
            value: "",
            isVisible: true,
            labelKey: "contacts.copyright.label",
        });

        return defaults;
    }

    function isAddressValid(str) {
        return str.trim().length > 5 && /[a-zA-Zа-яА-Я]/.test(str);
    }

    function getGoogleMapsUrl(address) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            address,
        )}`;
    }

    // -----------------------------
    // LOADERS
    // -----------------------------
    async function loadLanguages() {
        const res = await fetch(`${API_URL}/languages`, {
            headers: {Authorization: `Bearer ${accessToken}`},
        });
        return await res.json();
    }

    async function loadContacts() {
        const res = await fetch(`${API_URL}/contacts?all=true`, {
            headers: {Authorization: `Bearer ${accessToken}`},
        });
        return await res.json();
    }

    async function loadContactTranslations(contact, langs) {
        const labelKey = contact.labelKey;
        const valueKey = `contacts.${contact.id}.value`;

        async function loadKey(key) {
            const res = await fetch(
                `${API_URL}/translations?key=${encodeURIComponent(key)}`,
                {
                    headers: {Authorization: `Bearer ${accessToken}`},
                },
            );
            const data = await res.json();

            const map = {};
            langs.forEach(lang => {
                map[lang] = data[lang] || "";
            });
            return map;
        }

        const labelTranslations = await loadKey(labelKey);
        const valueTranslations = await loadKey(valueKey);

        setTranslations(prev => ({
            ...prev,
            [contact.id]: {
                label: labelTranslations,
                value: valueTranslations,
            },
        }));
    }

    // -----------------------------
    // INITIAL LOAD
    // -----------------------------
    useEffect(() => {
        if (!accessToken) return;

        (async () => {
            setLoading(true);

            try {
                const geoRes = await fetch("https://ipapi.co/json/");
                const geo = await geoRes.json();
                if (geo?.country_code) setGeoCountry(geo.country_code);
            } catch(e) {
                console.error("https://ipapi.co/json/ error:", e);
            }

            const langs = await loadLanguages();
            setLanguages(langs);

            let loaded = await loadContacts();
            if (loaded.length === 0) {
                loaded = createDefaultContacts();
            }

            setContacts(loaded);

            for (const c of loaded) {
                await loadContactTranslations(c, langs);
            }

            setLoading(false);
        })();
    }, [accessToken]);

    // -----------------------------
    // ADD CONTACT
    // -----------------------------
    function addContact(type) {
        const newC = createContact(type);

        setContacts(prev => [...prev, newC]);

        setTranslations(prev => ({
            ...prev,
            [newC.id]: {
                label: Object.fromEntries(languages.map(l => [l, ""])),
                value: Object.fromEntries(languages.map(l => [l, ""])),
            },
        }));
    }

    // -----------------------------
    // SAVE CONTACT
    // -----------------------------
    async function saveContact(contact) {
        const isTemp =
            contact.id.startsWith("phone-") ||
            contact.id.startsWith("email-") ||
            contact.id.startsWith("address-");

        const method = isTemp ? "POST" : "PATCH";
        const url =
            method === "POST"
                ? `${API_URL}/contacts`
                : `${API_URL}/contacts/${contact.id}`;

        const res = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(contact),
        });

        const data = await res.json();

        if (isTemp && data.id) {
            setContacts(prev =>
                prev.map(c => (c.id === contact.id ? {...data} : c)),
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

    async function saveTranslationsForContact(contact) {
        const t = translations[contact.id];

        await fetch(`${API_URL}/translations`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                key: contact.labelKey,
                translations: t.label,
            }),
        });

        await fetch(`${API_URL}/translations`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                key: `contacts.${contact.id}.value`,
                translations: t.value,
            }),
        });
    }

    // -----------------------------
    // VALIDATION
    // -----------------------------
    function validate(contact) {
        const e = {};

        if (contact.type === "phone") {
            if (!contact.value || !isValidPhoneNumber(contact.value)) {
                e.value = "Некорректный номер телефона";
            }
        }

        if (contact.type === "email") {
            if (
                !contact.value ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.value)
            ) {
                e.value = "Некорректный email";
            }
        }

        if (contact.type === "address") {
            if (!isAddressValid(contact.value)) {
                e.value = "Некорректный адрес";
            }
        }

        const t = translations[contact.id];
        if (t) {
            const tErrors = {label: {}, value: {}};
            let hasTErrors = false;

            languages.forEach(lang => {
                if (!t.label[lang]?.trim()) {
                    tErrors.label[lang] = "Обязательное поле";
                    hasTErrors = true;
                }
                if (!t.value[lang]?.trim()) {
                    tErrors.value[lang] = "Обязательное поле";
                    hasTErrors = true;
                }
            });

            if (hasTErrors) {
                e.translations = tErrors;
            }
        }

        setErrors(prev => ({...prev, [contact.id]: e}));

        return Object.keys(e).length === 0;
    }

    async function saveAll(contact) {
        if (!validate(contact)) {
            showToast("Исправьте ошибки перед сохранением");
            return;
        }

        await saveContact(contact);
        await saveTranslationsForContact(contact);

        showToast("Контакт сохранён");
    }

    // -----------------------------
    // RENDER
    // -----------------------------
    if (loading) {
        return (
            <div className="contacts-page">
                <h2>Загрузка…</h2>
            </div>
        );
    }

    return (
        <div className="page" style={{padding: 24}}>
            <div className="page__header">
                <div className="page__header-row">
                    <h1>Контакты</h1>

                    <div style={{display: "flex", gap: 8}}>
                        <button className="button" onClick={() => addContact("phone")}>
                            Добавить телефон
                        </button>
                        <button className="button" onClick={() => addContact("email")}>
                            Добавить email
                        </button>
                        <button className="button" onClick={() => addContact("address")}>
                            Добавить адрес
                        </button>
                    </div>
                </div>
            </div>

            <div className="contacts-list">
                {contacts.map(contact => {
                    const cErrors = errors[contact.id] || {};
                    const tErrors = cErrors.translations || {label: {}, value: {}};
                    const t = translations[contact.id] || {label: {}, value: {}};
                    const isPhone = contact.type === "phone";
                    const isAddress = contact.type === "address";

                    return (
                        <div key={contact.id} className="contact-item">
                            <div
                                className="contact-header"
                                onClick={() =>
                                    setExpanded(expanded === contact.id ? null : contact.id)
                                }
                            >
                                <strong>{contact.type}</strong>
                                <span>{contact.value}</span>
                            </div>

                            {expanded === contact.id && (
                                <div className="contact-body">
                                    <div className="field">
                                        <div className="field-holder" style={{flex: 1}}>
                                            {isPhone ? (
                                                <>
                                                    <label className="field-holder__label">
                                                        Телефон
                                                    </label>
                                                    <PhoneInput
                                                        className={
                                                            "contact-item__phone" +
                                                            (cErrors.value
                                                                ? " field-holder__input_error"
                                                                : "")
                                                        }
                                                        defaultCountry={geoCountry}
                                                        international
                                                        withCountryCallingCode
                                                        value={contact.value}
                                                        onChange={v => {
                                                            contact.value = v || "";
                                                            setContacts([...contacts]);
                                                        }}
                                                    />
                                                    {cErrors.value && (
                                                        <div className="field-holder__error">
                                                            {cErrors.value}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <LabeledInput
                                                    label={
                                                        contact.type === "email"
                                                            ? "Email"
                                                            : contact.type === "address"
                                                                ? "Адрес"
                                                                : "Значение"
                                                    }
                                                    value={contact.value}
                                                    error={cErrors.value}
                                                    onChange={v => {
                                                        contact.value = v;
                                                        setContacts([...contacts]);
                                                    }}
                                                />
                                            )}
                                        </div>

                                        <Checkbox
                                            label="Отображать"
                                            checked={contact.isVisible}
                                            onChange={() => {
                                                contact.isVisible = !contact.isVisible;
                                                setContacts([...contacts]);
                                            }}
                                        />
                                    </div>

                                    {isAddress && contact.value && (
                                        <div className="field-holder">
                                            <a
                                                href={getGoogleMapsUrl(contact.value)}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Открыть в Google Maps
                                            </a>
                                        </div>
                                    )}

                                    <div className="field" style={{alignItems: "flex-start"}}>
                                        <MultilangInput
                                            label="Label"
                                            languages={languages}
                                            valueMap={t.label}
                                            errors={tErrors.label || {}}
                                            onChange={next =>
                                                setTranslations(prev => ({
                                                    ...prev,
                                                    [contact.id]: {
                                                        ...prev[contact.id],
                                                        label: next,
                                                    },
                                                }))
                                            }
                                            className="contact-item__multilang"
                                        />

                                        <MultilangInput
                                            label="Value"
                                            languages={languages}
                                            valueMap={t.value}
                                            errors={tErrors.value || {}}
                                            onChange={next =>
                                                setTranslations(prev => ({
                                                    ...prev,
                                                    [contact.id]: {
                                                        ...prev[contact.id],
                                                        value: next,
                                                    },
                                                }))
                                            }
                                            className="contact-item__multilang"
                                        />
                                    </div>

                                    <div className="field" style={{justifyContent: "flex-end"}}>
                                        <button
                                            className="button"
                                            onClick={() => saveAll(contact)}
                                        >
                                            Сохранить
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
