export default function LabeledInput({
                                         label,
                                         placeholder = "",
                                         value,
                                         title = "",
                                         onChange,
                                         max = 5,
                                         type = "text",
                                         className = "",
                                         error = "",
                                         hint = ""
                                     }) {
    return (
        <label className="field-holder">
            {label && <span className="field-holder__label">{label}</span>}

            <input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className={
                    className +
                    " field-holder__input" +
                    (error ? " field-holder__input_error" : "")
                }
                style={{ padding: 6 }}
                max={max}
                min={1}
                title={title}
            />

            {error && (
                <div className="field-holder__error">
                    {error}
                </div>
            )}

            {!error && hint && (
                <div className="field-holder__hint">
                    {hint}
                </div>
            )}
        </label>
    );
}
