import {useState} from "react";
import LabeledSelect from "../controls/LabeledSelect";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";
import {FiChevronDown, FiChevronRight, FiFolder, FiPlus, FiTrash} from "react-icons/fi";
import Toggle from "../controls/Toggle";
import {TbFileDots} from "react-icons/tb";
import {BiCommentDots} from "react-icons/bi";
import {LuFolderDot} from "react-icons/lu";

export default function MenuItemDropdownMega({
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
        {value: "", label: "Нет"},
        ...badges.map(b => ({value: b.id, label: b.label}))
    ];

    const [collapsedLists, setCollapsedLists] = useState(() => ({}));     // { [c]: true }
    const [collapsedItems, setCollapsedItems] = useState(() => ({}));     // { ["c:s"]: true }

    const toggleList = (c) => setCollapsedLists(prev => ({...prev, [c]: !prev[c]}));
    const toggleItem = (c, s) => setCollapsedItems(prev => {
        const k = `${c}:${s}`;
        return {...prev, [k]: !prev[k]};
    });

    const addList = () =>
        updateItem(n => {
            const c = n.columns.length;
            n.columns.push({
                titleKey: `headerMenu.${n.id}.dropdown-mega.column.${c}.title`,
                items: []
            });
            setCollapsedLists(prev => ({...prev, [c]: false}));
        });

    const removeList = (c) =>
        updateItem(n => {
            n.columns.splice(c, 1);
        });

    const addCategory = (c) =>
        updateItem(n => {
            const s = n.columns[c].items.length;
            n.columns[c].items.push({
                labelKey: `headerMenu.${n.id}.dropdown-mega.column.${c}.item.${s}.title`,
                href: "",
                visible: true,
                badgeId: ""
            });
            setCollapsedLists(prev => ({...prev, [c]: false}));
            setCollapsedItems(prev => ({...prev, [`${c}:${s}`]: false}));
        });

    const removeCategory = (c, s) =>
        updateItem(n => {
            n.columns[c].items.splice(s, 1);
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
                <div className="menu-modal__row-item">
                    <LabeledSelect
                        label="Бейдж меню"
                        value={item.badgeId ?? ""}
                        onChange={(v) =>
                            updateItem(n => {
                                n.badgeId = v || "";
                            })
                        }
                        options={badgeOptions}
                    />
                </div>
            </div>

            {item.columns.map((col, c) => {
                const listCollapsed = collapsedLists[c] === true;

                return (
                    <div key={c} className="menu-modal__row">
                        <div className="menu-modal__row-item menu-modal__row_col">
                            <div className="menu-modal__sub-item-row menu-modal__sub-item-row_between">
                                <div className="menu-modal__sub-item-row_grow">
                                    <MultilangInput
                                        placeholder={"Название списка"}
                                        languages={languages}
                                        valueMap={translationMaps[col.titleKey] || {}}
                                        errors={extractErrors(`columns.${c}.title`)}
                                        onChange={(next) => updateTranslation(col.titleKey, next)}
                                    />
                                </div>

                                <div style={{alignSelf: "start", width: "auto"}} className={"menu-modal__sub-item-row"}>
                                    <button
                                        type="button"
                                        className="button button_icon"
                                        title={listCollapsed ? "Развернуть список" : "Свернуть список"}
                                        onClick={() => toggleList(c)}
                                    >
                                        {listCollapsed ? <FiChevronRight size={16}/> : <FiChevronDown size={16}/>}
                                    </button>

                                    <Toggle
                                        title={"Отображать список"}
                                        checked={col.visible !== false}
                                        onChange={() =>
                                            updateItem(n => {
                                                const cur = n.columns[c].visible;
                                                n.columns[c].visible = cur === false ? true : !cur;
                                            })
                                        }
                                    />

                                    <button
                                        type="button"
                                        className="button button_icon button_reject"
                                        title="Удалить список"
                                        onClick={() => removeList(c)}
                                    >
                                        <FiTrash size={16}/>
                                    </button>
                                </div>
                            </div>

                            {!listCollapsed && (
                                <>
                                    {col.items.map((sub, s) => {
                                        const labelErrors = extractErrors(`columns.${c}.items.${s}.label`);
                                        const itemKey = `${c}:${s}`;
                                        const itemCollapsed = collapsedItems[itemKey] === true;

                                        return (
                                            <div key={s} className="menu-modal__sub-item menu-modal__sub-item_col">
                                                <div
                                                    className="menu-modal__sub-item-row menu-modal__sub-item-row_between">
                                                    <div className="menu-modal__sub-item-row_grow">
                                                        <MultilangInput
                                                            languages={languages}
                                                            placeholder={"Название категории"}
                                                            valueMap={translationMaps[sub.labelKey] || {}}
                                                            errors={labelErrors}
                                                            onChange={(next) => updateTranslation(sub.labelKey, next)}
                                                        />
                                                    </div>
                                                    <div className="menu-modal__sub-item-row"
                                                         style={{width: "auto", alignSelf: "start"}}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="button button_icon"
                                                            title={itemCollapsed ? "Развернуть пункт" : "Свернуть пункт"}
                                                            onClick={() => toggleItem(c, s)}
                                                        >
                                                            {itemCollapsed ? <FiChevronRight size={16}/> :
                                                                <FiChevronDown size={16}/>}
                                                        </button>

                                                        <Toggle
                                                            title={"Отображать пункт"}
                                                            checked={sub.visible !== false}
                                                            onChange={() =>
                                                                updateItem(n => {
                                                                    const cur = n.columns[c].items[s].visible;
                                                                    n.columns[c].items[s].visible = cur === false ? true : !cur;
                                                                })
                                                            }
                                                        />

                                                        <button
                                                            type="button"
                                                            className="button button_icon button_reject"
                                                            title="Удалить пункт"
                                                            onClick={() => removeCategory(c, s)}
                                                        >
                                                            <FiTrash size={16}/>
                                                        </button>
                                                    </div>
                                                </div>

                                                {!itemCollapsed && (
                                                    <>
                                                        <div className="menu-modal__sub-item-row">
                                                            <div className="menu-modal__sub-item-row_fixed"
                                                                 style={{alignSelf: "end"}}>
                                                                <LabeledSelect
                                                                    label="Бейдж"
                                                                    value={sub.badgeId ?? ""}
                                                                    onChange={(v) =>
                                                                        updateItem(n => {
                                                                            n.columns[c].items[s].badgeId = v || "";
                                                                        })
                                                                    }
                                                                    options={badgeOptions}
                                                                />
                                                            </div>
                                                            <div className="menu-modal__sub-item-row">
                                                                <LabeledInput
                                                                    label="Ссылка"
                                                                    placeholder={"/category"}
                                                                    value={sub.href}
                                                                    onChange={(v) =>
                                                                        updateItem(n => {
                                                                            n.columns[c].items[s].href = v;
                                                                        })
                                                                    }
                                                                    error={fieldErrors[`columns.${c}.items.${s}.href`] ?? ""}
                                                                />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        className="button button_border"
                                        onClick={() => addCategory(c)}
                                    >
                                        <FiPlus style={{marginRight: 8}} size={16}/>
                                        Добавить категорию
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )
                    ;
            })}

            <button type="button" className="button button_secondary" onClick={addList}>
                <FiPlus style={{marginRight: 8}} size={16}/>
                Добавить список
            </button>

            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <LabeledInput
                        label="Изображение (URL)"
                        value={item.image?.src ?? ""}
                        onChange={(v) =>
                            updateItem(n => {
                                if (!n.image) n.image = {};
                                n.image.src = v;
                            })
                        }
                        error={fieldErrors["image.src"] ?? ""}
                    />

                    <LabeledSelect
                        label="Позиция изображения"
                        value={item.image?.position ?? "right"}
                        onChange={(v) =>
                            updateItem(n => {
                                if (!n.image) n.image = {};
                                n.image.position = v;
                            })
                        }
                        options={[
                            {value: "right", label: "Справа"},
                            {value: "left", label: "Слева"}
                        ]}
                    />
                </div>
            </div>
        </>
    );
}
