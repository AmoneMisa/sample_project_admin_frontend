
import { useState, useCallback } from "react";
import apiFetch from "../utils/apiFetch";

export function useUsers() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const [users, setUsers] = useState([]);

    const loadUsers = useCallback(async () => {
        const res = await apiFetch(`${API_URL}/users`);
        const data = await res.json();
        setUsers(data);
    }, []);

    const updatePermissions = async (id, permissions) => {
        const res = await apiFetch(`${API_URL}/users/${id}/permissions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ permissions }),
        });
        return res.json();
    };

    return { users, loadUsers, updatePermissions };
}
