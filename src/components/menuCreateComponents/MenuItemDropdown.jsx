import Checkbox from "../controls/Checkbox";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";

export default function MenuItemDropdown({
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

                <div className="menu-modal__row-item">
                    {item.items.map((sub, i) => {
                        const labelErrors = extractErrors(`items.${i}.label`);
                        const badgeErrors = extractErrors(`items.${i}.badge`);

                        return (
                            <div key={i} className="menu-modal__sub-item-wrapper">

                                <div className="menu-modal__sub-item">
                                    <div className="menu-modal__sub-item-row">
                                        <Checkbox
                                            label={`Отображать пункт ${i + 1}`}
                                            checked={sub.visible !== false}
                                            onChange={() =>
                                                updateItem(n => {
                                                    n.items[i].visible =
                                                        n.items[i].visible === false
                                                            ? true
                                                            : !n.items[i].visible;
                                                })
                                            }
                                        />

                                        <button
                                            type="button"
                                            className="button button_reject"
                                            onClick={() =>
                                                updateItem(n => n.items.splice(i, 1))
                                            }
                                        >
                                            Удалить пункт
                                        </button>
                                    </div>

                                    <div className="menu-modal__sub-item-row">
                                        <MultilangInput
                                            label={`Пункт ${i + 1}`}
                                            languages={languages}
                                            valueMap={translationMaps[sub.labelKey] || {}}
                                            errors={labelErrors}
                                            onChange={(next) =>
                                                updateTranslation(sub.labelKey, next)
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="menu-modal__sub-item">
                                    <LabeledInput
                                        label="Ссылка"
                                        value={sub.href}
                                        onChange={(v) =>
                                            updateItem(n => {
                                                n.items[i].href = v;
                                            })
                                        }
                                        error={fieldErrors[`items.${i}.href`] ?? ""}
                                    />
                                </div>

                                <div className="menu-modal__sub-item">
                                    <Checkbox
                                        label="Показывать бейдж"
                                        checked={sub.showBadge === true}
                                        onChange={() =>
                                            updateItem(n => {
                                                if (!n.items[i].badgeKey) {
                                                    n.items[i].badgeKey =
                                                        `headerMenu.${n.id}.dropdown-simple.item.${i}.badge`;
                                                }
                                                n.items[i].showBadge =
                                                    !n.items[i].showBadge;
                                                if (!n.items[i].showBadge)
                                                    n.items[i].badgeKey = null;
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
                </div>
            </div>

            <button
                type="button"
                className="button button_secondary"
                onClick={() =>
                    updateItem(n => {
                        const i = n.items.length;
                        n.items.push({
                            labelKey: `headerMenu.${n.id}.dropdown-simple.item.${i}.title`,
                            href: "",
                            visible: true,
                            badgeKey: null,
                            showBadge: false
                        });
                    })
                }
            >
                Добавить пункт
            </button>
        </>
    );
}
