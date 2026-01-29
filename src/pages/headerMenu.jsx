import {useEffect, useState} from "react";
import {useToast} from "../components/ToastContext";
import {useAuditLog} from "../hooks/useAuditLog";
import MenuItemDialog from "../components/MenuItemDialog";
import {useAuth} from "../hooks/authContext";
import {FiEdit, FiTrash} from "react-icons/fi";
import CustomTable from "../components/CustomTable";
import Checkbox from "../components/Checkbox";

export default function HeaderMenu() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const [menu, setMenu] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [creating, setCreating] = useState(false);
    const [translations, setTranslations] = useState({});

    const {pushSnapshot} = useAuditLog([]);
    const {showToast} = useToast();
    const {accessToken, user} = useAuth();

    const canEdit = user && (user.role === "moderator" || user.role === "admin");

    // LOAD MENU
    useEffect(() => {
        if (!accessToken) return;

        async function loadMenu() {
            const res = await fetch(`${API_URL}/header-menu`, {
                headers: {Authorization: `Bearer ${accessToken}`},
            });
            if (res.ok) {
                setMenu(await res.json());
            }
        }

        loadMenu();
    }, [accessToken, API_URL]);

    // SAVE MENU
    async function saveMenu(next) {
        await fetch(`${API_URL}/header-menu`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({json: next}),
        });

        setMenu(next);
        pushSnapshot(next, null, "Меню обновлено");
        showToast("Меню сохранено");
    }

    // LOAD TRANSLATIONS (RU)
    useEffect(() => {
        async function loadTranslations() {
            if (!accessToken) return;

            const res = await fetch(`${API_URL}/translations?lang=ru`, {
                headers: {Authorization: `Bearer ${accessToken}`},
            });

            if (res.ok) {
                setTranslations(await res.json());
            }
        }

        loadTranslations();
    }, [accessToken, API_URL]);

    // DELETE ITEM
    async function deleteItem(index) {
        const next = menu.filter((_, i) => i !== index);
        await saveMenu(next);
    }

    // TOGGLE VISIBLE
    async function toggleVisible(index) {
        const next = [...menu];
        next[index].visible = !next[index].visible;
        await saveMenu(next);
    }

    // MOVE ITEM
    async function moveItem(from, to) {
        const next = [...menu];
        const item = next.splice(from, 1)[0];
        next.splice(to, 0, item);
        await saveMenu(next);
    }

    // SAVE FROM POPUP
    async function handleSaveFromDialog(item, index = null) {
        const next = [...menu];

        if (index === null) {
            next.push(item);
        } else {
            next[index] = item;
        }

        await saveMenu(next);
    }

    return (
        <div className="page" style={{padding: 24}}>
            <div className="page__header">
                <h1>Хедер‑меню</h1>

                {canEdit && (
                    <button
                        className="button"
                        onClick={() => setCreating(true)}
                    >
                        Добавить
                    </button>
                )}
            </div>

            <CustomTable
                columns={[
                    {key: "type", title: "Тип"},

                    {
                        key: "visible",
                        title: "Отображать",
                        render: (_, item, index) => (
                            <Checkbox
                                checked={item.visible !== false}
                                onChange={() => toggleVisible(index)}
                            />
                        )
                    },
                    {
                        key: "label",
                        title: "Ключ",
                        render: (value) => {
                            const ru = translations[value]?.ru || "(нет перевода)";
                            return (
                                <a
                                    href={`/admin/?key=${value}`}
                                    className="table__cell-text"
                                    style={{color: "var(--color-link)"}}
                                >
                                    {ru}
                                </a>
                            );
                        },
                    },
                    {
                        key: "order",
                        title: "Порядок",
                        render: (_, item, index) => (
                            <div style={{display: "flex", gap: 6}}>
                                <button
                                    className="button button_icon"
                                    disabled={index === 0}
                                    onClick={() => moveItem(index, index - 1)}
                                    title="Переместить вверх"
                                >
                                    ↑
                                </button>

                                <button
                                    className="button button_icon"
                                    disabled={index === menu.length - 1}
                                    onClick={() => moveItem(index, index + 1)}
                                    title="Переместить вниз"
                                >
                                    ↓
                                </button>
                            </div>
                        )
                    },

                    {
                        key: "actions",
                        title: "Действия",
                        render: (_, item, index) =>
                            canEdit && (
                                <span style={{display: "flex", gap: 8}}>
                                    <button
                                        className="button button_icon button_reject"
                                        onClick={() => setEditingIndex(index)}
                                        title="Редактировать меню"
                                    >
                                        <FiEdit size={16}/>
                                    </button>
                                    <button
                                        className="button button_icon button_reject"
                                        onClick={() => deleteItem(index)}
                                        title="Удалить меню"
                                    >
                                        <FiTrash size={16}/>
                                    </button>
                                </span>
                            ),
                    },
                ]}
                data={menu}
            />

            {creating && (
                <MenuItemDialog title="Создать пункт меню" initialItem={null}
                                onSave={(item) => handleSaveFromDialog(item, null)}
                                onClose={() => setCreating(false)}
                />
            )}

            {editingIndex !== null && (
                <MenuItemDialog title="Редактировать пункт меню" initialItem={menu[editingIndex]}
                                onSave={(item) => handleSaveFromDialog(item, editingIndex)}
                                onClose={() => setEditingIndex(null)}
                />
            )}
        </div>
    );
}
