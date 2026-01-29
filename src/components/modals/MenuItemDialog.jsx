import {useEffect, useState} from "react";
import {v4 as uuid} from "uuid";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";
import LabeledInput from "../controls/LabeledInput";
import Modal from "./Modal";
import MenuItemSimple from "../menuCreateComponents/MenuItemSimple";
import LabeledSelect from "../controls/LabeledSelect";
import MenuItemDropdownMega from "../menuCreateComponents/MenuItemDropdownMega";
import MenuItemDropdown from "../menuCreateComponents/MenuItemDropdown";

// -----------------------------------------------------
// Collect all translation keys
// -----------------------------------------------------
function collectAllKeys(item) {
    const keys = [];

    if (item.labelKey) keys.push(item.labelKey);

    if (item.type === "simple") {
        if (item.badgeKey) keys.push(item.badgeKey);
    }

    if (item.type === "dropdown-simple") {
        for (const sub of item.items || []) {
            if (sub.labelKey) keys.push(sub.labelKey);
            if (sub.badgeKey) keys.push(sub.badgeKey);
        }
    }

    if (item.type === "dropdown-mega") {
        for (const col of item.columns || []) {
            if (col.titleKey) keys.push(col.titleKey);
            for (const sub of col.items || []) {
                if (sub.labelKey) keys.push(sub.labelKey);
                if (sub.badgeKey) keys.push(sub.badgeKey);
            }
        }
    }

    return Array.from(new Set(keys));
}

// -----------------------------------------------------
// Collect only visible translation keys
// -----------------------------------------------------
function collectVisibleKeys(item) {
    const keys = [];

    if (item.visible !== false && item.labelKey) {
        keys.push(item.labelKey);
    }

    if (item.type === "simple") {
        if (item.showBadge && item.badgeKey) keys.push(item.badgeKey);
    }

    if (item.type === "dropdown-simple") {
        for (const sub of item.items || []) {
            if (sub.visible !== false && sub.labelKey) {
                keys.push(sub.labelKey);
                if (sub.showBadge && sub.badgeKey) keys.push(sub.badgeKey);
            }
        }
    }

    if (item.type === "dropdown-mega") {
        for (const col of item.columns || []) {
            if (col.titleKey) keys.push(col.titleKey);

            for (const sub of col.items || []) {
                if (sub.visible !== false && sub.labelKey) {
                    keys.push(sub.labelKey);
                    if (sub.showBadge && sub.badgeKey) keys.push(sub.badgeKey);
                }
            }
        }
    }

    return Array.from(new Set(keys));
}
// -----------------------------------------------------
export default function MenuItemDialog({
                                           title,
                                           initialItem,
                                           onSave,
                                           onClose
                                       }) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [item, setItem] = useState(() => normalizeInitialItem(initialItem));
    const [languages, setLanguages] = useState([]);
    const [translations, setTranslations] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    // -----------------------------------------------------
    // Normalize initial item
    // -----------------------------------------------------
    function normalizeInitialItem(src) {
        if (!src) {
            const id = uuid();
            return {
                id,
                type: "simple",
                visible: true,
                href: "",
                labelKey: `headerMenu.item.${id}.label`,
                badgeKey: null,
                showBadge: false
            };
        }

        // Backward compatibility
        if (!src.labelKey && src.label) {
            return {
                ...src,
                labelKey: src.label
            };
        }

        return {...src};
    }

    // -----------------------------------------------------
    // Generic update
    // -----------------------------------------------------
    function updateItem(updater) {
        setItem(prev => {
            const next = structuredClone(prev);
            updater(next);
            return next;
        });
    }

    function updateTranslation(key, langCode, value) {
        setTranslations(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                [langCode]: value
            }
        }));
    }

    // -----------------------------------------------------
    // Update href
    // -----------------------------------------------------
    function updateHref(path, value) {
        setItem(prev => {
            const next = structuredClone(prev);
            let target = next;
            for (const p of path) target = target[p];
            target.href = value;
            return next;
        });
    }

    // -----------------------------------------------------
    // Update image (mega)
    // -----------------------------------------------------
    function updateImage(field, value) {
        setItem(prev => {
            if (prev.type !== "dropdown-mega") return prev;
            return {
                ...prev,
                image: {
                    ...prev.image,
                    [field]: value
                }
            };
        });
    }

    // -----------------------------------------------------
    // Toggle visible
    // -----------------------------------------------------
    function toggleVisible(path) {
        setItem(prev => {
            const next = structuredClone(prev);
            let target = next;
            for (const p of path) target = target[p];
            target.visible = target.visible === false ? true : !target.visible;
            return next;
        });
    }

    // -----------------------------------------------------
    // Toggle badge
    // -----------------------------------------------------
    function toggleBadge(path, type, itemIndex = null, colIndex = null) {
        setItem(prev => {
            const next = structuredClone(prev);
            let target = next;
            for (const p of path) target = target[p];

            if (!target.badgeKey) {
                const id = next.id;

                if (type === "simple") {
                    target.badgeKey = `headerMenu.item.${id}.badge`;
                } else if (type === "dropdown-simple") {
                    target.badgeKey = `headerMenu.item.${id}.item${itemIndex}.badge`;
                } else if (type === "dropdown-mega") {
                    target.badgeKey = `headerMenu.item.${id}.column${colIndex}.item${itemIndex}.badge`;
                }

                target.showBadge = true;
                return next;
            }

            target.showBadge = !target.showBadge;
            if (!target.showBadge) target.badgeKey = null;

            return next;
        });
    }

    // -----------------------------------------------------
    // Add/remove items & columns
    // -----------------------------------------------------
    function addSimpleItem() {
        if (item.type !== "dropdown-simple") return;
        updateItem(next => {
            const idx = next.items.length;
            next.items.push({
                labelKey: `headerMenu.item.${next.id}.item${idx}.label`,
                href: "",
                visible: true,
                badgeKey: null,
                showBadge: false
            });
        });
    }

    function removeSimpleItem(i) {
        if (item.type !== "dropdown-simple") return;
        updateItem(next => {
            next.items.splice(i, 1);
        });
    }

    function addColumn() {
        if (item.type !== "dropdown-mega") return;
        updateItem(next => {
            const c = next.columns.length;
            next.columns.push({
                titleKey: `headerMenu.item.${next.id}.column${c}.title`,
                items: [{
                    labelKey: `headerMenu.item.${next.id}.column${c}.item0.label`,
                    href: "",
                    visible: true,
                    badgeKey: null,
                    showBadge: false
                }]
            });
        });
    }

    function removeColumn(c) {
        if (item.type !== "dropdown-mega") return;
        updateItem(next => {
            next.columns.splice(c, 1);
        });
    }

    function addMegaItem(c) {
        if (item.type !== "dropdown-mega") return;
        updateItem(next => {
            const col = next.columns[c];
            const s = col.items.length;
            col.items.push({
                labelKey: `headerMenu.item.${next.id}.column${c}.item${s}.label`,
                href: "",
                visible: true,
                badgeKey: null,
                showBadge: false
            });
        });
    }

    function removeMegaItem(c, s) {
        if (item.type !== "dropdown-mega") return;
        updateItem(next => {
            next.columns[c].items.splice(s, 1);
        });
    }

    // -----------------------------------------------------
    // Change type
    // -----------------------------------------------------
    function updateType(newType) {
        updateItem(current => {
            const id = current.id;

            if (newType === "simple") {
                return Object.assign(current, {
                    type: "simple",
                    href: current.href || "",
                    labelKey: current.labelKey,
                    visible: current.visible !== false,
                    badgeKey: current.badgeKey || null,
                    showBadge: !!current.showBadge
                });
            }

            if (newType === "dropdown-simple") {
                current.type = "dropdown-simple";
                current.items = current.items?.length
                    ? current.items
                    : [{
                        labelKey: `headerMenu.item.${id}.item0.label`,
                        href: "",
                        visible: true,
                        badgeKey: null,
                        showBadge: false
                    }];
                return current;
            }

            if (newType === "dropdown-mega") {
                current.type = "dropdown-mega";
                current.columns = current.columns?.length
                    ? current.columns
                    : [{
                        titleKey: `headerMenu.item.${id}.column0.title`,
                        items: [{
                            labelKey: `headerMenu.item.${id}.column0.item0.label`,
                            href: "",
                            visible: true,
                            badgeKey: null,
                            showBadge: false
                        }]
                    }];
                current.image = {
                    src: current.image?.src || "",
                    position: current.image?.position || "right"
                };
                return current;
            }
        });
    }

    // -----------------------------------------------------
    // Validation
    // -----------------------------------------------------
    function validate() {
        const visibleKeys = collectVisibleKeys(item);
        const newErrors = {};
        let hasError = false;

        // translations
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

        // href validation
        function isValidUrl(input) {
            if (!input || typeof input !== "string") return false;
            const url = input.trim();

            try {
                new URL(url);
                return true;
            } catch {}

            if (/^\/[A-Za-z0-9._~!$&'()*+,;=:@/%?-]*$/.test(url)) return true;
            if (/^[A-Za-z0-9._~!$&'()*+,;=:@/%?-]+$/.test(url)) return true;
            if (/^\?[A-Za-z0-9._~!$&'()*+,;=:@/%?-]*$/.test(url)) return true;
            if (/^#[A-Za-z0-9._~!$&'()*+,;=:@/%?-]+$/.test(url)) return true;

            return false;
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
            item.items.forEach((sub, i) => {
                validateHref(["items", i, "href"], sub.href);
            });
        }

        if (item.type === "dropdown-mega") {
            item.columns.forEach((col, c) => {
                col.items.forEach((sub, s) => {
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

    // -----------------------------------------------------
    // Backend sync
    // -----------------------------------------------------
    async function saveTranslationsToBackend(allKeysBefore, visibleKeysNow) {
        const itemsPayload = [];

        for (const key of visibleKeysNow) {
            const langs = translations[key] || {};
            for (const lang of languages) {
                itemsPayload.push({
                    key,
                    lang: lang.code,
                    value: langs[lang.code] ?? ""
                });
            }
        }

        await fetch(`${API_URL}/translations`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({items: itemsPayload})
        });

        const removedKeys = allKeysBefore.filter(k => !visibleKeysNow.includes(k));

        if (removedKeys.length) {
            await fetch(`${API_URL}/translations`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({keys: removedKeys})
            });
        }
    }

    async function handleSave() {
        const allKeysBefore = collectAllKeys(initialItem || {});
        const visibleKeysNow = collectVisibleKeys(item);

        if (!validate()) return;

        await saveTranslationsToBackend(allKeysBefore, visibleKeysNow);

        onSave(item);
        showToast("Пункт меню сохранён");
        onClose();
    }

    // -----------------------------------------------------
    // Load languages + translations
    // -----------------------------------------------------
    async function loadLanguages() {
        const res = await fetch(`${API_URL}/languages`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        return await res.json();
    }

    async function loadTranslationsForKeys(keys, langs) {
        const result = {};

        for (const key of keys) {
            const res = await fetch(`${API_URL}/translations?key=${encodeURIComponent(key)}`, {
                headers: {Authorization: `Bearer ${accessToken}`}
            });
            const data = await res.json();
            result[key] = {};
            langs.forEach(lang => {
                result[key][lang.code] = data[lang.code] || "";
            });
        }

        return result;
    }

    useEffect(() => {
        (async () => {
            try {
                const langs = await loadLanguages();
                setLanguages(langs);

                const keys = collectAllKeys(item);
                const t = await loadTranslationsForKeys(keys, langs);
                setTranslations(t);
            } catch {
                setError("Не удалось загрузить данные");
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // -----------------------------------------------------
    // Render translation inputs
    // -----------------------------------------------------
    function renderTranslationInputs(key, label) {
        return (
            <div className="translation-block">
                {label && <div className="translation-label">{label}</div>}
                {languages.map(lang => (
                    <LabeledInput
                        key={lang.code}
                        label={lang.code.toUpperCase()}
                        value={translations[key]?.[lang.code] ?? ""}
                        onChange={v => updateTranslation(key, lang.code, v)}
                        error={fieldErrors[key]?.[lang.code] ?? ""}
                    />
                ))}
            </div>
        );
    }

    // -----------------------------------------------------
    // Render
    // -----------------------------------------------------
    if (loading) {
        return (
            <Modal open={true} onClose={onClose}>
                <div className="dialog__window">
                    <h2>Загрузка…</h2>
                </div>
            </Modal>
        );
    }

    return (
        <Modal open={true} title={title} onClose={onClose} width={800} className="menu-modal">
            {error && <div className="field-error">{error}</div>}

            <LabeledSelect
                label="Тип меню"
                value={item.type}
                onChange={updateType}
                className="menu-modal__select"
                options={[
                    {value: "simple", label: "Простое"},
                    {value: "dropdown-simple", label: "Выпадающее меню"},
                    {value: "dropdown-mega", label: "Мега-меню"}
                ]}
            />

            {item.type === "simple" && (
                <MenuItemSimple
                    item={item}
                    toggleVisible={toggleVisible}
                    renderTranslationInputs={renderTranslationInputs}
                    updateHref={updateHref}
                    toggleBadge={toggleBadge}
                    fieldErrors={fieldErrors}
                />
            )}

            {item.type === "dropdown-simple" && (
                <MenuItemDropdown
                    item={item}
                    toggleVisible={toggleVisible}
                    renderTranslationInputs={renderTranslationInputs}
                    updateHref={updateHref}
                    toggleBadge={toggleBadge}
                    removeSimpleItem={removeSimpleItem}
                    addSimpleItem={addSimpleItem}
                    fieldErrors={fieldErrors}
                />
            )}

            {item.type === "dropdown-mega" && (
                <MenuItemDropdownMega
                    item={item}
                    toggleVisible={toggleVisible}
                    renderTranslationInputs={renderTranslationInputs}
                    updateHref={updateHref}
                    toggleBadge={toggleBadge}
                    addColumn={addColumn}
                    removeColumn={removeColumn}
                    addMegaItem={addMegaItem}
                    removeMegaItem={removeMegaItem}
                    updateImage={updateImage}
                    fieldErrors={fieldErrors}
                />
            )}

            <button className="button button_accept" onClick={handleSave}>
                Сохранить
            </button>
        </Modal>
    );
}
