import ConfirmDialog from "../components/modals/ConfirmDialog";
import TestimonialDialog from "../components/modals/TestimonialDialog";
import {FiCopy, FiEdit, FiTrash} from "react-icons/fi";
import Checkbox from "../components/controls/Checkbox";
import CustomTable from "../components/customElems/CustomTable";
import {useEffect, useMemo, useState} from "react";
import {useToast} from "../components/layout/ToastContext";
import {useAuth} from "../hooks/authContext";
import LabeledInput from "../components/controls/LabeledInput";
import LabeledSelect from "../components/controls/LabeledSelect";

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
    const [filters, setFilters] = useState({name: "", role: "", visible: "all", rating: "", search: "",});

    function validateFilters() {
        const e = {};
        if (filters.rating && (isNaN(filters.rating) || filters.rating < 0)) {
            e.rating = "Введите число ≥ 0";
        }
        setFilterErrors(e);
        return Object.keys(e).length === 0;
    }

    const [sort, setSort] = useState({field: "id", direction: "asc",});

    function handleSort(field) {
        setSort(prev => prev.field === field ? {
            field,
            direction: prev.direction === "asc" ? "desc" : "asc"
        } : {field, direction: "asc"});
    }

    useEffect(() => {
        async function load() {
            if (!accessToken) return;
            const res = await fetch(`${API_URL}/testimonials`, {headers: {Authorization: `Bearer ${accessToken}`},});
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        }

        load();
    }, [accessToken, API_URL]);

    async function createItem(payload) {
        const res = await fetch(`${API_URL}/testimonials`, {
            method: "POST",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`,},
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json();
            showToast(err.detail || "Ошибка создания");
            return;
        }

        const newItem = await res.json();
        setItems(prev => [...prev, newItem]);
        showToast("Отзыв создан");
    }

    async function updateItem(id, payload) {
        const res = await fetch(`${API_URL}/testimonials/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json();
            showToast(err.detail || "Ошибка обновления");
            return;
        }

        const updated = await res.json();
        setItems(prev => prev.map(i => (i.id === id ? updated : i)));
        showToast("Отзыв обновлён");
    }

    async function deleteItem(id) {
        const res = await fetch(`${API_URL}/testimonials/${id}`, {
            method: "DELETE",
            headers: {Authorization: `Bearer ${accessToken}`},
        });

        if (!res.ok) {
            const err = await res.json();
            showToast(err.detail || "Ошибка удаления");
            return;
        }

        setItems(prev => prev.filter(i => i.id !== id));
        showToast("Отзыв удалён");
    }

    async function duplicateItem(item) {
        const {id, ...rest} = item;
        const duplicated = {...rest, name: `${item.name} (копия)`};

        const res = await fetch(`${API_URL}/testimonials`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(duplicated),
        });

        if (!res.ok) {
            const err = await res.json();
            showToast(err.detail || "Ошибка дублирования");
            return;
        }

        const newItem = await res.json();
        setItems(prev => [...prev, newItem]);
        showToast("Отзыв продублирован");
    }

    const filtered = useMemo(() => {
        return items.filter(item => {
            if (filters.name && !item.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
            if (filters.role && !item.role.toLowerCase().includes(filters.role.toLowerCase())) return false;
            if (filters.visible === "visible" && !item.isVisible) return false;
            if (filters.visible === "hidden" && item.isVisible) return false;
            if (filters.rating && Number(item.rating) !== Number(filters.rating)) return false;
            if (filters.search && !item.quote.toLowerCase().includes(filters.search.toLowerCase())) return false;
            return true;
        });
    }, [items, filters]);
    const sorted = useMemo(() => {
        const arr = [...filtered];
        const {field, direction} = sort;
        arr.sort((a, b) => {
            const dir = direction === "asc" ? 1 : -1;
            if (a[field] < b[field]) return -1 * dir;
            if (a[field] > b[field]) return 1 * dir;
            return 0;
        });
        return arr;
    }, [filtered, sort]);

    const columns = [{
        key: "id",
        title: (<span onClick={() => handleSort("id")}
                      className="sortable"> ID {sort.field === "id" ? (sort.direction === "asc" ? "↑" : "↓") : ""} </span>),
    }, {
        key: "name",
        title: (<span onClick={() => handleSort("name")}
                      className="sortable"> Имя {sort.field === "name" ? (sort.direction === "asc" ? "↑" : "↓") : ""} </span>),
    }, {
        key: "role",
        title: (<span onClick={() => handleSort("role")}
                      className="sortable"> Роль {sort.field === "role" ? (sort.direction === "asc" ? "↑" : "↓") : ""} </span>),
    }, {
        key: "quote",
        title: (<span onClick={() => handleSort("quote")}
                      className="sortable"> Отзыв {sort.field === "quote" ? (sort.direction === "asc" ? "↑" : "↓") : ""} </span>),
    }, {
        key: "rating",
        width: "100px",
        title: (<span onClick={() => handleSort("rating")}
                      className="sortable"> Рейтинг {sort.field === "rating" ? (sort.direction === "asc" ? "↑" : "↓") : ""} </span>),
    }, {
        key: "isVisible",
        title: "Отображать",
        width: "120px",
        render: (value, row) => canEdit ? (
            <Checkbox checked={value} onChange={() => updateItem(row.id, {isVisible: !value})}/>) : (
            <Checkbox checked={value} disabled/>),
    }, {
        key: "actions",
        title: "Действия",
        width: "180px",
        render: (_, row) => canEdit && (<div style={{display: "flex", justifyContent: "space-between"}}>
            <button className="button button_icon button_reject" onClick={() => setEditing(row)}><FiEdit size={16}/>
            </button>
            <button className="button button_icon button_reject" onClick={() => setDeleteTarget(row.id)}><FiTrash
                size={16}/></button>
            <button className="button button_icon button_reject" onClick={() => duplicateItem(row)}><FiCopy
                size={16}/></button>
        </div>),
    }
    ];

    return (
        <div className="page" style={{padding: 24}}>
            <div className="page__header">
                <h1>Отзывы</h1>

                {canEdit && (
                    <div style={{display: "flex", gap: 12}}>
                        <button className="button" onClick={() => setCreating(true)}>
                            Создать
                        </button>
                    </div>
                )}
            </div>

            {/* ФИЛЬТРЫ */}
            <div style={{display: "flex", gap: 12, marginBottom: 16}}>
                {/* ФИЛЬТРЫ */}
                <div style={{display: "flex", gap: 12, marginBottom: 16}}>

                    <LabeledInput
                        label="Имя"
                        value={filters.name}
                        onChange={v => setFilters({...filters, name: v})}
                    />

                    <LabeledInput
                        label="Роль"
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
                        value={filters.search}
                        onChange={v => setFilters({...filters, search: v})}
                        style={{flex: 1}}
                    />
                </div>

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
