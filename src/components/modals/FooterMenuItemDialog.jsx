import {useEffect, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";
import {useAuditLog} from "../../hooks/useAuditLog";
import {useTranslations} from "../../hooks/useTranslations";
import {v4 as uuid} from "uuid";

export default function FooterMenuItemDialog({initial, mode, blockId, onClose}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

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

    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState(() => {
        if (initial) return structuredClone(initial);

        const itemId = uuid();
        return {
            id: itemId,
            type: "link",
            labelKey: null, // создадим позже
            href: "",
            order: 0,
            isVisible: true
        };
    });

    useEffect(() => {
        if (!accessToken) return;
        (async () => {
            await loadAllTranslations();

            if (!form.labelKey) {
                const key = `footer.block.${blockId}.item.${form.id}.label`;
                setForm(prev => ({...prev, labelKey: key}));

                setTranslations(prev => ({
                    ...prev,
                    [key]: Object.fromEntries(languages.map(l => [l.code, ""]))
                }));
            }

            setLoading(false);
        })();
    }, [accessToken, loadAllTranslations]);

    const updateField = (key, value) => {
        setForm(prev => ({...prev, [key]: value}));
        setErrors(prev => ({...prev, [key]: ""}));
    };

    const validate = () => {
        const e = {};

        if (!form.href.trim()) e.href = "Обязательное поле";
        if (form.order < 0 || form.order === "" || isNaN(form.order))
            e.order = "Введите число ≥ 0";

        const t = translations[form.labelKey] || {};
        for (const lang of languages) {
            if (!t[lang.code]?.trim()) {
                if (!e.label) e.label = {};
                e.label[lang.code] = "Обязательное поле";
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const saveItem = async () => {
        if (mode === "edit") {
            const res = await fetch(`${API_URL}/footer/items/${form.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(form)
            });
            return (await res.json()).id;
        }

        const res = await fetch(`${API_URL}/footer/${blockId}/items`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(form)
        });

        const created = await res.json();
        return created.id;
    };

    const save = async () => {
        if (!validate()) return;

        const id = await saveItem();

        const finalKey = `footer.block.${blockId}.item.${id}.label`;
        const t = translations[form.labelKey] || {};

        for (const lang of languages) {
            await saveValue(finalKey, lang.code, t[lang.code] || "");
        }

        await fetch(`${API_URL}/footer/items/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({labelKey: finalKey})
        });

        showToast("Пункт меню сохранён");
        onClose();
    };

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

            <MultilangInput
                label="Название"
                languages={languages.map(l => l.code)}
                valueMap={t}
                errors={errors.label}
                onChange={next =>
                    setTranslations(prev => ({
                        ...prev,
                        [form.labelKey]: next
                    }))
                }
            />

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
                <button className="button button_accept" onClick={save}>
                    Сохранить
                </button>
                <button className="button button_reject" onClick={onClose}>
                    Отменить
                </button>
            </div>
        </Modal>
    );
}
