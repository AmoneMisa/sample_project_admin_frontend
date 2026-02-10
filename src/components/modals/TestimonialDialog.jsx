import {useEffect, useMemo, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import Toggle from "../controls/Toggle";
import LabeledNumberInput from "../controls/LabeledNumberInput";
import MultilangInput from "../controls/MultilangInput";
import {useTranslations} from "../../hooks/useTranslations";
import {useToast} from "../layout/ToastContext";
import {v4 as uuid} from "uuid";

export default function TestimonialDialog({title, initial, onSave, onClose}) {
    const {showToast} = useToast();

    const {
        languages,
        loadLanguages,
        translationMaps,
        loadAllTranslations,
        createKeysBatch,
        updateKeysBatch
    } = useTranslations();

    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState(() => {
        if (initial) {
            return {
                nameKey: initial?.nameKey || "",
                roleKey: initial?.roleKey || "",
                quoteKey: initial?.quoteKey || "",
                rating: initial?.rating ?? 5,
                avatar: initial?.avatar || "",
                logo: initial?.logo || "",
                isVisible: initial?.isVisible ?? true,
            };
        }

        const id = uuid();
        return {
            nameKey: `testimonial.${id}.name`,
            roleKey: `testimonial.${id}.role`,
            quoteKey: `testimonial.${id}.quote`,
            rating: 5,
            avatar: "",
            logo: "",
            isVisible: true,
        };
    });

    const [errors, setErrors] = useState({});

    const langCodes = useMemo(() => languages.map(l => l.code), [languages]);
    const makeEmptyMap = () => Object.fromEntries(langCodes.map(c => [c, ""]));

    const [nameTranslations, setNameTranslations] = useState({});
    const [roleTranslations, setRoleTranslations] = useState({});
    const [quoteTranslations, setQuoteTranslations] = useState({});

    useEffect(() => {
        (async () => {
            await loadLanguages();
            await loadAllTranslations();
            setLoading(false);
        })();
    }, []);

    useEffect(() => {
        if (loading) return;

        if (initial) {
            setNameTranslations({...((translationMaps[form.nameKey]) || {})});
            setRoleTranslations({...((translationMaps[form.roleKey]) || {})});
            setQuoteTranslations({...((translationMaps[form.quoteKey]) || {})});
        } else {
            const empty = makeEmptyMap();
            setNameTranslations({...empty});
            setRoleTranslations({...empty});
            setQuoteTranslations({...empty});
        }
    }, [loading, translationMaps]);

    const updateField = (field, value) => {
        setForm((prev) => ({...prev, [field]: value}));
        setErrors((prev) => ({...prev, [field]: ""}));
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

        for (const code of langCodes) {
            if (!(nameTranslations?.[code] || "").trim()) {
                next.name = next.name || {};
                next.name[code] = "Обязательное поле";
            }
            if (!(roleTranslations?.[code] || "").trim()) {
                next.role = next.role || {};
                next.role[code] = "Обязательное поле";
            }
            if (!(quoteTranslations?.[code] || "").trim()) {
                next.quote = next.quote || {};
                next.quote[code] = "Обязательное поле";
            }
        }

        if (!form.rating || form.rating < 1 || form.rating > 5) next.rating = "Рейтинг должен быть от 1 до 5";
        if (!isValidUrl(form.avatar)) next.avatar = "Некорректный URL";
        if (!isValidUrl(form.logo)) next.logo = "Некорректный URL";

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    function toKeyPayload(key, values) {
        return {
            key,
            values: Object.fromEntries(langCodes.map(c => [c, (values?.[c] || "")]))
        };
    }

    async function saveTranslations() {
        const payload = [
            toKeyPayload(form.nameKey, nameTranslations),
            toKeyPayload(form.roleKey, roleTranslations),
            toKeyPayload(form.quoteKey, quoteTranslations),
        ];

        if (initial) {
            await updateKeysBatch(
                payload.flatMap(item =>
                    Object.entries(item.values).map(([lang, value]) => ({
                        key: item.key,
                        lang,
                        value
                    }))
                )
            );
            return;
        }

        await createKeysBatch(payload);
    }

    const handleSave = async () => {
        if (!validate()) return;

        await saveTranslations();

        await onSave({
            ...form,
            rating: Number(form.rating),
        });

        showToast("Отзыв сохранён");
        onClose();
    };

    const avatarOk = form.avatar && isValidUrl(form.avatar);
    const logoOk = form.logo && isValidUrl(form.logo);

    return (
        <Modal open title={title} onClose={onClose} width={560}>
            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <Toggle
                        label="Отображать"
                        checked={form.isVisible}
                        onChange={() => updateField("isVisible", !form.isVisible)}
                    />
                </div>
            </div>

            <MultilangInput
                label="Имя"
                placeholder="Анна Иванова"
                languages={langCodes}
                valueMap={nameTranslations}
                errors={errors.name}
                onChange={setNameTranslations}
            />

            <MultilangInput
                label="Роль"
                placeholder="CEO / Designer"
                languages={langCodes}
                valueMap={roleTranslations}
                errors={errors.role}
                onChange={setRoleTranslations}
            />

            <MultilangInput
                label="Отзыв"
                placeholder="Напишите отзыв…"
                languages={langCodes}
                valueMap={quoteTranslations}
                errors={errors.quote}
                onChange={setQuoteTranslations}
                textarea
                textareaMinHeight={110}
            />

            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <LabeledNumberInput
                        label="Рейтинг"
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
                            <img src={form.avatar} alt=""/>
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
                            <img src={form.logo} alt=""/>
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
