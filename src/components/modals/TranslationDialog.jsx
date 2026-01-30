import {useState, useEffect} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import {FiSmile} from "react-icons/fi";
import EmojiPickerPopup from "../customElems/EmojiPicker";

export default function TranslationDialog({
                                              open,
                                              languages,
                                              initialKey,
                                              initialValues,
                                              existingKeys = [],
                                              onSave,
                                              onClose
                                          }) {
    const [state, setState] = useState({
        key: initialKey,
        values: {...initialValues}
    });

    const [emojiPickerFor, setEmojiPickerFor] = useState(null);
    const [errors, setErrors] = useState({});
    const keyExists = existingKeys.includes(initialKey);

    useEffect(() => {
        setState({
            key: initialKey,
            values: {...initialValues}
        });
        setErrors({});
    }, [initialKey, initialValues]);

    function validate() {
        const e = {};
        let ok = true;

        if (!keyExists) {
            e.key = "Этот ключ не существует. Создание новых ключей запрещено.";
            ok = false;
        }

        setErrors(e);
        return ok;
    }

    function handleSave() {
        if (!validate()) return;
        onSave(state.key, state.values);
    }

    return (
        <Modal
            open={open}
            title={`Редактирование ключа: ${initialKey}`}
            onClose={onClose}
            width={600}
        >
            {!keyExists && (
                <div style={{color: "var(--color-error)", marginBottom: 12}}>
                    Этот ключ не существует. Создание новых ключей запрещено.
                </div>
            )}

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

            <div className={"modal__actions"}>
                <button
                    className="button button_accept"
                    style={{marginLeft: 12}}
                    onClick={handleSave}
                    disabled={!keyExists}
                >
                    Сохранить
                </button>
                <button className="button button_reject" onClick={onClose}>
                    Отмена
                </button>
            </div>
        </Modal>
    );
}
