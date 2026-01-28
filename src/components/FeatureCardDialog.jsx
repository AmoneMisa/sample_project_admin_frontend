import {useEffect, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "./LabeledInput";
import UploadInput from "./UploadInput";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/ToastContext";

export default function FeatureCardDialog({initial, index, mode, onClose}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [form, setForm] = useState(
        initial || {
            image: "",
            titleKey: `featureCards.${index}.title`,
            descriptionKey: `featureCards.${index}.description`,
            order: index,
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
            map[lang] = data[lang] || "";
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

        // image
        if (!form.image.trim()) {
            e.image = "Обязательное поле";
        }

        // translations
        languages.forEach(lang => {
            if (!titleTranslations[lang]?.trim()) {
                if (!e.titleTranslations) e.titleTranslations = {};
                e.titleTranslations[lang] = "Обязательное поле";
            }
            if (!descriptionTranslations[lang]?.trim()) {
                if (!e.descriptionTranslations) e.descriptionTranslations = {};
                e.descriptionTranslations[lang] = "Обязательное поле";
            }
        });

        // order
        if (form.order < 0 || form.order === "" || isNaN(form.order)) {
            e.order = "Введите число ≥ 0";
        }

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
        const method = mode === "edit" ? "PATCH" : "POST";
        const url =
            mode === "edit"
                ? `${API_URL}/feature-cards/${form.id}`
                : `${API_URL}/feature-cards`;

        await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`}
            ,
            body: JSON.stringify(form)
        });
    }

    // -----------------------------
    // SAVE ALL
    // -----------------------------
    async function save() {
        if (!validate()) return;

        await saveCard();
        await saveTranslations(form.titleKey, titleTranslations);
        await saveTranslations(form.descriptionKey, descriptionTranslations);

        showToast("Карточка сохранена");
        onClose();
    }

    if (loading) {
        return (
            <Modal onClose={onClose}>
                <div className="dialog__window">
                    <h2>Загрузка…</h2>
                </div>
            </Modal>
        );
    }

    return (
        <Modal onClose={onClose}>
            <div className="dialog__window">
                <h2>{mode === "edit" ? "Редактировать карточку" : "Создать карточку"}</h2>

                <UploadInput
                    label="Изображение"
                    value={form.image}
                    error={errors.image}
                    onChange={(v) => updateField("image", v)}
                />

                <LabeledInput label="Ключ заголовка" value={form.titleKey} disabled />

                {languages.map(lang => (
                    <LabeledInput
                        key={lang}
                        label={`Заголовок (${lang})`}
                        value={titleTranslations[lang]}
                        error={errors.titleTranslations?.[lang]}
                        onChange={(v) =>
                            setTitleTranslations({...titleTranslations, [lang]: v})
                        }
                    />
                ))}

                <LabeledInput label="Ключ описания" value={form.descriptionKey} disabled />

                {languages.map(lang => (
                    <LabeledInput
                        key={lang}
                        label={`Описание (${lang})`}
                        value={descriptionTranslations[lang]}
                        error={errors.descriptionTranslations?.[lang]}
                        onChange={(v) =>
                            setDescriptionTranslations({...descriptionTranslations, [lang]: v})
                        }
                    />
                ))}

                <LabeledInput
                    label="Порядок"
                    type="number"
                    value={form.order}
                    error={errors.order}
                    onChange={(v) => updateField("order", Number(v))}
                />

                <div className="dialog__actions">
                    <button className="button" onClick={save}>Сохранить</button>
                    <button className="button button_border" onClick={onClose}>Отмена</button>
                </div>
            </div>
        </Modal>
    );
}
