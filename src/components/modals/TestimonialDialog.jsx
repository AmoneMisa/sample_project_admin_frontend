import {useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import Checkbox from "../controls/Checkbox";

export default function TestimonialDialog({title, initial, onSave, onClose}) {
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
        setForm(prev => ({...prev, [field]: value}));
        setErrors(prev => ({...prev, [field]: ""}));
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

    return (
        <Modal open={true} title={title} onClose={onClose} width={500}>
            <LabeledInput
                label="Имя"
                value={form.name}
                onChange={v => updateField("name", v)}
                error={errors.name}
            />

            <LabeledInput
                label="Роль"
                value={form.role}
                onChange={v => updateField("role", v)}
                error={errors.role}
            />

            <label className="field-holder">
                <span className="field-holder__label">Отзыв</span>
                <textarea
                    className={
                        "field-holder__input" +
                        (errors.quote ? " field-holder__input_error" : "")
                    }
                    style={{padding: 6, minHeight: 80}}
                    value={form.quote}
                    onChange={e => updateField("quote", e.target.value)}
                />
                {errors.quote && (
                    <div className="field-holder__error">{errors.quote}</div>
                )}
            </label>

            <LabeledInput
                label="Рейтинг"
                type="number"
                value={form.rating}
                max={5}
                min={1}
                onChange={v => updateField("rating", Number(v))}
                error={errors.rating}
            />

            <LabeledInput
                label="Аватар URL"
                value={form.avatar}
                onChange={v => updateField("avatar", v)}
                error={errors.avatar}
            />

            <LabeledInput
                label="Лого URL"
                value={form.logo}
                onChange={v => updateField("logo", v)}
                error={errors.logo}
            />

            <Checkbox
                label="Отображать"
                checked={form.isVisible}
                onChange={() => updateField("isVisible", !form.isVisible)}
            />

            <button className="button button_accept" onClick={handleSave}>
                Сохранить
            </button>
        </Modal>
    );
}
