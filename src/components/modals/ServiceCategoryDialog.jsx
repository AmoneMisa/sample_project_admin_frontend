import {useEffect, useState} from "react";
import Modal from "./Modal";
import {v4 as uuid} from "uuid";
import {useToast} from "../layout/ToastContext";
import MultilangInput from "../controls/MultilangInput";
import Toggle from "../controls/Toggle";
import LabeledInput from "../controls/LabeledInput";
import {useTranslations} from "../../hooks/useTranslations";
import apiFetch from "../../utils/apiFetch";

export default function ServiceCategoryDialog({initial, mode, onClose}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {showToast} = useToast();

    const {
        languages,
        loadLanguages,
        translationMaps,
        loadAllTranslations,
        createKeysBatch,
        updateKeysBatch
    } = useTranslations();

    const isEdit = mode === "edit";

    const [form, setForm] = useState(() => {
        if (initial) return structuredClone(initial);

        const id = uuid();
        return {
            id,
            order: 0,
            isVisible: true,
            titleKey: `serviceCategory.${id}.title`,
            descriptionKey: `serviceCategory.${id}.description`
        };
    });

    const [titleTranslations, setTitleTranslations] = useState({});
    const [descriptionTranslations, setDescriptionTranslations] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);

    const updateField = (key, value) => setForm(prev => ({...prev, [key]: value}));

    useEffect(() => {
        (async () => {
            await loadLanguages();
            await loadAllTranslations();

            if (isEdit) {
                const titleMap = translationMaps[form.titleKey] || {};
                const descMap = translationMaps[form.descriptionKey] || {};
                setTitleTranslations({...titleMap});
                setDescriptionTranslations({...descMap});
            } else {
                const empty = Object.fromEntries(languages.map(l => [l.code, ""]));
                setTitleTranslations(empty);
                setDescriptionTranslations(empty);
            }

            setLoading(false);
        })();
        // важно: зависимость как и у вас — через translationMaps
    }, [translationMaps]);

    function validate() {
        const e = {};

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
    }

    async function saveCategory() {
        if (isEdit) {
            await apiFetch(`${API_URL}/service-categories/${form.id}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(form)
            });
            return form.id;
        }

        const created = await apiFetch(`${API_URL}/service-categories`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(form)
        });

        return created.id;
    }

    async function save() {
        if (!validate()) return;

        const id = await saveCategory();

        const finalTitleKey = `serviceCategory.${id}.title`;
        const finalDescriptionKey = `serviceCategory.${id}.description`;

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

        if (isEdit) {
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

        await apiFetch(`${API_URL}/service-categories/${id}`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                titleKey: finalTitleKey,
                descriptionKey: finalDescriptionKey
            })
        });

        showToast("Категория сохранена");
        onClose();
    }

    if (loading) return null;

    return (
        <Modal open={true} onClose={onClose}>
            <h2 className="modal__header gradient-text">
                {isEdit ? "Редактировать категорию" : "Создать категорию"}
            </h2>

            <Toggle
                label="Видимость"
                checked={form.isVisible}
                onChange={(v) => updateField("isVisible", v)}
            />

            <MultilangInput
                placeholder={"Название"}
                label="Название"
                languages={languages.map(l => l.code)}
                valueMap={titleTranslations}
                errors={errors.title}
                onChange={setTitleTranslations}
            />

            <MultilangInput
                label="Описание"
                placeholder={"Описание"}
                languages={languages.map(l => l.code)}
                valueMap={descriptionTranslations}
                errors={errors.description}
                onChange={setDescriptionTranslations}
                textarea
            />

            <LabeledInput
                label="Порядок"
                type="number"
                value={form.order}
                onChange={(v) => updateField("order", Number(v))}
            />

            <div className="modal__actions">
                <button className="button" onClick={save}>Сохранить</button>
                <button className="button button_border" onClick={onClose}>Отмена</button>
            </div>
        </Modal>
    );
}
