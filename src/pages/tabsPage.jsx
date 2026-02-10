import {useEffect, useMemo, useState} from "react";
import CustomTable from "../components/customElems/CustomTable";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import Toggle from "../components/controls/Toggle";
import {FiEdit, FiTrash} from "react-icons/fi";
import {useTranslations} from "../hooks/useTranslations";
import apiFetch from "../utils/apiFetch";
import TabsUnderbuttonDialog from "../components/tabsCreateComponents/TabsUnderbuttonDialog";
import TabsWithBackgroundDialog from "../components/tabsCreateComponents/TabsWithBackgroundDialog";

export default function TabsPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";

    const {accessToken, user} = useAuth();
    const {showToast} = useToast();
    const canEdit = user && (user.role === "moderator" || user.role === "admin");

    const [withBackground, setWithBackground] = useState([]);
    const [underbutton, setUnderbutton] = useState([]);

    const [creatingType, setCreatingType] = useState(null); // "with-background" | "underbutton" | null
    const [editing, setEditing] = useState(null); // {type, row}
    const [deleteTarget, setDeleteTarget] = useState(null); // {type, id}

    const {translationMaps, loadAllTranslations, deleteKeys} = useTranslations();

    async function load() {
        const res = await apiFetch(`${API_URL}/tabs`);
        setWithBackground(res.withBackground || []);
        setUnderbutton(res.underbutton || []);
    }

    useEffect(() => {
        if (!accessToken) return;

        (async () => {
            await loadAllTranslations();
            await load();
        })();
    }, [accessToken]);

    async function patchMass(type, items) {
        await apiFetch(`${API_URL}/tabs`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({type, items})
        });
    }

    async function deleteMass(type, ids) {
        await apiFetch(`${API_URL}/tabs`, {
            method: "DELETE",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({type, ids})
        });
    }

    async function toggleVisible(type, row) {
        const next = !row.isVisible;

        await patchMass(type, [{id: row.id, isVisible: next}]);

        if (type === "with-background") {
            setWithBackground(prev => prev.map(x => (x.id === row.id ? {...x, isVisible: next} : x)));
        } else {
            setUnderbutton(prev => prev.map(x => (x.id === row.id ? {...x, isVisible: next} : x)));
        }
    }

    function collectKeysForDelete(type, item) {
        const keys = [];
        if (item.labelKey) keys.push(item.labelKey);
        if (item.titleKey) keys.push(item.titleKey);

        if (type === "with-background") {
            if (item.textKey) keys.push(item.textKey);
            if (item.buttonTextKey) keys.push(item.buttonTextKey);

            const list = item.list || [];
            for (const f of list) {
                if (f?.textKey) keys.push(f.textKey);
            }
        } else {
            if (item.descriptionKey) keys.push(item.descriptionKey);
            if (item.headlineKey) keys.push(item.headlineKey);
            if (item.buttonTextKey) keys.push(item.buttonTextKey);
        }

        return Array.from(new Set(keys)).filter(Boolean);
    }

    async function deleteItem(type, id) {
        const list = type === "with-background" ? withBackground : underbutton;
        const item = list.find(x => x.id === id);
        if (!item) return;

        await deleteMass(type, [id]);

        const keysToDelete = collectKeysForDelete(type, item);
        if (keysToDelete.length) await deleteKeys(keysToDelete);

        if (type === "with-background") {
            setWithBackground(prev => prev.filter(x => x.id !== id));
        } else {
            setUnderbutton(prev => prev.filter(x => x.id !== id));
        }

        showToast("Таб и связанные переводы удалены");
    }

    const columnsWithBackground = useMemo(() => ([
        {
            key: "id",
            title: "ID",
            width: "140px",
            render: (value, row) => (
                <div className="table__cell-row">
                    <span className="table__mono">{value}</span>

                    <Toggle
                        checked={row.isVisible}
                        disabled={!canEdit}
                        title={row.isVisible ? "Скрыть таб" : "Показать таб"}
                        onChange={() => {
                            if (!canEdit) return;
                            toggleVisible("with-background", row);
                        }}
                    />
                </div>
            )
        },
        {
            key: "icon",
            title: "Иконка",
            width: "170px",
            render: (v) => v ? <span className="table__mono">{v}</span> : <span className="table__muted">—</span>
        },
        {
            key: "labelKey",
            title: "Лейбл",
            width: "220px",
            render: (_, row) => translationMaps[row.labelKey]?.ru || ""
        },
        {
            key: "titleKey",
            title: "Заголовок",
            width: "260px",
            render: (_, row) => translationMaps[row.titleKey]?.ru || ""
        },
        {
            key: "textKey",
            title: "Текст",
            width: "320px",
            render: (_, row) => translationMaps[row.textKey]?.ru || ""
        },
        {
            key: "btn",
            title: "Кнопка",
            width: "220px",
            render: (_, row) => row.buttonTextKey ? (translationMaps[row.buttonTextKey]?.ru || "") : ""
        },
        {
            key: "features",
            title: "Преимущества",
            width: "110px",
            render: (_, row) => <span className="table__mono">{(row.list || []).length}</span>
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
                            onClick={() => setEditing({type: "with-background", row})}
                        >
                            <FiEdit size={16}/>
                        </button>

                        <button
                            title="Удалить"
                            className="button button_icon button_reject"
                            onClick={() => setDeleteTarget({type: "with-background", id: row.id})}
                        >
                            <FiTrash size={16}/>
                        </button>
                    </div>
                )
        }
    ]), [translationMaps, canEdit, withBackground]);

    const columnsUnderbutton = useMemo(() => ([
        {
            key: "id",
            title: "ID",
            width: "140px",
            render: (value, row) => (
                <div className="table__cell-row">
                    <span className="table__mono">{value}</span>

                    <Toggle
                        checked={row.isVisible}
                        disabled={!canEdit}
                        title={row.isVisible ? "Скрыть таб" : "Показать таб"}
                        onChange={() => {
                            if (!canEdit) return;
                            toggleVisible("underbutton", row);
                        }}
                    />
                </div>
            )
        },
        {
            key: "labelKey",
            title: "Лейбл",
            width: "220px",
            render: (_, row) => translationMaps[row.labelKey]?.ru || ""
        },
        {
            key: "titleKey",
            title: "Заголовок",
            width: "260px",
            render: (_, row) => translationMaps[row.titleKey]?.ru || ""
        },
        {
            key: "descriptionKey",
            title: "Описание",
            width: "340px",
            render: (_, row) => translationMaps[row.descriptionKey]?.ru || ""
        },
        {
            key: "buttonTextKey",
            title: "Кнопка",
            width: "240px",
            render: (_, row) => row.buttonTextKey ? (translationMaps[row.buttonTextKey]?.ru || "") : ""
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
                            onClick={() => setEditing({type: "underbutton", row})}
                        >
                            <FiEdit size={16}/>
                        </button>

                        <button
                            title="Удалить"
                            className="button button_icon button_reject"
                            onClick={() => setDeleteTarget({type: "underbutton", id: row.id})}
                        >
                            <FiTrash size={16}/>
                        </button>
                    </div>
                )
        }
    ]), [translationMaps, canEdit, underbutton]);

    return (
        <div className="page" style={{padding: 24}}>
            <div className="page__topbar page__topbar_sticky page__topbar_wrap">
                <div className="page__topbar-col">
                    <h1 className="page__header">Tabs</h1>
                    <div className="page__topbar-title">Управление табами (/tabs)</div>
                </div>
            </div>
            <div style={{marginTop: 16}}>
                <div className="page__row" style={{justifyContent: "space-between", alignItems: "center"}}>
                    <div>
                        <h2 className="page__header" style={{fontSize: 20}}>Tabs: with-background</h2>
                    </div>

                    {canEdit && (
                        <button className="button" onClick={() => setCreatingType("with-background")}>
                            Создать
                        </button>
                    )}
                </div>

                <CustomTable columns={columnsWithBackground} data={withBackground}/>
            </div>
            <div style={{marginTop: 28}}>
                <div className="page__row" style={{justifyContent: "space-between", alignItems: "center"}}>
                    <div>
                        <h2 className="page__header" style={{fontSize: 20}}>Tabs: underbutton</h2>
                    </div>

                    {canEdit && (
                        <button className="button" onClick={() => setCreatingType("underbutton")}>
                            Создать
                        </button>
                    )}
                </div>

                <CustomTable columns={columnsUnderbutton} data={underbutton}/>
            </div>
            {creatingType === "with-background" && (
                <TabsWithBackgroundDialog
                    mode="create"
                    onClose={() => {
                        setCreatingType(null);
                        load();
                    }}
                />
            )}

            {creatingType === "underbutton" && (
                <TabsUnderbuttonDialog
                    mode="create"
                    onClose={() => {
                        setCreatingType(null);
                        load();
                    }}
                />
            )}

            {editing?.type === "with-background" && (
                <TabsWithBackgroundDialog
                    mode="edit"
                    initial={editing.row}
                    onClose={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}

            {editing?.type === "underbutton" && (
                <TabsUnderbuttonDialog
                    mode="edit"
                    initial={editing.row}
                    onClose={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}

            {deleteTarget && (
                <ConfirmDialog
                    open={true}
                    title="Удалить таб?"
                    text="Вы уверены, что хотите удалить этот таб и связанные переводы?"
                    onConfirm={() => {
                        deleteItem(deleteTarget.type, deleteTarget.id);
                        setDeleteTarget(null);
                    }}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
