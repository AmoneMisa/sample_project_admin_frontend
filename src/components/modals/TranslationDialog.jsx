import {useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import {FiSmile} from "react-icons/fi";
import EmojiPickerPopup from "../customElems/EmojiPicker";

export default function TranslationDialog({
                                              open,
                                              languages,
                                              initialKey,
                                              initialValues,
                                              existingKeys,
                                              onSave,
                                              onClose
                                          }) {
    const [state, setState] = useState({
        key: initialKey,
        values: {...initialValues}
    });

    const [emojiPickerFor, setEmojiPickerFor] = useState(null);
    const [errors, setErrors] = useState({});

    const isNew = !existingKeys.includes(initialKey);

    // -----------------------------
    // VALIDATION
    // -----------------------------
    function validate() {
        const e = {};
        let ok = true;

        // validate key
        if (isNew) {
            if (!state.key.trim()) {
                e.key = "Ключ обязателен";
                ok = false;
            } else if (!/^[a-zA-Z0-9._-]+$/.test(state.key)) {
                e.key = "Только латиница, цифры, точки, дефисы и подчёркивания";
                ok = false;
            } else if (existingKeys.includes(state.key)) {
                e.key = "Такой ключ уже существует";
                ok = false;
            }
        }

        // validate translations
        for (const lang of languages) {
            const v = state.values[lang.code];
            if (!v || !v.trim()) {
                if (!e.values) e.values = {};
                e.values[lang.code] = "Поле обязательно";
                ok = false;
            }
        }

        setErrors(e);
        return ok;
    }

    function handleSave() {
        if (!validate()) return;
        onSave(state.key, state.values);
    }

    // -----------------------------
    // RENDER
    // -----------------------------
    return (
        <Modal
            open={open}
            title={isNew ? "Создание нового ключа" : `Редактирование ключа: ${initialKey}`}
            onClose={onClose}
            width={600}
        >
            {/* KEY FIELD */}
            {isNew && (
                <LabeledInput
                    label="Ключ"
                    value={state.key}
                    error={errors.key}
                    onChange={(v) =>
                        setState(prev => ({...prev, key: v}))
                    }
                />
            )}

            {/* TRANSLATION FIELDS */}
            {languages.map(lang => (
                <div
                    key={lang.code}
                    style={{
                        position: "relative",
                        width: "100%",
                        marginBottom: 12
                    }}
                >
                    <LabeledInput
                        label={lang.code.toUpperCase()}
                        value={state.values[lang.code] ?? ""}
                        error={errors.values?.[lang.code]}
                        onChange={(v) =>
                            setState(prev => ({
                                ...prev,
                                values: {
                                    ...prev.values,
                                    [lang.code]: v
                                }
                            }))
                        }
                    />

                    {/* Emoji button */}
                    <button
                        type="button"
                        className="button button_icon"
                        style={{
                            position: "absolute",
                            right: 6,
                            top: 34,
                            padding: 4
                        }}
                        onClick={() => setEmojiPickerFor({lang: lang.code})}
                    >
                        <FiSmile size={16}/>
                    </button>
                </div>
            ))}

            {/* EMOJI PICKER */}
            {emojiPickerFor && (
                <EmojiPickerPopup
                    onSelect={(emoji) => {
                        setState(prev => ({
                            ...prev,
                            values: {
                                ...prev.values,
                                [emojiPickerFor.lang]:
                                    (prev.values[emojiPickerFor.lang] ?? "") + emoji
                            }
                        }));
                        setEmojiPickerFor(null);
                    }}
                    onClose={() => setEmojiPickerFor(null)}
                />
            )}

            {/* ACTIONS */}
            <div style={{display: "flex", justifyContent: "flex-end", marginTop: 20}}>
                <button className="button button_border" onClick={onClose}>
                    Отмена
                </button>

                <button
                    className="button button_accept"
                    style={{marginLeft: 12}}
                    onClick={handleSave}
                >
                    Сохранить
                </button>
            </div>
        </Modal>
    );
}
