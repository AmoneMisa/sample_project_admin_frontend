import {useEffect, useState} from "react";
import Modal from "./Modal";
import {v4 as uuid} from "uuid";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";
import LabeledInput from "../controls/LabeledInput";

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
        setForm({...form, [key]: value});
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
                if (!e.titleTranslations) e.titleTranslations = {};
                e.titleTranslations[code] = "Обязательное поле";
            }

            if (!descriptionTranslations[code]?.trim()) {
                if (!e.descriptionTranslations) e.descriptionTranslations = {};
                e.descriptionTranslations[code] = "Обязательное поле";
            }
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    // -----------------------------
    // SAVE TRANSLATIONS
    // -----------------------------
    async function saveTranslations(key, translations) {
        await fetch(`${API_URL}/translations`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({key, translations})
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
                    Authorization: `Bearer ${accessToken}`}
                ,
                body: JSON.stringify(form)
            });
            return form.id;
        }

        const res = await fetch(`${API_URL}/feature-cards`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`}
            ,
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
                Authorization: `Bearer ${accessToken}`}
            ,
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
                <div className="dialog__window">
                    <h2>Загрузка…</h2>
                </div>
            </Modal>
        );
    }

    return (
        <Modal open={true} onClose={onClose}>
            <div className="dialog__window">
                <h2>{mode === "edit" ? "Редактировать карточку" : "Создать карточку"}</h2>

                <LabeledInput
                    label="URL изображения"
                    value={form.image}
                    error={errors.image}
                    onChange={(v) => updateField("image", v)}
                />

                {languages.map(lang => (
                    <LabeledInput
                        key={lang.code}
                        label={`Заголовок (${lang.code})`}
                        value={titleTranslations[lang.code]}
                        error={errors.titleTranslations?.[lang.code]}
                        onChange={(v) =>
                            setTitleTranslations({...titleTranslations, [lang.code]: v})
                        }
                    />
                ))}

                {languages.map(lang => (
                    <LabeledInput
                        key={lang.code}
                        label={`Описание (${lang.code})`}
                        value={descriptionTranslations[lang.code]}
                        error={errors.descriptionTranslations?.[lang.code]}
                        onChange={(v) =>
                            setDescriptionTranslations({...descriptionTranslations, [lang.code]: v})
                        }
                    />
                ))}

                <div className="dialog__actions">
                    <button className="button" onClick={save}>Сохранить</button>
                    <button className="button button_border" onClick={onClose}>Отмена</button>
                </div>
            </div>
        </Modal>
    );
}
