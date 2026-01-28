import {useEffect, useState} from "react";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/ToastContext";
import FooterMenuItemDialog from "../components/FooterMenuItemDialog";
import ConfirmDialog from "../components/ConfirmDialog";

export default function MenuPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [items, setItems] = useState([]);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    async function load() {
        const res = await fetch(`${API_URL}/menu?all=true`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        const data = await res.json();
        setItems(data);
    }

    useEffect(() => {
        if (accessToken) load();
    }, [accessToken]);

    async function deleteItem(id) {
        await fetch(`${API_URL}/menu/${id}`, {
            method: "DELETE",
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        setItems(items.filter(i => i.id !== id));
        showToast("Пункт удалён");
    }

    return (
        <div className="page" style={{padding: 24}}>
            <h1>Меню</h1>

            <button className="button" onClick={() => setCreating(true)}>
                Создать пункт
            </button>

            <div className="menu-list">
                {items.map(item => (
                    <div key={item.id} className="menu-item">
                        <div className="menu-header">
                            <strong>{item.labelKey}</strong>

                            <button className="button button_small" onClick={() => setEditing(item)}>
                                Редактировать
                            </button>

                            <button className="button button_small button_reject"
                                    onClick={() => setDeleteTarget(item.id)}>
                                Удалить
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {creating && (
                <FooterMenuItemDialog
                    mode="create"
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
