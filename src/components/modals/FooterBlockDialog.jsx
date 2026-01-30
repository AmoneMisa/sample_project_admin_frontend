import {useEffect, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import LabeledSelect from "../controls/LabeledSelect";
import MultilangInput from "../controls/MultilangInput";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";
import {v4 as uuid} from "uuid";
import {useAuditLog} from "../../hooks/useAuditLog";
import {useTranslations} from "../../hooks/useTranslations";

export default function FooterBlockDialog({initial, index, mode, onClose}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

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

    useEffect(() => {
        if (!accessToken) return;
        (async () => {
            await loadAllTranslations();
            setLoading(false);
        })();
    }, [accessToken, loadAllTranslations]);

    const updateField = (key, value) => {
        setForm(prev => ({...prev, [key]: value}));
        setErrors(prev => ({...prev, [key]: ""}));
    };

    const updateTranslation = (key, nextMap) => {
        for (const lang of languages) {
            const v = nextMap[lang.code] ?? "";
            saveValue(key, lang.code, v);
        }
    };

    const validate = () => {
        const e = {};

        if (!form.type.trim()) e.type = "Обязательное поле";
        if (form.order < 0 || form.order === "" || isNaN(form.order))
            e.order = "Введите число ≥ 0";

        const titleMap = translations[form.titleKey] || {};
        const descMap = translations[form.descriptionKey] || {};

        for (const lang of languages) {
            if (!titleMap[lang.code]?.trim()) {
                if (!e.titleTranslations) e.titleTranslations = {};
                e.titleTranslations[lang.code] = "Обязательное поле";
            }
            if (!descMap[lang.code]?.trim()) {
                if (!e.descriptionTranslations) e.descriptionTranslations = {};
                e.descriptionTranslations[lang.code] = "Обязательное поле";
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

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

    const handleSave = async () => {
        if (!validate()) return;

        const id = await saveBlock();

        const finalTitleKey = `footer.block.${id}.${form.type}.title`;
        const finalDescriptionKey = `footer.block.${id}.${form.type}.description`;

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
    };

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
                valueMap={titleMap}
                errors={errors.titleTranslations}
                onChange={next => updateTranslation(form.titleKey, next)}
            />

            <MultilangInput
                label="Описание"
                languages={languages.map(l => l.code)}
                valueMap={descMap}
                errors={errors.descriptionTranslations}
                onChange={next => updateTranslation(form.descriptionKey, next)}
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
