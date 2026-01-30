import LabeledSelect from "../controls/LabeledSelect";
import LabeledInput from "../controls/LabeledInput";
import Checkbox from "../controls/Checkbox";
import MultilangInput from "../controls/MultilangInput";

export default function MenuItemDropdownMega({
                                                 item,
                                                 updateItem,
                                                 translationMaps,
                                                 updateTranslation,
                                                 languages,
                                                 fieldErrors
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

    return (
        <>
            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <Checkbox
                        label="Отображать меню"
                        checked={item.visible !== false}
                        onChange={() =>
                            updateItem(n => {
                                n.visible = n.visible === false ? true : !n.visible;
                            })
                        }
                    />

                    <MultilangInput
                        label="Заголовок меню"
                        languages={languages}
                        valueMap={translationMaps[item.labelKey] || {}}
                        errors={extractErrors("label")}
                        onChange={(next) => updateTranslation(item.labelKey, next)}
                    />
                </div>
            </div>

            {item.columns.map((col, c) => (
                <div key={c} className="menu-modal__row">
                    <div className="menu-modal__row-item">

                        <MultilangInput
                            label={`Список ${c + 1}`}
                            languages={languages}
                            valueMap={translationMaps[col.titleKey] || {}}
                            errors={extractErrors(`columns.${c}.title`)}
                            onChange={(next) => updateTranslation(col.titleKey, next)}
                        />

                        <button
                            type="button"
                            className="button button_reject"
                            onClick={() =>
                                updateItem(n => n.columns.splice(c, 1))
                            }
                        >
                            Удалить список
                        </button>

                        {col.items.map((sub, s) => {
                            const labelErrors = extractErrors(`columns.${c}.items.${s}.label`);
                            const badgeErrors = extractErrors(`columns.${c}.items.${s}.badge`);

                            return (
                                <div key={s} className="menu-modal__sub-item">

                                    <div className="menu-modal__sub-item-row">
                                        <Checkbox
                                            label={`Отображать пункт ${s + 1}`}
                                            checked={sub.visible !== false}
                                            onChange={() =>
                                                updateItem(n => {
                                                    n.columns[c].items[s].visible =
                                                        n.columns[c].items[s].visible === false
                                                            ? true
                                                            : !n.columns[c].items[s].visible;
                                                })
                                            }
                                        />

                                        <button
                                            type="button"
                                            className="button button_reject"
                                            onClick={() =>
                                                updateItem(n => n.columns[c].items.splice(s, 1))
                                            }
                                        >
                                            Удалить пункт
                                        </button>
                                    </div>

                                    <div className="menu-modal__sub-item-row">
                                        <MultilangInput
                                            label={`Пункт ${c + 1}.${s + 1}`}
                                            languages={languages}
                                            valueMap={translationMaps[sub.labelKey] || {}}
                                            errors={labelErrors}
                                            onChange={(next) =>
                                                updateTranslation(sub.labelKey, next)
                                            }
                                        />
                                    </div>

                                    <div className="menu-modal__sub-item-row">
                                        <LabeledInput
                                            label="Ссылка"
                                            value={sub.href}
                                            onChange={(v) =>
                                                updateItem(n => {
                                                    n.columns[c].items[s].href = v;
                                                })
                                            }
                                            error={fieldErrors[`columns.${c}.items.${s}.href`] ?? ""}
                                        />
                                    </div>

                                    <div className="menu-modal__sub-item-row">
                                        <Checkbox
                                            label="Бейдж"
                                            checked={sub.showBadge === true}
                                            onChange={() =>
                                                updateItem(n => {
                                                    if (!n.columns[c].items[s].badgeKey) {
                                                        n.columns[c].items[s].badgeKey =
                                                            `headerMenu.${n.id}.dropdown-mega.column.${c}.item.${s}.badge`;
                                                    }
                                                    n.columns[c].items[s].showBadge =
                                                        !n.columns[c].items[s].showBadge;
                                                    if (!n.columns[c].items[s].showBadge)
                                                        n.columns[c].items[s].badgeKey = null;
                                                })
                                            }
                                        />

                                        {sub.showBadge && sub.badgeKey && (
                                            <MultilangInput
                                                label="Бейдж"
                                                languages={languages}
                                                valueMap={translationMaps[sub.badgeKey] || {}}
                                                errors={badgeErrors}
                                                onChange={(next) =>
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
                            onClick={() =>
                                updateItem(n => {
                                    const s = n.columns[c].items.length;
                                    n.columns[c].items.push({
                                        labelKey: `headerMenu.${n.id}.dropdown-mega.column.${c}.item.${s}.title`,
                                        href: "",
                                        visible: true,
                                        badgeKey: null,
                                        showBadge: false
                                    });
                                })
                            }
                        >
                            Добавить пункт в список
                        </button>
                    </div>
                </div>
            ))}

            <button
                type="button"
                className="button button_secondary"
                onClick={() =>
                    updateItem(n => {
                        const c = n.columns.length;
                        n.columns.push({
                            titleKey: `headerMenu.${n.id}.dropdown-mega.column.${c}.title`,
                            items: [{
                                labelKey: `headerMenu.${n.id}.dropdown-mega.column.${c}.item.0.title`,
                                href: "",
                                visible: true,
                                badgeKey: null,
                                showBadge: false
                            }]
                        });
                    })
                }
            >
                Добавить список
            </button>

            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <LabeledInput
                        label="Изображение (src)"
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
                            { value: "right", label: "Справа" },
                            { value: "left", label: "Слева" }
                        ]}
                    />
                </div>
            </div>
        </>
    );
}
