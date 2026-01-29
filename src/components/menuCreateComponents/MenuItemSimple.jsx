import Checkbox from "../controls/Checkbox";
import LabeledInput from "../controls/LabeledInput";

export default function MenuItemSimple({
                                           item,
                                           toggleVisible,
                                           renderTranslationInputs,
                                           updateHref,
                                           toggleBadge,
                                           fieldErrors
                                       }) {
    return (
        <div className="menu-modal__row">

            {/* Левая колонка */}
            <div className="menu-modal__row-item">

                <Checkbox
                    label="Отображать пункт меню"
                    checked={item.visible !== false}
                    onChange={() => toggleVisible([])}
                />

                {/* Заголовок */}
                {renderTranslationInputs(item.labelKey, "Заголовок")}
            </div>

            {/* Правая колонка */}
            <div className="menu-modal__row-item">

                {/* Ссылка */}
                <LabeledInput
                    label="Ссылка"
                    value={item.href}
                    onChange={(v) => updateHref([], v)}
                    error={fieldErrors["href"] ?? ""}
                />

                {/* Бейдж */}
                <Checkbox
                    label="Показывать бейдж"
                    checked={item.showBadge === true}
                    onChange={() => toggleBadge([], "simple")}
                />

                {item.showBadge && item.badgeKey &&
                    renderTranslationInputs(item.badgeKey, "Бейдж")}
            </div>
        </div>
    );
}
