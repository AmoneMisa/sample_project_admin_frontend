import MultilangInput from "../controls/MultilangInput";
import LabeledInput from "../controls/LabeledInput";
import Modal from "../modals/Modal";
import apiFetch from "../../utils/apiFetch";
import {useEffect, useMemo, useState} from "react";
import {useTranslations} from "../../hooks/useTranslations";
import {useToast} from "../layout/ToastContext";
import {v4 as uuid} from "uuid";

export default function TabsWithBackgroundDialog({initial, mode, onClose}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {showToast} = useToast();

    const {
        languages,
        loadLanguages,
        translationMaps,
        loadAllTranslations,
        createKeysBatch,
        updateKeysBatch,
        deleteKeys
    } = useTranslations();

    const [form, setForm] = useState(() => {
        if (initial) return structuredClone(initial);

        const id = uuid();
        return {
            id,
            labelKey: `tabs.withBg.${id}.label`,
            icon: "",
            titleKey: `tabs.withBg.${id}.title`,
            textKey: `tabs.withBg.${id}.text`,
            buttonTextKey: `tabs.withBg.${id}.button`,
            image: "",
            order: 0,
            isVisible: true,
            list: [
                {textKey: `tabs.withBg.${id}.feature.1`},
                {textKey: `tabs.withBg.${id}.feature.2`},
                {textKey: `tabs.withBg.${id}.feature.3`}
            ]
        };
    });

    const [initialFeatureKeys] = useState(() =>
        mode === "edit" ? (initial?.list || []).map(x => x.textKey) : []
    );

    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({});

    const [labelTranslations, setLabelTranslations] = useState({});
    const [titleTranslations, setTitleTranslations] = useState({});
    const [textTranslations, setTextTranslations] = useState({});
    const [buttonTranslations, setButtonTranslations] = useState({});
    const [featureTranslations, setFeatureTranslations] = useState({});

    const langCodes = useMemo(() => languages.map(l => l.code), [languages]);

    const updateField = (key, value) => setForm(prev => ({...prev, [key]: value}));

    const makeEmptyMap = () => Object.fromEntries(langCodes.map(c => [c, ""]));

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
            setTextTranslations({...((translationMaps[form.textKey]) || {})});
            setButtonTranslations({...((translationMaps[form.buttonTextKey]) || {})});

            const ft = {};
            for (const f of (form.list || [])) {
                ft[f.textKey] = {...((translationMaps[f.textKey]) || {})};
            }
            setFeatureTranslations(ft);
        } else {
            const empty = makeEmptyMap();
            setLabelTranslations({...empty});
            setTitleTranslations({...empty});
            setTextTranslations({...empty});
            setButtonTranslations({...empty});

            const ft = {};
            for (const f of (form.list || [])) ft[f.textKey] = {...empty};
            setFeatureTranslations(ft);
        }
    }, [loading, translationMaps]);

    function validate() {
        const e = {};

        if (!form.icon?.trim()) e.icon = "Обязательное поле";
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
            if (!textTranslations[code]?.trim()) {
                e.text = e.text || {};
                e.text[code] = "Обязательное поле";
            }
        }

        const list = form.list || [];
        if (!list.length) e.list = "Добавьте хотя бы одну фичу";

        for (const f of list) {
            const map = featureTranslations[f.textKey] || {};
            for (const code of langCodes) {
                if (!map[code]?.trim()) {
                    if (!e.features) e.features = {};
                    if (!e.features[f.textKey]) e.features[f.textKey] = {};
                    e.features[f.textKey][code] = "Обязательное поле";
                }
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    function addFeature() {
        const base = `tabs.withBg.${form.id}.feature`;
        const current = form.list || [];
        const nextIndex = current.length ? current.length + 1 : 1;
        const textKey = `${base}.${nextIndex}`;

        setForm(prev => ({...prev, list: [...(prev.list || []), {textKey}]}));
        setFeatureTranslations(prev => ({...prev, [textKey]: makeEmptyMap()}));
    }

    function removeFeature(textKey) {
        setForm(prev => ({...prev, list: (prev.list || []).filter(x => x.textKey !== textKey)}));
        setFeatureTranslations(prev => {
            const next = {...prev};
            delete next[textKey];
            return next;
        });
    }

    async function saveEntity() {
        if (mode === "edit") {
            await apiFetch(`${API_URL}/tabs`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    type: "with-background",
                    items: [{
                        id: form.id,
                        labelKey: form.labelKey,
                        icon: form.icon,
                        titleKey: form.titleKey,
                        textKey: form.textKey,
                        buttonTextKey: form.buttonTextKey,
                        image: form.image,
                        order: form.order,
                        isVisible: form.isVisible,
                        list: (form.list || []).map(f => ({textKey: f.textKey}))
                    }]
                })
            });

            return form.id;
        }

        await apiFetch(`${API_URL}/tabs`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                type: "with-background",
                tab: {
                    ...form,
                    list: (form.list || []).map(f => ({textKey: f.textKey}))
                }
            })
        });

        return form.id;
    }

    function diffKeys(oldKeys, newKeys) {
        const oldSet = new Set(oldKeys);
        const newSet = new Set(newKeys);

        return {
            added: newKeys.filter(k => !oldSet.has(k)),
            removed: oldKeys.filter(k => !newSet.has(k)),
            stayed: newKeys.filter(k => oldSet.has(k))
        };
    }

    function toKeyPayload(key, values) {
        return {
            key,
            values: Object.fromEntries(langCodes.map(c => [c, (values?.[c] || "")]))
        };
    }

    async function saveTranslations() {
        const basePayload = [
            toKeyPayload(form.labelKey, labelTranslations),
            toKeyPayload(form.titleKey, titleTranslations),
            toKeyPayload(form.textKey, textTranslations),
        ];

        const hasButtonAny = Object.values(buttonTranslations || {}).some(v => (v || "").trim());
        if (hasButtonAny) basePayload.push(toKeyPayload(form.buttonTextKey, buttonTranslations));

        const currentFeatureKeys = (form.list || []).map(x => x.textKey);

        if (mode === "edit") {
            const {added, removed} = diffKeys(initialFeatureKeys, currentFeatureKeys);

            if (removed.length) await deleteKeys(removed);

            if (added.length) {
                const addedPayload = added.map(k => toKeyPayload(k, featureTranslations[k] || {}));
                await createKeysBatch(addedPayload);
            }

            const updatePayload = [
                ...basePayload,
                ...currentFeatureKeys.map(k => toKeyPayload(k, featureTranslations[k] || {}))
            ];

            await updateKeysBatch(
                updatePayload.flatMap(item =>
                    Object.entries(item.values).map(([lang, value]) => ({
                        key: item.key,
                        lang,
                        value
                    }))
                )
            );

            return;
        }

        const createPayload = [
            ...basePayload,
            ...currentFeatureKeys.map(k => toKeyPayload(k, featureTranslations[k] || {}))
        ];

        await createKeysBatch(createPayload);
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
                {mode === "edit" ? "Редактировать таб (with-background)" : "Создать таб (with-background)"}
            </h2>

            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <LabeledInput
                        label="Icon (например: i-lucide-video)"
                        placeholder="i-lucide-video"
                        value={form.icon || ""}
                        error={errors.icon}
                        onChange={(v) => updateField("icon", v)}
                    />
                </div>

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
                placeholder="Например: Видео"
                languages={langCodes}
                valueMap={labelTranslations}
                errors={errors.label}
                onChange={setLabelTranslations}
            />

            <MultilangInput
                label="Title"
                placeholder="Например: Экспорт чата в видео"
                languages={langCodes}
                valueMap={titleTranslations}
                errors={errors.title}
                onChange={setTitleTranslations}
            />

            <MultilangInput
                label="Text"
                placeholder="Короткий текст под заголовком"
                languages={langCodes}
                valueMap={textTranslations}
                errors={errors.text}
                onChange={setTextTranslations}
            />

            <MultilangInput
                label="Button text (optional)"
                placeholder="Например: Попробовать"
                languages={langCodes}
                valueMap={buttonTranslations}
                errors={errors.button}
                onChange={setButtonTranslations}
            />

            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12}}>
                <div className="table__muted">Features</div>
                <button className="button button_border" onClick={addFeature}>+ Добавить фичу</button>
            </div>

            {(form.list || []).map((f) => (
                <div key={f.textKey} style={{marginTop: 12, borderTop: "1px solid var(--light-grey)", paddingTop: 12}}>
                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12}}>
                        <div className="table__mono" style={{fontSize: 12}}>{f.textKey}</div>
                        <button className="button button_icon button_reject" title="Удалить фичу"
                                onClick={() => removeFeature(f.textKey)}>
                            ✕
                        </button>
                    </div>

                    <MultilangInput
                        label="Feature text"
                        placeholder="Например: Автогенерация ролика"
                        languages={langCodes}
                        valueMap={featureTranslations[f.textKey] || {}}
                        errors={errors.features?.[f.textKey]}
                        onChange={(nextMap) =>
                            setFeatureTranslations(prev => ({...prev, [f.textKey]: nextMap}))
                        }
                    />
                </div>
            ))}

            <div className="modal__actions">
                <button className="button" onClick={save}>Сохранить</button>
                <button className="button button_border" onClick={onClose}>Отмена</button>
            </div>
        </Modal>
    );
}