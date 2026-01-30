import {useEffect, useState} from "react";
import {v4 as uuid} from "uuid";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import {useTranslations} from "../hooks/useTranslations";
import LabeledInput from "../components/controls/LabeledInput";
import MultilangInput from "../components/controls/MultilangInput";
import Checkbox from "../components/controls/Checkbox";
import {FiSave, FiTrash} from "react-icons/fi";
import PhoneInput from "react-phone-number-input";
import LabeledSelect from "../components/controls/LabeledSelect";

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
            await loadLanguages();
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
        <div className="page contacts-page">
            <h1 className="page__header">Контакты</h1>

            <div className={"page__block page__block_actions"}>
                <button className="button" onClick={() => addContact("phone")}>Добавить телефон</button>
                <button className="button" onClick={() => addContact("email")}>Добавить email</button>
                <button className="button" onClick={() => addContact("address")}>Добавить адрес</button>
                <button className="button" onClick={() => addContact("social")}>Добавить соцсеть</button>
            </div>

            {Object.entries(grouped).map(([groupName, list]) => (
                <div key={groupName} className={"page__block"}>
                    <h2 style={{marginBottom: 16}}>
                        {groupName === "phone" && "Телефоны"}
                        {groupName === "email" && "Email"}
                        {groupName === "address" && "Адреса"}
                        {groupName === "social" && "Соцсети"}
                        {groupName === "other" && "Прочее"}
                    </h2>

                    <div className="contacts-page__block">
                        {list.map(contact => {
                            const labelMap = translationMaps[contact.labelKey] || {};
                            const err = errors[contact.id] || {};

                            return (
                                <div key={contact.id} className="contacts-page__row">
                                    {contact.type !== "other" && (
                                        <div style={{display: "flex", justifyContent: "space-between", gap: 8}}>
                                            <Checkbox
                                                label="Отображать"
                                                checked={contact.isVisible}
                                                onChange={() => {
                                                    contact.isVisible = !contact.isVisible;
                                                    setContacts([...contacts]);
                                                }}
                                            />
                                            <div style={{display: "flex"}}>
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
                                            {err.socialType &&
                                                <div className="field-holder__error">{err.socialType}</div>}

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
                                        valueMap={labelMap}
                                        errors={err.label}
                                        onChange={next =>
                                            updateTranslation(contact.labelKey, next)
                                        }
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
