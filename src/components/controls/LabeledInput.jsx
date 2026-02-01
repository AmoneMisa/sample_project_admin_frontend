export default function LabeledInput({
                                         label,
                                         placeholder = "",
                                         value,
                                         title = "",
                                         onChange,
                                         minLength,
                                         maxLength,
                                         type = "text",
                                         className = "",
                                         error = "",
                                         hint = "",
                                         autoComplete
                                     }) {
    function handleChange(e) {
        let v = e.target.value;

        const forbidden = /<\/?(script|style|code)[^>]*>/gi;
        const anyTag = /<\/?[^>]+>/gi;

        v = v.replace(forbidden, "");

        // v = v.replace(anyTag, "");

        if (maxLength && v.length > maxLength) {
            v = v.slice(0, maxLength);
        }

        onChange(v);
    }

    return (
        <label className="field-holder">
            {label && <span className="field-holder__label">{label}</span>}

            <input
                autoComplete={autoComplete}
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={handleChange}
                className={
                    className +
                    " field-holder__input" +
                    (error ? " field-holder__input_error" : "")
                }
                minLength={minLength}
                maxLength={maxLength}
                title={title}
            />

            {error && <div className="field-holder__error">{error}</div>}

            {!error && hint && (
                <div className="field-holder__hint">{hint}</div>
            )}
        </label>
    );
}
