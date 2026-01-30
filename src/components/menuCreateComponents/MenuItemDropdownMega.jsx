import LabeledSelect from "../controls/LabeledSelect";
import LabeledInput from "../controls/LabeledInput";
import Checkbox from "../controls/Checkbox";
import MultilangInput from "../controls/MultilangInput";

export default function MenuItemDropdownMega({
                                                 item,
                                                 toggleVisible,
                                                 updateHref,
                                                 toggleBadge,
                                                 addColumn,
                                                 removeColumn,
                                                 addMegaItem,
                                                 removeMegaItem,
                                                 updateImage,
                                                 translations,
                                                 setTranslations,
                                                 languages,
                                                 fieldErrors
                                             }) {
    function updateTranslation(labelKey, next) {
        setTranslations(prev => ({
            ...prev,
            [labelKey]: next
        }));
    }

    function extractErrors(prefix) {
        const result = {};
        for (const key in fieldErrors) {
            if (key.startsWith(prefix)) {
                const lang = key.split(".").pop();
                result[lang] = fieldErrors[key];
            }
        }
        return result;
    }

    return (
        <>
            {/* Заголовок меню */}
            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <Checkbox
                        label="Отображать меню"
                        checked={item.visible !== false}
                        onChange={() => toggleVisible([])}
                    />

                    <MultilangInput
                        label="Заголовок меню"
                        languages={languages}
                        valueMap={translations[item.labelKey] || {}}
                        errors={extractErrors("label")}
                        onChange={next => updateTranslation(item.labelKey, next)}
                    />
                </div>
            </div>

            {/* Колонки */}
            {item.columns.map((col, c) => (
                <div key={col.id || c} className="menu-modal__row">
                    <div className="menu-modal__row-item">

                        {/* Заголовок списка */}
                        <MultilangInput
                            label={`Список ${c + 1}`}
                            languages={languages}
                            valueMap={translations[col.titleKey] || {}}
                            errors={extractErrors(`columns.${c}.title`)}
                            onChange={next => updateTranslation(col.titleKey, next)}
                        />

                        <button
                            type="button"
                            className="button button_reject"
                            onClick={() => removeColumn(c)}
                        >
                            Удалить список
                        </button>

                        {/* Пункты внутри списка */}
                        {col.items.map((sub, s) => {
                            const labelErrors = extractErrors(`columns.${c}.items.${s}.label`);
                            const badgeErrors = extractErrors(`columns.${c}.items.${s}.badge`);

                            return (
                                <div key={sub.id || s} className="menu-modal__sub-item">

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

                                    {/* Название пункта */}
                                    <div className="menu-modal__sub-item-row">
                                        <MultilangInput
                                            label={`Пункт ${c + 1}.${s + 1}`}
                                            languages={languages}
                                            valueMap={translations[sub.labelKey] || {}}
                                            errors={labelErrors}
                                            onChange={next =>
                                                updateTranslation(sub.labelKey, next)
                                            }
                                        />
                                    </div>

                                    {/* Ссылка */}
                                    <div className="menu-modal__sub-item-row">
                                        <LabeledInput
                                            label="Ссылка"
                                            value={sub.href}
                                            onChange={v =>
                                                updateHref(["columns", c, "items", s], v)
                                            }
                                            error={
                                                fieldErrors[`columns.${c}.items.${s}.href`] ?? ""
                                            }
                                        />
                                    </div>

                                    {/* Бейдж */}
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

                                        {sub.showBadge && sub.badgeKey && (
                                            <MultilangInput
                                                label="Бейдж"
                                                languages={languages}
                                                valueMap={translations[sub.badgeKey] || {}}
                                                errors={badgeErrors}
                                                onChange={next =>
                                                    updateTranslation(sub.badgeKey, next)
                                                }
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}

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

            {/* Изображение */}
            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <LabeledInput
                        label="Изображение (src)"
                        value={item.image?.src ?? ""}
                        onChange={v => updateImage("src", v)}
                        error={fieldErrors["image.src"] ?? ""}
                    />

                    <LabeledSelect
                        label="Позиция изображения"
                        value={item.image?.position ?? "right"}
                        onChange={v => updateImage("position", v)}
                        options={[
                            { value: "right", label: "Справа" },
                            { value: "left", label: "Слева" }
                        ]}
                    />
                </div>
            </div>
        </>
    );
}
