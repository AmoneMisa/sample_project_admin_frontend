import {useEffect, useState} from "react";
import {useAuditLog} from "../hooks/useAuditLog";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import AddKeyBar from "../components/customElems/AddKeyBar";
import FiltersBar from "../components/customElems/FiltersBar";
import HistoryDialog from "../components/modals/HistoryDialog";
import {useToast} from "../components/layout/ToastContext";
import {FiClock, FiEdit, FiRotateCcw, FiTrash} from "react-icons/fi";
import {useAuth} from "../hooks/authContext";
import CustomTable from "../components/customElems/CustomTable";
import TranslationDialog from "../components/modals/TranslationDialog";
import {useTranslations} from "../hooks/useTranslations";

export default function Index() {
    const [editingCell, setEditingCell] = useState(null);
    const [search, setSearch] = useState("");
    const [sortAsc, setSortAsc] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterErrorLevel, setFilterErrorLevel] = useState("all");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);

    const {accessToken, user} = useAuth();
    const canEdit = user && (user.role === "moderator" || user.role === "admin");
    const {showToast} = useToast();

    const audit = useAuditLog();
    const {
        translations,
        languages,
        loadAllTranslations,
        saveValue,
        deleteKeys,
        setMeta
    } = useTranslations(audit);

    useEffect(() => {
        if (accessToken) loadAllTranslations();
    }, [accessToken]);

    function requestDeleteKey(key) {
        setDeleteTarget(key);
    }

    async function confirmDeleteKey() {
        if (!deleteTarget) return;
        await deleteKeys([deleteTarget]);
        setDeleteTarget(null);
    }

    function cancelDeleteKey() {
        setDeleteTarget(null);
    }

    async function handleAddKey(newKey) {
        if (!accessToken) return;
        if (translations[newKey]) return;

        // создаём пустые значения
        for (const lang of languages) {
            await saveValue(newKey, lang.code, "");
        }

        setMeta(prev => ({
            ...prev,
            [newKey]: {allowEmpty: false}
        }));

        setSearch(newKey);
        showToast("Ключ добавлен");
    }

    if (!translations || !languages) {
        return (
            <div className="page" style={{padding: 24}}>
                <h2>Загрузка переводов</h2>
            </div>
        );
    }

    const filtered = Object.entries(translations || {}).filter(([key, values]) => {
        const s = search.toLowerCase();
        if (!s) return true;

        if (key.toLowerCase().includes(s)) return true;

        return Object.values(values).some(v =>
            String(v).toLowerCase().includes(s)
        );
    });

    const sorted = [...filtered].sort(([a], [b]) =>
        sortAsc ? a.localeCompare(b) : b.localeCompare(a)
    );

    return (
        <div className="page" style={{padding: 24}}>
            <div className="page__header">
                <h1>Переводы</h1>

                <div style={{display: "flex", gap: 12}}>
                    {canEdit && (
                        <>
                            <button
                                className="button button_icon button_border"
                                style={{color: "var(--color-error)"}}
                                disabled={!audit.canUndo}
                                onClick={() => audit.undo()}
                            >
                                <FiRotateCcw size={16}/>
                            </button>

                            <button
                                className="button button_icon button_border"
                                onClick={() => setHistoryOpen(true)}
                            >
                                <FiClock size={16}/> Изменения
                            </button>

                            <HistoryDialog
                                open={historyOpen}
                                history={audit.getHistory()}
                                onRestore={(i) => audit.restore(i)}
                                onClose={() => setHistoryOpen(false)}
                            />
                        </>
                    )}
                </div>

                <div className="page__header-row">
                    {canEdit && (
                        <AddKeyBar
                            onAdd={(newKey) =>
                                setEditingCell({
                                    key: newKey,
                                    values: Object.fromEntries(
                                        languages.map(l => [l.code, ""])
                                    )
                                })
                            }
                            existingKeys={Object.keys(translations)}
                        />
                    )}

                    <FiltersBar
                        search={search}
                        setSearch={setSearch}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        filterErrorLevel={filterErrorLevel}
                        setFilterErrorLevel={setFilterErrorLevel}
                    />
                </div>
            </div>

            <CustomTable
                columns={[
                    {
                        key: "key",
                        title: (
                            <span
                                style={{cursor: "pointer"}}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSortAsc(prev => !prev);
                                }}
                            >
                            Ключ {sortAsc ? "▲" : "▼"}
                        </span>
                        ),
                        render: (value) => <span>{value}</span>,
                    },

                    ...languages.map((lang) => ({
                        key: lang.code,
                        title: lang.code,
                        render: (_, row) => {
                            const raw = row.values[lang.code];
                            const val = Array.isArray(raw) ? raw.join("; ") : String(raw ?? "");

                            return (
                                <div
                                    onClick={() => {
                                        if (!canEdit) return;
                                        setEditingCell({
                                            key: row.key,
                                            values: {...row.values}
                                        });
                                    }}
                                    style={{
                                        cursor: canEdit ? "pointer" : "default",
                                        width: "280px"
                                    }}
                                >
                                    {val}
                                </div>
                            );
                        },
                    })),

                    {
                        key: "actions",
                        title: "Действия",
                        render: (_, row) =>
                            canEdit && (
                                <span style={{display: "flex", gap: 8}}>
                                <button
                                    title="Редактировать"
                                    className="button button_icon button_reject"
                                    onClick={() =>
                                        setEditingCell({
                                            key: row.key,
                                            values: {...row.values}
                                        })
                                    }
                                >
                                    <FiEdit size={16}/>
                                </button>

                                <button
                                    title="Удалить"
                                    className="button button_icon button_reject"
                                    onClick={() => requestDeleteKey(row.key)}
                                >
                                    <FiTrash size={16}/>
                                </button>
                            </span>
                            ),
                    },
                ]}
                data={sorted.map(([key, values]) => ({key, values}))}
            />

            {canEdit && (
                <ConfirmDialog
                    open={!!deleteTarget}
                    title="Удалить ключ?"
                    text={`Вы уверены, что хотите удалить ключ "${deleteTarget}"?`}
                    onConfirm={confirmDeleteKey}
                    onCancel={cancelDeleteKey}
                />
            )}

            {/* EDIT DIALOG */}
            {editingCell && (
                <TranslationDialog
                    open={true}
                    languages={languages}
                    initialKey={editingCell.key}
                    initialValues={editingCell.values}
                    existingKeys={Object.keys(translations)}
                    onClose={() => setEditingCell(null)}
                    onSave={async (key, values) => {
                        if (!translations[key]) {
                            await handleAddKey(key);
                        }

                        for (const lang of languages) {
                            await saveValue(
                                key,
                                lang.code,
                                values[lang.code] ?? ""
                            );
                        }

                        setEditingCell(null);
                    }}
                />
            )}
        </div>
    );
}
