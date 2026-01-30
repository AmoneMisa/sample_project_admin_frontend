import {useEffect, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import LabeledSelect from "../controls/LabeledSelect";
import MultilangInput from "../controls/MultilangInput";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";
import {v4 as uuid} from "uuid";
import {useTranslations} from "../../hooks/useTranslations";

export default function FooterBlockDialog({initial, index, mode, onClose}) {
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
            type: "menu",
            titleKey: `footer.block.${id}.menu.title`,
            descriptionKey: `footer.block.${id}.menu.description`,
            order: index,
            isVisible: true
        };
    });

    const [titleTranslations, setTitleTranslations] = useState({});
    const [descriptionTranslations, setDescriptionTranslations] = useState({});

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
                const all = window.__translations; // useTranslations already loaded them globally
                setTitleTranslations({...all[form.titleKey]});
                setDescriptionTranslations({...all[form.descriptionKey]});
            } else {
                const empty = Object.fromEntries(
                    languages.map(l => [l.code, ""])
                );
                setTitleTranslations(empty);
                setDescriptionTranslations(empty);
            }

            setLoading(false);
        })();
    }, [languages.length]);

    // -----------------------------
    // VALIDATION
    // -----------------------------
    const validate = () => {
        const e = {};

        if (!form.type.trim()) e.type = "Обязательное поле";
        if (form.order < 0 || form.order === "" || isNaN(form.order))
            e.order = "Введите число ≥ 0";

        for (const lang of languages) {
            const code = lang.code;

            if (!titleTranslations[code]?.trim()) {
                if (!e.title) e.title = {};
                e.title[code] = "Обязательное поле";
            }

            if (!descriptionTranslations[code]?.trim()) {
                if (!e.description) e.description = {};
                e.description[code] = "Обязательное поле";
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // -----------------------------
    // SAVE BLOCK
    // -----------------------------
    const saveBlock = async () => {
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
    };

    // -----------------------------
    // SAVE ALL
    // -----------------------------
    const handleSave = async () => {
        if (!validate()) return;

        const id = await saveBlock();

        const finalTitleKey = `footer.block.${id}.${form.type}.title`;
        const finalDescriptionKey = `footer.block.${id}.${form.type}.description`;

        const payload = [
            {
                key: finalTitleKey,
                values: Object.fromEntries(
                    languages.map(l => [l.code, titleTranslations[l.code] || ""])
                )
            },
            {
                key: finalDescriptionKey,
                values: Object.fromEntries(
                    languages.map(l => [l.code, descriptionTranslations[l.code] || ""])
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
            <h2>{mode === "edit" ? "Редактировать блок" : "Создать блок"}</h2>

            <LabeledSelect
                label="Тип блока"
                value={form.type}
                error={errors.type}
                onChange={v => updateField("type", v)}
                options={[
                    {value: "menu", label: "Меню"},
                    {value: "newsletter", label: "Подписка"},
                    {value: "logos", label: "Логотипы"},
                    {value: "contacts", label: "Контакты"},
                    {value: "footerInfo", label: "Информация"}
                ]}
            />

            <MultilangInput
                label="Заголовок"
                languages={languages.map(l => l.code)}
                valueMap={titleTranslations}
                errors={errors.title}
                onChange={setTitleTranslations}
            />

            <MultilangInput
                label="Описание"
                languages={languages.map(l => l.code)}
                valueMap={descriptionTranslations}
                errors={errors.description}
                onChange={setDescriptionTranslations}
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
