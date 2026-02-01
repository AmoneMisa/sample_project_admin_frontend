import {useEffect, useState} from "react";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import FooterBlockDialog from "../components/modals/FooterBlockDialog";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import Toggle from "../components/controls/Toggle";
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
        const data = await apiFetch(`${API_URL}/footer?all=true`);
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
            },
            body: JSON.stringify({isVisible: !block.isVisible})
        });

        setBlocks(prev => prev.map(b => (b.id === block.id ? updated : b)));
    }

    async function deleteBlock(id) {
        await apiFetch(`${API_URL}/footer/${id}`, {
            method: "DELETE"
        });

        setBlocks(prev => prev.filter(b => b.id !== id));
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
            width: "160px",
            render: (_, row) => (
                <div style={{display: "flex", alignItems: "center", justifyContent: "center"}}>
                    <Toggle
                        checked={!!row.isVisible}
                        onChange={() => toggleVisible(row)}
                        title="Показать / скрыть блок"
                    />
                </div>
            )
        },
        {
            key: "actions",
            title: "Действия",
            width: "160px",
            render: (_, row) => (
                <div style={{display: "flex", gap: 8, justifyContent: "center"}}>
                    <button
                        type="button"
                        className="button button_icon"
                        onClick={() => setEditing(row)}
                        title="Редактировать"
                    >
                        <FiEdit size={16}/>
                    </button>

                    <button
                        type="button"
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
        <div className="page footer-page">
            <div className="page__topbar page__topbar_sticky page__topbar_wrap">
                <div className="page__topbar-col">
                    <h1 className="page__header">Footer</h1>
                    <div className="page__topbar-title">
                        Управление блоками футера
                    </div>
                </div>

                <div className="page__row page__row_wrap" style={{justifyContent: "flex-end"}}>
                    <button
                        type="button"
                        className="button"
                        onClick={() => setCreating(true)}
                    >
                        Создать блок
                    </button>
                </div>
            </div>

            <div className="page__block page__block_card">
                <CustomTable columns={columns} data={blocks}/>
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
