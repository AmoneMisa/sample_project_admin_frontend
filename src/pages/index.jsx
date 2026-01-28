import {useCallback, useEffect, useRef, useState} from "react";
import EmojiPickerPopup from "../components/EmojiPicker";
import {useBeforeUnload, useLocation} from "react-router-dom";
import {useAuditLog} from "../hooks/useAuditLog";
import ConfirmDialog from "../components/ConfirmDialog";
import AddKeyBar from "../components/AddKeyBar";
import FiltersBar from "../components/FiltersBar";
import HistoryDialog from "../components/HistoryDialog";
import {useToast} from "../components/ToastContext";
import {FiClock, FiEdit, FiRotateCcw, FiSave, FiSmile, FiTrash} from "react-icons/fi";
import Checkbox from "../components/Checkbox";
import {useAuth} from "../hooks/authContext";
import CustomTable from "../components/CustomTable";
import LabeledInput from "../components/LabeledInput";
import Modal from "../components/Modal";
import TranslationDialog from "../components/TranslationDialog";

export default function Index() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const [editingCell, setEditingCell] = useState(null);
    const [emojiPickerFor, setEmojiPickerFor] = useState(null);
    const [languages, setLanguages] = useState([]);
    const [search, setSearch] = useState("");
    const [sortAsc, setSortAsc] = useState(true);
    const [dirty, setDirty] = useState(false);
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterErrorLevel, setFilterErrorLevel] = useState("all");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);

    const location = useLocation();
    const {accessToken, user} = useAuth();
    const canEdit = user && (user.role === "moderator" || user.role === "admin");
    const {showToast} = useToast();

    const {
        translations,
        setTranslations,
        meta,
        setMeta,
        pushSnapshot,
        undo,
        canUndo,
        getHistory,
        markDeleted,
    } = useAuditLog();

    // LOAD LANGUAGES + TRANSLATIONS
    useEffect(() => {
        async function load() {
            if (!accessToken) return;

            const languagesRes = await fetch(`${API_URL}/languages/enabled`, {
                headers: {Authorization: `Bearer ${accessToken}`},
            });
            const langs = await languagesRes.json();
            setLanguages(langs);

            let all = {};
            for (const lang of langs) {
                const res = await fetch(`${API_URL}/translations?lang=${lang.code}`, {
                    headers: {Authorization: `Bearer ${accessToken}`},
                });
                const data = await res.json();

                for (const [key, value] of Object.entries(data)) {
                    if (!all[key]) all[key] = {};
                    let v = value;
                    let isList = false;

                    if (typeof v === "string" && v.trim().startsWith("[") && v.trim().endsWith("]")) {
                        try {
                            const parsed = JSON.parse(v);
                            if (Array.isArray(parsed)) {
                                v = parsed.join("; ");
                                isList = true;
                            }
                        } catch {}
                    }

                    all[key][lang.code] = v;
                    meta[key] = meta[key] || {};
                    if (isList) meta[key].isList = true;
                }
            }

            setTranslations(all);
        }

        load();
    }, [accessToken, setTranslations, meta, API_URL]);

    // SAVE ALL
    const saveAll = useCallback(async () => {
        if (!accessToken) return;

        const items = [];
        for (const [key, values] of Object.entries(translations)) {
            const metaForKey = meta[key] || {};
            const isList = !!metaForKey.isList;

            for (const lang of languages) {
                const rawValue = values[lang.code];
                const payloadValue = isList
                    ? String(rawValue).split(";").map((s) => s.trim()).filter(Boolean)
                    : rawValue;

                items.push({key, lang: lang.code, value: payloadValue});
            }
        }

        await fetch(`${API_URL}/translations/bulk-update`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
            body: JSON.stringify({items}),
        });

        showToast("Ключи успешно сохранены");
        setDirty(false);
    }, [translations, languages, meta, showToast, accessToken, API_URL]);

    // SAVE SINGLE VALUE
    async function saveValue(key, lang, newValue) {
        if (!accessToken) return;

        setDirty(true);

        const prevTranslations = translations;
        const prevMeta = meta;

        const nextTranslations = {
            ...prevTranslations,
            [key]: {
                ...prevTranslations[key],
                [lang]: newValue,
            },
        };

        const metaForKey = meta[key] || {};
        const isList = !!metaForKey.isList;

        const payloadValue = isList
            ? newValue.split(";").map(s => s.trim()).filter(Boolean)
            : newValue;

        pushSnapshot(
            nextTranslations,
            prevMeta,
            `Изменён ${lang} перевод у ключа '${key}'`
        );

        setTranslations(nextTranslations);
        setDirty(false);

        await fetch(`${API_URL}/translations/update`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
            body: JSON.stringify({key, lang, value: payloadValue}),
        });

        showToast("Ключ сохранён");
    }

    // DELETE KEY
    function requestDeleteKey(key) {
        setDeleteTarget(key);
    }

    async function confirmDeleteKey() {
        if (!accessToken) return;
        const key = deleteTarget;
        if (!key) return;

        const prevTranslations = translations;
        const prevMeta = meta;

        const {[key]: removedTranslations, ...rest} = prevTranslations;
        const {[key]: removedMeta, ...restMeta} = prevMeta;

        markDeleted(key, removedTranslations, removedMeta);
        pushSnapshot(rest, restMeta, `Удалён ключ '${key}'`);

        setTranslations(rest);
        setMeta(restMeta);
        setDeleteTarget(null);

        await fetch(`${API_URL}/translations/delete`, {
            method: "DELETE",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
            body: JSON.stringify({key}),
        });

        showToast("Ключ успешно удалён");
    }

    function cancelDeleteKey() {
        setDeleteTarget(null);
    }

    // ADD KEY (via popup)
    function handleAddKey(newKey) {
        const prevTranslations = translations;
        const prevMeta = meta;

        if (prevTranslations[newKey]) return;

        const emptyRow = {};
        for (const lang of languages) emptyRow[lang.code] = "";

        const nextTranslations = {
            ...prevTranslations,
            [newKey]: emptyRow,
        };

        const nextMeta = {
            ...prevMeta,
            [newKey]: {allowEmpty: false},
        };

        pushSnapshot(nextTranslations, prevMeta, `Добавлен ключ '${newKey}'`);
        setTranslations(nextTranslations);
        setMeta(nextMeta);
        setDirty(true);
        setSearch(newKey);
    }

    // FILTER + SORT
    const filtered = Object.entries(translations).filter(([key, values]) => {
        const s = search.toLowerCase();
        if (s && !key.toLowerCase().includes(s)) {
            const match = Object.values(values).some((v) =>
                String(v).toLowerCase().includes(s)
            );
            if (!match) return false;
        }
        return true;
    });

    const sorted = [...filtered].sort(([a], [b]) =>
        sortAsc ? a.localeCompare(b) : b.localeCompare(a)
    );

    // RENDER
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
                                disabled={!canUndo}
                                onClick={() => {
                                    const metaSnapshot = undo();
                                    if (metaSnapshot) setMeta(metaSnapshot);
                                }}
                            >
                                <FiRotateCcw size={16}/>
                            </button>

                            <button
                                className="button button_icon button_border"
                                onClick={saveAll}
                                style={{color: "var(--color-accept)"}}
                            >
                                <FiSave size={16}/> Сохранить
                            </button>

                            <button
                                className="button button_icon button_border"
                                onClick={() => setHistoryOpen(true)}
                            >
                                <FiClock size={16}/> Изменения
                            </button>

                            <HistoryDialog
                                open={historyOpen}
                                history={getHistory()}
                                onRestore={(i) => {
                                    const item = getHistory()[i];
                                    if (!item) return;

                                    setTranslations(structuredClone(item.state));
                                    setMeta(() => {
                                        const next = structuredClone(item.meta);
                                        for (const key of Object.keys(item.state)) {
                                            if (!next[key]) next[key] = {};
                                        }
                                        return next;
                                    });
                                }}
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
                                        className="button button_icon"
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

            {/* DELETE CONFIRM */}
            {canEdit && (
                <ConfirmDialog
                    open={!!deleteTarget}
                    title="Удалить ключ?"
                    text={`Вы уверены, что хотите удалить ключ "${deleteTarget}"?`}
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
                    existingKeys={Object.keys(translations)}
                    onClose={() => setEditingCell(null)}
                    onSave={async (key, values) => {
                        // если ключ новый — создаём
                        if (!translations[key]) {
                            handleAddKey(key);
                        }

                        // сохраняем все языки
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
