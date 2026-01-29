import {useState, useEffect} from "react";
import {useAuditLog} from "../hooks/useAuditLog";
import {useTranslations} from "../hooks/useTranslations";
import PhoneInput from "react-phone-number-input";
import LabeledInput from "../components/controls/LabeledInput";
import Checkbox from "../components/controls/Checkbox";
import MultilangInput from "../components/controls/MultilangInput";
import {FiSave, FiTrash} from "react-icons/fi";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";

export default function ContactsPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();
    const [contacts, setContacts] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const FIXED_SOCIALS = ["facebook", "instagram", "telegram", "whatsapp", "linkedin", "youtube", "pinterest", "github", "headhunter"];
    const {translations, setTranslations, meta, setMeta, pushSnapshot, markDeleted} = useAuditLog();
    const {languages, loadAllTranslations, saveValue, deleteKeys} = useTranslations({
        translations,
        setTranslations,
        meta,
        setMeta,
        pushSnapshot,
        markDeleted
    });

    function createContact(type) {
        const id = `${type}-${Date.now()}`;
        return {id, type, value: "", isVisible: true, labelKey: `contacts.${type}.${id}.label`};
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
                labelKey: `contacts.social.${s}.label`
            });
        });
        defaults.push({
            id: "copyright",
            type: "copyright",
            value: "",
            isVisible: true,
            labelKey: "contacts.copyright.label"
        });
        return defaults;
    }

    async function loadContacts() {
        const res = await fetch(`${API_URL}/contacts?all=true`, {headers: {Authorization: `Bearer ${accessToken}`}});
        return await res.json();
    }

    useEffect(() => {
        if (!accessToken) return;

        (async () => {
            setLoading(true);

            await loadAllTranslations();

            let loaded = await loadContacts();
            if (loaded.length === 0) loaded = createDefaultContacts();

            setContacts(loaded);

            const next = {};
            for (const c of loaded) {
                next[c.id] = {
                    label: Object.fromEntries(languages.map(l => [l.code, ""])),
                    value: Object.fromEntries(languages.map(l => [l.code, ""]))
                };
            }

            setTranslations(prev => ({...next, ...prev}));
            setLoading(false);
        })();
    }, [accessToken, loadAllTranslations, languages, setTranslations]);

    function addContact(type) {
        const newC = createContact(type);
        setContacts(prev => [...prev, newC]);
        const empty = {
            label: Object.fromEntries(languages.map(l => [l.code, ""])),
            value: Object.fromEntries(languages.map(l => [l.code, ""]))
        };
        setTranslations(prev => ({...prev, [newC.id]: empty}));
    }

    async function saveContact(contact) {
        const isTemp = contact.id.startsWith("phone-") || contact.id.startsWith("email-") || contact.id.startsWith("address-");
        const method = isTemp ? "POST" : "PATCH";
        const url = method === "POST" ? `${API_URL}/contacts` : `${API_URL}/contacts/${contact.id}`;
        const res = await fetch(url, {
            method,
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
            body: JSON.stringify(contact)
        });
        const data = await res.json();
        if (isTemp && data.id) {
            setContacts(prev => prev.map(c => (c.id === contact.id ? {...data} : c)));
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
        const t = translations[contact.id];
        for (const [lang, value] of Object.entries(t.label)) {
            await saveValue(contact.labelKey, lang, value);
        }
        for (const [lang, value] of Object.entries(t.value)) {
            await saveValue(`contacts.${contact.id}.value`, lang, value);
        }
        await saveContact(contact);
        showToast("Контакт сохранён");
    }

    function requestDelete(contact) {
        deleteKeys([contact.labelKey, `contacts.${contact.id}.value`]);
        setContacts(prev => prev.filter(c => c.id !== contact.id));
        showToast("Контакт удалён");
    }

    const grouped = {
        phone: contacts.filter(c => c.type === "phone"),
        email: contacts.filter(c => c.type === "email"),
        address: contacts.filter(c => c.type === "address"),
        social: contacts.filter(c => c.type.startsWith("social.")),
        other: contacts.filter(c => !["phone", "email", "address"].includes(c.type) && !c.type.startsWith("social."))
    };
    if (loading) return null;

    return (
        <div className="page" style={{padding: 24}}><h1>Контакты</h1>
            <div style={{display: "flex", gap: 8, marginBottom: 24}}>
                <button className="button" onClick={() => addContact("phone")}>Добавить телефон</button>
                <button className="button" onClick={() => addContact("email")}>Добавить email</button>
                <button className="button" onClick={() => addContact("address")}>Добавить адрес</button>
            </div>
            {Object.entries(grouped).map(([groupName, list]) => (
                    <div key={groupName} style={{marginBottom: 32}}>
                        <h2
                            style={{marginBottom: 16}}> {groupName === "phone" && "Телефоны"}
                            {groupName === "email" && "Email"}
                            {groupName === "address" && "Адреса"}
                            {groupName === "social" && "Соцсети"}
                            {groupName === "other" && "Прочее"}
                        </h2>
                        <div style={{display: "flex", flexWrap: "wrap", gap: 16}}> {list.map(contact => {
                                const t = translations[contact.id] || {label: {}, value: {}};
                                return (<div key={contact.id} style={{
                                        flex: "1 1 calc(33.333% - 16px)",
                                        minWidth: 280,
                                        border: "1px solid #ddd",
                                        borderRadius: 8,
                                        padding: 16
                                    }}> {contact.type === "phone" ? (
                                        <> <PhoneInput international
                                                       withCountryCallingCode value={contact.value}
                                                       onChange={v => {
                                                           contact.value = v || "";
                                                           setContacts([...contacts]);
                                                       }}/> {errors[contact.id]?.value && (
                                            <div className="field-holder__error"> {errors[contact.id].value} </div>)} </>) : (
                                        <LabeledInput label="Значение" value={contact.value} error={errors[contact.id]?.value}
                                                      onChange={v => {
                                                          contact.value = v;
                                                          setContacts([...contacts]);
                                                      }}
                                        />
                                    )}
                                        <Checkbox label="Отображать" checked={contact.isVisible}
                                                  onChange={() => {
                                                      contact.isVisible = !contact.isVisible;
                                                      setContacts([...contacts]);
                                                  }}
                                        />
                                        <MultilangInput label="Label"
                                                        languages={languages.map(l => l.code)}
                                                        valueMap={t.label}
                                                        errors={errors[contact.id]?.translations?.label}
                                                        onChange={next => setTranslations(prev => ({
                                                                ...prev,
                                                                [contact.id]: {
                                                                    ...prev[contact.id],
                                                                    label: next
                                                                }
                                                            })
                                                        )}
                                        />
                                        <MultilangInput label="Value"
                                                        languages={languages.map(l => l.code)}
                                                        valueMap={t.value}
                                                        errors={errors[contact.id]?.translations?.value}
                                                        onChange={next => setTranslations(prev => ({
                                                                ...prev,
                                                                [contact.id]: {
                                                                    ...prev[contact.id],
                                                                    value: next
                                                                }
                                                            })
                                                        )}
                                        />
                                        <div style={{display: "flex", justifyContent: "flex-end", gap: 8}}>
                                            <button className="button button_icon" onClick={() => saveAll(contact)}>
                                                <FiSave size={16}/>
                                            </button>
                                            <button className="button button_icon" onClick={() => requestDelete(contact)}>
                                                <FiTrash size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                );
                            }
                        )}
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
