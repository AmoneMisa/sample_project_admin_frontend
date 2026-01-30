import {useEffect, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";
import {v4 as uuid} from "uuid";
import {useTranslations} from "../../hooks/useTranslations";

export default function FooterMenuItemDialog({initial, mode, blockId, onClose}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const {
        languages,
        loadAllTranslations,
        createKeysBatch,
        updateKeysBatch
    } = useTranslations({});

    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState(() => {
        if (initial) return structuredClone(initial);

        const id = uuid();
        return {
            id,
            blockId,
            href: "",
            order: 0,
            isVisible: true,
            labelKey: `footer.menu.${id}.label`
        };
    });

    const [labelTranslations, setLabelTranslations] = useState({});

    const updateField = (key, value) => {
        setForm(prev => ({...prev, [key]: value}));
        setErrors(prev => ({...prev, [key]: ""}));
    };

    // -----------------------------
    // INITIAL LOAD
    // -----------------------------
    useEffect(() => {
        (async () => {
            await loadAllTranslations();

            if (mode === "edit") {
                const all = window.__translations;
                setLabelTranslations({...all[form.labelKey]});
            } else {
                const empty = Object.fromEntries(
                    languages.map(l => [l.code, ""])
                );
                setLabelTranslations(empty);
            }

            setLoading(false);
        })();
    }, [languages.length]);

    // -----------------------------
    // VALIDATION
    // -----------------------------
    const validate = () => {
        const e = {};

        if (!form.href.trim()) e.href = "Обязательное поле";
        if (form.order < 0 || form.order === "" || isNaN(form.order))
            e.order = "Введите число ≥ 0";

        for (const lang of languages) {
            const code = lang.code;
            if (!labelTranslations[code]?.trim()) {
                if (!e.label) e.label = {};
                e.label[code] = "Обязательное поле";
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // -----------------------------
    // SAVE ITEM
    // -----------------------------
    const saveItem = async () => {
        if (mode === "edit") {
            await fetch(`${API_URL}/footer/items/${form.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(form)
            });
            return form.id;
        }

        const res = await fetch(`${API_URL}/footer/items`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(form)
        });

        const item = await res.json();
        return item.id;
    };

    // -----------------------------
    // SAVE ALL
    // -----------------------------
    const handleSave = async () => {
        if (!validate()) return;

        const id = await saveItem();

        const finalLabelKey = `footer.menu.${id}.label`;

        const payload = [
            {
                key: finalLabelKey,
                values: Object.fromEntries(
                    languages.map(l => [l.code, labelTranslations[l.code] || ""])
                )
            }
        ];

        if (mode === "edit") {
            await updateKeysBatch(
                payload.flatMap(item =>
                    Object.entries(item.values).map(([lang, value]) => ({
                        key: item.key,
                        lang,
                        value
                    }))
                )
            );
        } else {
            await createKeysBatch(payload);
        }

        await fetch(`${API_URL}/footer/items/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                labelKey: finalLabelKey
            })
        });

        showToast("Пункт меню сохранён");
        onClose();
    };

    // -----------------------------
    // RENDER
    // -----------------------------
    if (loading) {
        return (
            <Modal open={true} onClose={onClose}>
                <h2 className="modal__header">Загрузка…</h2>
            </Modal>
        );
    }

    return (
        <Modal open={true} onClose={onClose} width={600}>
            <h2>{mode === "edit" ? "Редактировать пункт" : "Создать пункт"}</h2>

            <LabeledInput
                label="Ссылка"
                value={form.href}
                error={errors.href}
                onChange={v => updateField("href", v)}
            />

            <MultilangInput
                label="Название"
                languages={languages.map(l => l.code)}
                valueMap={labelTranslations}
                errors={errors.label}
                onChange={setLabelTranslations}
            />

            <LabeledInput
                label="Порядок"
                type="number"
                value={form.order}
                error={errors.order}
                onChange={v => updateField("order", Number(v))}
            />

            <div className="modal__actions">
                <button className="button button_accept" onClick={handleSave}>
                    Сохранить
                </button>
                <button className="button button_reject" onClick={onClose}>
                    Отменить
                </button>
            </div>
        </Modal>
    );
}
