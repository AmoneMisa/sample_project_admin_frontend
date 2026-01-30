import Checkbox from "../controls/Checkbox";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";

export default function MenuItemSimple({
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

    const badgeErrors = extractErrors("badge");

    return (
        <div className="menu-modal__row">
            <div className="menu-modal__row-item">
                <Checkbox
                    label="Отображать пункт меню"
                    checked={item.visible !== false}
                    onChange={() =>
                        updateItem(n => {
                            n.visible = n.visible === false ? true : !n.visible;
                        })
                    }
                />
            </div>

            <div className="menu-modal__row-item">
                <LabeledInput
                    label="Ссылка"
                    value={item.href}
                    onChange={(v) =>
                        updateItem(n => {
                            n.href = v;
                        })
                    }
                    error={fieldErrors["href"] ?? ""}
                />
            </div>
            <div className="menu-modal__row-item">
                <Checkbox
                    label="Бейдж"
                    checked={item.showBadge === true}
                    onChange={() =>
                        updateItem(n => {
                            if (!n.badgeKey) {
                                n.badgeKey = `headerMenu.${n.id}.simple.badge`;
                            }
                            n.showBadge = !n.showBadge;
                            if (!n.showBadge) n.badgeKey = null;
                        })
                    }
                />

                {item.showBadge && item.badgeKey && (
                    <MultilangInput
                        label="Бейдж"
                        languages={languages}
                        valueMap={translationMaps[item.badgeKey] || {}}
                        errors={badgeErrors}
                        onChange={(next) => updateTranslation(item.badgeKey, next)}
                    />
                )}
            </div>
        </div>
    );
}
