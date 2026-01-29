import Checkbox from "../controls/Checkbox";
import LabeledInput from "../controls/LabeledInput";

export default function MenuItemDropdown({
                                             item,
                                             toggleVisible,
                                             renderTranslationInputs,
                                             updateHref,
                                             toggleBadge,
                                             removeSimpleItem,
                                             addSimpleItem,
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

                <div className="menu-modal__row-item">
                    {item.items.map((sub, i) => (
                        <div key={i} className="menu-modal__sub-item-wrapper">

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
                                    {renderTranslationInputs(sub.labelKey, `Пункт ${i + 1}`)}
                                </div>
                            </div>

                            <div className="menu-modal__sub-item">
                                <LabeledInput
                                    label="Ссылка"
                                    value={sub.href}
                                    onChange={(v) => updateHref(["items", i], v)}
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

                                {sub.showBadge && sub.badgeKey &&
                                    renderTranslationInputs(sub.badgeKey, "Бейдж")}
                            </div>

                        </div>
                    ))}
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
