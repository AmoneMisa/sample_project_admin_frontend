export default function LabeledNumberInput({
                                               label,
                                               value,
                                               min,
                                               max,
                                               step = 1,
                                               onChange,
                                               error,
                                               placeholder
                                           }) {

    const clamp = (v) => {
        let n = Number(v);
        if (isNaN(n)) n = min ?? 0;

        if (min != null) n = Math.max(min, n);
        if (max != null) n = Math.min(max, n);

        return n;
    };

    const inc = () => onChange(clamp(value + step));
    const dec = () => onChange(clamp(value - step));

    return (
        <div className="field-holder">
            {label && <span className="field-holder__label">{label}</span>}

            <div className="number-input">
                <button
                    type="button"
                    className="number-input__btn"
                    onClick={dec}
                >
                    −
                </button>

                <input
                    type="text"
                    className={
                        "field-holder__input" +
                        (error ? " field-holder__input_error" : "")
                    }
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(clamp(e.target.value))}
                />

                <button
                    type="button"
                    className="number-input__btn"
                    onClick={inc}
                >
                    +
                </button>
            </div>

            {error && <div className="field-holder__error">{error}</div>}
        </div>
    );
}
