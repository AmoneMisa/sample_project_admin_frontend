import {useEffect, useState} from "react";
import CustomTable from "../components/customElems/CustomTable";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import MenuItemDialog from "../components/modals/MenuItemDialog";
import Checkbox from "../components/controls/Checkbox";
import {FiEdit, FiTrash} from "react-icons/fi";
import {useTranslations} from "../hooks/useTranslations";
import apiFetch from "../utils/apiFetch";
import {v4 as uuid} from "uuid";

export default function HeaderMenu() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";

    const {accessToken, user} = useAuth();
    const {showToast} = useToast();
    const canEdit = user && (user.role === "moderator" || user.role === "admin");

    const [menu, setMenu] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [creating, setCreating] = useState(false);

    const {
        translationMaps,
        loadAllTranslations,
        deleteKeys
    } = useTranslations();

    useEffect(() => {
        if (!accessToken) return;
        (async () => {
            await loadAllTranslations();

            const data = await apiFetch(`${API_URL}/header-menu`, {
                headers: {Authorization: `Bearer ${accessToken}`}
            });

            const normalized = data.map((item, index) => {
                const id = item.id ?? index + 1;
                const labelKey = item.labelKey || item.label || null;

                return {
                    ...item,
                    id,
                    labelKey
                };
            });

            setMenu(normalized);
        })();
    }, [accessToken]);

    async function saveMenu(next) {
        await apiFetch(`${API_URL}/header-menu`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({json: next})
        });

        setMenu(next);
        showToast("Меню сохранено");
    }

    async function deleteItem(id) {
        const item = menu.find(i => i.id === id);
        if (!item) return;

        const next = menu.filter(i => i.id !== id);

        if (item.labelKey) {
            await deleteKeys([item.labelKey]);
        }

        await saveMenu(next);
    }

    async function toggleVisible(id) {
        const next = menu.map(item =>
            item.id === id
                ? {...item, visible: item.visible === false ? true : !item.visible}
                : item
        );

        await saveMenu(next);
    }

    async function moveItem(fromId, toId) {
        const current = [...menu];
        const fromIndex = current.findIndex(i => i.id === fromId);
        const toIndex = current.findIndex(i => i.id === toId);
        if (fromIndex === -1 || toIndex === -1) return;

        const item = current.splice(fromIndex, 1)[0];
        current.splice(toIndex, 0, item);

        await saveMenu(current);
    }

    async function handleSaveFromDialog(item) {
        const isEdit = !!editingItem;
        let next;

        if (!isEdit) {
            // Создание нового пункта
            next = [...menu, item];
        } else {
            // Редактирование существующего
            next = menu.map(it => (it.id === item.id ? item : it));
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
            )
        },

        {
            key: "labelKey",
            title: "Название (ru)",
            render: (value) => {
                if (!value) return <span className="table__cell-text">(нет ключа)</span>;

                const ru = translationMaps[value]?.ru || "(нет перевода)";

                return (
                    <a
                        href={`/admin/?key=${value}`}
                        className="table__cell-text"
                        style={{color: "var(--color-link)"}}
                    >
                        {ru}
                    </a>
                );
            }
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
                        onClick={() => moveItem(item.id, menu[index - 1]?.id)}
                        title="Переместить вверх"
                    >
                        ↑
                    </button>

                    <button
                        className="button button_icon"
                        disabled={index === menu.length - 1 || !canEdit}
                        onClick={() => moveItem(item.id, menu[index + 1]?.id)}
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
                )
        }
    ];

    return (
        <div className="page" style={{padding: 24}}>
            <div className="page__header">
                <h1>Хедер‑меню</h1>

                {canEdit && (
                    <div>
                        <button className="button" onClick={() => setCreating(true)}>
                            Добавить
                        </button>
                    </div>
                )}
            </div>

            <CustomTable columns={columns} data={menu}/>

            {creating && (
                <MenuItemDialog
                    title="Создать пункт меню"
                    initialItem={{
                        id: uuid(),
                        type: "simple",
                        visible: true,
                        href: "",
                        labelKey: null,
                        badgeKey: null,
                        showBadge: false
                    }}
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
