import {useEffect, useState} from "react";
import {FiEdit, FiRotateCcw, FiTrash} from "react-icons/fi";
import {useToast} from "../components/ToastContext";
import {useAuditLog} from "../hooks/useAuditLog";
import MenuItemDialog from "../components/MenuItemDialog";
import {useAuth} from "../hooks/authContext";
import CustomTable from "../components/CustomTable";

function isValidKey(str) {
    return /^[a-zA-Z0-9._-]+$/.test(str);
}

function slugify(key) {
    return key.split(".").pop().toLowerCase();
}

function inheritHref(parentHref, childKey) {
    return `${parentHref}/${slugify(childKey)}`;
}

export default function HeaderMenu() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const [menu, setMenu] = useState([]);
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);
    const [availableLanguages, setAvailableLanguages] = useState([]);
    const [translations, setTranslations] = useState({});

    const {pushSnapshot, undo, canUndo} = useAuditLog([]);
    const {showToast} = useToast();
    const {accessToken, user} = useAuth();

    const canEdit = user && (user.role === "moderator" || user.role === "admin");

    useEffect(() => {
        if (!accessToken) return;

        async function loadMeta() {
            try {
                const resLang = await fetch(`${API_URL}/languages`, {
                    headers: {Authorization: `Bearer ${accessToken}`},
                });
                const langs = await resLang.json();
                setAvailableLanguages(langs);

                const result = {};
                for (const lang of langs) {
                    const res = await fetch(`${API_URL}/translations/structured?lang=${lang.code}`, {
                        headers: {Authorization: `Bearer ${accessToken}`},
                    });
                    const data = await res.json();

                    for (const [key, value] of Object.entries(data)) {
                        if (!result[key]) result[key] = {};
                        result[key][lang.code] = value;
                    }
                }
                setTranslations(result);

            } catch (e) {
                console.error("Ошибка загрузки языков/переводов", e);
            }
        }

        loadMeta();
    }, [accessToken, API_URL]);

    useEffect(() => {
        if (!accessToken) return;

        async function loadMenu() {
            const res = await fetch(`${API_URL}/header-menu`, {
                headers: {Authorization: `Bearer ${accessToken}`},
            });
            if (res.ok) {
                const data = await res.json();
                setMenu(data);
            }
        }

        loadMenu();
    }, [accessToken, API_URL]);

    // -----------------------------
    // Сохранение меню
    // -----------------------------
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

    function normalizeItem(item, parentHref = "") {
        if (!isValidKey(item.label)) {
            showToast(`Некорректный ключ: ${item.label}`);
        }

        if (!item.href) {
            item.href = parentHref
                ? inheritHref(parentHref, item.label)
                : `/${slugify(item.label)}`;
        }

        if (item.items) {
            item.items = item.items.map((sub) =>
                normalizeItem(sub, item.href)
            );
        }
        if (item.columns) {
            item.columns = item.columns.map((col) => ({
                ...col,
                title: col.title,
                items: col.items.map((sub) =>
                    normalizeItem(sub, item.href)
                ),
            }));
        }
        return item;
    }

    function updateItem(index, updated) {
        const next = [...menu];
        next[index] = normalizeItem(updated);
        saveMenu(next);
    }

    function deleteItem(index) {
        const next = menu.filter((_, i) => i !== index);
        saveMenu(next);
    }

    function addItem(item) {
        const next = [...menu, normalizeItem(item)];
        saveMenu(next);
    }

    function toggleVisible(index) {
        const next = [...menu];
        next[index].visible = next[index].visible === false ? true : !next[index].visible;
        saveMenu(next);
    }

    function moveItem(from, to) {
        const next = [...menu];
        const item = next.splice(from, 1)[0];
        next.splice(to, 0, item);
        saveMenu(next);
    }

    return (
        <div className="page" style={{padding: 24}}>
            <div className="page__header">
                <h1>Хедер‑меню</h1>

                {canEdit && (
                    <div style={{display: "flex", gap: 12}}>
                        <button
                            className="button button_icon button_border"
                            style={{color: "var(--color-error)"}}
                            disabled={!canUndo}
                            onClick={undo}
                            title="Отменить последнее изменение"
                        >
                            <FiRotateCcw size={16}/>
                        </button>

                        <button
                            className="button"
                            onClick={() => setCreating(true)}
                        >
                            Добавить
                        </button>
                    </div>
                )}
            </div>

            <CustomTable
                columns={[
                    {key: "type", title: "Тип"},

                    {
                        key: "visible",
                        title: "Отображать",
                        render: (_, item, index) => (
                            <input
                                type="checkbox"
                                checked={item.visible !== false}
                                onChange={() => toggleVisible(index)}
                            />
                        )
                    },

                    {
                        key: "label",
                        title: "Ключ",
                        render: (value) => (
                            <a
                                href={`/?key=${value}`}
                                className="table__cell-text"
                                style={{color: "var(--color-link)"}}
                            >
                                {value}
                            </a>
                        ),
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
                                        onClick={() => setEditing({index, item})}
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

            {creating && canEdit && (
                <MenuItemDialog
                    title="Добавить пункт меню"
                    languages={availableLanguages}
                    translations={translations}
                    onSave={addItem}
                    menuIndex={menu.length}
                    onClose={() => setCreating(false)}
                />
            )}

            {editing && canEdit && (
                <MenuItemDialog
                    title="Редактировать пункт"
                    initialItem={editing.item}
                    languages={availableLanguages}
                    translations={translations}
                    menuIndex={menu.length}
                    onSave={(updated) => updateItem(editing.index, updated)}
                    onClose={() => setEditing(null)}
                />
            )}
        </div>
    );
}
