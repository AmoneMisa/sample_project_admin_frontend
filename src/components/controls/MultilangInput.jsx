import {useState} from "react";

export default function MultilangInput({
                                           label,
                                           languages,
                                           valueMap,
                                           errors = {},
                                           onChange,
                                           placeholder,
                                           hint,
                                           className = "",
                                       }) {
    const [activeLang, setActiveLang] = useState(languages[0] || "ru");

    return (
        <div className={`field-holder ${className}`}>
            {label && (
                <label className="field-holder__label">
                    {label}
                </label>
            )}

            <div className="multilang-input__tabs">
                {languages.map(lang => (
                    <button
                        key={lang}
                        type="button"
                        className={
                            "multilang-input__tab" +
                            (activeLang === lang ? " multilang-input__tab_active" : "")
                        }
                        onClick={() => setActiveLang(lang)}
                    >
                        {lang.toUpperCase()}
                    </button>
                ))}
            </div>

            <input
                placeholder={placeholder}
                className={
                    "input" +
                    (errors[activeLang] ? " field-holder__input_error" : "")
                }
                value={valueMap[activeLang] || ""}
                onChange={e => {
                    onChange({
                        ...valueMap,
                        [activeLang]: e.target.value,
                    });
                }}
            />

            {errors[activeLang] && (
                <div className="field-holder__error">
                    {errors[activeLang]}
                </div>
            )}

            {hint && !errors[activeLang] && (
                <div className="field-holder__hint">
                    {hint}
                </div>
            )}
        </div>
    );
}
