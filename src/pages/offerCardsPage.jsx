import {useEffect, useMemo, useState} from "react";
import CustomTable from "../components/customElems/CustomTable";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import OfferCardDialog from "../components/modals/OfferCardDialog";
import Toggle from "../components/controls/Toggle";
import {FiEdit, FiTrash} from "react-icons/fi";
import apiFetch from "../utils/apiFetch";

function normalizeOfferCard(row) {
    const visible =
        typeof row?.visible === "boolean"
            ? row.visible
            : typeof row?.isVisible === "boolean"
                ? row.isVisible
                : true;

    return {
        ...row,
        visible,
        isVisible: visible,
    };
}

export default function OfferCardsPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken, user} = useAuth();
    const {showToast} = useToast();

    const canEdit = !!user && (user.role === "admin" || user.role === "moderator");

    const [items, setItems] = useState([]);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    async function load() {
        const data = await apiFetch(`${API_URL}/offer-cards`);

        setItems((data || []).map(normalizeOfferCard));
    }

    useEffect(() => {
        if (!accessToken) return;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken]);

    async function toggleVisible(row) {
        if (!canEdit) return;

        const updated = await apiFetch(`${API_URL}/offer-cards/${row.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ visible: !row.visible })
        });

        const next = normalizeOfferCard(updated);
        setItems(prev => prev.map(i => (i.id === row.id ? next : i)));
        showToast(next.visible ? "Карточка включена" : "Карточка скрыта");
    }

    async function deleteItem(id) {
        if (!canEdit) return;

        await apiFetch(`${API_URL}/offer-cards/${id}`, {
            method: "DELETE"
        });

        setItems(prev => prev.filter(i => i.id !== id));
        showToast("Карточка удалена");
    }

    const columns = useMemo(() => {
        const base = [
            {
                key: "visible",
                title: "Вкл",
                width: "90px",
                render: (_, row) => (
                    <div style={{display: "flex", justifyContent: "center"}}>
                        <Toggle
                            checked={!!row.visible}
                            disabled={!canEdit}
                            onChange={() => toggleVisible(row)}
                            title={canEdit ? "Показать / скрыть" : "Только просмотр"}
                        />
                    </div>
                )
            },
            { key: "order", title: "Порядок", width: "110px", render: (v) => (v ?? 0) },
            { key: "key", title: "Key", width: "220px", render: (v) => v || "-" },
            { key: "name", title: "Название", width: "260px", render: (v) => v || "-" },
            {
                key: "description",
                title: "Описание",
                width: "320px",
                render: (v) => v || "-"
            },
            {
                key: "monthly",
                title: "Monthly",
                width: "180px",
                render: (v) => v || "-"
            },
            {
                key: "yearly",
                title: "Yearly",
                width: "180px",
                render: (v) => v || "-"
            },
            {
                key: "highlight",
                title: "Highlight",
                width: "120px",
                render: (v) => (v ? "Да" : "Нет")
            },
            {
                key: "features",
                title: "Features",
                render: (v) => {
                    const s = (v ?? "").toString().trim();
                    return s ? s : "-";
                }
            }
        ];

        if (canEdit) {
            base.push({
                key: "actions",
                title: "Действия",
                width: "140px",
                render: (_, row) => (
                    <div style={{display: "flex", gap: 8, justifyContent: "center"}}>
                        <button
                            type="button"
                            className="button button_icon"
                            title="Редактировать"
                            onClick={() => setEditing(row)}
                        >
                            <FiEdit size={16}/>
                        </button>

                        <button
                            type="button"
                            className="button button_icon button_reject"
                            title="Удалить"
                            onClick={() => setDeleteTarget(row.id)}
                        >
                            <FiTrash size={16}/>
                        </button>
                    </div>
                )
            });
        }

        return base;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canEdit, accessToken]);

    return (
        <div className="page offer-cards-page">
            <div className="page__topbar page__topbar_sticky page__topbar_wrap">
                <div className="page__topbar-col">
                    <h1 className="page__header">Offer Cards</h1>
                    <div className="page__topbar-title">
                        Управление карточками офферов
                    </div>
                </div>

                {canEdit && (
                    <div className="page__row page__row_wrap" style={{justifyContent: "flex-end"}}>
                        <button
                            type="button"
                            className="button"
                            onClick={() => setCreating(true)}
                        >
                            Создать
                        </button>
                    </div>
                )}
            </div>

            <div className="page__block page__block_card">
                <CustomTable columns={columns} data={items}/>
            </div>

            {canEdit && creating && (
                <OfferCardDialog
                    mode="create"
                    onClose={() => {
                        setCreating(false);
                        load();
                    }}
                />
            )}

            {canEdit && editing && (
                <OfferCardDialog
                    mode="edit"
                    initial={editing}
                    onClose={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}

            {canEdit && deleteTarget && (
                <ConfirmDialog
                    open={true}
                    title="Удалить карточку?"
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
