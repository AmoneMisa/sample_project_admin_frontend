import {useEffect, useState} from "react";
import Modal from "./Modal";
import {v4 as uuid} from "uuid";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";

export default function FeatureCardDialog({initial, mode, onClose}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const tempId = uuid();

    const [form, setForm] = useState(
        initial || {
            image: "",
            titleKey: `temp.featureCard.${tempId}.title`,
            descriptionKey: `temp.featureCard.${tempId}.description`,
            isVisible: true,
        }
    );

    const [languages, setLanguages] = useState([]);
    const [titleTranslations, setTitleTranslations] = useState({});
    const [descriptionTranslations, setDescriptionTranslations] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);

    function updateField(key, value) {
        setForm(prev => ({...prev, [key]: value}));
    }

    // -----------------------------
    // LOAD LANGUAGES
    // -----------------------------
    async function loadLanguages() {
        const res = await fetch(`${API_URL}/languages`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        return await res.json();
    }

    // -----------------------------
    // LOAD TRANSLATIONS
    // -----------------------------
    async function loadTranslations(key, langs, setter) {
        const res = await fetch(`${API_URL}/translations?key=${encodeURIComponent(key)}`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        const data = await res.json();

        const map = {};
        langs.forEach(lang => {
            map[lang.code] = data[lang.code] || "";
        });

        setter(map);
    }

    // -----------------------------
    // INITIAL LOAD
    // -----------------------------
    useEffect(() => {
        (async () => {
            const langs = await loadLanguages();
            setLanguages(langs);

            await loadTranslations(form.titleKey, langs, setTitleTranslations);
            await loadTranslations(form.descriptionKey, langs, setDescriptionTranslations);

            setLoading(false);
        })();
    }, []);

    // -----------------------------
    // VALIDATION
    // -----------------------------
    function validate() {
        const e = {};

        if (!form.image.trim()) {
            e.image = "Обязательное поле";
        }

        languages.forEach(lang => {
            const code = lang.code;

            if (!titleTranslations[code]?.trim()) {
                if (!e.title) e.title = {};
                e.title[code] = "Обязательное поле";
            }

            if (!descriptionTranslations[code]?.trim()) {
                if (!e.description) e.description = {};
                e.description[code] = "Обязательное поле";
            }
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    // -----------------------------
    // SAVE TRANSLATIONS (правильный формат!)
    // -----------------------------
    async function saveTranslations(key, translations) {
        const items = Object.entries(translations).map(([lang, value]) => ({
            key,
            lang,
            value
        }));

        await fetch(`${API_URL}/translations`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({items})
        });
    }

    // -----------------------------
    // SAVE CARD
    // -----------------------------
    async function saveCard() {
        if (mode === "edit") {
            await fetch(`${API_URL}/feature-cards/${form.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(form)
            });
            return form.id;
        }

        const res = await fetch(`${API_URL}/feature-cards`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(form)
        });

        const card = await res.json();
        return card.id;
    }

    // -----------------------------
    // SAVE ALL
    // -----------------------------
    async function save() {
        if (!validate()) return;

        const id = await saveCard();

        // Генерируем финальные ключи
        const finalTitleKey = `featureCard.${id}.title`;
        const finalDescriptionKey = `featureCard.${id}.description`;

        // Сохраняем переводы
        await saveTranslations(finalTitleKey, titleTranslations);
        await saveTranslations(finalDescriptionKey, descriptionTranslations);

        // Обновляем карточку с финальными ключами
        await fetch(`${API_URL}/feature-cards/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                titleKey: finalTitleKey,
                descriptionKey: finalDescriptionKey
            })
        });

        showToast("Карточка сохранена");
        onClose();
    }

    // -----------------------------
    // RENDER
    // -----------------------------
    if (loading) {
        return (
            <Modal open={true} onClose={onClose}>
                <h2 className="modal__header gradient-text">Загрузка…</h2>
            </Modal>
        );
    }

    return (
        <Modal open={true} onClose={onClose}>
            <h2 className="modal__header gradient-text">
                {mode === "edit" ? "Редактировать карточку" : "Создать карточку"}
            </h2>

            <LabeledInput
                label="URL изображения"
                value={form.image}
                error={errors.image}
                onChange={(v) => updateField("image", v)}
            />

            <MultilangInput
                label="Заголовок"
                languages={languages.map(l => l.code)}
                valueMap={titleTranslations}
                errors={errors.title}
                onChange={(next) => setTitleTranslations(next)}
            />

            <MultilangInput
                label="Описание"
                languages={languages.map(l => l.code)}
                valueMap={descriptionTranslations}
                errors={errors.description}
                onChange={(next) => setDescriptionTranslations(next)}
            />

            <div className="modal__actions">
                <button className="button" onClick={save}>Сохранить</button>
                <button className="button button_border" onClick={onClose}>Отмена</button>
            </div>
        </Modal>
    );
}
