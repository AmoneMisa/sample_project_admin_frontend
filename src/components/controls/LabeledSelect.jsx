import {useEffect, useMemo, useRef, useState} from "react";
import {FiCheck, FiChevronDown} from "react-icons/fi";

export default function LabeledSelect({
                                          label,
                                          value,
                                          onChange,
                                          options = [],
                                          className = "",
                                          placeholder = null,
                                          error = "",
                                          hint = "",
                                          disabled = false,

                                          // optional: for classic form submit
                                          name = "",
                                          renderHiddenNative = false, // if true -> renders hidden native select
                                      }) {
    const rootRef = useRef(null);
    const buttonRef = useRef(null);
    const listRef = useRef(null);

    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const selectedOption = useMemo(
        () => options.find(o => String(o.value) === String(value)),
        [options, value]
    );

    const labelText = selectedOption?.label ?? "";

    const visibleText = labelText || placeholder || "Выберите…";

    const isPlaceholderShown = !labelText;

    const close = () => {
        setOpen(false);
        setActiveIndex(-1);
    };

    const openMenu = () => {
        if (disabled) return;
        setOpen(true);

        const selectedIdx = options.findIndex(o => String(o.value) === String(value));
        setActiveIndex(selectedIdx >= 0 ? selectedIdx : (options.length ? 0 : -1));
    };

    const toggle = () => {
        if (open) close();
        else openMenu();
    };

    const commitIndex = (idx) => {
        if (idx < 0 || idx >= options.length) return;
        const opt = options[idx];
        onChange(String(opt.value));
        close();
        requestAnimationFrame(() => buttonRef.current?.focus());
    };

    useEffect(() => {
        if (!open) return;

        const onDocMouseDown = (e) => {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(e.target)) close();
        };

        const onDocKeyDown = (e) => {
            if (e.key === "Escape") close();
        };

        document.addEventListener("mousedown", onDocMouseDown);
        document.addEventListener("keydown", onDocKeyDown);
        return () => {
            document.removeEventListener("mousedown", onDocMouseDown);
            document.removeEventListener("keydown", onDocKeyDown);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
        el?.scrollIntoView({block: "nearest"});
    }, [open, activeIndex]);

    const onButtonKeyDown = (e) => {
        if (disabled) return;

        if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
            e.preventDefault();
            openMenu();
            return;
        }

        if (!open) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, options.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === "Home") {
            e.preventDefault();
            setActiveIndex(options.length ? 0 : -1);
        } else if (e.key === "End") {
            e.preventDefault();
            setActiveIndex(options.length ? options.length - 1 : -1);
        } else if (e.key === "Enter") {
            e.preventDefault();
            commitIndex(activeIndex);
        } else if (e.key === "Tab") {
            close();
        }
    };

    const onOptionMouseEnter = (idx) => setActiveIndex(idx);

    const onOptionMouseDown = (e) => {
        e.preventDefault();
    };

    const inputClass =
        "field-holder__input" +
        (error ? " field-holder__input_error" : "") +
        (disabled ? " field-holder__input_disabled" : "");

    return (
        <div ref={rootRef} className={`select field-holder ${className}`}>
            {label && <span className="field-holder__label">{label}</span>}
            {renderHiddenNative && (
                <select
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{position: "absolute", opacity: 0, pointerEvents: "none", height: 0, width: 0}}
                    tabIndex={-1}
                    aria-hidden="true"
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((opt) => (
                        <option key={opt.value} value={String(opt.value)}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            )}

            <button
                ref={buttonRef}
                type="button"
                className={`selectx ${inputClass} ${open ? "selectx_open" : ""}`}
                onClick={toggle}
                onKeyDown={onButtonKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
            >
        <span className={`selectx__value ${isPlaceholderShown ? "selectx__value_placeholder" : ""}`}>
          {visibleText}
        </span>

                <span className="selectx__chevron" aria-hidden="true">
          <FiChevronDown/>
        </span>
            </button>

            {open && (
                <div className="selectx__menu" role="listbox" ref={listRef}>
                    {options.length === 0 && (
                        <div className="selectx__empty">Нет вариантов</div>
                    )}

                    {options.map((opt, idx) => {
                        const isSelected = String(opt.value) === String(value);
                        const isActive = idx === activeIndex;

                        return (
                            <div
                                key={opt.value}
                                role="option"
                                aria-selected={isSelected}
                                data-idx={idx}
                                className={
                                    "selectx__option" +
                                    (isSelected ? " selectx__option_selected" : "") +
                                    (isActive ? " selectx__option_active" : "")
                                }
                                onMouseEnter={() => onOptionMouseEnter(idx)}
                                onMouseDown={onOptionMouseDown}
                                onClick={() => commitIndex(idx)}
                                title={opt.label}
                            >
                                <span className="selectx__option-label">{opt.label}</span>
                                {isSelected && <span className="selectx__option-mark"><FiCheck size={16}/></span>}
                            </div>
                        );
                    })}
                </div>
            )}

            {error && <div className="field-holder__error">{error}</div>}
            {!error && hint && <div className="field-holder__hint">{hint}</div>}
        </div>
    );
}
