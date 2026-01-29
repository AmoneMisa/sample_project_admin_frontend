import {useEffect, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";
import {v4 as uuid} from "uuid";
import {FiSave, FiTrash} from "react-icons/fi";
import {useAuditLog} from "../../hooks/useAuditLog";
import {useTranslations} from "../../hooks/useTranslations";

export default function FooterBlockDialog({initial, index, mode, onClose}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);

    const tempId = uuid();

    const [form, setForm] = useState(
        initial || {
            type: "menu",
            titleKey: `temp.footer.block.${tempId}.title`,
            descriptionKey: `temp.footer.block.${tempId}.description`,
            order: index,
            isVisible: true
        }
    );

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

        if (!form.type.trim()) e.type = "Обязательное поле";
        if (form.order < 0 || form.order === "" || isNaN(form.order)) e.order = "Введите число ≥ 0";

        const titleMap = translations[form.titleKey] || {};
        const descMap = translations[form.descriptionKey] || {};

        languages.forEach(lang => {
            if (!titleMap[lang.code]?.trim()) {
                if (!e.titleTranslations) e.titleTranslations = {};
                e.titleTranslations[lang.code] = "Обязательное поле";
            }
            if (!descMap[lang.code]?.trim()) {
                if (!e.descriptionTranslations) e.descriptionTranslations = {};
                e.descriptionTranslations[lang.code] = "Обязательное поле";
            }
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function saveBlock() {
        if (mode === "edit") {
            await fetch(`${API_URL}/footer/${form.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(form)
            });
            return form.id;
        }

        const res = await fetch(`${API_URL}/footer`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(form)
        });

        const block = await res.json();
        return block.id;
    }

    async function save() {
        if (!validate()) return;

        const id = await saveBlock();

        const finalTitleKey = `footer.block.${id}.title`;
        const finalDescriptionKey = `footer.block.${id}.description`;

        const titleMap = translations[form.titleKey] || {};
        const descMap = translations[form.descriptionKey] || {};

        for (const lang of languages) {
            await saveValue(finalTitleKey, lang.code, titleMap[lang.code] || "");
            await saveValue(finalDescriptionKey, lang.code, descMap[lang.code] || "");
        }

        await fetch(`${API_URL}/footer/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                titleKey: finalTitleKey,
                descriptionKey: finalDescriptionKey
            })
        });

        showToast("Блок сохранён");
        onClose();
    }

    if (loading) {
        return (
            <Modal open={true} onClose={onClose}>
                <h2 className="modal__header">Загрузка…</h2>
            </Modal>
        );
    }

    const titleMap = translations[form.titleKey] || {};
    const descMap = translations[form.descriptionKey] || {};

    return (
        <Modal open={true} onClose={onClose}>
            <div className="dialog__window">
                <h2>{mode === "edit" ? "Редактировать блок" : "Создать блок"}</h2>

                <LabeledInput
                    label="Тип"
                    value={form.type}
                    error={errors.type}
                    onChange={v => updateField("type", v)}
                />

                <LabeledInput label="Ключ заголовка" value={form.titleKey} disabled />

                {languages.map(lang => (
                    <LabeledInput
                        key={lang.code}
                        label={`Заголовок (${lang.code})`}
                        value={titleMap[lang.code] || ""}
                        error={errors.titleTranslations?.[lang.code]}
                        onChange={v =>
                            setTranslations(prev => ({
                                ...prev,
                                [form.titleKey]: {
                                    ...(prev[form.titleKey] || {}),
                                    [lang.code]: v
                                }
                            }))
                        }
                    />
                ))}

                <LabeledInput label="Ключ описания" value={form.descriptionKey} disabled />

                {languages.map(lang => (
                    <LabeledInput
                        key={lang.code}
                        label={`Описание (${lang.code})`}
                        value={descMap[lang.code] || ""}
                        error={errors.descriptionTranslations?.[lang.code]}
                        onChange={v =>
                            setTranslations(prev => ({
                                ...prev,
                                [form.descriptionKey]: {
                                    ...(prev[form.descriptionKey] || {}),
                                    [lang.code]: v
                                }
                            }))
                        }
                    />
                ))}

                <LabeledInput
                    label="Порядок"
                    type="number"
                    value={form.order}
                    error={errors.order}
                    onChange={v => updateField("order", Number(v))}
                />

                <div className="modal__actions">
                    <button className="button button_icon" onClick={save}>
                        <FiSave size={16} />
                    </button>
                    <button className="button button_icon" onClick={onClose}>
                        <FiTrash size={16} />
                    </button>
                </div>
            </div>
        </Modal>
    );
}
