import {useEffect, useState} from "react";
import Modal from "./Modal";
import {v4 as uuid} from "uuid";
import {useToast} from "../layout/ToastContext";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";
import Toggle from "../controls/Toggle";
import {useTranslations} from "../../hooks/useTranslations";
import apiFetch from "../../utils/apiFetch";

export default function ServiceDialog({initial, mode, onClose}) {
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
            link: "",
            image: "",
            category: "",
            order: 0,
            isVisible: true,
            titleKey: `service.${id}.title`,
            descriptionKey: `service.${id}.description`
        };
    });

    const [titleTranslations, setTitleTranslations] = useState({});
    const [descriptionTranslations, setDescriptionTranslations] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);

    const updateField = (key, value) => {
        setForm(prev => ({...prev, [key]: value}));
    };

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
                const empty = Object.fromEntries(
                    languages.map(l => [l.code, ""])
                );
                setTitleTranslations(empty);
                setDescriptionTranslations(empty);
            }

            setLoading(false);
        })();
    }, [translationMaps]);

    function validate() {
        const e = {};

        if (!form.category.trim()) e.category = "Обязательное поле";

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

    async function saveService() {
        if (isEdit) {
            await apiFetch(`${API_URL}/services/${form.id}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(form)
            });

            return form.id;
        }

        const created = await apiFetch(`${API_URL}/services`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(form)
        });

        return created.id;
    }

    async function save() {
        if (!validate()) return;

        const id = await saveService();

        const finalTitleKey = `service.${id}.title`;
        const finalDescriptionKey = `service.${id}.description`;

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

        await apiFetch(`${API_URL}/services/${id}`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                titleKey: finalTitleKey,
                descriptionKey: finalDescriptionKey
            })
        });

        showToast("Сервис сохранён");
        onClose();
    }

    if (loading) return null;

    return (
        <Modal open={true} onClose={onClose}>
            <h2 className="modal__header gradient-text">
                {isEdit ? "Редактировать сервис" : "Создать сервис"}
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
                label="Категория"
                placeholder="dev / content / automation / popular"
                value={form.category}
                error={errors.category}
                onChange={(v) => updateField("category", v)}
            />

            <LabeledInput
                label="Ссылка на сервис"
                placeholder="https://..."
                value={form.link}
                onChange={(v) => updateField("link", v)}
            />

            <LabeledInput
                label="URL изображения"
                placeholder="/img/services/layout.png"
                value={form.image}
                onChange={(v) => updateField("image", v)}
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
