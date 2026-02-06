import {useEffect, useMemo, useState} from "react";
import CustomTable from "../components/customElems/CustomTable";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import ServiceDialog from "../components/modals/ServiceDialog";
import Toggle from "../components/controls/Toggle";
import {FiEdit, FiTrash} from "react-icons/fi";
import apiFetch from "../utils/apiFetch";
import {useTranslations} from "../hooks/useTranslations";
import ServiceCategoryDialog from "../components/modals/ServiceCategoryDialog";

export default function ServicesPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken, user} = useAuth();
    const {showToast} = useToast();
    const {translationMaps, languages, loadAllTranslations} = useTranslations();

    const canEdit = user && (user.role === "moderator" || user.role === "admin");

    const [items, setItems] = useState([]);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [categories, setCategories] = useState([]);
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null);

    async function loadAll() {
        const [services, cats] = await Promise.all([
            apiFetch(`${API_URL}/services`),
            apiFetch(`${API_URL}/service-categories`)
        ]);
        setItems(services || []);
        setCategories(cats || []);
    }

    async function load() {
        const data = await apiFetch(`${API_URL}/services`);
        setItems(data || []);
    }

    useEffect(() => {
        if (!accessToken) return;
        loadAll();
    }, [accessToken]);


    async function toggleVisible(row) {
        if (!canEdit) return;

        const updated = await apiFetch(`${API_URL}/services/${row.id}`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({isVisible: !row.isVisible})
        });

        setItems(prev => prev.map(i => (i.id === row.id ? updated : i)));
        showToast(updated.isVisible ? "Сервис включён" : "Сервис скрыт");
    }

    async function deleteItem(id) {
        if (!canEdit) return;

        await apiFetch(`${API_URL}/services/${id}`, {method: "DELETE"});
        setItems(prev => prev.filter(i => i.id !== id));
        showToast("Сервис удалён");
    }

    const getPreviewTextByKey = (key) => {
        const map = translationMaps?.[key] || {};
        for (const lang of languages) {
            const v = (map?.[lang.code] ?? "").trim();
            if (v) return v;
        }
        return "";
    };

    const columns = useMemo(() => {
        const base = [
            {
                key: "isVisible",
                title: "Вкл",
                width: "90px",
                render: (_, row) => (
                    <div style={{display: "flex", justifyContent: "center"}}>
                        <Toggle
                            checked={!!row.isVisible}
                            disabled={!canEdit}
                            onChange={() => toggleVisible(row)}
                        />
                    </div>
                )
            },
            {key: "order", title: "Порядок", width: "110px"},
            {
                key: "titleKey",
                title: "Название",
                width: "260px",
                render: (_, row) => {
                    const text = getPreviewTextByKey(row.titleKey);
                    return <a href={`/admin?key=${row.titleKey}`}>{text || "-"}</a>;
                }
            },
            {
                key: "descriptionKey",
                title: "Описание",
                width: "320px",
                render: (_, row) => {
                    const text = getPreviewTextByKey(row.descriptionKey);
                    return <a href={`/admin?key=${row.descriptionKey}`}>{text || "-"}</a>;
                }
            },
            {
                key: "category",
                title: "Категория",
                width: "160px",
                render: (v) => v || "-"
            },
            {
                key: "link",
                title: "Ссылка",
                width: "260px",
                render: (v) => v || "-"
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
                            onClick={() => setEditing(row)}
                        >
                            <FiEdit size={16}/>
                        </button>

                        <button
                            type="button"
                            className="button button_icon button_reject"
                            onClick={() => setDeleteTarget(row.id)}
                        >
                            <FiTrash size={16}/>
                        </button>
                    </div>
                )
            });
        }

        return base;
    }, [canEdit, translationMaps, languages]);
    const categoryColumns = useMemo(() => {
        const base = [
            {
                key: "isVisible",
                title: "Вкл",
                width: "90px",
                render: (_, row) => (
                    <div style={{display: "flex", justifyContent: "center"}}>
                        <Toggle
                            checked={!!row.isVisible}
                            disabled={!canEdit}
                            onChange={async () => {
                                if (!canEdit) return;

                                const updated = await apiFetch(`${API_URL}/service-categories/${row.id}`, {
                                    method: "PATCH",
                                    headers: {"Content-Type": "application/json"},
                                    body: JSON.stringify({isVisible: !row.isVisible})
                                });

                                setCategories(prev => prev.map(i => (i.id === row.id ? updated : i)));
                                showToast(updated.isVisible ? "Категория включена" : "Категория скрыта");
                            }}
                        />
                    </div>
                )
            },
            {key: "order", title: "Порядок", width: "110px"},
            {
                key: "titleKey",
                title: "Название",
                width: "320px",
                render: (_, row) => {
                    const text = getPreviewTextByKey(row.titleKey);
                    return <a href={`/admin?key=${row.titleKey}`}>{text || "-"}</a>;
                }
            },
            {
                key: "descriptionKey",
                title: "Описание",
                width: "420px",
                render: (_, row) => {
                    const text = getPreviewTextByKey(row.descriptionKey);
                    return <a href={`/admin?key=${row.descriptionKey}`}>{text || "-"}</a>;
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
                            onClick={() => setEditingCategory(row)}
                        >
                            <FiEdit size={16}/>
                        </button>

                        <button
                            type="button"
                            className="button button_icon button_reject"
                            onClick={() => setDeleteCategoryTarget(row.id)}
                        >
                            <FiTrash size={16}/>
                        </button>
                    </div>
                )
            });
        }

        return base;
    }, [canEdit, translationMaps, languages]);

    return (
        <div className="page services-page">
            <div className="page__topbar page__topbar_sticky page__topbar_wrap">
                <div className="page__topbar-col">
                    <h1 className="page__header">Services</h1>
                    <div className="page__topbar-title">Управление сервисами</div>
                </div>

                {canEdit && (
                    <div className="page__row page__row_wrap" style={{justifyContent: "flex-end"}}>
                        <button type="button" className="button" onClick={() => setCreating(true)}>
                            Создать
                        </button>
                    </div>
                )}
            </div>

            <div className="page__block page__block_card">
                <CustomTable columns={columns} data={items}/>
            </div>

            <div className="page__block page__block_card">
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12}}>
                    <div style={{fontWeight: 700}}>Категории сервисов</div>

                    {canEdit && (
                        <button type="button" className="button" onClick={() => setCreatingCategory(true)}>
                            Создать категорию
                        </button>
                    )}
                </div>

                <CustomTable columns={categoryColumns} data={categories}/>
            </div>

            {canEdit && creating && (
                <ServiceDialog
                    mode="create"
                    onClose={async () => {
                        setCreating(false);
                        await loadAllTranslations();
                        await load();
                    }}
                />
            )}

            {canEdit && editing && (
                <ServiceDialog
                    mode="edit"
                    initial={editing}
                    onClose={async () => {
                        setEditing(null);
                        await loadAllTranslations();
                        await load();
                    }}
                />
            )}

            {canEdit && deleteTarget && (
                <ConfirmDialog
                    open={true}
                    title="Удалить сервис?"
                    text="Вы уверены?"
                    onConfirm={() => {
                        deleteItem(deleteTarget);
                        setDeleteTarget(null);
                    }}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}

            {canEdit && creatingCategory && (
                <ServiceCategoryDialog
                    mode="create"
                    onClose={async () => {
                        setCreatingCategory(false);
                        await loadAllTranslations();
                        await loadAll();
                    }}
                />
            )}

            {canEdit && editingCategory && (
                <ServiceCategoryDialog
                    mode="edit"
                    initial={editingCategory}
                    onClose={async () => {
                        setEditingCategory(null);
                        await loadAllTranslations();
                        await loadAll();
                    }}
                />
            )}

            {canEdit && deleteCategoryTarget && (
                <ConfirmDialog
                    open={true}
                    title="Удалить категорию?"
                    text="Вы уверены?"
                    onConfirm={async () => {
                        await apiFetch(`${API_URL}/service-categories/${deleteCategoryTarget}`, { method: "DELETE" });
                        setCategories(prev => prev.filter(i => i.id !== deleteCategoryTarget));
                        showToast("Категория удалена");
                        setDeleteCategoryTarget(null);
                    }}
                    onCancel={() => setDeleteCategoryTarget(null)}
                />
            )}
        </div>
    );
}
