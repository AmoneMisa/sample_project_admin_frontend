import {useEffect, useState} from "react";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import FiltersBar from "../components/customElems/FiltersBar";
import HistoryDialog from "../components/modals/HistoryDialog";
import {useToast} from "../components/layout/ToastContext";
import {FiClock, FiEdit, FiRotateCcw, FiTrash} from "react-icons/fi";
import {useAuth} from "../hooks/authContext";
import CustomTable from "../components/customElems/CustomTable";
import TranslationDialog from "../components/modals/TranslationDialog";
import {useTranslations} from "../hooks/useTranslations";
import {useAuditLog} from "../hooks/useAuditLog";

export default function Index() {
    const [editingCell, setEditingCell] = useState(null);
    const [search, setSearch] = useState("");
    const [sortAsc, setSortAsc] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterErrorLevel, setFilterErrorLevel] = useState("all");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);

    const {accessToken, user, loading} = useAuth();
    const canEdit = user && (user.role === "moderator" || user.role === "admin");
    const {showToast} = useToast();

    const {
        languages,
        translationMaps,
        updateTranslation,
        loadAllTranslations,
        updateKeysBatch,
        deleteKeys
    } = useTranslations();

    const audit = useAuditLog({
        applyUpdate: async (key, lang, value) => {
            const prevMap = translationMaps[key] || {};
            const nextMap = {...prevMap, [lang]: value};
            updateTranslation(key, nextMap);

            await updateKeysBatch([{key, lang, value}]);
        },
        applyDelete: async (key) => {
            await deleteKeys([key]);
        },
        applyRestoreMap: async (key, map) => {
            updateTranslation(key, map);
            const items = Object.entries(map).map(([lang, value]) => ({
                key,
                lang,
                value
            }));
            await updateKeysBatch(items);
        }
    });

    useEffect(() => {
        if (!loading && accessToken) {
            loadAllTranslations();
        }
    }, [loading, accessToken, loadAllTranslations]);

    function requestDeleteKey(key) {
        setDeleteTarget(key);
    }

    async function confirmDeleteKey() {
        if (!deleteTarget) return;

        const oldMap = translationMaps[deleteTarget] || {};
        if (Object.keys(oldMap).length === 0) {
            setDeleteTarget(null);
            return;
        }

        // логируем батч удаления
        audit.logBatch([
            {
                type: "delete",
                key: deleteTarget,
                oldMap
            }
        ]);

        await deleteKeys([deleteTarget]);
        showToast("Переводы очищены");
        setDeleteTarget(null);
    }

    function cancelDeleteKey() {
        setDeleteTarget(null);
    }

    const filtered = Object.entries(translationMaps || {}).filter(([key, values]) => {
        const s = search.toLowerCase();
        if (!s) return true;

        if (key.toLowerCase().includes(s)) return true;

        return Object.values(values).some(v =>
            String(v ?? "").toLowerCase().includes(s)
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
                                onRestore={async (i) => {
                                    // откат к конкретному батчу — можно реализовать позже,
                                    // сейчас оставим стандартный undo/redo
                                }}
                                onClose={() => setHistoryOpen(false)}
                            />
                        </>
                    )}
                </div>

                <div className="page__header-row">
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
                                        title="Очистить"
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
                    title="Очистить переводы?"
                    text={`Все переводы ключа "${deleteTarget}" будут стерты.`}
                    onConfirm={confirmDeleteKey}
                    onCancel={cancelDeleteKey}
                />
            )}

            {editingCell && (
                <TranslationDialog
                    open={true}
                    languages={languages}
                    initialKey={editingCell.key}
                    initialValues={editingCell.values}
                    existingKeys={Object.keys(translationMaps)}
                    onClose={() => setEditingCell(null)}
                    onSave={async (key, values) => {
                        const prevMap = translationMaps[key] || {};
                        const nextMap = {...prevMap};

                        const batch = [];

                        for (const lang of languages) {
                            const code = lang.code;
                            const oldValue = prevMap[code] ?? "";
                            const newValue = values[code] ?? "";

                            if (oldValue === newValue) continue;

                            nextMap[code] = newValue;

                            batch.push({
                                type: "update",
                                key,
                                lang: code,
                                oldValue,
                                newValue
                            });
                        }

                        if (batch.length === 0) {
                            setEditingCell(null);
                            return;
                        }

                        updateTranslation(key, nextMap);

                        await updateKeysBatch(
                            batch.map(item => ({
                                key: item.key,
                                lang: item.lang,
                                value: item.newValue
                            }))
                        );

                        audit.logBatch(batch);
                        setEditingCell(null);
                    }}
                />
            )}
        </div>
    );
}
