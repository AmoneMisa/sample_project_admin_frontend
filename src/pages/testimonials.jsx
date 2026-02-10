import ConfirmDialog from "../components/modals/ConfirmDialog";
import TestimonialDialog from "../components/modals/TestimonialDialog";
import {FiCopy, FiEdit, FiTrash} from "react-icons/fi";
import Toggle from "../components/controls/Toggle";
import CustomTable from "../components/customElems/CustomTable";
import {useEffect, useMemo, useState} from "react";
import {useToast} from "../components/layout/ToastContext";
import {useAuth} from "../hooks/authContext";
import LabeledInput from "../components/controls/LabeledInput";
import LabeledSelect from "../components/controls/LabeledSelect";
import apiFetch from "../utils/apiFetch";
import {useTranslations} from "../hooks/useTranslations";

export default function Testimonials() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const [items, setItems] = useState([]);
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [filterErrors, setFilterErrors] = useState({});
    const {showToast} = useToast();
    const {accessToken, user} = useAuth();
    const canEdit = user && (user.role === "moderator" || user.role === "admin");
    const [filters, setFilters] = useState({name: "", role: "", visible: "all", rating: "", search: ""});

    const {translationMaps, loadAllTranslations, deleteKeys} = useTranslations();

    function validateFilters() {
        const e = {};
        if (filters.rating && (isNaN(filters.rating) || filters.rating < 0)) e.rating = "Введите число ≥ 0";
        setFilterErrors(e);
        return Object.keys(e).length === 0;
    }

    const [sort, setSort] = useState({field: "id", direction: "asc"});

    function handleSort(field) {
        setSort(prev => prev.field === field
            ? {field, direction: prev.direction === "asc" ? "desc" : "asc"}
            : {field, direction: "asc"});
    }

    useEffect(() => {
        async function load() {
            if (!accessToken) return;

            await loadAllTranslations();
            const data = await apiFetch(`${API_URL}/testimonials`);
            setItems(data);
        }

        load();
    }, [accessToken, API_URL]);

    async function createItem(payload) {
        const res = await apiFetch(`${API_URL}/testimonials`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });

        const newItem = res.testimonial ?? res;

        setItems(prev => [...prev, newItem]);
        showToast("Отзыв создан");
    }

    async function updateItem(id, payload) {
        const res = await apiFetch(`${API_URL}/testimonials/${id}`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });

        const updated = res.testimonial ?? res;

        setItems(prev => prev.map(i => (i.id === id ? updated : i)));
        showToast("Отзыв обновлён");
    }

    async function deleteItem(id) {
        const item = items.find(i => i.id === id);
        if (!item) return;

        await apiFetch(`${API_URL}/testimonials/${id}`, {method: "DELETE"});

        const keysToDelete = [item.nameKey, item.roleKey, item.quoteKey].filter(Boolean);
        if (keysToDelete.length) await deleteKeys(keysToDelete);

        setItems(prev => prev.filter(i => i.id !== id));
        showToast("Отзыв удалён");
    }

    async function duplicateItem(item) {
        const {id, ...rest} = item;

        const newItem = await apiFetch(`${API_URL}/testimonials`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(rest)
        });

        const created = newItem.testimonial ?? newItem;

        setItems(prev => [...prev, created]);
        showToast("Отзыв продублирован");
    }

    const filtered = useMemo(() => {
        return items.filter(item => {
            const name = (translationMaps[item.nameKey]?.ru || "").toLowerCase();
            const role = (translationMaps[item.roleKey]?.ru || "").toLowerCase();
            const quote = (translationMaps[item.quoteKey]?.ru || "").toLowerCase();

            if (filters.name && !name.includes(filters.name.toLowerCase())) return false;
            if (filters.role && !role.includes(filters.role.toLowerCase())) return false;
            if (filters.visible === "visible" && !item.isVisible) return false;
            if (filters.visible === "hidden" && item.isVisible) return false;
            if (filters.rating && Number(item.rating) !== Number(filters.rating)) return false;
            if (filters.search && !quote.includes(filters.search.toLowerCase())) return false;

            return true;
        });
    }, [items, filters, translationMaps]);

    const sorted = useMemo(() => {
        const arr = [...filtered];
        const {field, direction} = sort;
        const dir = direction === "asc" ? 1 : -1;

        arr.sort((a, b) => {
            const ax = a[field];
            const bx = b[field];
            if (ax < bx) return -1 * dir;
            if (ax > bx) return 1 * dir;
            return 0;
        });

        return arr;
    }, [filtered, sort]);

    const columns = [
        {
            key: "id",
            title: (
                <span onClick={() => handleSort("id")} className="sortable">
                    ID {sort.field === "id" ? (sort.direction === "asc" ? "↑" : "↓") : ""}
                </span>
            ),
            render: (value, row) => (
                <div className="table__cell-row" style={{display: "flex", gap: 8, alignItems: "center"}}>
                    <span>{value}</span>
                    <Toggle
                        checked={row.isVisible}
                        disabled={!canEdit}
                        title={row.isVisible ? "Скрыть отзыв" : "Показать отзыв"}
                        onChange={() => {
                            if (!canEdit) return;
                            updateItem(row.id, {isVisible: !row.isVisible});
                        }}
                    />
                </div>
            ),
        },
        {
            key: "nameKey",
            title: (
                <span onClick={() => handleSort("nameKey")} className="sortable">
                    Имя {sort.field === "nameKey" ? (sort.direction === "asc" ? "↑" : "↓") : ""}
                </span>
            ),
            render: (_, row) => translationMaps[row.nameKey]?.ru || ""
        },
        {
            key: "roleKey",
            title: (
                <span onClick={() => handleSort("roleKey")} className="sortable">
                    Роль {sort.field === "roleKey" ? (sort.direction === "asc" ? "↑" : "↓") : ""}
                </span>
            ),
            render: (_, row) => translationMaps[row.roleKey]?.ru || ""
        },
        {
            key: "quoteKey",
            title: (
                <span onClick={() => handleSort("quoteKey")} className="sortable">
                    Отзыв {sort.field === "quoteKey" ? (sort.direction === "asc" ? "↑" : "↓") : ""}
                </span>
            ),
            render: (_, row) => translationMaps[row.quoteKey]?.ru || ""
        },
        {
            key: "rating",
            width: "100px",
            title: (
                <span onClick={() => handleSort("rating")} className="sortable">
                    Рейтинг {sort.field === "rating" ? (sort.direction === "asc" ? "↑" : "↓") : ""}
                </span>
            ),
        },
        {
            key: "actions",
            title: "Действия",
            width: "180px",
            render: (_, row) => canEdit && (
                <div style={{display: "flex", justifyContent: "space-between"}}>
                    <button className="button button_icon button_reject" onClick={() => setEditing(row)}>
                        <FiEdit size={16}/>
                    </button>
                    <button className="button button_icon button_reject" onClick={() => setDeleteTarget(row.id)}>
                        <FiTrash size={16}/>
                    </button>
                    <button className="button button_icon button_reject" onClick={() => duplicateItem(row)}>
                        <FiCopy size={16}/>
                    </button>
                </div>
            ),
        }
    ];

    return (
        <div className="page" style={{padding: 24}}>
            <div className="page__topbar page__topbar_sticky page__topbar_wrap">
                <div className="page__topbar-col">
                    <h1 className="page__header">Отзывы</h1>
                    <div className="page__topbar-title">Управление отзывами</div>
                </div>

                {canEdit && (
                    <div className="page__row page__row_wrap" style={{justifyContent: "flex-end"}}>
                        <button className="button" onClick={() => setCreating(true)}>
                            Создать
                        </button>
                    </div>
                )}
            </div>

            <div style={{display: "flex", gap: 12, marginBottom: 16}}>
                <LabeledInput
                    label="Имя"
                    placeholder={"Анна Логачева"}
                    value={filters.name}
                    onChange={v => setFilters({...filters, name: v})}
                />
                <LabeledInput
                    label="Роль"
                    placeholder={"Разработчик"}
                    value={filters.role}
                    onChange={v => setFilters({...filters, role: v})}
                />
                <LabeledSelect
                    label="Отображение"
                    value={filters.visible}
                    options={[
                        {value: "all", label: "Все"},
                        {value: "visible", label: "Только видимые"},
                        {value: "hidden", label: "Только скрытые"},
                    ]}
                    onChange={v => setFilters({...filters, visible: v})}
                />
                <LabeledInput
                    label="Рейтинг"
                    placeholder={"5"}
                    type="number"
                    value={filters.rating}
                    error={filterErrors.rating}
                    onChange={v => {
                        setFilters({...filters, rating: v});
                        validateFilters();
                    }}
                    style={{width: 100}}
                />
                <LabeledInput
                    label="Поиск по тексту"
                    placeholder="Этот товар невероятный..."
                    value={filters.search}
                    onChange={v => setFilters({...filters, search: v})}
                    style={{flex: 1}}
                />
            </div>

            <CustomTable columns={columns} data={sorted}/>

            {creating && canEdit && (
                <TestimonialDialog
                    title="Создать отзыв"
                    onSave={createItem}
                    onClose={() => setCreating(false)}
                />
            )}

            {editing && canEdit && (
                <TestimonialDialog
                    title="Редактировать отзыв"
                    initial={editing}
                    onSave={(payload) => updateItem(editing.id, payload)}
                    onClose={() => setEditing(null)}
                />
            )}

            {deleteTarget && canEdit && (
                <ConfirmDialog
                    open={true}
                    title="Удалить отзыв?"
                    text="Вы уверены, что хотите удалить этот отзыв?"
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
