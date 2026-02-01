import {useEffect, useState} from "react";
import LabeledInput from "../components/controls/LabeledInput";
import LabeledSelect from "../components/controls/LabeledSelect";
import {useAuth} from "../hooks/authContext";
import CustomTable from "../components/customElems/CustomTable";
import apiFetch from "../utils/apiFetch";
import Checkbox from "../components/controls/Checkbox";

export default function UsersPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const [users, setUsers] = useState([]);
    const [roleFilter, setRoleFilter] = useState("all");
    const [search, setSearch] = useState("");

    const PERMISSIONS = [
        {key: "canEditMenu", label: "Редактировать меню"},
        {key: "canEditContacts", label: "Редактировать контакты"},
        {key: "canEditFeatureCards", label: "Редактировать featureCard"},
        {key: "canPublish", label: "Публиковать"},
    ];

    async function loadUsers() {
        const params = new URLSearchParams();

        if (roleFilter !== "all") params.set("role", roleFilter);
        if (search.trim()) params.set("email", search.trim());

        const res = await apiFetch(`${API_URL}/users?${params.toString()}`);
        const data = await res.json();
        setUsers(data);
    }

    useEffect(() => {
        if (accessToken) loadUsers();
    }, [accessToken, roleFilter, search]);

    async function changeRole(id, role) {
        await apiFetch(`${API_URL}/users/${id}/role`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({role})
        });

        loadUsers();
    }

    async function updatePermissions(id, permissions) {
        await apiFetch(`${API_URL}/users/${id}/permissions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({permissions})
        });

        loadUsers();
    }

    async function deleteUser(id) {
        await apiFetch(`${API_URL}/users/${id}/delete`, {
            method: "POST",
        });

        loadUsers();
    }

    async function restoreUser(id) {
        await apiFetch(`${API_URL}/users/${id}/restore`, {
            method: "POST",
        });

        loadUsers();
    }

    const columns = [
        {key: "id", title: "ID"},
        {key: "email", title: "Email"},
        {key: "full_name", title: "ФИО"},
        {key: "role", title: "Роль"},
        {
            key: "permissions",
            title: "Права",
            render: (_, u) => {
                const isAdmin = u.role === "admin";
                return (
                    <div style={{display: "flex", flexDirection: "column", gap: 4}}>
                        {PERMISSIONS.map(p => (
                            <Checkbox
                                key={p.key}
                                checked={u.permissions?.[p.key] || false}
                                disabled={isAdmin}
                                onChange={async (e) => {
                                    const updated = {
                                        ...u.permissions,
                                        [p.key]: e.target.checked
                                    };
                                    await updatePermissions(u.id, updated);
                                }}
                                label={p.label}
                            />
                        ))}
                    </div>
                );
            }
        },
        {
            key: "actions",
            title: "Действия",
            render: (_, u) => (
                <span style={{display: "flex", gap: 8}}>
                    {u.role !== "admin" && (
                        <>
                            <button
                                className="button button_border"
                                style={{color: "white"}}
                                onClick={() =>
                                    changeRole(
                                        u.id,
                                        u.role === "observer"
                                            ? "moderator"
                                            : "observer"
                                    )
                                }
                            >
                                {u.role === "observer"
                                    ? "Сделать модератором"
                                    : "Сделать наблюдателем"}
                            </button>

                            {!u.deleted ? (
                                <button
                                    className="button_reject"
                                    onClick={() => deleteUser(u.id)}
                                >
                                    Удалить
                                </button>
                            ) : (
                                <button
                                    className="button_accept"
                                    onClick={() => restoreUser(u.id)}
                                >
                                    Восстановить
                                </button>
                            )}
                        </>
                    )}
                </span>
            ),
        },
    ];

    return (
        <div className='page' style={{padding: 24}}>
            <div className="page__header">
                <h2>
                    Управление пользователями
                </h2>

                <div className="field" style={{marginBottom: 20}}>
                    <LabeledInput
                        label="Поиск по email"
                        value={search}
                        onChange={setSearch}
                    />

                    <LabeledSelect
                        value={roleFilter}
                        placeholder={"Роль пользователя"}
                        onChange={setRoleFilter}
                        options={[
                            {value: "all", label: "Все"},
                            {value: "observer", label: "Наблюдатели"},
                            {value: "moderator", label: "Модераторы"},
                            {value: "admin", label: "Администратор"},
                        ]}
                    />
                </div>
            </div>

            <CustomTable columns={columns} data={users}/>
        </div>
    );
}
