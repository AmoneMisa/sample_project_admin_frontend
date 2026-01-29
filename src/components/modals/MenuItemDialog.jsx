import {useEffect, useState} from "react";
import LabeledInput from "../controls/LabeledInput";
import LabeledSelect from "../controls/LabeledSelect";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";
import {useTranslations} from "../../hooks/useTranslations";
import {useAuditLog} from "../../hooks/useAuditLog";
import {v4 as uuid} from "uuid";
import MenuItemSimple from "../menuCreateComponents/MenuItemSimple";
import MenuItemDropdown from "../menuCreateComponents/MenuItemDropdown";
import MenuItemDropdownMega from "../menuCreateComponents/MenuItemDropdownMega";
import Modal from "./Modal";


// -----------------------------------------------------
// Collect all translation keys
// -----------------------------------------------------
function collectAllKeys(item) {
    const keys = [];

    function walk(node) {
        if (!node || typeof node !== "object") return;

        if (node.labelKey) keys.push(node.labelKey);
        if (node.titleKey) keys.push(node.titleKey);
        if (node.showBadge && node.badgeKey) keys.push(node.badgeKey);

        if (Array.isArray(node.items)) node.items.forEach(walk);
        if (Array.isArray(node.columns)) {
            node.columns.forEach(col => {
                walk(col);
                if (Array.isArray(col.items)) col.items.forEach(walk);
            });
        }
    }

    walk(item);
    return keys;
}

// -----------------------------------------------------
// Collect only visible keys
// -----------------------------------------------------
function collectVisibleKeys(item) {
    const keys = [];

    function walk(node) {
        if (!node || typeof node !== "object") return;

        if (node.labelKey) keys.push(node.labelKey);
        if (node.titleKey) keys.push(node.titleKey);
        if (node.showBadge && node.badgeKey) keys.push(node.badgeKey);

        if (Array.isArray(node.items)) node.items.forEach(walk);
        if (Array.isArray(node.columns)) {
            node.columns.forEach(col => {
                walk(col);
                if (Array.isArray(col.items)) col.items.forEach(walk);
            });
        }
    }

    walk(item);
    return keys;
}

export default function MenuItemDialog({initialItem, onSave, onClose, title}) {
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const {
        translations,
        languages,
        loadAllTranslations,
        saveValue,
        deleteKeys
    } = useTranslations(useAuditLog());

    const [loading, setLoading] = useState(true);
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState("");

    // -----------------------------------------------------
    // Normalize initial item
    // -----------------------------------------------------
    const [item, setItem] = useState(() => {
        if (!initialItem) {
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

        if (!initialItem.labelKey && initialItem.label) {
            return {...initialItem, labelKey: initialItem.label};
        }

        return structuredClone(initialItem);
    });

    // -----------------------------------------------------
    // Load translations
    // -----------------------------------------------------
    useEffect(() => {
        (async () => {
            await loadAllTranslations();
            setLoading(false);
        })();
    }, [accessToken]);

    // -----------------------------------------------------
    // Update helpers
    // -----------------------------------------------------
    function updateItem(updater) {
        setItem(prev => {
            const next = structuredClone(prev);
            updater(next);
            return next;
        });
    }

    function updateTranslation(key, lang, value) {
        saveValue(key, lang, value);
    }

    function updateHref(path, value) {
        updateItem(next => {
            let target = next;
            for (const p of path) target = target[p];
            target.href = value;
        });
    }

    function toggleVisible(path) {
        updateItem(next => {
            let target = next;
            for (const p of path) target = target[p];
            target.visible = target.visible === false ? true : !target.visible;
        });
    }

    function toggleBadge(path, type, itemIndex = null, colIndex = null) {
        updateItem(next => {
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
                return;
            }

            target.showBadge = !target.showBadge;
            if (!target.showBadge) target.badgeKey = null;
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
        updateItem(next => next.items.splice(i, 1));
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
        updateItem(next => next.columns.splice(c, 1));
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
        updateItem(next => next.columns[c].items.splice(s, 1));
    }

    function updateImage(field, value) {
        updateItem(next => {
            if (!next.image) next.image = {};
            next.image[field] = value;
        });
    }

    // -----------------------------------------------------
    // Change type
    // -----------------------------------------------------
    function updateType(newType) {
        updateItem(current => {
            const id = current.id;

            if (newType === "simple") {
                Object.assign(current, {
                    type: "simple",
                    href: current.href || "",
                    labelKey: current.labelKey,
                    visible: current.visible !== false,
                    badgeKey: current.badgeKey || null,
                    showBadge: !!current.showBadge
                });
                delete current.items;
                delete current.columns;
                delete current.image;
                return;
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
                delete current.columns;
                delete current.image;
                return;
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
                delete current.items;

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
            for (const lang of languages) {
                const v = translations[key]?.[lang.code];
                if (!v || !v.trim()) {
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
    // Save
    // -----------------------------------------------------
    async function handleSave() {
        const allBefore = collectAllKeys(initialItem || {});
        const visibleNow = collectVisibleKeys(item);

        if (!validate()) return;

        // save translations
        for (const key of visibleNow) {
            for (const lang of languages) {
                const value = translations[key]?.[lang.code] || "";
                await saveValue(key, lang.code, value);
            }
        }

        // delete removed keys
        const removed = allBefore.filter(k => !visibleNow.includes(k));
        if (removed.length) {
            await deleteKeys(removed);
        }

        onSave(item);
        showToast("Пункт меню сохранён");
        onClose();
    }

    // -----------------------------------------------------
    // Render translation inputs
    // -----------------------------------------------------
    function renderTranslationInputs(key, label) {
        const fe = fieldErrors || {};

        return (
            <div className="translation-block">
                {label && <div className="translation-label">{label}</div>}
                {languages.map(lang => (
                    <LabeledInput
                        key={lang.code}
                        label={lang.code.toUpperCase()}
                        value={translations[key]?.[lang.code] ?? ""}
                        onChange={(v) => updateTranslation(key, lang.code, v)}
                        error={fe[key]?.[lang.code] ?? ""}
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
