import {useEffect, useState} from "react";
import CustomTable from "../components/customElems/CustomTable";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import FooterMenuItemDialog from "../components/modals/FooterMenuItemDialog";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import {useTranslations} from "../hooks/useTranslations";
import Checkbox from "../components/controls/Checkbox";
import {FiEdit, FiTrash} from "react-icons/fi";

export default function FooterMenuPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [menuBlock, setMenuBlock] = useState(null);
    const [items, setItems] = useState([]);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const {
        languages,
        translationMaps,
        loadAllTranslations,
        deleteKeys
    } = useTranslations();

    // -----------------------------
    // LOAD FOOTER BLOCK + ITEMS
    // -----------------------------
    async function load() {
        const res = await fetch(`${API_URL}/footer?all=true`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        const blocks = await res.json();
        let block = blocks.find(b => b.type === "menu");

        if (!block) {
            const createRes = await fetch(`${API_URL}/footer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    type: "menu",
                    titleKey: "footer.menu.title",
                    descriptionKey: "footer.menu.description",
                    order: 0,
                    isVisible: true
                })
            });

            block = await createRes.json();
        }

        setMenuBlock(block);

        const itemsRes = await fetch(`${API_URL}/footer/${block.id}/items`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        setItems(await itemsRes.json());
    }

    useEffect(() => {
        if (!accessToken) return;

        (async () => {
            await loadAllTranslations();
            await load();
        })();
    }, [accessToken]);

    // -----------------------------
    // DELETE ITEM + RELATED KEYS
    // -----------------------------
    async function deleteItem(id) {
        const item = items.find(i => i.id === id);
        if (!item) return;

        // 1. delete item
        await fetch(`${API_URL}/footer/items/${id}`, {
            method: "DELETE",
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        // 2. delete translation keys
        const keysToDelete = [item.labelKey];
        if (item.descriptionKey) keysToDelete.push(item.descriptionKey);

        await deleteKeys(keysToDelete);

        // 3. update UI
        setItems(prev => prev.filter(i => i.id !== id));
        showToast("Пункт и связанные переводы удалены");
    }

    // -----------------------------
    // TOGGLE VISIBLE
    // -----------------------------
    async function toggleVisible(item) {
        const res = await fetch(`${API_URL}/footer/items/${item.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({isVisible: !item.isVisible})
        });

        const updated = await res.json();
        setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
    }

    // -----------------------------
    // TABLE COLUMNS
    // -----------------------------
    const columns = [
        {key: "id", title: "ID", width: "80px"},

        {
            key: "labelKey",
            title: "Название (ru)",
            render: (_, row) => {
                const ru = translationMaps[row.labelKey]?.ru;
                return ru?.trim() ? ru : "(нет перевода)";
            }
        },

        {
            key: "href",
            title: "Ссылка",
            render: (value) => value || "-"
        },

        {
            key: "order",
            title: "Порядок",
            width: "120px",
            render: (value) => value ?? "-"
        },

        {
            key: "isVisible",
            title: "Отображать",
            width: "120px",
            render: (value, row) => (
                <Checkbox checked={value} onChange={() => toggleVisible(row)}/>
            )
        },

        {
            key: "actions",
            title: "Действия",
            width: "140px",
            render: (_, row) => (
                <div style={{display: "flex", gap: 8}}>
                    <button
                        className="button button_icon"
                        onClick={() => setEditing(row)}
                        title="Редактировать"
                    >
                        <FiEdit size={16}/>
                    </button>

                    <button
                        className="button button_icon button_reject"
                        onClick={() => setDeleteTarget(row.id)}
                        title="Удалить"
                    >
                        <FiTrash size={16}/>
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="page" style={{padding: 24}}>
            <h1 className={"page__header"}>Меню футера</h1>

            <div style={{marginBottom: 12}}>
                <button className="button" onClick={() => setCreating(true)}>
                    Создать пункт
                </button>
            </div>

            <CustomTable columns={columns} data={items}/>

            {creating && (
                <FooterMenuItemDialog
                    mode="create"
                    blockId={menuBlock.id}
                    onClose={() => {
                        setCreating(false);
                        load();
                    }}
                />
            )}

            {editing && (
                <FooterMenuItemDialog
                    mode="edit"
                    initial={editing}
                    blockId={menuBlock.id}
                    onClose={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}

            {deleteTarget && (
                <ConfirmDialog
                    open={true}
                    title="Удалить пункт?"
                    text="Вы уверены?"
                    onConfirm={() => {
                        deleteItem(deleteTarget);
                        setDeleteTarget(null);
                    }}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
