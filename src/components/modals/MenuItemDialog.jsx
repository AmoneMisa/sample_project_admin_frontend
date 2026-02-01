import {useEffect, useState} from "react";
import {useToast} from "../layout/ToastContext";
import {useTranslations} from "../../hooks/useTranslations";
import LabeledSelect from "../controls/LabeledSelect";
import MultilangInput from "../controls/MultilangInput";
import Modal from "./Modal";
import MenuItemSimple from "../menuCreateComponents/MenuItemSimple";
import MenuItemDropdown from "../menuCreateComponents/MenuItemDropdown";
import MenuItemDropdownMega from "../menuCreateComponents/MenuItemDropdownMega";

export default function MenuItemDialog({
                                           initialItem,
                                           onSave,
                                           onClose,
                                           title,
                                           badges = []
                                       }) {
    const {showToast} = useToast();

    const {
        languages,
        loadLanguages,
        loadAllTranslations,
        translationMaps,
        createKeysBatch,
        updateKeysBatch
    } = useTranslations({});

    const [, setLoading] = useState(true);
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState("");

    const makeLabelKey = (id, type) => `headerMenu.${id}.${type}.label`;
    const makeSimpleItemKey = (id, i) => `headerMenu.${id}.dropdown-simple.item.${i}.title`;
    const makeColumnTitleKey = (id, c) => `headerMenu.${id}.dropdown-mega.column.${c}.title`;
    const makeMegaItemKey = (id, c, s) => `headerMenu.${id}.dropdown-mega.column.${c}.item.${s}.title`;

    const [item, setItem] = useState(() => {
        if (!initialItem) {
            return {
                id: null,
                type: "simple",
                visible: true,
                href: "",
                labelKey: null,
                badgeId: ""
            };
        }

        const next = structuredClone(initialItem);
        if (next.badgeId == null) next.badgeId = "";
        delete next.badgeKey;
        delete next.showBadge;

        const walk = (node) => {
            if (!node) return;
            if (node.badgeId == null) node.badgeId = "";
            delete node.badgeKey;
            delete node.showBadge;
            if (node.items) node.items.forEach(walk);
            if (node.columns) node.columns.forEach(col => col.items.forEach(walk));
        };
        walk(next);

        return next;
    });

    const [localMaps, setLocalMaps] = useState({});

    useEffect(() => {
        loadLanguages();
        loadAllTranslations();
    }, []);

    useEffect(() => {
        if (!Object.keys(translationMaps).length) return;

        const maps = {};
        const collect = (key) => {
            maps[key] = {...(translationMaps[key] || {})};
        };

        const walk = (node) => {
            if (!node) return;
            if (node.labelKey) collect(node.labelKey);
            if (node.items) node.items.forEach(walk);
            if (node.columns) {
                node.columns.forEach(col => {
                    collect(col.titleKey);
                    col.items.forEach(walk);
                });
            }
        };

        walk(item);
        setLocalMaps(maps);
        setLoading(false);
    }, [translationMaps]);

    const updateItem = (fn) => {
        setItem(prev => {
            const next = structuredClone(prev);
            fn(next);
            return next;
        });
    };

    const updateTranslation = (key, nextMap) => {
        setLocalMaps(prev => ({
            ...prev,
            [key]: nextMap
        }));
    };

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
            const values = localMaps[key] || {};
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

    const handleSave = async () => {
        if (!validate()) return;

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

    return (
        <Modal open={true} onClose={onClose} width={800}>
            <h2 className={"modal__header"}>{title}</h2>

            {error && (
                <div style={{color: "red", marginBottom: 12}}>
                    {error}
                </div>
            )}

            <LabeledSelect
                label="Тип"
                value={item.type}
                onChange={(v) =>
                    updateItem(n => {
                        const id = n.id;
                        if (!id) return;

                        if (v === "simple") {
                            n.type = "simple";
                            n.labelKey = makeLabelKey(id, "simple");
                            n.badgeId = n.badgeId ?? "";
                            n.items = undefined;
                            n.columns = undefined;
                            n.image = undefined;
                        }

                        if (v === "dropdown-simple") {
                            n.type = "dropdown-simple";
                            n.labelKey = makeLabelKey(id, "dropdown-simple");
                            n.badgeId = n.badgeId ?? "";
                            n.items = n.items?.length
                                ? n.items
                                : [{
                                    labelKey: makeSimpleItemKey(id, 0),
                                    href: "",
                                    visible: true,
                                    badgeId: ""
                                }];
                            n.columns = undefined;
                            n.image = undefined;
                        }

                        if (v === "dropdown-mega") {
                            n.type = "dropdown-mega";
                            n.labelKey = makeLabelKey(id, "dropdown-mega");
                            n.badgeId = n.badgeId ?? "";
                            n.columns = n.columns?.length
                                ? n.columns
                                : [{
                                    titleKey: makeColumnTitleKey(id, 0),
                                    items: [{
                                        labelKey: makeMegaItemKey(id, 0, 0),
                                        href: "",
                                        visible: true,
                                        badgeId: "" // <-- новое
                                    }]
                                }];
                            n.items = undefined;
                            n.image = {
                                src: n.image?.src || "",
                                position: n.image?.position || "right"
                            };
                        }
                    })
                }
                options={[
                    {value: "simple", label: "Простой"},
                    {value: "dropdown-simple", label: "Выпадающий"},
                    {value: "dropdown-mega", label: "Мега-меню"}
                ]}
            />

            <MultilangInput
                label="Название меню"
                placeholder={"Название меню"}
                languages={languages.map(l => l.code)}
                valueMap={localMaps[item.labelKey] || {}}
                onChange={(m) => updateTranslation(item.labelKey, m)}
            />

            {item.type === "simple" && (
                <MenuItemSimple
                    item={item}
                    updateItem={updateItem}
                    translationMaps={localMaps}
                    updateTranslation={updateTranslation}
                    languages={languages.map(l => l.code)}
                    fieldErrors={fieldErrors}
                    badges={badges}
                />
            )}

            {item.type === "dropdown-simple" && (
                <MenuItemDropdown
                    item={item}
                    updateItem={updateItem}
                    translationMaps={localMaps}
                    updateTranslation={updateTranslation}
                    languages={languages.map(l => l.code)}
                    fieldErrors={fieldErrors}
                    badges={badges}
                />
            )}

            {item.type === "dropdown-mega" && (
                <MenuItemDropdownMega
                    item={item}
                    updateItem={updateItem}
                    translationMaps={localMaps}
                    updateTranslation={updateTranslation}
                    languages={languages.map(l => l.code)}
                    fieldErrors={fieldErrors}
                    badges={badges}
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
