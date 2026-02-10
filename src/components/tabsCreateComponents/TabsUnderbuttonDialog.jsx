import {useEffect, useMemo, useState} from "react";
import {v4 as uuid} from "uuid";
import {useToast} from "../layout/ToastContext";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";
import apiFetch from "../../utils/apiFetch";
import {useTranslations} from "../../hooks/useTranslations";
import Modal from "../modals/Modal";

export default function TabsUnderbuttonDialog({initial, mode, onClose}) {
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
            labelKey: `tabs2.${id}.label`,
            titleKey: `tabs2.${id}.title`,
            descriptionKey: `tabs2.${id}.description`,
            headlineKey: `tabs2.${id}.headline`,
            buttonTextKey: `tabs2.${id}.button`,
            image: "",
            order: 0,
            isVisible: true
        };
    });

    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({});

    const [labelTranslations, setLabelTranslations] = useState({});
    const [titleTranslations, setTitleTranslations] = useState({});
    const [descriptionTranslations, setDescriptionTranslations] = useState({});
    const [headlineTranslations, setHeadlineTranslations] = useState({});
    const [buttonTranslations, setButtonTranslations] = useState({});

    const langCodes = useMemo(() => languages.map(l => l.code), [languages]);

    const updateField = (key, value) => setForm(prev => ({...prev, [key]: value}));

    function makeEmptyMap() {
        return Object.fromEntries(langCodes.map(c => [c, ""]));
    }

    useEffect(() => {
        (async () => {
            await loadLanguages();
            await loadAllTranslations();
            setLoading(false);
        })();
    }, []);

    useEffect(() => {
        if (loading) return;

        if (mode === "edit") {
            setLabelTranslations({...((translationMaps[form.labelKey]) || {})});
            setTitleTranslations({...((translationMaps[form.titleKey]) || {})});
            setDescriptionTranslations({...((translationMaps[form.descriptionKey]) || {})});
            setHeadlineTranslations({...((translationMaps[form.headlineKey]) || {})});
            setButtonTranslations({...((translationMaps[form.buttonTextKey]) || {})});
        } else {
            const empty = makeEmptyMap();
            setLabelTranslations({...empty});
            setTitleTranslations({...empty});
            setDescriptionTranslations({...empty});
            setHeadlineTranslations({...empty});
            setButtonTranslations({...empty});
        }
    }, [loading, translationMaps]);

    function validate() {
        const e = {};
        if (!form.image?.trim()) e.image = "Обязательное поле";

        for (const code of langCodes) {
            if (!labelTranslations[code]?.trim()) {
                e.label = e.label || {};
                e.label[code] = "Обязательное поле";
            }
            if (!titleTranslations[code]?.trim()) {
                e.title = e.title || {};
                e.title[code] = "Обязательное поле";
            }
            if (!descriptionTranslations[code]?.trim()) {
                e.description = e.description || {};
                e.description[code] = "Обязательное поле";
            }
            if (!buttonTranslations[code]?.trim()) {
                e.button = e.button || {};
                e.button[code] = "Обязательное поле";
            }
            if (!headlineTranslations[code]?.trim()) {
                e.headline = e.headline || {};
                e.headline[code] = "Обязательное поле";
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function saveEntity() {
        if (mode === "edit") {
            await apiFetch(`${API_URL}/tabs/mass`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    type: "underbutton",
                    items: [{
                        id: form.id,
                        labelKey: form.labelKey,
                        titleKey: form.titleKey,
                        descriptionKey: form.descriptionKey,
                        headlineKey: form.headlineKey,
                        image: form.image,
                        buttonTextKey: form.buttonTextKey,
                        order: form.order,
                        isVisible: form.isVisible
                    }]
                })
            });
            return form.id;
        }

        await apiFetch(`${API_URL}/tabs`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                type: "underbutton",
                tab: form
            })
        });

        return form.id;
    }

    async function saveTranslations() {
        const payload = [
            {key: form.labelKey, values: {...labelTranslations}},
            {key: form.titleKey, values: {...titleTranslations}},
            {key: form.descriptionKey, values: {...descriptionTranslations}},
            {key: form.headlineKey, values: {...headlineTranslations}},
            {key: form.buttonTextKey, values: {...buttonTranslations}}
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
    }

    async function save() {
        if (!validate()) return;

        await saveEntity();
        await saveTranslations();

        showToast("Таб сохранён");
        onClose();
    }

    return (
        <Modal open={true} onClose={onClose}>
            <h2 className="modal__header gradient-text">
                {mode === "edit" ? "Редактировать таб (underbutton)" : "Создать таб (underbutton)"}
            </h2>

            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <LabeledInput
                        label="URL изображения"
                        placeholder="https://... или /images/..."
                        value={form.image || ""}
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
                label="Label"
                placeholder="Например: Connect"
                languages={langCodes}
                valueMap={labelTranslations}
                errors={errors.label}
                onChange={setLabelTranslations}
            />

            <MultilangInput
                label="Title"
                placeholder="Например: Подключите аккаунт"
                languages={langCodes}
                valueMap={titleTranslations}
                errors={errors.title}
                onChange={setTitleTranslations}
            />

            <MultilangInput
                label="Description"
                placeholder="Короткое описание"
                languages={langCodes}
                valueMap={descriptionTranslations}
                errors={errors.description}
                onChange={setDescriptionTranslations}
            />

            <MultilangInput
                label="Headline"
                placeholder="Например: Быстрый старт"
                languages={langCodes}
                valueMap={headlineTranslations}
                errors={errors.headline}
                onChange={setHeadlineTranslations}
            />

            <MultilangInput
                label="Button text"
                placeholder="Например: Подключить"
                languages={langCodes}
                valueMap={buttonTranslations}
                errors={errors.button}
                onChange={setButtonTranslations}
            />

            <div className="modal__actions">
                <button className="button" onClick={save}>Сохранить</button>
                <button className="button button_border" onClick={onClose}>Отмена</button>
            </div>
        </Modal>
    );
}
