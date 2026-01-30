import Checkbox from "../controls/Checkbox";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";

export default function MenuItemDropdown({
                                             item,
                                             toggleVisible,
                                             updateHref,
                                             toggleBadge,
                                             removeSimpleItem,
                                             addSimpleItem,
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

                <div className="menu-modal__row-item">
                    {item.items.map((sub, i) => {
                        const labelErrors = extractErrors(`items.${i}.label`);
                        const badgeErrors = extractErrors(`items.${i}.badge`);

                        return (
                            <div key={sub.id || i} className="menu-modal__sub-item-wrapper">

                                <div className="menu-modal__sub-item">
                                    <div className="menu-modal__sub-item-row">
                                        <Checkbox
                                            label={`Отображать пункт ${i + 1}`}
                                            checked={sub.visible !== false}
                                            onChange={() => toggleVisible(["items", i])}
                                        />

                                        <button
                                            type="button"
                                            className="button button_reject"
                                            onClick={() => removeSimpleItem(i)}
                                        >
                                            Удалить пункт
                                        </button>
                                    </div>

                                    <div className="menu-modal__sub-item-row">
                                        <MultilangInput
                                            label={`Пункт ${i + 1}`}
                                            languages={languages}
                                            valueMap={translations[sub.labelKey] || {}}
                                            errors={labelErrors}
                                            onChange={next =>
                                                updateTranslation(sub.labelKey, next)
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="menu-modal__sub-item">
                                    <LabeledInput
                                        label="Ссылка"
                                        value={sub.href}
                                        onChange={v => updateHref(["items", i], v)}
                                        error={fieldErrors[`items.${i}.href`] ?? ""}
                                    />
                                </div>

                                <div className="menu-modal__sub-item">
                                    <Checkbox
                                        label="Показывать бейдж"
                                        checked={sub.showBadge === true}
                                        onChange={() =>
                                            toggleBadge(["items", i], "dropdown-simple", i)
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
                </div>
            </div>

            <button
                type="button"
                className="button button_secondary"
                onClick={addSimpleItem}
            >
                Добавить пункт
            </button>
        </>
    );
}
