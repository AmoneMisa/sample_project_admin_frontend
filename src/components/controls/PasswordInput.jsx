import {useState} from "react";
import {FiEye, FiEyeOff} from "react-icons/fi";

export default function PasswordInput({
                                          label,
                                          value,
                                          onChange,
                                          placeholder = "",
                                          error,
                                          showRules = false,
                                          autoComplete
                                      }) {
    const [show, setShow] = useState(false);

    function validatePassword(val) {
        const hasUpper = /[A-ZА-Я]/.test(val);
        const hasLower = /[a-zа-я]/.test(val);
        const hasDigit = /\d/.test(val);
        const longEnough = val.length >= 6;

        return {
            valid: hasUpper && hasLower && hasDigit && longEnough,
            hasUpper,
            hasLower,
            hasDigit,
            longEnough
        };
    }

    const validation = validatePassword(value);

    return (
        <div className="field-holder">
            <label className="field-holder__label">{label}</label>

            <div style={{position: "relative"}}>
                <input
                    autoComplete={autoComplete}
                    style={{width: "-webkit-fill-available"}}
                    type={show ? "text" : "password"}
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    className="input"
                />

                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="button button_icon"
                    style={{
                        position: "absolute",
                        right: 6,
                        top: "50%",
                        transform: "translateY(-50%)"
                    }}
                >
                    {show ? <FiEyeOff/> : <FiEye/>}
                </button>
            </div>

            {error && <div className="field-holder__error">{error}</div>}
            {showRules && (
                <ul style={{fontSize: 12, opacity: 0.8, marginTop: 6}}>
                    <li style={{color: validation.hasUpper ? "lime" : "inherit"}}>
                        1 заглавная буква
                    </li>
                    <li style={{color: validation.hasLower ? "lime" : "inherit"}}>
                        1 строчная буква
                    </li>
                    <li style={{color: validation.hasDigit ? "lime" : "inherit"}}>
                        1 цифра
                    </li>
                    <li style={{color: validation.longEnough ? "lime" : "inherit"}}>
                        минимум 6 символов
                    </li>
                </ul>
            )}
        </div>
    );
}
