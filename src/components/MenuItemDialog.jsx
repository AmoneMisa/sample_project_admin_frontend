import {useState} from "react";
import Modal from "./Modal";
import LabeledInput from "./LabeledInput";
import LabeledSelect from "./LabeledSelect";
import Checkbox from "./Checkbox";

function collectAllKeys(item) {
    const keys = [];

    keys.push(item.label);

    if (item.type === "simple") {
        if (item.badgeKey) keys.push(item.badgeKey);
    }

    if (item.type === "dropdown-simple") {
        for (const sub of item.items) {
            keys.push(sub.label);
            if (sub.badgeKey) keys.push(sub.badgeKey);
        }
    }

    if (item.type === "dropdown-mega") {
        for (const col of item.columns) {
            keys.push(col.title);
            for (const sub of col.items) {
                keys.push(sub.label);
                if (sub.badgeKey) keys.push(sub.badgeKey);
            }
        }
    }

    return Array.from(new Set(keys));
}

function collectVisibleKeys(item) {
    const keys = [];

    if (item.visible !== false) {
        keys.push(item.label);
    }

    if (item.type === "simple") {
        if (item.showBadge && item.badgeKey) {
            keys.push(item.badgeKey);
        }
    }

    if (item.type === "dropdown-simple") {
        for (const sub of item.items) {
            if (sub.visible !== false) {
                keys.push(sub.label);
                if (sub.showBadge && sub.badgeKey) {
                    keys.push(sub.badgeKey);
                }
            }
        }
    }

    if (item.type === "dropdown-mega") {
        for (const col of item.columns) {
            keys.push(col.title);

            for (const sub of col.items) {
                if (sub.visible !== false) {
                    keys.push(sub.label);
                    if (sub.showBadge && sub.badgeKey) {
                        keys.push(sub.badgeKey);
                    }
                }
            }
        }
    }

    return Array.from(new Set(keys));
}

export default function MenuItemDialog({
                                           title,
                                           languages,
                                           initialItem,
                                           initialTranslations,
                                           onSave,
                                           onClose,
                                       }) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";

    const [fieldErrors, setFieldErrors] = useState({});
    const defaultItem = initialItem || {
        type: "simple",
        label: "",
        href: "",
        visible: true,
    };

    const [item, setItem] = useState(defaultItem);
    const [translations, setTranslations] = useState({
        ...initialTranslations,
    });
    const [error, setError] = useState("");

    // -----------------------------
    // update translation
    // -----------------------------
    function updateTranslation(key, lang, value) {
        setTranslations((prev) => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                [lang]: value,
            },
        }));
    }

    // -----------------------------
    // toggle visible
    // -----------------------------
    function toggleVisible(path) {
        setItem((prev) => {
            const next: any = structuredClone(prev);
            let target: any = next;
            for (const p of path) target = target[p];
            target.visible = target.visible === false ? true : !target.visible;
            return next;
        });
    }

    // -----------------------------
    // toggle badge
    // -----------------------------
    function toggleBadge(path: (string | number)[], badgeKey: string | undefined | null) {
        if (!badgeKey) return;

        setItem((prev) => {
            const next: any = structuredClone(prev);
            let target: any = next;
            for (const p of path) target = target[p];
            target.showBadge = !target.showBadge;
            return next;
        });
    }

    // -----------------------------
    // update href
    // -----------------------------
    function updateHref(path: (string | number)[], value: string) {
        setItem((prev) => {
            const next: any = structuredClone(prev);
            let target: any = next;
            for (const p of path) target = target[p];
            target.href = value;
            return next;
        });
    }

    // -----------------------------
    // update image
    // -----------------------------
    function updateImage(field, value) {
        setItem((prev) => {
            if (prev.type !== "dropdown-mega") return prev;
            return {
                ...prev,
                image: {
                    src: prev.image?.src || "",
                    position: prev.image?.position || "right",
                    [field]: value,
                },
            };
        });
    }

    // -----------------------------
    // validation
    // -----------------------------
    function isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    function validate() {
        const visibleKeys = collectVisibleKeys(item);
        const newErrors = {};
        let hasError = false;

        // Проверка переводов
        for (const key of visibleKeys) {
            const langs = translations[key] || {};
            for (const lang of languages) {
                const v = langs[lang.code];
                if (!v || v.trim() === "") {
                    hasError = true;
                    if (!newErrors[key]) newErrors[key] = {};
                    newErrors[key][lang.code] = "Поле обязательно";
                }
            }
        }

        // Проверка href
        function validateHref(path, href) {
            const key = path.join(".");
            if (!href || href.trim() === "") {
                newErrors[key] = "Поле обязательно";
                hasError = true;
            } else if (!isValidUrl(href)) {
                newErrors[key] = "Некорректная ссылка";
                hasError = true;
            }
        }

        if (item.type === "simple") {
            validateHref([], item.href);
        }

        if (item.type === "dropdown-simple") {
            item.items.forEach((sub, i) => {
                validateHref(["items", i], sub.href);
            });
        }

        if (item.type === "dropdown-mega") {
            item.columns.forEach((col, c) => {
                col.items.forEach((sub, s) => {
                    validateHref(["columns", c, "items", s], sub.href);
                });
            });

            if (item.image?.src) {
                validateHref(["image", "src"], item.image.src);
            }
        }

        setFieldErrors(newErrors);

        if (hasError) {
            setError("Исправьте ошибки в форме");
            return false;
        }

        setError("");
        return true;
    }

    // -----------------------------
    // backend sync
    // -----------------------------
    async function saveTranslationsToBackend(allKeysBefore, visibleKeysNow) {
        const items: { key: string; lang: string; value: string | null }[] = [];

        for (const key of visibleKeysNow) {
            const langs = translations[key] || {};
            for (const lang of languages) {
                items.push({
                    key,
                    lang: lang.code,
                    value: langs[lang.code] ?? "",
                });
            }
        }

        await fetch(`${API_URL}/translations/bulk-update`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({items}),
        });

        const removedKeys = allKeysBefore.filter(
            (k) => !visibleKeysNow.includes(k)
        );

        for (const key of removedKeys) {
            await fetch(`${API_URL}/translations/delete`, {
                method: "DELETE",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({key}),
            });
        }
    }

    async function handleSave() {
        const allKeysBefore = collectAllKeys(initialItem);
        const visibleKeysNow = collectVisibleKeys(item);

        if (!validate()) return;

        await saveTranslationsToBackend(allKeysBefore, visibleKeysNow);

        onSave(item);
        onClose();
    }

    // -----------------------------
    // render helpers
    // -----------------------------
    function renderTranslationInputs(key, label) {
        return (
            <div className="translation-block">
                {label && <div className="translation-label">{label}</div>}
                {languages.map((lang) => (
                    <LabeledInput
                        key={lang.code}
                        label={lang.code.toUpperCase()}
                        value={translations[key]?.[lang.code] ?? ""}
                        onChange={(v) => updateTranslation(key, lang.code, v)}
                        error={fieldErrors[key]?.[lang.code] ?? ""}
                    />
                ))}
            </div>
        );
    }

    // -----------------------------
    // render
    // -----------------------------
    return (
        <Modal open={true} title={title} onClose={onClose} width={800}>
            {error && <div className="field-error">{error}</div>}

            {/* SIMPLE */}
            {item.type === "simple" && (
                <>
                    <Checkbox
                        label="Отображать пункт меню"
                        checked={item.visible !== false}
                        onChange={() => toggleVisible([])}
                    />

                    {renderTranslationInputs(item.label, "Заголовок")}

                    <LabeledInput
                        label="Ссылка"
                        value={item.href}
                        onChange={(v) => updateHref([], v)}
                        error={fieldErrors[`href`] ?? ""}
                    />

                    {item.badgeKey && (
                        <>
                            <Checkbox
                                label="Показывать бейдж"
                                checked={item.showBadge === true}
                                onChange={() => toggleBadge([], item.badgeKey)}
                            />
                            {item.showBadge && renderTranslationInputs(item.badgeKey, "Бейдж")}
                        </>
                    )}
                </>
            )}

            {/* DROPDOWN-SIMPLE */}
            {item.type === "dropdown-simple" && (
                <>
                    <Checkbox
                        label="Отображать меню"
                        checked={item.visible !== false}
                        onChange={() => toggleVisible([])}
                    />

                    {renderTranslationInputs(item.label, "Заголовок меню")}

                    {item.items.map((sub, i) => (
                        <div key={i} className="sub-item">
                            <Checkbox
                                label={`Отображать пункт ${i + 1}`}
                                checked={sub.visible !== false}
                                onChange={() => toggleVisible(["items", i])}
                            />

                            {renderTranslationInputs(sub.label, `Пункт ${i + 1}`)}

                            <LabeledInput
                                label="Ссылка"
                                value={sub.href}
                                onChange={(v) => updateHref(["items", i], v)}
                                error={fieldErrors[`items.${i}.href`] ?? ""}
                            />

                            {sub.badgeKey && (
                                <>
                                    <Checkbox
                                        label="Показывать бейдж"
                                        checked={sub.showBadge === true}
                                        onChange={() => toggleBadge(["items", i], sub.badgeKey)}
                                    />
                                    {sub.showBadge &&
                                        renderTranslationInputs(sub.badgeKey, "Бейдж")}
                                </>
                            )}
                        </div>
                    ))}
                </>
            )}

            {/* DROPDOWN-MEGA */}
            {item.type === "dropdown-mega" && (
                <>
                    <Checkbox
                        label="Отображать меню"
                        checked={item.visible !== false}
                        onChange={() => toggleVisible([])}
                    />

                    {renderTranslationInputs(item.label, "Заголовок меню")}

                    {item.columns.map((col, c) => (
                        <div key={c} className="mega-column">
                            {renderTranslationInputs(col.title, `Список ${c + 1}`)}

                            {col.items.map((sub, s) => (
                                <div key={s} className="mega-item">
                                    <Checkbox
                                        label={`Отображать пункт ${s + 1}`}
                                        checked={sub.visible !== false}
                                        onChange={() =>
                                            toggleVisible(["columns", c, "items", s])
                                        }
                                    />

                                    {renderTranslationInputs(
                                        sub.label,
                                        `Пункт ${c + 1}.${s + 1}`
                                    )}

                                    <LabeledInput
                                        label="Ссылка"
                                        value={sub.href}
                                        onChange={(v) => updateHref(["columns", c, "items", s], v)}
                                        error={fieldErrors[`columns.${c}.items.${s}.href`] ?? ""}
                                    />

                                    {sub.badgeKey && (
                                        <>
                                            <Checkbox
                                                label="Показывать бейдж"
                                                checked={sub.showBadge === true}
                                                onChange={() =>
                                                    toggleBadge(
                                                        ["columns", c, "items", s],
                                                        sub.badgeKey
                                                    )
                                                }
                                            />
                                            {sub.showBadge &&
                                                renderTranslationInputs(sub.badgeKey, "Бейдж")}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}

                    <LabeledInput
                        label="Изображение (src)"
                        value={item.image?.src ?? ""}
                        onChange={(v) => updateImage("src", v)}
                        error={fieldErrors["image.src"] ?? ""}
                    />

                    <LabeledSelect
                        label="Позиция изображения"
                        value={item.image?.position ?? "right"}
                        onChange={(v) => updateImage("position", v)}
                        options={[
                            {value: "right", label: "Справа"},
                            {value: "left", label: "Слева"},
                        ]}
                    />
                </>
            )}

            <button className="button button_accept" onClick={handleSave}>
                Сохранить
            </button>
        </Modal>
    );
}
