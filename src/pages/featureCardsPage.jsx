import {useEffect, useState} from "react";
import CustomTable from "../components/customElems/CustomTable";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import FeatureCardDialog from "../components/modals/FeatureCardDialog";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import Checkbox from "../components/controls/Checkbox";
import {FiEdit, FiTrash} from "react-icons/fi";
import {useTranslations} from "../hooks/useTranslations";

export default function FeatureCardsPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";

    const {accessToken, user} = useAuth();
    const {showToast} = useToast();
    const canEdit = user && (user.role === "moderator" || user.role === "admin");

    const [items, setItems] = useState([]);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const {
        languages,
        translationMaps,
        updateTranslation,
        loadAllTranslations,
        updateKeysBatch,
        deleteKeys
    } = useTranslations();

    async function load() {
        const res = await fetch(`${API_URL}/feature-cards?all=true`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        const data = await res.json();
        setItems(data);
    }

    useEffect(() => {
        if (!accessToken) return;

        (async () => {
            await loadAllTranslations();
            await load();
        })();
    }, [accessToken]);

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

        setItems(next);
    }

    async function deleteItem(id) {
        const item = items.find(i => i.id === id);
        if (!item) return;

        await fetch(`${API_URL}/footer/items/${id}`, {
            method: "DELETE",
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        const keysToDelete = [item.labelKey];
        if (item.descriptionKey) keysToDelete.push(item.descriptionKey);

        await deleteKeys(keysToDelete);

        setItems(prev => prev.filter(i => i.id !== id));
        showToast("Пункт и связанные переводы удалены");
    }


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
                translationMaps[row.titleKey]?.ru || ""
        },

        {
            key: "descriptionKey",
            title: "Описание (ru)",
            width: "350px",
            render: (_, row) =>
                translationMaps[row.descriptionKey]?.ru || ""
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

    return (
        <div className="page" style={{padding: 24}}>
            <div className="page__header">
                <h1>Feature Cards</h1>

                {canEdit && (
                    <div style={{display: "flex", gap: 12}}>
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
