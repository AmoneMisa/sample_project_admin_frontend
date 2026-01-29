import {useEffect, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";
import {v4 as uuid} from "uuid";

export default function FooterBlockDialog({initial, index, mode, onClose}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [errors, setErrors] = useState({});
    const [languages, setLanguages] = useState([]);
    const [loading, setLoading] = useState(true);

    // -----------------------------
    // INITIAL FORM
    // -----------------------------
    const tempId = uuid();

    const [form, setForm] = useState(
        initial || {
            type: "menu",
            titleKey: `temp.footer.block.${tempId}.title`,
            descriptionKey: `temp.footer.block.${tempId}.description`,
            order: index,
            isVisible: true,
        }
    );

    const [titleTranslations, setTitleTranslations] = useState({});
    const [descriptionTranslations, setDescriptionTranslations] = useState({});

    function updateField(key, value) {
        setForm({...form, [key]: value});
    }

    // -----------------------------
    // LOAD LANGUAGES + TRANSLATIONS
    // -----------------------------
    async function loadLanguages() {
        const res = await fetch(`${API_URL}/languages`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        return await res.json();
    }

    async function loadTranslations(key, langs, setter) {
        const res = await fetch(`${API_URL}/translations?key=${encodeURIComponent(key)}`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        const data = await res.json();

        const map = {};
        langs.forEach(lang => map[lang] = data[lang] || "");
        setter(map);
    }

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

        if (!form.type.trim()) {
            e.type = "Обязательное поле";
        }

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
    // SAVE BLOCK
    // -----------------------------
    async function saveBlock() {
        if (mode === "edit") {
            await fetch(`${API_URL}/footer/${form.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(form)
            });
            return form.id;
        }

        const res = await fetch(`${API_URL}/footer`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(form)
        });

        const block = await res.json();
        return block.id;
    }

    // -----------------------------
    // MAIN SAVE
    // -----------------------------
    async function save() {
        if (!validate()) return;

        const id = await saveBlock();

        // Генерируем финальные ключи
        const finalTitleKey = `footer.block.${id}.title`;
        const finalDescriptionKey = `footer.block.${id}.description`;

        // Переносим переводы
        await saveTranslations(finalTitleKey, titleTranslations);
        await saveTranslations(finalDescriptionKey, descriptionTranslations);

        // Обновляем блок с финальными ключами
        await fetch(`${API_URL}/footer/${id}`, {
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

        showToast("Блок сохранён");
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
                <h2>{mode === "edit" ? "Редактировать блок" : "Создать блок"}</h2>

                <LabeledInput
                    label="Тип"
                    value={form.type}
                    error={errors.type}
                    onChange={(v) => updateField("type", v)}
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
