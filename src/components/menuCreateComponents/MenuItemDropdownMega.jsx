import LabeledSelect from "../controls/LabeledSelect";
import LabeledInput from "../controls/LabeledInput";
import Checkbox from "../controls/Checkbox";

export default function MenuItemDropdownMega({
                                                 item,
                                                 toggleVisible,
                                                 renderTranslationInputs,
                                                 updateHref,
                                                 toggleBadge,
                                                 addColumn,
                                                 removeColumn,
                                                 addMegaItem,
                                                 removeMegaItem,
                                                 updateImage,
                                                 fieldErrors
                                             }) {
    return (
        <>
            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <Checkbox
                        label="Отображать меню"
                        checked={item.visible !== false}
                        onChange={() => toggleVisible([])}
                    />

                    {renderTranslationInputs(item.labelKey, "Заголовок меню")}
                </div>
            </div>

            {item.columns.map((col, c) => (
                <div key={c} className="menu-modal__row">
                    <div className="menu-modal__row-item">

                        {renderTranslationInputs(col.titleKey, `Список ${c + 1}`)}

                        <button
                            type="button"
                            className="button button_reject"
                            onClick={() => removeColumn(c)}
                        >
                            Удалить список
                        </button>

                        {col.items.map((sub, s) => (
                            <div key={s} className="menu-modal__sub-item">

                                <div className="menu-modal__sub-item-row">
                                    <Checkbox
                                        label={`Отображать пункт ${s + 1}`}
                                        checked={sub.visible !== false}
                                        onChange={() =>
                                            toggleVisible(["columns", c, "items", s])
                                        }
                                    />

                                    <button
                                        type="button"
                                        className="button button_reject"
                                        onClick={() => removeMegaItem(c, s)}
                                    >
                                        Удалить пункт
                                    </button>
                                </div>

                                <div className="menu-modal__sub-item-row">
                                    {renderTranslationInputs(
                                        sub.labelKey,
                                        `Пункт ${c + 1}.${s + 1}`
                                    )}
                                </div>

                                <div className="menu-modal__sub-item-row">
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
                                </div>

                                <div className="menu-modal__sub-item-row">
                                    <Checkbox
                                        label="Бейдж"
                                        checked={sub.showBadge === true}
                                        onChange={() =>
                                            toggleBadge(
                                                ["columns", c, "items", s],
                                                "dropdown-mega",
                                                s,
                                                c
                                            )
                                        }
                                    />

                                    {sub.showBadge && sub.badgeKey &&
                                        renderTranslationInputs(sub.badgeKey, "Бейдж")}
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            className="button button_border"
                            onClick={() => addMegaItem(c)}
                        >
                            Добавить пункт в список
                        </button>
                    </div>
                </div>
            ))}

            <button
                type="button"
                className="button button_secondary"
                onClick={addColumn}
            >
                Добавить список
            </button>

            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
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
                </div>
            </div>
        </>
    );
}
