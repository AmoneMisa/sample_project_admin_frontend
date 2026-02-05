import {useEffect, useMemo, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import Toggle from "../controls/Toggle";
import MultilangInput from "../controls/MultilangInput";
import apiFetch from "../../utils/apiFetch";
import {useToast} from "../layout/ToastContext";
import {useTranslations} from "../../hooks/useTranslations";
import {FiArrowDown, FiArrowUp, FiChevronDown, FiChevronRight, FiPlus, FiTrash} from "react-icons/fi";
import {v4 as uuid} from "uuid";
import LabeledNumberInput from "../controls/LabeledNumberInput";

export default function OfferCardDialog({mode = "create", initial = null, onClose}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {showToast} = useToast();

    const isEdit = mode === "edit";

    const {
        languages,
        loadLanguages,
        translationMaps,
        loadAllTranslations,
        createKeysBatch,
        updateKeysBatch,
    } = useTranslations();

    const languageCodes = useMemo(() => (languages || []).map((l) => l.code), [languages]);

    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState(() => {
        if (initial) return structuredClone(initial);

        return {
            id: null,
            name: "",
            description: "",
            monthly: "",
            yearly: "",
            features: [],
            highlight: false,
            order: 0,
            isVisible: true,
        };
    });

    const [nameTranslations, setNameTranslations] = useState({});
    const [descriptionTranslations, setDescriptionTranslations] = useState({});
    const [featureTranslations, setFeatureTranslations] = useState({});
    const [errors, setErrors] = useState({});
    const [collapsedFeatures, setCollapsedFeatures] = useState({});

    const updateField = (key, value) => {
        setForm((prev) => ({...prev, [key]: value}));
        setErrors((prev) => ({...prev, [key]: ""}));
    };

    const updateFeature = (featureId, patch) => {
        setForm((prev) => {
            const next = structuredClone(prev);
            const idx = next.features.findIndex((x) => x.id === featureId);
            if (idx === -1) return prev;
            next.features[idx] = {...next.features[idx], ...patch};
            next.features = next.features.map((x, i) => ({...x, order: i}));
            return next;
        });
    };

    const toggleFeatureCollapse = (featureId) => {
        setCollapsedFeatures((prev) => ({...prev, [featureId]: !prev[featureId]}));
    };

    const addFeature = () => {
        const featureId = uuid();

        setForm(prev => {
            const next = structuredClone(prev);
            next.features.push({
                id: featureId,
                order: next.features.length,
                isVisible: true,
            });
            return next;
        });

        setCollapsedFeatures(prev => ({...prev, [featureId]: false}));

        setFeatureTranslations(prev => {
            const empty = Object.fromEntries(languageCodes.map(c => [c, ""]));
            return {...prev, [featureId]: empty};
        });
    };

    const removeFeature = (featureId) => {
        setForm((prev) => {
            const next = structuredClone(prev);
            next.features = next.features.filter((x) => x.id !== featureId);
            next.features = next.features.map((x, i) => ({...x, order: i}));
            return next;
        });

        setFeatureTranslations((prev) => {
            const next = {...prev};
            delete next[featureId];
            return next;
        });

        setCollapsedFeatures((prev) => {
            const next = {...prev};
            delete next[featureId];
            return next;
        });
    };

    const moveFeature = (featureId, dir) => {
        setForm((prev) => {
            const next = structuredClone(prev);
            const idx = next.features.findIndex((x) => x.id === featureId);
            if (idx === -1) return prev;

            const to = dir === "up" ? idx - 1 : idx + 1;
            if (to < 0 || to >= next.features.length) return prev;

            const tmp = next.features[idx];
            next.features[idx] = next.features[to];
            next.features[to] = tmp;

            next.features = next.features.map((x, i) => ({...x, order: i}));
            return next;
        });
    };

    const getPreviewTextByKey = (key) => {
        const map = translationMaps?.[key] || {};
        for (const lang of languageCodes) {
            const v = (map?.[lang] ?? "").toString().trim();
            if (v) return v;
        }
        for (const k of Object.keys(map)) {
            const v = (map?.[k] ?? "").toString().trim();
            if (v) return v;
        }
        return "Нет текста";
    };

    useEffect(() => {
        (async () => {
            await loadLanguages();
            await loadAllTranslations();

            if (isEdit && initial?.id) {
                const nameKey = initial.labelKey;
                const descKey = initial.descriptionKey;

                if (nameKey) setNameTranslations({...(translationMaps[nameKey] || {})});
                if (descKey) setDescriptionTranslations({...(translationMaps[descKey] || {})});

                const nextFeatureTranslations = {};
                for (const f of initial.features || []) {
                    nextFeatureTranslations[f.id] = {...(translationMaps[f.labelKey] || {})};
                }
                setFeatureTranslations(nextFeatureTranslations);
                const collapsed = {};
                for (const f of initial.features || []) collapsed[f.id] = true;
                setCollapsedFeatures(collapsed);
            } else {
                const empty = Object.fromEntries((languages || []).map((l) => [l.code, ""]));
                setNameTranslations(empty);
                setDescriptionTranslations(empty);
            }

            setLoading(false);
        })();
    }, [translationMaps]);

    const validate = () => {
        const e = {};

        const validatePrice = (value) => {
            if (!value) return "Обязательное поле";

            if (value < 0.01) return "Минимум 0.01";

            return null;
        };

        if (!form.name.trim()) e.name = "Обязательное поле";
        if (!form.description.trim()) e.description = "Обязательное поле";

        const monthlyError = validatePrice(form.monthly);
        if (monthlyError) e.monthly = monthlyError;

        const yearlyError = validatePrice(form.yearly);
        if (yearlyError) e.yearly = yearlyError;

        if (!form.features || !form.features.length) {
            e.features = "Добавьте хотя бы одну фичу";
        }

        const featureErrors = {};
        for (const f of form.features || []) {
            const map = featureTranslations[f.id] || {};
            for (const code of languageCodes) {
                if (!map?.[code]?.trim()) {
                    if (!featureErrors[f.id]) featureErrors[f.id] = {};
                    featureErrors[f.id][code] = "Обязательное поле";
                }
            }
        }

        if (Object.keys(featureErrors).length) {
            e.featureTranslations = featureErrors;
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const saveCard = async () => {
        const payload = {
            name: form.name.trim(),
            description: form.description.trim(),
            monthly: form.monthly,
            yearly: form.yearly,
            highlight: !!form.highlight,
            order: Number(form.order) || 0,
            isVisible: !!form.isVisible,
            features: (form.features || []).map((f, i) => ({
                id: f.id,
                labelKey: f.labelKey,
                order: i,
                isVisible: !!f.isVisible,
            })),
        };

        if (isEdit) {
            await apiFetch(`${API_URL}/offer-cards/${initial.id}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            });

            return initial.id;
        }

        const card = await apiFetch(`${API_URL}/offer-cards`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload),
        });

        return card.id;
    };

    const save = async () => {
        if (!validate()) return;

        let id;
        try {
            id = await saveCard();
        } catch (err) {
            showToast("Ошибка при сохранении карточки");
            console.error(err);
            return;
        }

        if (!id) {
            console.error("Card ID is missing");
            return;
        }

        const finalFeatures = form.features.map((f, idx) => ({
            ...f,
            labelKey: `offerCard.${id}.feature.${f.id}.title`,
            order: idx,
        }));

        const translationsPayload = finalFeatures.map(f => ({
            key: f.labelKey,
            values: featureTranslations[f.id],
        }));

        if (isEdit) {
            await updateKeysBatch(
                translationsPayload.flatMap(item =>
                    Object.entries(item.values).map(([lang, value]) => ({
                        key: item.key,
                        lang,
                        value,
                    }))
                )
            );
        } else {
            await createKeysBatch(translationsPayload);
        }

        try {
            await apiFetch(`${API_URL}/offer-cards/${id}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    features: finalFeatures.map(f => ({
                        id: f.id,
                        labelKey: f.labelKey,
                        order: f.order,
                        isVisible: !!f.isVisible,
                    })),
                }),
            });
        } catch (err) {
            showToast("Ошибка при обновлении фичей");
            console.error(err);
            return;
        }

        showToast(isEdit ? "Карточка обновлена" : "Карточка создана");
        onClose();
    };

    if (loading) {
        return (
            <Modal open={true} onClose={onClose} width={860}>
                <div style={{padding: 20}}>Загрузка…</div>
            </Modal>
        );
    }

    return (
        <Modal open={true} onClose={onClose} width={860}>
            <h2 className="modal__header gradient-text">
                {isEdit ? "Редактировать Offer Card" : "Создать Offer Card"}
            </h2>
            <div className="page__row page__row_wrap" style={{alignItems: "center"}}>
                <div style={{minWidth: 220}}>
                    <Toggle
                        label="Отображать"
                        checked={!!form.isVisible}
                        onChange={(e) => updateField("isVisible", e.target.checked)}
                    />
                </div>

                <div style={{minWidth: 220}}>
                    <Toggle
                        label="Highlight"
                        checked={!!form.highlight}
                        onChange={(e) => updateField("highlight", e.target.checked)}
                    />
                </div>
            </div>

            <div className="page__row page__row_wrap" style={{alignItems: "flex-end"}}>
                <div style={{flex: 1, minWidth: 260}}>
                    <LabeledInput
                        label="Название"
                        placeholder="Например: Pro / Basic / Enterprise"
                        value={form.name}
                        onChange={(v) => updateField("name", v)}
                        error={errors.name}
                    />
                </div>

                <div style={{flex: 1, minWidth: 260}}>
                    <LabeledInput
                        label="Описание"
                        placeholder="Например: Лучший выбор для команды"
                        value={form.description}
                        onChange={(v) => updateField("description", v)}
                        error={errors.description}
                    />
                </div>
            </div>

            <div className="page__row page__row_wrap" style={{alignItems: "flex-end"}}>
                <div style={{flex: 1, minWidth: 260}}>
                    <LabeledNumberInput
                        label="Ежемесячная стоимость"
                        placeholder="9"
                        value={form.monthly}
                        onChange={(v) => updateField("monthly", v)}
                        error={errors.monthly}
                        min={0.01}
                    />
                </div>

                <div style={{flex: 1, minWidth: 260}}>
                    <LabeledNumberInput
                        min={0.01}
                        label="Годовая стоимость"
                        placeholder="90"
                        value={form.yearly}
                        onChange={(v) => updateField("yearly", v)}
                        error={errors.yearly}
                    />
                </div>
            </div>
            <div className="page__row page__row_wrap menu-modal__section" style={{marginTop: 16}}>
                <div className="menu-modal__section-header">
                    <div className="menu-modal__section-title" style={{marginBottom: "8px"}}>Преимущества</div>
                    <button type="button" className="button button_secondary" onClick={addFeature}>
                        <FiPlus style={{marginRight: 8}} size={16}/>
                        Добавить
                    </button>
                </div>

                {!!errors.features && <div className="field-holder__error">{errors.features}</div>}

                <div className="menu-modal__submenu" style={{width: "100%"}}>
                    {(form.features || []).map((f, idx) => {
                        const collapsed = collapsedFeatures[f.id] === true;
                        const preview = getPreviewTextByKey(f.labelKey);
                        const perFeatureErrors = errors?.featureTranslations?.[f.id] || {};
                        return (
                            <div key={f.id} className="menu-modal__sub-item menu-modal__sub-item_col">
                                <div className="menu-modal__sub-item-row menu-modal__sub-item-row_between">
                                    <div className="menu-modal__sub-item-row_grow">
                                        {collapsed ? (
                                            <div className="menu-modal__collapsed-preview">{preview}</div>
                                        ) : (
                                            <div style={{marginTop: 8}}>
                                                <MultilangInput
                                                    label=""
                                                    placeholder="Например: Доступ к API"
                                                    languages={languageCodes}
                                                    valueMap={
                                                        featureTranslations[f.id] ||
                                                        Object.fromEntries(languageCodes.map((c) => [c, ""]))
                                                    }
                                                    errors={perFeatureErrors}
                                                    onChange={(nextMap) => {
                                                        setFeatureTranslations((prev) => ({...prev, [f.id]: nextMap}));
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="menu-modal__sub-item-row"
                                         style={{width: "auto", alignSelf: "start"}}>
                                        <button
                                            type="button"
                                            className="button button_icon"
                                            title={collapsed ? "Развернуть фичу" : "Свернуть фичу"}
                                            onClick={() => toggleFeatureCollapse(f.id)}
                                        >
                                            {collapsed ? <FiChevronRight size={16}/> : <FiChevronDown size={16}/>}
                                        </button>
                                        <Toggle
                                            title="Отображать фичу"
                                            checked={f.isVisible !== false}
                                            onChange={(e) => updateFeature(f.id, {isVisible: e.target.checked})}
                                        />

                                        <button
                                            type="button"
                                            className="button button_icon"
                                            title="Поднять выше"
                                            disabled={idx === 0}
                                            onClick={() => moveFeature(f.id, "up")}
                                        >
                                            <FiArrowUp size={16}/>
                                        </button>

                                        <button
                                            type="button"
                                            className="button button_icon"
                                            title="Опустить ниже"
                                            disabled={idx === (form.features.length - 1)}
                                            onClick={() => moveFeature(f.id, "down")}
                                        >
                                            <FiArrowDown size={16}/>
                                        </button>

                                        <button
                                            type="button"
                                            className="button button_icon button_reject"
                                            title="Удалить фичу"
                                            onClick={() => removeFeature(f.id)}
                                        >
                                            <FiTrash size={16}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="modal__actions">
                <button className="button" onClick={save}>
                    Сохранить
                </button>
                <button className="button button_border" onClick={onClose}>
                    Отмена
                </button>
            </div>
        </Modal>
    );
}
