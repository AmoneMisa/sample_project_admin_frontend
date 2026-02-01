import { useState } from "react";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";
import LabeledSelect from "../controls/LabeledSelect";
import Toggle from "../controls/Toggle";
import { FiChevronDown, FiChevronRight, FiPlus, FiTrash } from "react-icons/fi";

const MAX_TITLE_LEN = 80;

export default function MenuItemDropdown({
                                             item,
                                             updateItem,
                                             translationMaps,
                                             updateTranslation,
                                             languages,
                                             fieldErrors,
                                             badges = []
                                         }) {
    const extractErrors = (prefix) => {
        const result = {};
        for (const key in fieldErrors) {
            if (key.startsWith(prefix)) {
                const lang = key.split(".").pop();
                result[lang] = fieldErrors[key];
            }
        }
        return result;
    };

    const badgeOptions = [
        { value: "", label: "Нет" },
        ...badges.map(b => ({ value: b.id, label: b.label }))
    ];

    const [collapsedItems, setCollapsedItems] = useState(() => ({})); // { [i]: true }

    const toggleItem = (i) =>
        setCollapsedItems(prev => ({ ...prev, [i]: !prev[i] }));

    const trimToMax = (value) => {
        if (value == null) return "";
        const s = String(value);
        return s.length > MAX_TITLE_LEN ? s.slice(0, MAX_TITLE_LEN) : s;
    };

    const normalizeMapToMax = (map) => {
        const next = { ...(map || {}) };
        for (const lang of languages) {
            if (typeof next[lang] === "string") next[lang] = trimToMax(next[lang]);
        }
        return next;
    };

    const getPreviewText = (key) => {
        const map = translationMaps?.[key] || {};
        for (const lang of languages) {
            const v = (map?.[lang] ?? "").toString().trim();
            if (v) return v;
        }
        for (const k of Object.keys(map)) {
            const v = (map?.[k] ?? "").toString().trim();
            if (v) return v;
        }
        return "Нет текста";
    };

    const addItem = () =>
        updateItem(n => {
            const i = n.items.length;
            n.items.push({
                labelKey: `headerMenu.${n.id}.dropdown-simple.item.${i}.title`,
                href: "",
                visible: true,
                badgeId: ""
            });
            setCollapsedItems(prev => ({ ...prev, [i]: false }));
        });

    const removeItem = (i) =>
        updateItem(n => {
            n.items.splice(i, 1);
        });

    return (
        <>
            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <Toggle
                        label="Отображать меню"
                        checked={item.visible !== false}
                        onChange={() =>
                            updateItem(n => {
                                n.visible = n.visible === false ? true : !n.visible;
                            })
                        }
                    />
                </div>
            </div>

            <div className="menu-modal__row">
                <div className="menu-modal__row-item menu-modal__row_col">
                    {item.items.map((sub, i) => {
                        const itemCollapsed = collapsedItems[i] === true;
                        const labelErrors = extractErrors(`items.${i}.label`);
                        const preview = getPreviewText(sub.labelKey);

                        return (
                            <div key={i} className="menu-modal__sub-item menu-modal__sub-item_col">
                                <div className="menu-modal__sub-item-row menu-modal__sub-item-row_between">
                                    <div className="menu-modal__sub-item-row_grow">
                                        {!itemCollapsed ? (
                                            <MultilangInput
                                                placeholder={`Название пункта ${i + 1}`}
                                                languages={languages}
                                                valueMap={translationMaps[sub.labelKey] || {}}
                                                errors={labelErrors}
                                                onChange={(next) =>
                                                    updateTranslation(sub.labelKey, normalizeMapToMax(next))
                                                }
                                            />
                                        ) : (
                                            <div className="menu-modal__collapsed-preview">{preview}</div>
                                        )}
                                    </div>

                                    <div className="menu-modal__sub-item-row" style={{ width: "auto", alignSelf: "start" }}>
                                        <button
                                            type="button"
                                            className="button button_icon"
                                            title={itemCollapsed ? "Развернуть пункт" : "Свернуть пункт"}
                                            onClick={() => toggleItem(i)}
                                        >
                                            {itemCollapsed ? <FiChevronRight size={16} /> : <FiChevronDown size={16} />}
                                        </button>

                                        <Toggle
                                            title="Отображать пункт"
                                            checked={sub.visible !== false}
                                            onChange={() =>
                                                updateItem(n => {
                                                    const cur = n.items[i].visible;
                                                    n.items[i].visible = cur === false ? true : !cur;
                                                })
                                            }
                                        />

                                        <button
                                            type="button"
                                            className="button button_icon button_reject"
                                            title="Удалить пункт"
                                            onClick={() => removeItem(i)}
                                        >
                                            <FiTrash size={16} />
                                        </button>
                                    </div>
                                </div>

                                {!itemCollapsed && (
                                    <>
                                        <div className="menu-modal__sub-item-row">
                                            <div className="menu-modal__sub-item-row_fixed" style={{ alignSelf: "end" }}>
                                                <LabeledSelect
                                                    label="Бейдж"
                                                    value={sub.badgeId ?? ""}
                                                    onChange={(v) =>
                                                        updateItem(n => {
                                                            n.items[i].badgeId = v || "";
                                                        })
                                                    }
                                                    options={badgeOptions}
                                                />
                                            </div>

                                            <div className="menu-modal__sub-item-row">
                                                <LabeledInput
                                                    label="Ссылка"
                                                    placeholder="/category"
                                                    value={sub.href}
                                                    onChange={(v) =>
                                                        updateItem(n => {
                                                            n.items[i].href = v;
                                                        })
                                                    }
                                                    error={fieldErrors[`items.${i}.href`] ?? ""}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}

                    <button type="button" className="button button_secondary" onClick={addItem}>
                        <FiPlus style={{ marginRight: 8 }} size={16} />
                        Добавить пункт
                    </button>
                </div>
            </div>
        </>
    );
}
