export default function LabeledSelect({
                                          label,
                                          value,
                                          onChange,
                                          options = [],
                                          className = "",
                                          placeholder = null,
                                          error = "",
                                          hint = ""
                                      }) {
    return (
        <div className={`select field-holder ${className}`}>
            {label && (
                <span className="field-holder__label">
                    {label}
                </span>
            )}

            <select
                className={
                    "field-holder__input" +
                    (error ? " field-holder__input_error" : "")
                }
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}

                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

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
        </div>
    );
}
