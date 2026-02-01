import {useEffect, useState} from "react";
import CustomTable from "../components/customElems/CustomTable";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import FooterMenuItemDialog from "../components/modals/FooterMenuItemDialog";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import {useTranslations} from "../hooks/useTranslations";
import Toggle from "../components/controls/Toggle";
import {FiEdit, FiTrash} from "react-icons/fi";
import apiFetch from "../utils/apiFetch";

export default function FooterMenuPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken} = useAuth();
    const {showToast} = useToast();

    const [menuBlock, setMenuBlock] = useState(null);
    const [items, setItems] = useState([]);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const {translationMaps, loadAllTranslations, deleteKeys} = useTranslations();

    async function load() {
        const blocks = await apiFetch(`${API_URL}/footer?all=true`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        let block = blocks.find(b => b.type === "menu");

        if (!block) {
            block = await apiFetch(`${API_URL}/footer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    type: "menu",
                    titleKey: "footer.menu.title",
                    descriptionKey: "footer.menu.description",
                    order: 0,
                    isVisible: true
                })
            });
        }

        setMenuBlock(block);

        const items = await apiFetch(`${API_URL}/footer/${block.id}/items`, {
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        setItems(items);
    }

    useEffect(() => {
        if (!accessToken) return;

        (async () => {
            await loadAllTranslations();
            await load();
        })();
    }, [accessToken]);

    async function deleteItem(id) {
        const item = items.find(i => i.id === id);
        if (!item) return;

        await apiFetch(`${API_URL}/footer/items/${id}`, {
            method: "DELETE",
            headers: {Authorization: `Bearer ${accessToken}`}
        });

        const keysToDelete = [item.labelKey];
        if (item.descriptionKey) keysToDelete.push(item.descriptionKey);

        await deleteKeys(keysToDelete);

        setItems(prev => prev.filter(i => i.id !== id));
        showToast("Пункт и связанные переводы удалены");
    }

    async function toggleVisible(item) {
        const updated = await apiFetch(`${API_URL}/footer/items/${item.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({isVisible: !item.isVisible})
        });

        setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
    }

    const columns = [
        {key: "id", title: "ID", width: "80px"},
        {
            key: "labelKey",
            title: "Название (ru)",
            render: (_, row) => {
                const ru = translationMaps[row.labelKey]?.ru;
                return ru?.trim() ? ru : "(нет перевода)";
            }
        },
        {
            key: "href",
            title: "Ссылка",
            render: (value) => value || "-"
        },
        {
            key: "order",
            title: "Порядок",
            width: "120px",
            render: (value) => value ?? "-"
        },
        {
            key: "isVisible",
            title: "Отображать",
            width: "140px",
            render: (value, row) => (
                <div style={{display: "flex", alignItems: "center", justifyContent: "center"}}>
                    <Toggle
                        checked={!!value}
                        onChange={() => toggleVisible(row)}
                        title="Показать / скрыть"
                    />
                </div>
            )
        },
        {
            key: "actions",
            title: "Действия",
            width: "140px",
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
        <div className="page footer-menu-page">
            <div className="page__topbar page__topbar_sticky page__topbar_wrap">
                <div className="page__topbar-col">
                    <h1 className="page__header">Меню футера</h1>
                    <div className="page__topbar-title">
                        Управление пунктами меню футера
                    </div>
                </div>

                <div className="page__row page__row_wrap" style={{justifyContent: "flex-end"}}>
                    <button
                        type="button"
                        className="button"
                        onClick={() => setCreating(true)}
                        disabled={!menuBlock}
                        title={!menuBlock ? "Блок меню ещё не загружен" : "Создать пункт"}
                    >
                        Создать пункт
                    </button>
                </div>
            </div>

            <div className="page__block page__block_card">
                <CustomTable columns={columns} data={items}/>
            </div>

            {creating && menuBlock && (
                <FooterMenuItemDialog
                    mode="create"
                    blockId={menuBlock.id}
                    onClose={() => {
                        setCreating(false);
                        load();
                    }}
                />
            )}

            {editing && menuBlock && (
                <FooterMenuItemDialog
                    mode="edit"
                    initial={editing}
                    blockId={menuBlock.id}
                    onClose={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}

            {deleteTarget && (
                <ConfirmDialog
                    open={true}
                    title="Удалить пункт?"
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
