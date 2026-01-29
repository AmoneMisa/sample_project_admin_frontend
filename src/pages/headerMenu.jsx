import {useEffect, useState} from "react";
import {useToast} from "../components/layout/ToastContext";
import {useAuditLog} from "../hooks/useAuditLog";
import MenuItemDialog from "../components/modals/MenuItemDialog";
import {useAuth} from "../hooks/authContext";
import {FiEdit, FiTrash} from "react-icons/fi";
import CustomTable from "../components/customElems/CustomTable";
import Checkbox from "../components/controls/Checkbox";

export default function HeaderMenu() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const [menu, setMenu] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
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
            if (!res.ok) return;

            const data = await res.json();

            const normalized = data.map((item, index) => {
                const id = item.id ?? index + 1;
                const labelKey = item.labelKey || item.label || null;

                return {
                    ...item,
                    id,
                    labelKey,
                };
            });

            setMenu(normalized);
            pushSnapshot(normalized, null, "Меню загружено");
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

            if (!res.ok) return;

            // ожидаем объект вида { key: { ru, en, ... } }
            setTranslations(await res.json());
        }

        loadTranslations();
    }, [accessToken, API_URL]);

    // DELETE ITEM
    async function deleteItem(id) {
        const next = menu.filter((item) => item.id !== id);
        await saveMenu(next);
    }

    // TOGGLE VISIBLE
    async function toggleVisible(id) {
        const next = menu.map((item) =>
            item.id === id ? {...item, visible: item.visible === false ? true : !item.visible} : item
        );
        await saveMenu(next);
    }

    // MOVE ITEM
    async function moveItem(fromId, toId) {
        const current = [...menu];
        const fromIndex = current.findIndex((i) => i.id === fromId);
        const toIndex = current.findIndex((i) => i.id === toId);
        if (fromIndex === -1 || toIndex === -1) return;

        const item = current.splice(fromIndex, 1)[0];
        current.splice(toIndex, 0, item);
        await saveMenu(current);
    }

    // SAVE FROM POPUP
    async function handleSaveFromDialog(item) {
        let next;

        if (!item.id) {
            const maxId = menu.reduce((m, it) => Math.max(m, it.id || 0), 0);
            const withId = {...item, id: maxId + 1};
            next = [...menu, withId];
        } else {
            next = menu.map((it) => (it.id === item.id ? item : it));
        }

        await saveMenu(next);
    }

    const columns = [
        {key: "type", title: "Тип", width: "120px"},

        {
            key: "visible",
            title: "Отображать",
            width: "120px",
            render: (_, item) => (
                <Checkbox
                    checked={item.visible !== false}
                    onChange={() => canEdit && toggleVisible(item.id)}
                    disabled={!canEdit}
                />
            ),
        },

        {
            key: "labelKey",
            title: "Название (ru)",
            render: (value) => {
                if (!value) return <span className="table__cell-text">(нет ключа)</span>;

                const t = translations[value];
                const ru = t?.ru || t || "(нет перевода)";

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
            width: "140px",
            render: (_, item, index) => (
                <div style={{display: "flex", gap: 6}}>
                    <button
                        className="button button_icon"
                        disabled={index === 0 || !canEdit}
                        onClick={() =>
                            moveItem(item.id, menu[index - 1]?.id)
                        }
                        title="Переместить вверх"
                    >
                        ↑
                    </button>

                    <button
                        className="button button_icon"
                        disabled={index === menu.length - 1 || !canEdit}
                        onClick={() =>
                            moveItem(item.id, menu[index + 1]?.id)
                        }
                        title="Переместить вниз"
                    >
                        ↓
                    </button>
                </div>
            ),
        },

        {
            key: "actions",
            title: "Действия",
            width: "150px",
            render: (_, item) =>
                canEdit && (
                    <span style={{display: "flex", gap: 8}}>
                        <button
                            className="button button_icon"
                            onClick={() => setEditingItem(item)}
                            title="Редактировать пункт"
                        >
                            <FiEdit size={16}/>
                        </button>
                        <button
                            className="button button_icon button_reject"
                            onClick={() => deleteItem(item.id)}
                            title="Удалить пункт"
                        >
                            <FiTrash size={16}/>
                        </button>
                    </span>
                ),
        },
    ];

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

            <CustomTable columns={columns} data={menu}/>

            {creating && (
                <MenuItemDialog
                    title="Создать пункт меню"
                    initialItem={null}
                    onSave={(item) => {
                        handleSaveFromDialog(item);
                        setCreating(false);
                    }}
                    onClose={() => setCreating(false)}
                />
            )}

            {editingItem && (
                <MenuItemDialog
                    title="Редактировать пункт меню"
                    initialItem={editingItem}
                    onSave={(item) => {
                        handleSaveFromDialog(item);
                        setEditingItem(null);
                    }}
                    onClose={() => setEditingItem(null)}
                />
            )}
        </div>
    );
}
