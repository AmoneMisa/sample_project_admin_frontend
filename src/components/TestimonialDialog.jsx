import {useState} from "react";
import Modal from "./Modal";
import LabeledInput from "./LabeledInput";
import Checkbox from "./Checkbox";

export default function TestimonialDialog({title, initial, onSave, onClose}) {
    const [name, setName] = useState(initial?.name || "");
    const [role, setRole] = useState(initial?.role || "");
    const [quote, setQuote] = useState(initial?.quote || "");
    const [rating, setRating] = useState(initial?.rating || 5);
    const [avatar, setAvatar] = useState(initial?.avatar || "");
    const [logo, setLogo] = useState(initial?.logo || "");
    const [isVisible, setIsVisible] = useState(initial?.isVisible ?? true);

    const [errors, setErrors] = useState({});

    function isValidUrl(str) {
        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    }

    function validate() {
        const next = {};

        if (!name.trim()) next.name = "Введите имя";
        if (!role.trim()) next.role = "Введите роль";
        if (!quote.trim()) next.quote = "Введите текст отзыва";

        if (!rating || rating < 1 || rating > 5) {
            next.rating = "Рейтинг должен быть от 1 до 5";
        }

        if (avatar && !isValidUrl(avatar)) {
            next.avatar = "Некорректный URL";
        }

        if (logo && !isValidUrl(logo)) {
            next.logo = "Некорректный URL";
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    }

    function handleSave() {
        if (!validate()) return;

        onSave({name, role, quote, rating, avatar, logo, isVisible});
        onClose();
    }

    return (
        <Modal open={true} title={title} onClose={onClose} width={500}>
            <LabeledInput
                label="Имя"
                value={name}
                onChange={(v) => {
                    setName(v);
                    setErrors((e) => ({...e, name: ""}));
                }}
                error={errors.name}
            />

            <LabeledInput
                label="Роль"
                value={role}
                onChange={(v) => {
                    setRole(v);
                    setErrors((e) => ({...e, role: ""}));
                }}
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
                    value={quote}
                    onChange={(e) => {
                        setQuote(e.target.value);
                        setErrors((e2) => ({...e2, quote: ""}));
                    }}
                />
                {errors.quote && (
                    <div className="field-holder__error">{errors.quote}</div>
                )}
            </label>

            <LabeledInput
                label="Рейтинг"
                type="number"
                value={rating}
                max={5}
                min={1}
                onChange={(v) => {
                    setRating(Number(v));
                    setErrors((e) => ({...e, rating: ""}));
                }}
                error={errors.rating}
            />

            <LabeledInput
                label="Аватар URL"
                value={avatar}
                onChange={(v) => {
                    setAvatar(v);
                    setErrors((e) => ({...e, avatar: ""}));
                }}
                error={errors.avatar}
            />

            <LabeledInput
                label="Лого URL"
                value={logo}
                onChange={(v) => {
                    setLogo(v);
                    setErrors((e) => ({...e, logo: ""}));
                }}
                error={errors.logo}
            />

            <Checkbox
                label="Показывать"
                checked={isVisible}
                onChange={() => setIsVisible(!isVisible)}
            />

            <button className="button button_accept" onClick={handleSave}>
                Сохранить
            </button>
        </Modal>
    );
}