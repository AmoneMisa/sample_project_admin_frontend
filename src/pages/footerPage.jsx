import {useEffect, useState} from "react";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import FooterBlockDialog from "../components/modals/FooterBlockDialog";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import Checkbox from "../components/controls/Checkbox";

export default function FooterPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [blocks, setBlocks] = useState([]);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    async function load() {
        const res = await fetch(`${API_URL}/footer?all=true`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        const data = await res.json();
        setBlocks(data);
    }

    useEffect(() => {
        if (accessToken) load();
    }, [accessToken]);

    async function toggleVisible(block) {
        const res = await fetch(`${API_URL}/footer/${block.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({isVisible: !block.isVisible})
        });

        const updated = await res.json();
        setBlocks(blocks.map(b => b.id === block.id ? updated : b));
    }

    async function deleteBlock(id) {
        await fetch(`${API_URL}/footer/${id}`, {
            method: "DELETE",
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        setBlocks(blocks.filter(b => b.id !== id));
        showToast("Блок удалён");
    }

    return (
        <div className="page" style={{padding: 24}}>
            <h1>Footer</h1>

            <button className="button" onClick={() => setCreating(true)}>
                Создать блок
            </button>

            <div className="footer-list">
                {blocks.map(block => (
                    <div key={block.id} className="footer-item">
                        <div className="footer-header">
                            <strong>{block.type}</strong>

                            <Checkbox
                                checked={block.isVisible}
                                onChange={() => toggleVisible(block)}
                            />

                            <button className="button button_small" onClick={() => setEditing(block)}>
                                Редактировать
                            </button>

                            <button className="button button_small button_reject"
                                    onClick={() => setDeleteTarget(block.id)}>
                                Удалить
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {creating && (
                <FooterBlockDialog
                    mode="create"
                    index={blocks.length}
                    onClose={() => {
                        setCreating(false);
                        load();
                    }}
                />
            )}

            {editing && (
                <FooterBlockDialog
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
                    title="Удалить блок?"
                    text="Вы уверены?"
                    onConfirm={() => {
                        deleteBlock(deleteTarget);
                        setDeleteTarget(null);
                    }}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
