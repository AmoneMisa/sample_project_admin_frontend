import {useEffect, useState} from "react";
import CustomTable from "../components/customElems/CustomTable";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import FeatureCardDialog from "../components/modals/FeatureCardDialog";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import Toggle from "../components/controls/Toggle";
import {FiEdit, FiTrash} from "react-icons/fi";
import {useTranslations} from "../hooks/useTranslations";
import apiFetch from "../utils/apiFetch";

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
        translationMaps,
        loadAllTranslations,
        deleteKeys
    } = useTranslations();

    async function load() {
        const data = await apiFetch(`${API_URL}/feature-cards?all=true`);
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
        const updated = await apiFetch(`${API_URL}/feature-cards/${row.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({isVisible: !row.isVisible})
        });

        setItems(items.map(i => (i.id === row.id ? updated : i)));
    }

    async function deleteItem(id) {
        const item = items.find(i => i.id === id);
        if (!item) return;

        await apiFetch(`${API_URL}/feature-cards/${id}`, {
            method: "DELETE"
        });

        const keysToDelete = [item.titleKey];
        if (item.descriptionKey) keysToDelete.push(item.descriptionKey);

        await deleteKeys(keysToDelete);

        setItems(prev => prev.filter(i => i.id !== id));
        showToast("Карточка и связанные переводы удалены");
    }

    const columns = [
        {
            key: "id",
            title: "ID",
            width: "110px",
            render: (value, row) => (
                <div className="table__cell-row">
                    <span className="table__mono">{value}</span>

                    <Toggle
                        checked={row.isVisible}
                        disabled={!canEdit}
                        title={row.isVisible ? "Скрыть карточку" : "Показать карточку"}
                        onChange={() => {
                            if (!canEdit) return;
                            toggleVisible(row);
                        }}
                    />
                </div>
            )
        },
        {
            key: "image",
            title: "Изображение",
            width: "140px",
            render: (value) => {
                if (!value) return <span className="table__muted">—</span>;

                return (
                    <a
                        className="table__img"
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        title="Открыть изображение"
                    >
                        <img
                            src={value}
                            alt=""
                            loading="lazy"
                            onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const parent = e.currentTarget.parentElement;
                                if (parent && !parent.querySelector(".table__img-fallback")) {
                                    const span = document.createElement("span");
                                    span.className = "table__img-fallback";
                                    span.textContent = "нет";
                                    parent.appendChild(span);
                                }
                            }}
                        />
                    </a>
                );
            }
        },
        {
            key: "titleKey",
            title: "Заголовок (ru)",
            width: "250px",
            render: (_, row) => translationMaps[row.titleKey]?.ru || ""
        },
        {
            key: "descriptionKey",
            title: "Описание (ru)",
            width: "350px",
            render: (_, row) => translationMaps[row.descriptionKey]?.ru || ""
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
                )
        }
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
