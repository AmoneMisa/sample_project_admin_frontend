import {useEffect, useState} from "react";
import CustomTable from "../components/customElems/CustomTable";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import FeatureCardDialog from "../components/modals/FeatureCardDialog";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import Checkbox from "../components/controls/Checkbox";
import {FiEdit, FiRotateCcw, FiTrash} from "react-icons/fi";
import {useAuditLogList} from "../hooks/useAuditLogList";
import {useTranslations} from "../hooks/useTranslations";
import {useAuditLog} from "../hooks/useAuditLog";

export default function FeatureCardsPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";

    const {accessToken, user} = useAuth();
    const {showToast} = useToast();
    const canEdit = user && (user.role === "moderator" || user.role === "admin");

    const [items, setItems] = useState([]);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const {setState, pushSnapshot, undo, canUndo} = useAuditLogList([]);

    const {
        translations,
        loadAllTranslations,
        languages
    } = useTranslations(useAuditLog());

    // -----------------------------
    // LOAD ALL CARDS
    // -----------------------------
    async function load() {
        const res = await fetch(`${API_URL}/feature-cards?all=true`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        const data = await res.json();

        setItems(data);
        setState(data);
    }

    useEffect(() => {
        if (!accessToken) return;

        (async () => {
            await loadAllTranslations();
            await load();
        })();
    }, [accessToken]);

    // -----------------------------
    // TOGGLE VISIBILITY
    // -----------------------------
    async function toggleVisible(row) {
        const res = await fetch(`${API_URL}/feature-cards/${row.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({isVisible: !row.isVisible})
        });

        const updated = await res.json();
        const next = items.map(i => (i.id === row.id ? updated : i));

        pushSnapshot(next, null, "Изменена видимость карточки");
        setItems(next);
        setState(next);
    }

    // -----------------------------
    // DELETE CARD
    // -----------------------------
    async function deleteItem(id) {
        await fetch(`${API_URL}/feature-cards/${id}`, {
            method: "DELETE",
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        const next = items.filter(i => i.id !== id);

        pushSnapshot(next, null, "Удалена карточка");
        setItems(next);
        setState(next);
        showToast("Карточка удалена");
    }

    // -----------------------------
    // TABLE COLUMNS
    // -----------------------------
    const columns = [
        {key: "id", title: "ID", width: "60px"},

        {
            key: "image",
            title: "Изображение",
            width: "120px",
            render: (value) =>
                value ? (
                    <img
                        src={value}
                        alt=""
                        style={{width: 80, height: "auto", borderRadius: 6}}
                    />
                ) : (
                    "-"
                )
        },

        {
            key: "titleKey",
            title: "Заголовок (ru)",
            width: "250px",
            render: (_, row) =>
                translations[row.titleKey]?.ru || ""
        },

        {
            key: "descriptionKey",
            title: "Описание (ru)",
            width: "350px",
            render: (_, row) =>
                translations[row.descriptionKey]?.ru || ""
        },

        {
            key: "isVisible",
            title: "Отображать",
            width: "120px",
            render: (value, row) =>
                canEdit ? (
                    <Checkbox checked={value} onChange={() => toggleVisible(row)} />
                ) : (
                    <Checkbox checked={value} disabled />
                ),
        },

        {
            key: "actions",
            title: "Действия",
            width: "150px",
            render: (_, row) =>
                canEdit && (
                    <div style={{display: "flex", gap: 8}}>
                        <button
                            title="Редактировать"
                            className="button button_icon"
                            onClick={() => setEditing(row)}
                        >
                            <FiEdit size={16}/>
                        </button>

                        <button
                            title="Удалить"
                            className="button button_icon button_reject"
                            onClick={() => setDeleteTarget(row.id)}
                        >
                            <FiTrash size={16}/>
                        </button>
                    </div>
                ),
        },
    ];

    // -----------------------------
    // RENDER
    // -----------------------------
    return (
        <div className="page" style={{padding: 24}}>
            <div className="page__header">
                <h1>Feature Cards</h1>

                {canEdit && (
                    <div style={{display: "flex", gap: 12}}>
                        <button
                            className="button button_icon button_border"
                            disabled={!canUndo}
                            onClick={undo}
                            style={{color: "var(--color-error)"}}
                        >
                            <FiRotateCcw size={16}/> Отменить
                        </button>

                        <button className="button" onClick={() => setCreating(true)}>
                            Создать
                        </button>
                    </div>
                )}
            </div>

            <CustomTable columns={columns} data={items}/>

            {creating && (
                <FeatureCardDialog
                    mode="create"
                    onClose={() => {
                        setCreating(false);
                        load();
                    }}
                />
            )}

            {editing && (
                <FeatureCardDialog
                    mode="edit"
                    initial={editing}
                    onClose={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}

            {deleteTarget && (
                <ConfirmDialog
                    open={true}
                    title="Удалить карточку?"
                    text="Вы уверены, что хотите удалить эту карточку?"
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
