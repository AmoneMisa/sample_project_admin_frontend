export default function Toggle({
                                   checked,
                                   onChange,
                                   label,
                                   disabled = false,
                                   className = ""
                               }) {
    return (
        <label className={`toggle ${className} ${disabled ? "toggle_disabled" : ""}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
            />
            <span className="toggle__track">
                <span className="toggle__thumb"></span>
            </span>
            {label && <span className="toggle__label">{label}</span>}
        </label>
    );
}
