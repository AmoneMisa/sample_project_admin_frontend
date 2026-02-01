import Toggle from "../controls/Toggle";
import LabeledInput from "../controls/LabeledInput";
import LabeledSelect from "../controls/LabeledSelect";

export default function MenuItemSimple({
                                           item,
                                           updateItem,
                                           fieldErrors,
                                           badges = []
                                       }) {
    const badgeOptions = [
        { value: "", label: "Нет" },
        ...badges.map(b => ({ value: b.id, label: b.label }))
    ];

    return (
        <>
            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <Toggle
                        label="Отображать пункт меню"
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
                    <LabeledInput
                        label="Ссылка"
                        placeholder="/category"
                        value={item.href}
                        onChange={(v) =>
                            updateItem(n => {
                                n.href = v;
                            })
                        }
                        error={fieldErrors["href"] ?? ""}
                    />
                </div>
            </div>

            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <LabeledSelect
                        label="Бейдж"
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
        </>
    );
}
