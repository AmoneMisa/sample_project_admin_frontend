import {useEffect, useState} from "react";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import FooterBlockDialog from "../components/modals/FooterBlockDialog";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import Checkbox from "../components/controls/Checkbox";
import {FiEdit, FiTrash} from "react-icons/fi";
import CustomTable from "../components/customElems/CustomTable";
import apiFetch from "../utils/apiFetch";

export default function FooterPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [blocks, setBlocks] = useState([]);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    async function load() {
        const data = await apiFetch(`${API_URL}/footer?all=true`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        setBlocks(data);
    }

    useEffect(() => {
        if (accessToken) load();
    }, [accessToken]);

    async function toggleVisible(block) {
        const updated = await apiFetch(`${API_URL}/footer/${block.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({ isVisible: !block.isVisible })
        });

        setBlocks(blocks.map(b => (b.id === block.id ? updated : b)));
    }

    async function deleteBlock(id) {
        await apiFetch(`${API_URL}/footer/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        setBlocks(blocks.filter(b => b.id !== id));
        showToast("Блок удалён");
    }

    const columns = [
        {
            key: "type",
            title: "Тип",
            render: (value) => <strong>{value}</strong>
        },
        {
            key: "isVisible",
            title: "Видимость",
            render: (_, row) => (
                <Checkbox
                    checked={row.isVisible}
                    onChange={() => toggleVisible(row)}
                />
            )
        },
        {
            key: "actions",
            title: "Действия",
            render: (_, row) => (
                <span style={{display: "flex", gap: 8}}>
                <button
                    className="button button_icon"
                    onClick={() => setEditing(row)}
                >
                    <FiEdit size={16}/>
                </button>

                <button
                    className="button button_icon"
                    onClick={() => setDeleteTarget(row.id)}
                >
                    <FiTrash size={16}/>
                </button>
            </span>
            )
        }
    ];

    return (
        <div className="page" style={{padding: 24}}>
            <h1 className="page__header">Footer</h1>

            <button className="button" onClick={() => setCreating(true)}>
                Создать блок
            </button>

            <CustomTable
                columns={columns}
                data={blocks}
            />

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
