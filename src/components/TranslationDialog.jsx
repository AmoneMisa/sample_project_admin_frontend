import {useState} from "react";
import Modal from "./Modal";
import LabeledInput from "./LabeledInput";
import {FiSmile} from "react-icons/fi";
import EmojiPickerPopup from "./EmojiPicker";

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

    const isNew = !existingKeys.includes(initialKey);

    return (
        <Modal
            open={open}
            title={isNew ? "Создание нового ключа" : `Редактирование ключа: ${initialKey}`}
            onClose={onClose}
            width={600}
        >
            {/* Поле для ключа — только при создании */}
            {isNew && (
                <LabeledInput
                    label="Ключ"
                    value={state.key}
                    onChange={(v) =>
                        setState((prev) => ({...prev, key: v}))
                    }
                />
            )}

            {/* Поля для переводов */}
            {languages.map((lang) => (
                <div key={lang.code} style={{position: "relative", width: "-webkit-fill-available"}}>
                    <LabeledInput
                        label={lang.code.toUpperCase()}
                        value={state.values[lang.code] ?? ""}
                        onChange={(v) =>
                            setState((prev) => ({
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
                        className="button button_icon button_reject"
                        style={{position: "absolute", right: 0, top: 28}}
                        onClick={() =>
                            setEmojiPickerFor({
                                lang: lang.code
                            })
                        }
                    >
                        <FiSmile size={16}/>
                    </button>
                </div>
            ))}

            {/* Emoji Picker */}
            {emojiPickerFor && (
                <EmojiPickerPopup
                    onSelect={(emoji) => {
                        setState((prev) => ({
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

            <div style={{display: "flex", justifyContent: "flex-end", marginTop: 20}}>
                <button
                    className="button button_border"
                    onClick={onClose}
                >
                    Отмена
                </button>

                <button
                    className="button button_accept"
                    style={{marginLeft: 12}}
                    onClick={() => onSave(state.key, state.values)}
                >
                    Сохранить
                </button>
            </div>
        </Modal>
    );
}
