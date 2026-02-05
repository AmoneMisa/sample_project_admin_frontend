import {useEffect, useState} from "react";
import Modal from "./Modal";
import {v4 as uuid} from "uuid";
import {useToast} from "../layout/ToastContext";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";
import {useTranslations} from "../../hooks/useTranslations";
import apiFetch from "../../utils/apiFetch";

export default function FeatureCardDialog({initial, mode, onClose}) {
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

    const [form, setForm] = useState(() => {
        if (initial) return structuredClone(initial);

        const id = uuid();
        return {
            id,
            image: "",
            titleKey: `featureCard.${id}.title`,
            descriptionKey: `featureCard.${id}.description`,
            isVisible: true
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

            if (mode === "edit") {
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

        if (!form.image.trim()) e.image = "Обязательное поле";

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

    async function saveCard() {
        if (mode === "edit") {
            await apiFetch(`${API_URL}/feature-cards/${form.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form)
            });

            return form.id;
        }

        const card = await apiFetch(`${API_URL}/feature-cards`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(form)
        });

        return card.id;
    }

    async function save() {
        if (!validate()) return;

        const id = await saveCard();

        const finalTitleKey = `featureCard.${id}.title`;
        const finalDescriptionKey = `featureCard.${id}.description`;

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

        await apiFetch(`${API_URL}/feature-cards/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                titleKey: finalTitleKey,
                descriptionKey: finalDescriptionKey
            })
        });

        showToast("Карточка сохранена");
        onClose();
    }

    return (
        <Modal open={true} onClose={onClose}>
            <h2 className="modal__header gradient-text">
                {mode === "edit" ? "Редактировать карточку" : "Создать карточку"}
            </h2>
            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <LabeledInput
                        label="URL изображения"
                        placeholder="https://... (png/jpg/svg/webp)"
                        value={form.image}
                        error={errors.image}
                        onChange={(v) => updateField("image", v)}
                    />
                    {form.image?.trim() && (
                        <div className="menu-modal__preview menu-modal__preview_image">
                            <img
                                src={form.image}
                                alt="Preview"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    const parent = e.currentTarget.parentElement;
                                    if (parent && !parent.querySelector(".menu-modal__preview-fallback")) {
                                        const div = document.createElement("div");
                                        div.className = "menu-modal__preview-fallback";
                                        div.textContent = "Не удалось загрузить изображение";
                                        parent.appendChild(div);
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
            <MultilangInput
                label="Заголовок"
                placeholder="Например: Быстрая доставка"
                languages={languages.map(l => l.code)}
                valueMap={titleTranslations}
                errors={errors.title}
                onChange={setTitleTranslations}
            />

            <MultilangInput
                label="Описание"
                placeholder="Коротко опишите преимущество (1–2 строки)"
                languages={languages.map(l => l.code)}
                valueMap={descriptionTranslations}
                errors={errors.description}
                onChange={setDescriptionTranslations}
            />

            <div className="modal__actions">
                <button className="button" onClick={save}>Сохранить</button>
                <button className="button button_border" onClick={onClose}>Отмена</button>
            </div>
        </Modal>
    );
}
