import { useState } from "react";
import Modal from "./Modal";
import LabeledInput from "./LabeledInput";
import LabeledSelect from "./LabeledSelect";
import Checkbox from "./Checkbox";

function collectAllKeys(item) {
    const keys = [];

    if (item.label) keys.push(item.label);

    if (item.type === "simple") {
        if (item.badgeKey) keys.push(item.badgeKey);
    }

    if (item.type === "dropdown-simple") {
        for (const sub of item.items || []) {
            if (sub.label) keys.push(sub.label);
            if (sub.badgeKey) keys.push(sub.badgeKey);
        }
    }

    if (item.type === "dropdown-mega") {
        for (const col of item.columns || []) {
            if (col.title) keys.push(col.title);
            for (const sub of col.items || []) {
                if (sub.label) keys.push(sub.label);
                if (sub.badgeKey) keys.push(sub.badgeKey);
            }
        }
    }

    return Array.from(new Set(keys));
}

function collectVisibleKeys(item) {
    const keys = [];

    if (item.visible !== false && item.label) {
        keys.push(item.label);
    }

    if (item.type === "simple") {
        if (item.showBadge && item.badgeKey) {
            keys.push(item.badgeKey);
        }
    }

    if (item.type === "dropdown-simple") {
        for (const sub of item.items || []) {
            if (sub.visible !== false && sub.label) {
                keys.push(sub.label);
                if (sub.showBadge && sub.badgeKey) {
                    keys.push(sub.badgeKey);
                }
            }
        }
    }

    if (item.type === "dropdown-mega") {
        for (const col of item.columns || []) {
            if (col.title) keys.push(col.title);

            for (const sub of col.items || []) {
                if (sub.visible !== false && sub.label) {
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

    function normalizeInitialItem(src) {
        const base = src || { type: "simple", label: "", href: "", visible: true };

        if (base.type === "simple") {
            return {
                type: "simple",
                label: base.label || "",
                href: base.href || "",
                visible: base.visible !== false,
                badgeKey: base.badgeKey || null,
                showBadge: !!base.showBadge,
            };
        }

        if (base.type === "dropdown-simple") {
            return {
                type: "dropdown-simple",
                label: base.label || "",
                visible: base.visible !== false,
                items: (base.items && base.items.length
                    ? base.items
                    : [{ label: "", href: "", visible: true }]).map((it) => ({
                    label: it.label || "",
                    href: it.href || "",
                    visible: it.visible !== false,
                    badgeKey: it.badgeKey || null,
                    showBadge: !!it.showBadge,
                })),
            };
        }

        if (base.type === "dropdown-mega") {
            return {
                type: "dropdown-mega",
                label: base.label || "",
                visible: base.visible !== false,
                columns: (base.columns && base.columns.length
                    ? base.columns
                    : [
                        {
                            title: "",
                            items: [{ label: "", href: "", visible: true }],
                        },
                    ]).map((col) => ({
                    title: col.title || "",
                    items: (col.items || []).map((it) => ({
                        label: it.label || "",
                        href: it.href || "",
                        visible: it.visible !== false,
                        badgeKey: it.badgeKey || null,
                        showBadge: !!it.showBadge,
                    })),
                })),
                image: {
                    src: base.image?.src || "",
                    position: base.image?.position || "right",
                },
            };
        }

        return {
            type: "simple",
            label: base.label || "",
            href: base.href || "",
            visible: base.visible !== false,
        };
    }

    const [fieldErrors, setFieldErrors] = useState({});
    const [item, setItem] = useState(() => normalizeInitialItem(initialItem));
    const [translations, setTranslations] = useState({ ...(initialTranslations || {}) });
    const [error, setError] = useState("");

    function updateTranslation(key, lang, value) {
        setTranslations((prev) => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                [lang]: value,
            },
        }));
    }

    function toggleVisible(path) {
        setItem((prev) => {
            const next = structuredClone(prev);
            let target = next;
            for (const p of path) target = target[p];
            target.visible = target.visible === false ? true : !target.visible;
            return next;
        });
    }

    function toggleBadge(path, badgeKey) {
        if (!badgeKey) return;
        setItem((prev) => {
            const next = structuredClone(prev);
            let target = next;
            for (const p of path) target = target[p];
            target.showBadge = !target.showBadge;
            return next;
        });
    }

    function updateHref(path, value) {
        setItem((prev) => {
            const next = structuredClone(prev);
            let target = next;
            for (const p of path) target = target[p];
            target.href = value;
            return next;
        });
    }

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

    function updateType(newType) {
        setItem((prev) => {
            const current = normalizeInitialItem(prev);

            if (newType === "simple") {
                return {
                    type: "simple",
                    label: current.label || "",
                    href: current.href || "",
                    visible: current.visible !== false,
                    badgeKey: current.badgeKey || null,
                    showBadge: !!current.showBadge,
                };
            }

            if (newType === "dropdown-simple") {
                return {
                    type: "dropdown-simple",
                    label: current.label || "",
                    visible: current.visible !== false,
                    items:
                        current.items && current.items.length
                            ? current.items
                            : [{ label: "", href: "", visible: true }],
                };
            }

            if (newType === "dropdown-mega") {
                return {
                    type: "dropdown-mega",
                    label: current.label || "",
                    visible: current.visible !== false,
                    columns:
                        current.columns && current.columns.length
                            ? current.columns
                            : [
                                {
                                    title: "",
                                    items: [{ label: "", href: "", visible: true }],
                                },
                            ],
                    image: {
                        src: current.image?.src || "",
                        position: current.image?.position || "right",
                    },
                };
            }

            return current;
        });
    }

    function addSimpleItem() {
        if (item.type !== "dropdown-simple") return;
        setItem((prev) => ({
            ...prev,
            items: [...(prev.items || []), { label: "", href: "", visible: true }],
        }));
    }

    function removeSimpleItem(index) {
        if (item.type !== "dropdown-simple") return;
        setItem((prev) => {
            const items = [...(prev.items || [])];
            items.splice(index, 1);
            return { ...prev, items };
        });
    }

    function addColumn() {
        if (item.type !== "dropdown-mega") return;
        setItem((prev) => ({
            ...prev,
            columns: [
                ...(prev.columns || []),
                { title: "", items: [{ label: "", href: "", visible: true }] },
            ],
        }));
    }

    function removeColumn(index) {
        if (item.type !== "dropdown-mega") return;
        setItem((prev) => {
            const cols = [...(prev.columns || [])];
            cols.splice(index, 1);
            return { ...prev, columns: cols };
        });
    }

    function addMegaItem(colIndex) {
        if (item.type !== "dropdown-mega") return;
        setItem((prev) => {
            const cols = [...(prev.columns || [])];
            const col = { ...cols[colIndex] };
            col.items = [...(col.items || []), { label: "", href: "", visible: true }];
            cols[colIndex] = col;
            return { ...prev, columns: cols };
        });
    }

    function removeMegaItem(colIndex, itemIndex) {
        if (item.type !== "dropdown-mega") return;
        setItem((prev) => {
            const cols = [...(prev.columns || [])];
            const col = { ...cols[colIndex] };
            const items = [...(col.items || [])];
            items.splice(itemIndex, 1);
            col.items = items;
            cols[colIndex] = col;
            return { ...prev, columns: cols };
        });
    }

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
            validateHref(["href"], item.href);
        }

        if (item.type === "dropdown-simple") {
            (item.items || []).forEach((sub, i) => {
                validateHref(["items", i, "href"], sub.href);
            });
        }

        if (item.type === "dropdown-mega") {
            (item.columns || []).forEach((col, c) => {
                (col.items || []).forEach((sub, s) => {
                    validateHref(["columns", c, "items", s, "href"], sub.href);
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

    async function saveTranslationsToBackend(allKeysBefore, visibleKeysNow) {
        const items = [];

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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
        });

        const removedKeys = allKeysBefore.filter((k) => !visibleKeysNow.includes(k));

        for (const key of removedKeys) {
            await fetch(`${API_URL}/translations/delete`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key }),
            });
        }
    }

    async function handleSave() {
        const allKeysBefore = collectAllKeys(initialItem || {});
        const visibleKeysNow = collectVisibleKeys(item);

        if (!validate()) return;

        await saveTranslationsToBackend(allKeysBefore, visibleKeysNow);

        onSave(item);
        onClose();
    }

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

    return (
        <Modal open={true} title={title} onClose={onClose} width={800}>
            {error && <div className="field-error">{error}</div>}

            <LabeledSelect
                label="Тип меню"
                value={item.type}
                onChange={updateType}
                options={[
                    { value: "simple", label: "Обычный пункт" },
                    { value: "dropdown-simple", label: "Выпадающее меню" },
                    { value: "dropdown-mega", label: "Мега-меню" },
                ]}
            />

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
                        error={fieldErrors["href"] ?? ""}
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

                    {(item.items || []).map((sub, i) => (
                        <div key={i} className="sub-item">
                            <div className="sub-item-header">
                                <Checkbox
                                    label={`Отображать пункт ${i + 1}`}
                                    checked={sub.visible !== false}
                                    onChange={() => toggleVisible(["items", i])}
                                />
                                <button
                                    type="button"
                                    className="button button_small button_danger"
                                    onClick={() => removeSimpleItem(i)}
                                >
                                    Удалить пункт
                                </button>
                            </div>

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

                    <button
                        type="button"
                        className="button button_secondary"
                        onClick={addSimpleItem}
                    >
                        Добавить пункт
                    </button>
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

                    {(item.columns || []).map((col, c) => (
                        <div key={c} className="mega-column">
                            <div className="mega-column-header">
                                {renderTranslationInputs(col.title, `Список ${c + 1}`)}
                                <button
                                    type="button"
                                    className="button button_small button_danger"
                                    onClick={() => removeColumn(c)}
                                >
                                    Удалить список
                                </button>
                            </div>

                            {(col.items || []).map((sub, s) => (
                                <div key={s} className="mega-item">
                                    <div className="mega-item-header">
                                        <Checkbox
                                            label={`Отображать пункт ${s + 1}`}
                                            checked={sub.visible !== false}
                                            onChange={() =>
                                                toggleVisible(["columns", c, "items", s])
                                            }
                                        />
                                        <button
                                            type="button"
                                            className="button button_small button_danger"
                                            onClick={() => removeMegaItem(c, s)}
                                        >
                                            Удалить пункт
                                        </button>
                                    </div>

                                    {renderTranslationInputs(
                                        sub.label,
                                        `Пункт ${c + 1}.${s + 1}`
                                    )}

                                    <LabeledInput
                                        label="Ссылка"
                                        value={sub.href}
                                        onChange={(v) =>
                                            updateHref(["columns", c, "items", s], v)
                                        }
                                        error={
                                            fieldErrors[`columns.${c}.items.${s}.href`] ?? ""
                                        }
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

                            <button
                                type="button"
                                className="button button_secondary"
                                onClick={() => addMegaItem(c)}
                            >
                                Добавить пункт в список
                            </button>
                        </div>
                    ))}

                    <button
                        type="button"
                        className="button button_secondary"
                        onClick={addColumn}
                    >
                        Добавить список
                    </button>

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
                            { value: "right", label: "Справа" },
                            { value: "left", label: "Слева" },
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
