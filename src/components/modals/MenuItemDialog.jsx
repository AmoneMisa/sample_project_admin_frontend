import {useEffect, useState} from "react";
import {v4 as uuid} from "uuid";
import LabeledSelect from "../controls/LabeledSelect";
import {useToast} from "../layout/ToastContext";
import {useTranslations} from "../../hooks/useTranslations";
import {useAuditLog} from "../../hooks/useAuditLog";
import Modal from "./Modal";
import MenuItemSimple from "../menuCreateComponents/MenuItemSimple";
import MenuItemDropdown from "../menuCreateComponents/MenuItemDropdown";
import MenuItemDropdownMega from "../menuCreateComponents/MenuItemDropdownMega";

export default function MenuItemDialog({initialItem, onSave, onClose, title}) {
    const {showToast} = useToast();

    const {
        translations,
        languages,
        loadAllTranslations,
        saveValue
    } = useTranslations(useAuditLog());

    const [loading, setLoading] = useState(true);
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState("");

    const [item, setItem] = useState(() => {
        if (!initialItem) {
            const rootId = uuid();
            return {
                id: rootId,
                type: "simple",
                visible: true,
                href: "",
                labelKey: `headerMenu.${rootId}.simple.label`,
                badgeKey: null,
                showBadge: false
            };
        }
        return structuredClone(initialItem);
    });

    useEffect(() => {
        (async () => {
            await loadAllTranslations();
            setLoading(false);
        })();
    }, [loadAllTranslations]);

    function updateItem(updater) {
        setItem(prev => {
            const next = structuredClone(prev);
            updater(next);
            return next;
        });
    }

    function updateTranslation(labelKey, nextValueMap) {
        for (const lang of languages) {
            const v = nextValueMap[lang.code] ?? "";
            saveValue(labelKey, lang.code, v);
        }
    }

    function makeLabelKey(rootId, type) {
        return `headerMenu.${rootId}.${type}.label`;
    }

    function makeSimpleItemKey(rootId, i) {
        return `headerMenu.${rootId}.dropdown-simple.item.${i}.title`;
    }

    function makeSimpleBadgeKey(rootId, i) {
        return `headerMenu.${rootId}.dropdown-simple.item.${i}.badge`;
    }

    function makeColumnTitleKey(rootId, c) {
        return `headerMenu.${rootId}.dropdown-mega.column.${c}.title`;
    }

    function makeMegaItemKey(rootId, c, s) {
        return `headerMenu.${rootId}.dropdown-mega.column.${c}.item.${s}.title`;
    }

    function makeMegaBadgeKey(rootId, c, s) {
        return `headerMenu.${rootId}.dropdown-mega.column.${c}.item.${s}.badge`;
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

            const rootId = next.id;

            if (!target.badgeKey) {
                if (type === "simple") {
                    target.badgeKey = `headerMenu.${rootId}.simple.badge`;
                } else if (type === "dropdown-simple") {
                    target.badgeKey = makeSimpleBadgeKey(rootId, itemIndex);
                } else if (type === "dropdown-mega") {
                    target.badgeKey = makeMegaBadgeKey(rootId, colIndex, itemIndex);
                }
                target.showBadge = true;
                return;
            }

            target.showBadge = !target.showBadge;
            if (!target.showBadge) target.badgeKey = null;
        });
    }

    function addSimpleItem() {
        if (item.type !== "dropdown-simple") return;
        updateItem(next => {
            const i = next.items.length;
            next.items.push({
                labelKey: makeSimpleItemKey(next.id, i),
                href: "",
                visible: true,
                badgeKey: null,
                showBadge: false
            });
        });
    }

    function removeSimpleItem(i) {
        updateItem(next => next.items.splice(i, 1));
    }

    function addColumn() {
        updateItem(next => {
            const c = next.columns.length;
            next.columns.push({
                titleKey: makeColumnTitleKey(next.id, c),
                items: [{
                    labelKey: makeMegaItemKey(next.id, c, 0),
                    href: "",
                    visible: true,
                    badgeKey: null,
                    showBadge: false
                }]
            });
        });
    }

    function removeColumn(c) {
        updateItem(next => next.columns.splice(c, 1));
    }

    function addMegaItem(c) {
        updateItem(next => {
            const col = next.columns[c];
            const s = col.items.length;
            col.items.push({
                labelKey: makeMegaItemKey(next.id, c, s),
                href: "",
                visible: true,
                badgeKey: null,
                showBadge: false
            });
        });
    }

    function removeMegaItem(c, s) {
        updateItem(next => next.columns[c].items.splice(s, 1));
    }

    function updateImage(field, value) {
        updateItem(next => {
            if (!next.image) next.image = {};
            next.image[field] = value;
        });
    }

    function updateType(newType) {
        updateItem(current => {
            const rootId = current.id;

            if (newType === "simple") {
                Object.assign(current, {
                    type: "simple",
                    labelKey: makeLabelKey(rootId, "simple"),
                    href: current.href || "",
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
                current.labelKey = makeLabelKey(rootId, "dropdown-simple");
                current.items = current.items?.length
                    ? current.items
                    : [{
                        labelKey: makeSimpleItemKey(rootId, 0),
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
                current.labelKey = makeLabelKey(rootId, "dropdown-mega");
                current.columns = current.columns?.length
                    ? current.columns
                    : [{
                        titleKey: makeColumnTitleKey(rootId, 0),
                        items: [{
                            labelKey: makeMegaItemKey(rootId, 0, 0),
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

    function validate() {
        const newErrors = {};
        let hasError = false;

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

    async function handleSave() {
        if (!validate()) return;

        onSave(item);
        showToast("Пункт меню сохранён");
        onClose();
    }

    if (loading || !languages.length || !translations) {
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
                    updateHref={updateHref}
                    toggleBadge={toggleBadge}
                    translations={translations}
                    setTranslations={updateTranslation}
                    languages={languages}
                    fieldErrors={fieldErrors}
                />
            )}

            {item.type === "dropdown-simple" && (
                <MenuItemDropdown
                    item={item}
                    toggleVisible={toggleVisible}
                    updateHref={updateHref}
                    toggleBadge={toggleBadge}
                    removeSimpleItem={removeSimpleItem}
                    addSimpleItem={addSimpleItem}
                    translations={translations}
                    setTranslations={updateTranslation}
                    languages={languages}
                    fieldErrors={fieldErrors}
                />
            )}

            {item.type === "dropdown-mega" && (
                <MenuItemDropdownMega
                    item={item}
                    toggleVisible={toggleVisible}
                    updateHref={updateHref}
                    toggleBadge={toggleBadge}
                    addColumn={addColumn}
                    removeColumn={removeColumn}
                    addMegaItem={addMegaItem}
                    removeMegaItem={removeMegaItem}
                    updateImage={updateImage}
                    translations={translations}
                    setTranslations={updateTranslation}
                    languages={languages}
                    fieldErrors={fieldErrors}
                />
            )}

            <button className="button button_accept" onClick={handleSave}>
                Сохранить
            </button>
        </Modal>
    );
}
