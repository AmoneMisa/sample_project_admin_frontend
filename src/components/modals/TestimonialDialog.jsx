import { useState, useMemo } from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import Toggle from "../controls/Toggle";

export default function TestimonialDialog({ title, initial, onSave, onClose }) {
    const [form, setForm] = useState({
        name: initial?.name || "",
        role: initial?.role || "",
        quote: initial?.quote || "",
        rating: initial?.rating ?? 5,
        avatar: initial?.avatar || "",
        logo: initial?.logo || "",
        isVisible: initial?.isVisible ?? true,
    });

    const [errors, setErrors] = useState({});

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const isValidUrl = (str) => {
        if (!str) return true;
        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    };

    const validate = () => {
        const next = {};

        if (!form.name.trim()) next.name = "Введите имя";
        if (!form.role.trim()) next.role = "Введите роль";
        if (!form.quote.trim()) next.quote = "Введите текст отзыва";

        if (!form.rating || form.rating < 1 || form.rating > 5)
            next.rating = "Рейтинг должен быть от 1 до 5";

        if (!isValidUrl(form.avatar)) next.avatar = "Некорректный URL";
        if (!isValidUrl(form.logo)) next.logo = "Некорректный URL";

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        onSave(form);
        onClose();
    };

    const avatarOk = form.avatar && isValidUrl(form.avatar);
    const logoOk = form.logo && isValidUrl(form.logo);

    return (
        <Modal open title={title} onClose={onClose} width={560}>

            {/* Toggle */}
            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <Toggle
                        label="Отображать"
                        checked={form.isVisible}
                        onChange={() => updateField("isVisible", !form.isVisible)}
                    />
                </div>
            </div>

            {/* Имя + роль */}
            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <LabeledInput
                        label="Имя"
                        placeholder="Анна Иванова"
                        value={form.name}
                        onChange={(v) => updateField("name", v)}
                        error={errors.name}
                    />
                </div>

                <div className="menu-modal__row-item">
                    <LabeledInput
                        label="Роль"
                        placeholder="CEO / Designer"
                        value={form.role}
                        onChange={(v) => updateField("role", v)}
                        error={errors.role}
                    />
                </div>
            </div>

            {/* Отзыв */}
            <div className="menu-modal__row">
                <div className="menu-modal__row-item">

                    <label className="field-holder">
                        <span className="field-holder__label">Отзыв</span>

                        <textarea
                            className={
                                "field-holder__input" +
                                (errors.quote ? " field-holder__input_error" : "")
                            }
                            placeholder="Напишите отзыв…"
                            style={{ minHeight: 110 }}
                            value={form.quote}
                            onChange={(e) => updateField("quote", e.target.value)}
                        />

                        {errors.quote && (
                            <div className="field-holder__error">{errors.quote}</div>
                        )}
                    </label>

                </div>
            </div>

            {/* Рейтинг */}
            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <LabeledInput
                        label="Рейтинг"
                        type="number"
                        min={1}
                        max={5}
                        placeholder="1–5"
                        value={form.rating}
                        onChange={(v) => updateField("rating", Number(v))}
                        error={errors.rating}
                    />
                </div>
            </div>
            <div className="menu-modal__row">

                <div className="menu-modal__row-item">

                    <LabeledInput
                        label="Аватар URL"
                        placeholder="https://..."
                        value={form.avatar}
                        onChange={(v) => updateField("avatar", v)}
                        error={errors.avatar}
                    />

                    {avatarOk && (
                        <div className="menu-modal__preview">
                            <img src={form.avatar} alt="" />
                        </div>
                    )}

                </div>

                <div className="menu-modal__row-item">

                    <LabeledInput
                        label="Лого URL"
                        placeholder="https://..."
                        value={form.logo}
                        onChange={(v) => updateField("logo", v)}
                        error={errors.logo}
                    />

                    {logoOk && (
                        <div className="menu-modal__preview menu-modal__preview_logo">
                            <img src={form.logo} alt="" />
                        </div>
                    )}

                </div>

            </div>

            <div className="modal__actions">
                <button className="button button_accept" onClick={handleSave}>
                    Сохранить
                </button>

                <button className="button button_reject" onClick={onClose}>
                    Отмена
                </button>
            </div>

        </Modal>
    );
}
