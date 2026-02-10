import MultilangInput from "../controls/MultilangInput";
import LabeledInput from "../controls/LabeledInput";
import Modal from "../modals/Modal";
import apiFetch from "../../utils/apiFetch";
import {useEffect, useMemo, useState} from "react";
import {useTranslations} from "../../hooks/useTranslations";
import {useToast} from "../layout/ToastContext";
import {v4 as uuid} from "uuid";
import {FiChevronDown, FiChevronRight, FiPlus, FiTrash} from "react-icons/fi";
import Toggle from "../controls/Toggle";

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
        if (initial) {
            const next = structuredClone(initial);
            next.list = (next.list || []).map(x => ({
                textKey: x.textKey,
                isVisible: x.isVisible !== false
            }));
            return next;
        }

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
            list: []
        };
    });

    const [initialFeatureKeys] = useState(() =>
        mode === "edit" ? (initial?.list || []).map(x => x.textKey) : []
    );

    const [collapsedItems, setCollapsedItems] = useState(() => ({}));
    const toggleItem = (i) => setCollapsedItems(prev => ({...prev, [i]: !prev[i]}));

    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({});

    const [labelTranslations, setLabelTranslations] = useState({});
    const [titleTranslations, setTitleTranslations] = useState({});
    const [textTranslations, setTextTranslations] = useState({});
    const [buttonTranslations, setButtonTranslations] = useState({});
    const [featureTranslations, setFeatureTranslations] = useState({});

    const langCodes = useMemo(() => languages.map(l => l.code), [languages]);
    const makeEmptyMap = () => Object.fromEntries(langCodes.map(c => [c, ""]));

    const updateField = (key, value) => setForm(prev => ({...prev, [key]: value}));

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
            setFeatureTranslations({});
        }
    }, [loading, translationMaps]);

    const getPreviewText = (key) => {
        const map = translationMaps?.[key] || {};
        for (const lang of langCodes) {
            const v = (map?.[lang] ?? "").toString().trim();
            if (v) return v;
        }
        for (const k of Object.keys(map)) {
            const v = (map?.[k] ?? "").toString().trim();
            if (v) return v;
        }
        return "Нет текста";
    };

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

        for (let i = 0; i < (form.list || []).length; i++) {
            const f = form.list[i];
            const map = featureTranslations[f.textKey] || {};
            for (const code of langCodes) {
                if (!map[code]?.trim()) {
                    if (!e.features) e.features = {};
                    if (!e.features[i]) e.features[i] = {};
                    e.features[i][code] = "Обязательное поле";
                }
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    function nextFeatureIndex(list, base) {
        let max = 0;
        for (const it of list) {
            const k = it.textKey || "";
            if (!k.startsWith(base + ".")) continue;
            const tail = k.slice((base + ".").length);
            const n = Number(tail);
            if (Number.isFinite(n)) max = Math.max(max, n);
        }
        return max + 1;
    }

    function addFeature() {
        const base = `tabs.withBg.${form.id}.feature`;
        const current = form.list || [];
        const idx = nextFeatureIndex(current, base);
        const textKey = `${base}.${idx}`;

        setForm(prev => ({
            ...prev,
            list: [...(prev.list || []), {textKey, isVisible: true}]
        }));

        setCollapsedItems(prev => ({...prev, [current.length]: false}));
        setFeatureTranslations(prev => ({...prev, [textKey]: makeEmptyMap()}));
    }

    function removeFeature(i) {
        const textKey = form.list?.[i]?.textKey;
        if (!textKey) return;

        setForm(prev => {
            const next = structuredClone(prev);
            next.list.splice(i, 1);
            return next;
        });

        setFeatureTranslations(prev => {
            const next = {...prev};
            delete next[textKey];
            return next;
        });

        setCollapsedItems(prev => {
            const next = {};
            const entries = Object.entries(prev).map(([k, v]) => [Number(k), v]).sort((a, b) => a[0] - b[0]);
            let shift = false;
            for (const [idx, val] of entries) {
                if (idx === i) {
                    shift = true;
                    continue;
                }
                next[shift ? idx - 1 : idx] = val;
            }
            return next;
        });
    }

    function toggleFeatureVisible(i) {
        setForm(prev => {
            const next = structuredClone(prev);
            const cur = next.list[i]?.isVisible;
            next.list[i].isVisible = cur === false ? true : !cur;
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
            removed: oldKeys.filter(k => !newSet.has(k))
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

            <div className="menu-modal__row">
                <div className="menu-modal__row-item menu-modal__row_col">
                    {(form.list || []).map((f, i) => {
                        const itemCollapsed = collapsedItems[i] === true;
                        const preview = getPreviewText(f.textKey);

                        return (
                            <div key={f.textKey} className="menu-modal__sub-item menu-modal__sub-item_col">
                                <div className="menu-modal__sub-item-row menu-modal__sub-item-row_between">
                                    <div className="menu-modal__sub-item-row_grow">
                                        {!itemCollapsed ? (
                                            <MultilangInput
                                                placeholder={`Преимущество ${i + 1}`}
                                                languages={langCodes}
                                                valueMap={featureTranslations[f.textKey] || {}}
                                                errors={errors.features?.[i]}
                                                onChange={(nextMap) =>
                                                    setFeatureTranslations(prev => ({...prev, [f.textKey]: nextMap}))
                                                }
                                            />
                                        ) : (
                                            <div className="menu-modal__collapsed-preview">{preview}</div>
                                        )}
                                    </div>

                                    <div className="menu-modal__sub-item-row" style={{width: "auto", alignSelf: "start"}}>
                                        <button
                                            type="button"
                                            className="button button_icon"
                                            title={itemCollapsed ? "Развернуть" : "Свернуть"}
                                            onClick={() => toggleItem(i)}
                                        >
                                            {itemCollapsed ? <FiChevronRight size={16}/> : <FiChevronDown size={16}/>}
                                        </button>

                                        <Toggle
                                            title="Отображать преимущество"
                                            checked={f.isVisible !== false}
                                            onChange={() => toggleFeatureVisible(i)}
                                        />

                                        <button
                                            type="button"
                                            className="button button_icon button_reject"
                                            title="Удалить"
                                            onClick={() => removeFeature(i)}
                                        >
                                            <FiTrash size={16}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <button type="button" className="button button_secondary" onClick={addFeature}>
                        <FiPlus style={{marginRight: 8}} size={16}/>
                        Добавить преимущество
                    </button>
                </div>
            </div>

            <div className="modal__actions">
                <button className="button" onClick={save}>Сохранить</button>
                <button className="button button_border" onClick={onClose}>Отмена</button>
            </div>
        </Modal>
    );
}
