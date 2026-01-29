import {useEffect, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";
import {useAuditLog} from "../../hooks/useAuditLog";
import {useTranslations} from "../../hooks/useTranslations";
import {FiSave, FiTrash} from "react-icons/fi";

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
            isVisible: true
        }
    );

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);

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
        saveValue
    } = useTranslations({
        translations,
        setTranslations,
        meta,
        setMeta,
        pushSnapshot,
        markDeleted
    });

    useEffect(() => {
        if (!accessToken) return;
        (async () => {
            await loadAllTranslations();
            setLoading(false);
        })();
    }, [accessToken, loadAllTranslations]);

    function updateField(key, value) {
        setForm({...form, [key]: value});
    }

    function validate() {
        const e = {};

        if (!form.href.trim()) e.href = "Обязательное поле";
        if (form.order < 0 || form.order === "" || isNaN(form.order)) e.order = "Введите число ≥ 0";

        const t = translations[form.labelKey] || {};
        const labelMap = t || {};

        languages.forEach(lang => {
            if (!labelMap[lang.code]?.trim()) {
                if (!e.labelTranslations) e.labelTranslations = {};
                e.labelTranslations[lang.code] = "Обязательное поле";
            }
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function saveItem() {
        if (mode === "edit") {
            await fetch(`${API_URL}/footer/items/${form.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(form)
            });
        } else {
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

        const t = translations[form.labelKey] || {};

        for (const lang of languages) {
            const value = t[lang.code] || "";
            await saveValue(form.labelKey, lang.code, value);
        }

        await saveItem();

        showToast("Пункт меню сохранён");
        onClose();
    }

    if (loading) {
        return (
            <Modal open={true} onClose={onClose}>
                <h2 className="modal__header">Загрузка…</h2>
            </Modal>
        );
    }

    const t = translations[form.labelKey] || {};

    return (
        <Modal open={true} onClose={onClose}>
            <h2 className="modal__header">
                {mode === "edit" ? "Редактировать пункт" : "Создать пункт"}
            </h2>

            <LabeledInput label="Ключ" value={form.labelKey} disabled />

            {languages.map(lang => (
                <LabeledInput
                    key={lang.code}
                    label={`Label (${lang.code})`}
                    value={t[lang.code] || ""}
                    error={errors.labelTranslations?.[lang.code]}
                    onChange={v =>
                        setTranslations(prev => ({
                            ...prev,
                            [form.labelKey]: {
                                ...(prev[form.labelKey] || {}),
                                [lang.code]: v
                            }
                        }))
                    }
                />
            ))}

            <LabeledInput
                label="Ссылка"
                value={form.href}
                error={errors.href}
                onChange={v => updateField("href", v)}
            />

            <LabeledInput
                label="Порядок"
                type="number"
                value={form.order}
                error={errors.order}
                onChange={v => updateField("order", Number(v))}
            />

            <div className="modal__actions">
                <button className="button button_icon" onClick={save}><FiSave size={16} /> </button>
                <button className="button button_icon" onClick={onClose}><FiTrash size={16} /></button>
            </div>
        </Modal>
    );
}
