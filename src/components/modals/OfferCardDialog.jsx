import {useEffect, useMemo, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import Toggle from "../controls/Toggle";
import apiFetch from "../../utils/apiFetch";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";

const MAX_KEY_LEN = 255;

export default function OfferCardDialog({ mode = "create", initial = null, onClose }) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const isEdit = mode === "edit";

    const [form, setForm] = useState(() => ({
        key: initial?.key || "",
        name: initial?.name || "",
        description: initial?.description || "",
        monthly: initial?.monthly || "",
        yearly: initial?.yearly || "",
        features: initial?.features || "",
        highlight: !!initial?.highlight,
        order: initial?.order ?? 0,
        visible:
            typeof initial?.visible === "boolean"
                ? initial.visible
                : typeof initial?.isVisible === "boolean"
                    ? initial.isVisible
                    : true
    }));

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!initial) return;
        setForm({
            key: initial.key || "",
            name: initial.name || "",
            description: initial.description || "",
            monthly: initial.monthly || "",
            yearly: initial.yearly || "",
            features: initial.features || "",
            highlight: !!initial.highlight,
            order: initial.order ?? 0,
            visible:
                typeof initial.visible === "boolean"
                    ? initial.visible
                    : typeof initial.isVisible === "boolean"
                        ? initial.isVisible
                        : true
        });
        setErrors({});
    }, [initial]);

    const update = (k, v) => {
        setForm(prev => ({...prev, [k]: v}));
        setErrors(prev => ({...prev, [k]: ""}));
    };

    const featuresHint = useMemo(() => {
        const s = (form.features ?? "").toString().trim();
        if (!s) return "";
        const count =
            s.includes("\n")
                ? s.split("\n").filter(x => x.trim()).length
                : s.split(",").filter(x => x.trim()).length;

        return `Элементов: ${count}`;
    }, [form.features]);

    function validate() {
        const e = {};

        if (!form.key.trim()) e.key = "Обязательное поле";
        if (form.key.length > MAX_KEY_LEN) e.key = `Макс. ${MAX_KEY_LEN} символов`;

        if (!form.name.trim()) e.name = "Обязательное поле";
        if (!form.description.trim()) e.description = "Обязательное поле";
        if (!form.monthly.trim()) e.monthly = "Обязательное поле";
        if (!form.yearly.trim()) e.yearly = "Обязательное поле";
        if (!form.features.trim()) e.features = "Обязательное поле";

        if (form.order === "" || Number.isNaN(Number(form.order))) {
            e.order = "Введите число";
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function save() {
        if (!validate()) return;

        const payload = {
            ...(isEdit ? {} : { key: form.key.trim() }),
            name: form.name.trim(),
            description: form.description.trim(),
            monthly: form.monthly.trim(),
            yearly: form.yearly.trim(),
            features: form.features.trim(),
            highlight: !!form.highlight,
            order: Number(form.order) || 0,
            visible: !!form.visible
        };

        if (isEdit) {
            await apiFetch(`${API_URL}/offer-cards/${initial.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(payload)
            });
            showToast("Карточка обновлена");
        } else {
            await apiFetch(`${API_URL}/offer-cards`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            showToast("Карточка создана");
        }

        onClose();
    }

    return (
        <Modal open={true} onClose={onClose} width={760}>
            <h2 className="modal__header gradient-text">
                {isEdit ? "Редактировать Offer Card" : "Создать Offer Card"}
            </h2>

            <div className="page__row page__row_wrap" style={{alignItems: "flex-end"}}>
                <div style={{flex: 1, minWidth: 260}}>
                    <LabeledInput
                        label="Key"
                        value={form.key}
                        onChange={(v) => update("key", v)}
                        placeholder="pricing.pro / pricing.basic / offer.vip"
                        error={errors.key}
                        disabled={isEdit}
                        hint={isEdit ? "Key нельзя менять" : ""}
                    />
                </div>

                <div style={{width: 160}}>
                    <LabeledInput
                        label="Порядок"
                        type="number"
                        value={form.order}
                        onChange={(v) => update("order", v)}
                        placeholder="0"
                        error={errors.order}
                    />
                </div>

                <div style={{minWidth: 220}}>
                    <Toggle
                        label="Отображать"
                        checked={!!form.visible}
                        onChange={(e) => update("visible", e.target.checked)}
                    />
                </div>

                <div style={{minWidth: 220}}>
                    <Toggle
                        label="Highlight"
                        checked={!!form.highlight}
                        onChange={(e) => update("highlight", e.target.checked)}
                    />
                </div>
            </div>

            <div className="page__row page__row_wrap" style={{alignItems: "flex-end"}}>
                <div style={{flex: 1, minWidth: 260}}>
                    <LabeledInput
                        label="Название"
                        value={form.name}
                        onChange={(v) => update("name", v)}
                        placeholder="Pro / Basic / Enterprise"
                        error={errors.name}
                    />
                </div>

                <div style={{flex: 1, minWidth: 260}}>
                    <LabeledInput
                        label="Описание"
                        value={form.description}
                        onChange={(v) => update("description", v)}
                        placeholder="Лучший выбор для команды"
                        error={errors.description}
                    />
                </div>
            </div>

            <div className="page__row page__row_wrap" style={{alignItems: "flex-end"}}>
                <div style={{flex: 1, minWidth: 260}}>
                    <LabeledInput
                        label="Monthly"
                        value={form.monthly}
                        onChange={(v) => update("monthly", v)}
                        placeholder="$9 / мес"
                        error={errors.monthly}
                    />
                </div>

                <div style={{flex: 1, minWidth: 260}}>
                    <LabeledInput
                        label="Yearly"
                        value={form.yearly}
                        onChange={(v) => update("yearly", v)}
                        placeholder="$90 / год"
                        error={errors.yearly}
                    />
                </div>
            </div>

            <label className="field-holder" style={{marginTop: 6}}>
                <span className="field-holder__label">Features</span>
                <textarea
                    className={"field-holder__input" + (errors.features ? " field-holder__input_error" : "")}
                    value={form.features}
                    onChange={(e) => update("features", e.target.value)}
                    placeholder={"Например:\n• 10 проектов\n• Поддержка 24/7\n• Доступ к API\n\nМожно и CSV: feature1, feature2, feature3"}
                />
                {errors.features && <div className="field-holder__error">{errors.features}</div>}
                {!errors.features && featuresHint && <div className="field-holder__hint">{featuresHint}</div>}
            </label>

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
