import {useEffect, useMemo, useState} from "react";
import {v4 as uuid} from "uuid";
import {FiCopy, FiTrash, FiEdit} from "react-icons/fi";
import CustomTable from "../components/customElems/CustomTable";
import Toggle from "../components/controls/Toggle";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import MultilangInput from "../components/controls/MultilangInput";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import apiFetch from "../utils/apiFetch";
import {useTranslations} from "../hooks/useTranslations";

function normalizeAnimatedText(row) {
    const visible =
        typeof row?.visible === "boolean"
            ? row.visible
            : typeof row?.isVisible === "boolean"
                ? row.isVisible
                : true;

    return {
        ...row,
        visible,
        isVisible: visible,
        order: row?.order ?? 0,
    };
}

function buildTitleKey(id) {
    return `animatedText.${id}.title`;
}

function emptyMapByLangCodes(langCodes) {
    return Object.fromEntries((langCodes || []).map((c) => [c, ""]));
}

export default function AnimatedTextPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken, user} = useAuth();
    const {showToast} = useToast();

    const {
        languages,
        loadLanguages,
        translationMaps,
        loadAllTranslations,
        createKeysBatch,
        updateKeysBatch,
    } = useTranslations();

    const canEdit = !!user && (user.role === "admin" || user.role === "moderator");
    const langCodes = useMemo(() => (languages || []).map((l) => l.code), [languages]);
    const [items, setItems] = useState([]);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [createVisible, setCreateVisible] = useState(true);
    const [createTranslations, setCreateTranslations] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [editingTranslations, setEditingTranslations] = useState({});

    async function load() {
        const data = await apiFetch(`${API_URL}/animated-text`, {
            headers: accessToken ? {Authorization: `Bearer ${accessToken}`} : undefined,
        });

        setItems((data || []).map(normalizeAnimatedText));
    }

    useEffect(() => {
        if (!accessToken) return;

        (async () => {
            await loadLanguages();
            await loadAllTranslations();
            await load();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken]);

    useEffect(() => {
        if (!langCodes.length) return;
        setCreateTranslations(emptyMapByLangCodes(langCodes));
    }, [langCodes]);

    const getPreviewTextByKey = (key) => {
        const map = translationMaps?.[key] || {};
        for (const code of langCodes) {
            const v = (map?.[code] ?? "").toString().trim();
            if (v) return v;
        }
        for (const k of Object.keys(map)) {
            const v = (map?.[k] ?? "").toString().trim();
            if (v) return v;
        }
        return "";
    };

    const getMapByKey = (key) => {
        const map = translationMaps?.[key] || {};
        const result = emptyMapByLangCodes(langCodes);
        for (const code of langCodes) result[code] = (map?.[code] ?? "").toString();
        return result;
    };

    async function toggleVisible(row) {
        if (!canEdit) return;

        const updated = await apiFetch(`${API_URL}/animated-text/${row.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({isVisible: !row.visible}),
        });

        const next = normalizeAnimatedText(updated.animatedText ?? updated);
        setItems((prev) => prev.map((i) => (i.id === row.id ? next : i)));
        showToast(next.visible ? "Элемент включен" : "Элемент скрыт");
    }

    async function deleteItem(id) {
        if (!canEdit) return;

        await apiFetch(`${API_URL}/animated-text/${id}`, {
            method: "DELETE"
        });

        setItems((prev) => prev.filter((i) => i.id !== id));
        showToast("Элемент удалён");
    }

    async function createItem() {
        if (!canEdit) return;

        const id = uuid();
        const titleKey = buildTitleKey(id);

        await createKeysBatch([
            {
                key: titleKey,
                values: Object.fromEntries(langCodes.map((c) => [c, createTranslations?.[c] || ""])),
            },
        ]);

        const maxOrder = items.length ? Math.max(...items.map((x) => x.order ?? 0)) : 0;

        const created = await apiFetch(`${API_URL}/animated-text`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id,
                titleKey,
                isVisible: createVisible,
                order: maxOrder + 1,
            }),
        });

        setItems((prev) => [...prev, normalizeAnimatedText(created.animatedText ?? created)]);
        setCreateVisible(true);
        setCreateTranslations(emptyMapByLangCodes(langCodes));

        showToast("Элемент создан");
    }

    function startEdit(row) {
        setEditingId(row.id);
        setEditingTranslations(getMapByKey(row.titleKey));
    }

    async function saveEdit(row) {
        if (!canEdit) return;

        await updateKeysBatch(
            Object.entries(editingTranslations || {}).map(([lang, value]) => ({
                key: row.titleKey,
                lang,
                value: value ?? "",
            }))
        );

        setEditingId(null);
        setEditingTranslations({});
    }

    function cancelEdit() {
        setEditingId(null);
        setEditingTranslations({});
    }

    async function duplicateItem(row) {
        if (!canEdit) return;

        const newId = uuid();
        const newKey = buildTitleKey(newId);
        const originalMap = getMapByKey(row.titleKey);

        await createKeysBatch([
            {
                key: newKey,
                values: Object.fromEntries(langCodes.map((c) => [c, originalMap?.[c] || ""])),
            },
        ]);
        const maxOrder = items.length ? Math.max(...items.map((x) => x.order ?? 0)) : 0;

        const created = await apiFetch(`${API_URL}/animated-text`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: newId,
                titleKey: newKey,
                isVisible: row.visible,
                order: maxOrder + 1,
            }),
        });

        setItems((prev) => [...prev, normalizeAnimatedText(created.animatedText ?? created)]);
        showToast("Элемент продублирован");
    }

    const columns = useMemo(() => {
        const base = [
            {
                key: "visible",
                title: "Вкл",
                width: "90px",
                render: (_, row) => (
                    <div style={{display: "flex", justifyContent: "center"}}>
                        <Toggle
                            checked={!!row.visible}
                            disabled={!canEdit}
                            onChange={() => toggleVisible(row)}
                            title={canEdit ? "Показать / скрыть" : "Только просмотр"}
                        />
                    </div>
                ),
            },
            {key: "order", title: "Порядок", width: "110px", render: (v) => v ?? 0},
            {
                key: "text",
                title: "Текст",
                render: (_, row) => getPreviewTextByKey(row.titleKey) || "-",
            },
        ];

        if (canEdit) {
            base.push({
                key: "actions",
                title: "Действия",
                width: "190px",
                render: (_, row) => (
                    <div style={{display: "flex", gap: 8, justifyContent: "center"}}>
                        <button
                            type="button"
                            className="button button_icon"
                            title="Редактировать"
                            onClick={() => startEdit(row)}
                        >
                            <FiEdit size={16}/>
                        </button>

                        <button
                            type="button"
                            className="button button_icon"
                            title="Дублировать"
                            onClick={() => duplicateItem(row)}
                        >
                            <FiCopy size={16}/>
                        </button>

                        <button
                            type="button"
                            className="button button_icon button_reject"
                            title="Удалить"
                            onClick={() => setDeleteTarget(row.id)}
                        >
                            <FiTrash size={16}/>
                        </button>
                    </div>
                ),
            });
        }

        return base;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canEdit, translationMaps, langCodes, items]);

    const editingRow = editingId ? items.find((x) => x.id === editingId) : null;

    return (
        <div className="page animated-text-page">
            <div className="page__topbar page__topbar_sticky page__topbar_wrap">
                <div className="page__topbar-col">
                    <h1 className="page__header">Анимированный текст</h1>
                    <div className="page__topbar-title">Управление анимированным текстом</div>
                </div>

                {canEdit && (
                    <div className="page__row page__row_wrap" style={{justifyContent: "flex-end"}}>
                        <button type="button" className="button" onClick={createItem}>
                            Создать
                        </button>
                    </div>
                )}
            </div>
            <div className="page__block page__block_card" style={{display: "flex", flexDirection: "column", gap: 12}}>
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12}}>
                    <div className="page__topbar-title" style={{margin: 0}}>
                        Переводы (создание)
                    </div>

                    <div style={{display: "flex", alignItems: "center", gap: 10}}>
                        <div style={{opacity: 0.8}}>Вкл</div>
                        <Toggle
                            checked={!!createVisible}
                            disabled={!canEdit}
                            onChange={() => setCreateVisible((v) => !v)}
                        />
                    </div>
                </div>
                <MultilangInput
                    label="Текст"
                    placeholder="Текст"
                    languages={langCodes}
                    valueMap={createTranslations}
                    onChange={setCreateTranslations}
                />
            </div>
            <div className="page__block page__block_card">
                <CustomTable columns={columns} data={items}/>
            </div>
            {canEdit && editingRow && (
                <div className="page__block page__block_card"
                     style={{display: "flex", flexDirection: "column", gap: 12}}>
                    <div style={{display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap"}}>
                        <div className="page__topbar-title" style={{margin: 0}}>
                            Редактирование текста
                        </div>

                        <div style={{display: "flex", gap: 8}}>
                            <button type="button" className="button" onClick={() => saveEdit(editingRow)}>
                                Сохранить
                            </button>
                            <button type="button" className="button button_border" onClick={cancelEdit}>
                                Отмена
                            </button>
                        </div>
                    </div>

                    <MultilangInput
                        label={null}
                        placeholder="Текст"
                        languages={langCodes}
                        valueMap={editingTranslations}
                        onChange={setEditingTranslations}
                    />
                </div>
            )}

            {canEdit && deleteTarget && (
                <ConfirmDialog
                    open={true}
                    title="Удалить элемент?"
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
