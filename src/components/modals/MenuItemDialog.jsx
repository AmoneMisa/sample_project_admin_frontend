import {useEffect, useState} from "react";
import Modal from "./Modal";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";
import LabeledSelect from "../controls/LabeledSelect";
import Checkbox from "../controls/Checkbox";
import {useAuth} from "../../hooks/authContext";
import {useToast} from "../layout/ToastContext";
import {v4 as uuid} from "uuid";
import {useTranslations} from "../../hooks/useTranslations";
import MenuItemDropdownMega from "../menuCreateComponents/MenuItemDropdownMega";
import MenuItemDropdown from "../menuCreateComponents/MenuItemDropdown";
import MenuItemSimple from "../menuCreateComponents/MenuItemSimple";

export default function MenuItemDialog({initialItem, onSave, onClose, title}) {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const {
        languages,
        translations,
        loadAllTranslations,
        createKeysBatch,
        updateKeysBatch
    } = useTranslations({});

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

    const [translationMaps, setTranslationMaps] = useState({});

    useEffect(() => {
        (async () => {
            await loadAllTranslations();

            const maps = {};
            const collect = (key) => {
                maps[key] = {...(translations[key] || {})};
            };

            const walk = (node) => {
                if (!node) return;
                if (node.labelKey) collect(node.labelKey);
                if (node.badgeKey) collect(node.badgeKey);
                if (node.items) node.items.forEach(walk);
                if (node.columns) {
                    node.columns.forEach(col => {
                        collect(col.titleKey);
                        col.items.forEach(walk);
                    });
                }
            };

            walk(item);
            setTranslationMaps(maps);
            setLoading(false);
        })();
    }, [loadAllTranslations]);

    const updateItem = (fn) => {
        setItem(prev => {
            const next = structuredClone(prev);
            fn(next);
            return next;
        });
    };

    const updateTranslation = (key, nextMap) => {
        setTranslationMaps(prev => ({
            ...prev,
            [key]: nextMap
        }));
    };

    const makeLabelKey = (rootId, type) =>
        `headerMenu.${rootId}.${type}.label`;

    const makeSimpleItemKey = (rootId, i) =>
        `headerMenu.${rootId}.dropdown-simple.item.${i}.title`;
    const makeColumnTitleKey = (rootId, c) =>
        `headerMenu.${rootId}.dropdown-mega.column.${c}.title`;

    const makeMegaItemKey = (rootId, c, s) =>
        `headerMenu.${rootId}.dropdown-mega.column.${c}.item.${s}.title`;
    const validate = () => {
        const errs = {};
        let hasError = false;

        const isValidUrl = (input) => {
            if (!input || typeof input !== "string") return false;
            const url = input.trim();
            try {
                new URL(url);
                return true;
            } catch {
            }
            if (/^\/[A-Za-z0-9._~!$&'()*+,;=:@/%?-]*$/.test(url)) return true;
            if (/^[A-Za-z0-9._~!$&'()*+,;=:@/%?-]+$/.test(url)) return true;
            if (/^\?[A-Za-z0-9._~!$&'()*+,;=:@/%?-]*$/.test(url)) return true;
            if (/^#[A-Za-z0-9._~!$&'()*+,;=:@/%?-]+$/.test(url)) return true;
            return false;
        };

        const validateHref = (path, href) => {
            const key = path.join(".");
            if (!href || href.trim() === "") {
                errs[key] = "Поле обязательно";
                hasError = true;
            } else if (!isValidUrl(href)) {
                errs[key] = "Некорректная ссылка";
                hasError = true;
            }
        };

        if (item.type === "simple") validateHref(["href"], item.href);

        if (item.type === "dropdown-simple") {
            item.items.forEach((sub, i) =>
                validateHref(["items", i, "href"], sub.href)
            );
        }

        if (item.type === "dropdown-mega") {
            item.columns.forEach((col, c) => {
                col.items.forEach((sub, s) =>
                    validateHref(["columns", c, "items", s, "href"], sub.href)
                );
            });
            if (item.image?.src) validateHref(["image", "src"], item.image.src);
        }

        setFieldErrors(errs);

        if (hasError) {
            setError("Исправьте ошибки в форме");
            return false;
        }

        setError("");
        return true;
    };

    const collectAllKeys = () => {
        const result = [];

        const add = (key) => {
            const values = translationMaps[key] || {};
            result.push({
                key,
                values: Object.fromEntries(
                    languages.map(l => [l.code, values[l.code] || ""])
                )
            });
        };

        const walk = (node) => {
            if (!node) return;
            if (node.labelKey) add(node.labelKey);
            if (node.badgeKey) add(node.badgeKey);
            if (node.items) node.items.forEach(walk);
            if (node.columns) {
                node.columns.forEach(col => {
                    add(col.titleKey);
                    col.items.forEach(walk);
                });
            }
        };

        walk(item);
        return result;
    };

    const saveItem = async () => {
        if (initialItem) {
            await fetch(`${API_URL}/menu/${item.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(item)
            });
            return item.id;
        }

        const res = await fetch(`${API_URL}/menu`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(item)
        });

        const created = await res.json();
        return created.id;
    };

    const handleSave = async () => {
        if (!validate()) return;

        const id = await saveItem();
        const payload = collectAllKeys();

        if (initialItem) {
            await updateKeysBatch(
                payload.flatMap(item =>
                    Object.entries(item.values).map(([lang, value]) => ({
                        key: item.key,
                        lang,
                        value
                    }))
                )
            );
        } else {
            await createKeysBatch(payload);
        }

        showToast("Пункт меню сохранён");
        onSave(item);
        onClose();
    };

    if (loading || !languages.length) {
        return (
            <Modal open={true} onClose={onClose}>
                <h2>Загрузка…</h2>
            </Modal>
        );
    }

    return (
        <Modal open={true} onClose={onClose} width={800}>
            <h2>{title}</h2>

            {error && (
                <div style={{color: "red", marginBottom: 12}}>
                    {error}
                </div>
            )}

            <LabeledSelect
                label="Тип"
                value={item.type}
                onChange={(v) => updateItem(n => {
                    const rootId = n.id;
                    if (v === "simple") {
                        n.type = "simple";
                        n.labelKey = makeLabelKey(rootId, "simple");
                        n.items = undefined;
                        n.columns = undefined;
                        n.image = undefined;
                    }
                    if (v === "dropdown-simple") {
                        n.type = "dropdown-simple";
                        n.labelKey = makeLabelKey(rootId, "dropdown-simple");
                        n.items = n.items?.length ? n.items : [{
                            labelKey: makeSimpleItemKey(rootId, 0),
                            href: "",
                            visible: true,
                            badgeKey: null,
                            showBadge: false
                        }];
                        n.columns = undefined;
                        n.image = undefined;
                    }
                    if (v === "dropdown-mega") {
                        n.type = "dropdown-mega";
                        n.labelKey = makeLabelKey(rootId, "dropdown-mega");
                        n.columns = n.columns?.length ? n.columns : [{
                            titleKey: makeColumnTitleKey(rootId, 0),
                            items: [{
                                labelKey: makeMegaItemKey(rootId, 0, 0),
                                href: "",
                                visible: true,
                                badgeKey: null,
                                showBadge: false
                            }]
                        }];
                        n.items = undefined;
                        n.image = {
                            src: n.image?.src || "",
                            position: n.image?.position || "right"
                        };
                    }
                })}
                options={[
                    {value: "simple", label: "Простой"},
                    {value: "dropdown-simple", label: "Выпадающий простой"},
                    {value: "dropdown-mega", label: "Мега-меню"}
                ]}
            />

            <MultilangInput
                label="Название"
                languages={languages.map(l => l.code)}
                valueMap={translationMaps[item.labelKey]}
                onChange={(m) => updateTranslation(item.labelKey, m)}
            />

            {item.type === "simple" && (
                <MenuItemSimple
                    item={item}
                    updateItem={updateItem}
                    translationMaps={translationMaps}
                    updateTranslation={updateTranslation}
                    languages={languages.map(l => l.code)}
                    fieldErrors={fieldErrors}
                />
            )}

            {item.type === "dropdown-simple" && (
                <MenuItemDropdown
                    item={item}
                    updateItem={updateItem}
                    translationMaps={translationMaps}
                    updateTranslation={updateTranslation}
                    languages={languages.map(l => l.code)}
                    fieldErrors={fieldErrors}
                />
            )}

            {item.type === "dropdown-mega" && (
                <MenuItemDropdownMega
                    item={item}
                    updateItem={updateItem}
                    translationMaps={translationMaps}
                    updateTranslation={updateTranslation}
                    languages={languages.map(l => l.code)}
                    fieldErrors={fieldErrors}
                />
            )}

            <div className="modal__actions">
                <button className="button button_accept" onClick={handleSave}>
                    Сохранить
                </button>
                <button className="button button_reject" onClick={onClose}>
                    Отменить
                </button>
            </div>
        </Modal>
    );
}
