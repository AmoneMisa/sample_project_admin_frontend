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
                                           minLength,
                                           maxLength,
                                           forbidHtml = false
                                       }) {
    const [activeLang, setActiveLang] = useState(languages[0] || "ru");

    function sanitize(value) {
        let v = value;

        const forbidden = /<\/?(script|style|code)[^>]*>/gi;
        v = v.replace(forbidden, "");

        if (forbidHtml) {
            const anyTag = /<\/?[^>]+>/gi;
            v = v.replace(anyTag, "");
        }

        if (maxLength && v.length > maxLength) {
            v = v.slice(0, maxLength);
        }

        return v;
    }

    function handleChange(e) {
        const raw = e.target.value;
        const cleaned = sanitize(raw);

        onChange({
            ...valueMap,
            [activeLang]: cleaned,
        });
    }

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
                onChange={handleChange}
                minLength={minLength}
                maxLength={maxLength}
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
