import {useEffect, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import LabeledSelect from "../controls/LabeledSelect";
import MultilangInput from "../controls/MultilangInput";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";
import {v4 as uuid} from "uuid";
import {useTranslations} from "../../hooks/useTranslations";
import apiFetch from "../../utils/apiFetch";

const TYPE_CONFIG = {
    menu: {fields: ["title", "description"]},
    newsletter: {fields: ["title", "description", "placeholder"]},
    contacts: {fields: ["title"]},
    footerInfo: {fields: []},
    logos: {fields: []}
};

function makeKey(id, type, field) {
    return `footer.block.${id}.${type}.${field}`;
}

export default function FooterBlockDialog({initial, index, mode, onClose}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const {
        languages,
        loadLanguages,
        loadAllTranslations,
        translationMaps,
        createKeysBatch,
        updateKeysBatch
    } = useTranslations({});

    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const [form, setForm] = useState(() => {
        if (initial) return structuredClone(initial);

        const id = uuid();
        const type = "menu";
        const fields = TYPE_CONFIG[type].fields;

        const keys = Object.fromEntries(
            fields.map(f => [`${f}Key`, makeKey(id, type, f)])
        );

        return {
            id,
            type,
            order: index,
            isVisible: true,
            ...keys
        };
    });

    const updateItem = (fn) => {
        setForm(prev => {
            const next = structuredClone(prev);
            fn(next);
            return next;
        });
    };

    const [translations, setTranslations] = useState({
        title: {},
        description: {},
        placeholder: {}
    });

    const setFieldTranslations = (field, map) => {
        setTranslations(prev => ({...prev, [field]: map}));
    };

    useEffect(() => {
        (async () => {
            await loadAllTranslations();
            await loadLanguages();

            const fields = TYPE_CONFIG[form.type].fields;

            if (mode === "edit") {
                const loaded = {};
                for (const f of fields) {
                    loaded[f] = {...(translationMaps[form[`${f}Key`]] || {})};
                }
                setTranslations(prev => ({...prev, ...loaded}));
            } else {
                const empty = Object.fromEntries(
                    languages.map(l => [l.code, ""])
                );

                const initialMaps = {};
                for (const f of fields) {
                    initialMaps[f] = empty;
                }

                setTranslations(prev => ({...prev, ...initialMaps}));
            }

            setLoading(false);
        })();
    }, [languages.length, translationMaps]);

    const validate = () => {
        const e = {};
        const fields = TYPE_CONFIG[form.type].fields;

        if (!form.type.trim()) e.type = "Обязательное поле";
        if (form.order < 0 || form.order === "" || isNaN(form.order))
            e.order = "Введите число ≥ 0";

        for (const f of fields) {
            for (const lang of languages) {
                const code = lang.code;
                if (!translations[f][code]?.trim()) {
                    if (!e[f]) e[f] = {};
                    e[f][code] = "Обязательное поле";
                }
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const saveBlock = async () => {
        if (mode === "edit") {
            await apiFetch(`${API_URL}/footer/${form.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(form)
            });

            return form.id;
        }

        const block = await apiFetch(`${API_URL}/footer`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(form)
        });

        return block.id;
    };

    const handleSave = async () => {
        if (!validate()) return;

        const id = await saveBlock();
        const fields = TYPE_CONFIG[form.type].fields;

        const payload = fields.map(f => ({
            key: makeKey(id, form.type, f),
            values: Object.fromEntries(
                languages.map(l => [l.code, translations[f][l.code] || ""])
            )
        }));

        if (mode === "edit") {
            const res = await updateKeysBatch(
                payload.flatMap(item =>
                    Object.entries(item.values).map(([lang, value]) => ({
                        key: item.key,
                        lang,
                        value
                    }))
                )
            );

            if (res?.error) {
                throw new Error("Ошибка обновления переводов");
            }
        } else {
            const res = await createKeysBatch(payload);
            if (res?.error) {
                throw new Error("Ошибка создания переводов");
            }
        }

        await apiFetch(`${API_URL}/footer/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(
                Object.fromEntries(
                    fields.map(f => [`${f}Key`, makeKey(id, form.type, f)])
                )
            )
        });

        showToast("Блок сохранён");
        onClose();
    };

    const fields = TYPE_CONFIG[form.type].fields;

    return (
        <Modal open={true} onClose={onClose} width={600}>
            <h2 className={'modal__header'}>{mode === "edit" ? "Редактировать блок" : "Создать блок"}</h2>

            <LabeledSelect
                label="Тип блока"
                value={form.type}
                error={errors.type}
                onChange={v =>
                    updateItem(n => {
                        n.type = v;
                        Object.keys(n).forEach(k => {
                            if (k.endsWith("Key")) delete n[k];
                        });
                        const newFields = TYPE_CONFIG[v].fields;
                        newFields.forEach(f => {
                            n[`${f}Key`] = makeKey(n.id, v, f);
                        });
                    })
                }
                options={[
                    {value: "menu", label: "Меню"},
                    {value: "newsletter", label: "Подписка"},
                    {value: "logos", label: "Логотипы"},
                    {value: "contacts", label: "Контакты"},
                    {value: "footerInfo", label: "Информация"}
                ]}
            />

            {fields.includes("title") && (
                <MultilangInput
                    label="Заголовок"
                    languages={languages.map(l => l.code)}
                    valueMap={translations.title}
                    errors={errors.title}
                    onChange={m => setFieldTranslations("title", m)}
                />
            )}

            {fields.includes("description") && (
                <MultilangInput
                    label="Описание"
                    languages={languages.map(l => l.code)}
                    valueMap={translations.description}
                    errors={errors.description}
                    onChange={m => setFieldTranslations("description", m)}
                />
            )}

            {fields.includes("placeholder") && (
                <MultilangInput
                    label="Плейсхолдер"
                    languages={languages.map(l => l.code)}
                    valueMap={translations.placeholder}
                    errors={errors.placeholder}
                    onChange={m => setFieldTranslations("placeholder", m)}
                />
            )}

            <LabeledInput
                label="Порядок"
                type="number"
                value={form.order}
                error={errors.order}
                onChange={v =>
                    updateItem(n => {
                        n.order = Number(v);
                    })
                }
            />

            <div className="modal__actions">
                <button className="button button_accept" onClick={handleSave}>
                    Сохранить
                </button>
                <button className="button button_reject" onClick={onClose}>
                    Отменить
                </button>
            </div>
        </Modal>
    );
}