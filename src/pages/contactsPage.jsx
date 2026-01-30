import {useEffect, useState} from "react";
import {v4 as uuid} from "uuid";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import {useTranslations} from "../hooks/useTranslations";
import LabeledInput from "../components/controls/LabeledInput";
import MultilangInput from "../components/controls/MultilangInput";
import Checkbox from "../components/controls/Checkbox";
import {FiSave, FiTrash} from "react-icons/fi";

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
        languages,
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

    async function loadContacts() {
        const res = await fetch(`${API_URL}/contacts?all=true`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        return await res.json();
    }

    useEffect(() => {
        if (!accessToken) return;

        (async () => {
            setLoading(true);

            await loadAllTranslations();

            let loaded = await loadContacts();

            if (!loaded.some(c => c.type === "phone")) loaded.push(createContact("phone"));
            if (!loaded.some(c => c.type === "email")) loaded.push(createContact("email"));
            if (!loaded.some(c => c.type === "address")) loaded.push(createContact("address"));
            if (!loaded.some(c => c.type === "other")) loaded.push(createFooterInfo());

            loaded = loaded.map(c => ({
                ...c,
                labelKey: c.labelKey || makeLabelKey(c.type, c.id)
            }));

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
    }, [accessToken, loadAllTranslations]);

    function addContact(type) {
        const newC = type === "social" ? createSocialContact() : createContact(type);
        setContacts(prev => [...prev, newC]);

        const empty = Object.fromEntries(languages.map(l => [l.code, ""]));
        updateTranslation(newC.labelKey, empty);
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
        showToast("Контакт сохранён");
    }

    async function requestDelete(contact) {
        const group = grouped[contact.type];

        if (contact.type !== "social" && group.length === 1) {
            showToast("Нельзя удалить последний элемент этого блока");
            return;
        }

        await deleteKeys([contact.labelKey]);

        await fetch(`${API_URL}/contacts/${contact.id}`, {
            method: "DELETE",
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        setContacts(prev => prev.filter(c => c.id !== contact.id));
        showToast("Контакт удалён");
    }

    const grouped = {
        phone: contacts.filter(c => c.type === "phone"),
        email: contacts.filter(c => c.type === "email"),
        address: contacts.filter(c => c.type === "address"),
        social: contacts.filter(c => c.type === "social"),
        other: contacts.filter(c => c.type === "other")
    };

    if (loading) return null;

    return (
        <div className="contacts-page">

            {Object.entries(grouped).map(([type, list]) => (
                <div key={type} className="contacts-group">
                    <h3>{type}</h3>

                    {list.map(contact => {
                        const err = errors[contact.id] || {};
                        const labelMap = translationMaps[contact.labelKey] || {};

                        return (
                            <div key={contact.id} className="contact-item">

                                <MultilangInput
                                    label="Заголовок"
                                    languages={languages.map(l => l.code)}
                                    valueMap={labelMap}
                                    errors={err.label ? {all: err.label} : {}}
                                    onChange={(m) => updateTranslation(contact.labelKey, m)}
                                />

                                <LabeledInput
                                    label="Значение"
                                    value={contact.value}
                                    error={err.value}
                                    onChange={(v) =>
                                        setContacts(prev =>
                                            prev.map(c =>
                                                c.id === contact.id ? {...c, value: v} : c
                                            )
                                        )
                                    }
                                />

                                {contact.type === "social" && (
                                    <select
                                        value={contact.socialType}
                                        onChange={(e) =>
                                            setContacts(prev =>
                                                prev.map(c =>
                                                    c.id === contact.id
                                                        ? {...c, socialType: e.target.value}
                                                        : c
                                                )
                                            )
                                        }
                                    >
                                        {SOCIAL_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                )}

                                <Checkbox
                                    label="Отображать"
                                    checked={contact.isVisible}
                                    onChange={() =>
                                        setContacts(prev =>
                                            prev.map(c =>
                                                c.id === contact.id
                                                    ? {...c, isVisible: !c.isVisible}
                                                    : c
                                            )
                                        )
                                    }
                                />

                                <button
                                    className="button button_icon"
                                    onClick={() => saveAll(contact)}
                                >
                                    <FiSave size={16}/>
                                </button>

                                <button
                                    className="button button_icon"
                                    onClick={() => requestDelete(contact)}
                                >
                                    <FiTrash size={16}/>
                                </button>
                            </div>
                        );
                    })}

                    <button
                        className="button button_secondary"
                        onClick={() => addContact(type)}
                    >
                        Добавить
                    </button>
                </div>
            ))}

        </div>
    );
}
