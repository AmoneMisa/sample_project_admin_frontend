import {useEffect, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";

export default function FooterMenuItemDialog({initial, index, mode, blockId, onClose}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [form, setForm] = useState(
        initial || {
            type: "link",
            labelKey: `footer.menu.${index}.label`,
            href: "",
            order: index,
            isVisible: true,
        }
    );

    const [languages, setLanguages] = useState([]);
    const [labelTranslations, setLabelTranslations] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);

    function updateField(key, value) {
        setForm({...form, [key]: value});
    }

    async function loadLanguages() {
        const res = await fetch(`${API_URL}/languages`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        return await res.json();
    }

    async function loadTranslations(key, langs) {
        const res = await fetch(`${API_URL}/translations?key=${encodeURIComponent(key)}`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        const data = await res.json();

        const map = {};
        langs.forEach(lang => map[lang] = data[lang] || "");
        setLabelTranslations(map);
    }

    useEffect(() => {
        (async () => {
            const langs = await loadLanguages();
            setLanguages(langs);

            await loadTranslations(form.labelKey, langs);

            setLoading(false);
        })();
    }, []);

    // -----------------------------
    // VALIDATION
    // -----------------------------
    function validate() {
        const e = {};

        if (!form.href.trim()) {
            e.href = "Обязательное поле";
        }

        if (form.order < 0 || form.order === "" || isNaN(form.order)) {
            e.order = "Введите число ≥ 0";
        }

        languages.forEach(lang => {
            if (!labelTranslations[lang]?.trim()) {
                if (!e.labelTranslations) e.labelTranslations = {};
                e.labelTranslations[lang] = "Обязательное поле";
            }
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function saveTranslations() {
        await fetch(`${API_URL}/translations`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                key: form.labelKey,
                translations: labelTranslations
            })
        });
    }

    async function saveItem() {
        if (mode === "edit") {
            // PATCH /footer/items/{id}
            await fetch(`${API_URL}/footer/items/${form.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(form)
            });
        } else {
            // POST /footer/{blockId}/items
            await fetch(`${API_URL}/footer/${blockId}/items`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(form)
            });
        }
    }

    async function save() {
        if (!validate()) return;

        await saveItem();
        await saveTranslations();

        showToast("Пункт меню сохранён");
        onClose();
    }

    if (loading) {
        return (
            <Modal open={true} onClose={onClose}>
                <div className="dialog__window">
                    <h2>Загрузка…</h2>
                </div>
            </Modal>
        );
    }

    return (
        <Modal open={true} onClose={onClose}>
            <div className="dialog__window">
                <h2>{mode === "edit" ? "Редактировать пункт" : "Создать пункт"}</h2>

                <LabeledInput label="Ключ" value={form.labelKey} disabled />

                {languages.map(lang => (
                    <LabeledInput
                        key={lang}
                        label={`Label (${lang})`}
                        value={labelTranslations[lang]}
                        error={errors.labelTranslations?.[lang]}
                        onChange={(v) =>
                            setLabelTranslations({...labelTranslations, [lang]: v})
                        }
                    />
                ))}

                <LabeledInput
                    label="Ссылка"
                    value={form.href}
                    error={errors.href}
                    onChange={(v) => updateField("href", v)}
                />

                <LabeledInput
                    label="Порядок"
                    type="number"
                    value={form.order}
                    error={errors.order}
                    onChange={(v) => updateField("order", Number(v))}
                />

                <div className="dialog__actions">
                    <button className="button" onClick={save}>Сохранить</button>
                    <button className="button button_border" onClick={onClose}>Отмена</button>
                </div>
            </div>
        </Modal>
    );
}
