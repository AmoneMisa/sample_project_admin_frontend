import {useEffect, useState} from "react";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/ToastContext";
import FooterMenuItemDialog from "../components/FooterMenuItemDialog";
import ConfirmDialog from "../components/ConfirmDialog";

export default function MenuPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [menuBlock, setMenuBlock] = useState(null);
    const [items, setItems] = useState([]);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // -----------------------------
    // LOAD FOOTER BLOCKS
    // -----------------------------
    async function load() {
        const res = await fetch(`${API_URL}/footer?all=true`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        const blocks = await res.json();

        // ищем блок меню
        let block = blocks.find(b => b.type === "menu");

        // если нет — создаём
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

        // загружаем items
        const itemsRes = await fetch(`${API_URL}/footer/${block.id}/items`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        const itemsData = await itemsRes.json();
        setItems(itemsData);
    }

    useEffect(() => {
        if (accessToken) load();
    }, [accessToken]);

    // -----------------------------
    // DELETE ITEM
    // -----------------------------
    async function deleteItem(id) {
        await fetch(`${API_URL}/footer/items/${id}`, {
            method: "DELETE",
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        setItems(items.filter(i => i.id !== id));
        showToast("Пункт удалён");
    }

    // -----------------------------
    // RENDER
    // -----------------------------
    if (!menuBlock) {
        return <div className="page" style={{padding: 24}}><h2>Загрузка…</h2></div>;
    }

    return (
        <div className="page" style={{padding: 24}}>
            <h1>Меню футера</h1>

            <button className="button" onClick={() => setCreating(true)}>
                Создать пункт
            </button>

            <div className="menu-list">
                {items.map(item => (
                    <div key={item.id} className="menu-item">
                        <div className="menu-header">
                            <strong>{item.labelKey}</strong>

                            <button
                                className="button button_small"
                                onClick={() => setEditing(item)}
                            >
                                Редактировать
                            </button>

                            <button
                                className="button button_small button_reject"
                                onClick={() => setDeleteTarget(item.id)}
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {creating && (
                <FooterMenuItemDialog
                    mode="create"
                    blockId={menuBlock.id}
                    index={items.length}
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
                    index={editing.order}
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
