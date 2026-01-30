import Checkbox from "../controls/Checkbox";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";

export default function MenuItemSimple({
                                           item,
                                           toggleVisible,
                                           updateHref,
                                           toggleBadge,
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

    const labelErrors = extractErrors("label");
    const badgeErrors = extractErrors("badge");

    return (
        <div className="menu-modal__row">

            {/* Левая колонка */}
            <div className="menu-modal__row-item">

                <Checkbox
                    label="Отображать пункт меню"
                    checked={item.visible !== false}
                    onChange={() => toggleVisible([])}
                />

                <MultilangInput
                    label="Заголовок"
                    languages={languages}
                    valueMap={translations[item.labelKey] || {}}
                    errors={labelErrors}
                    onChange={next => updateTranslation(item.labelKey, next)}
                />
            </div>

            {/* Правая колонка */}
            <div className="menu-modal__row-item">

                <LabeledInput
                    label="Ссылка"
                    value={item.href}
                    onChange={v => updateHref([], v)}
                    error={fieldErrors["href"] ?? ""}
                />

                <Checkbox
                    label="Показывать бейдж"
                    checked={item.showBadge === true}
                    onChange={() => toggleBadge([], "simple")}
                />

                {item.showBadge && item.badgeKey && (
                    <MultilangInput
                        label="Бейдж"
                        languages={languages}
                        valueMap={translations[item.badgeKey] || {}}
                        errors={badgeErrors}
                        onChange={next => updateTranslation(item.badgeKey, next)}
                    />
                )}
            </div>
        </div>
    );
}
