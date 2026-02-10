import {useEffect, useMemo, useState} from "react";
import {v4 as uuid} from "uuid";
import {FiCopy, FiTrash, FiEdit, FiSave, FiX} from "react-icons/fi";
import CustomTable from "../components/customElems/CustomTable";
import Toggle from "../components/controls/Toggle";
import ConfirmDialog from "../components/modals/ConfirmDialog";
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

function makeEmptyMap(languages) {
    return Object.fromEntries((languages || []).map((l) => [l.code, ""]));
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

    const [items, setItems] = useState([]);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [createId, setCreateId] = useState(() => uuid());
    const [createVisible, setCreateVisible] = useState(true);
    const [createTranslations, setCreateTranslations] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [editingTranslations, setEditingTranslations] = useState({});

    const createTitleKey = useMemo(() => buildTitleKey(createId), [createId]);

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
        if (!languages?.length) return;
        setCreateTranslations(makeEmptyMap(languages));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [languages?.length]);

    const getPreviewTextByKey = (key) => {
        const map = translationMaps?.[key] || {};
        for (const lang of languages) {
            const v = (map?.[lang.code] ?? "").toString().trim();
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
        const result = makeEmptyMap(languages);
        for (const lang of languages) result[lang.code] = (map?.[lang.code] ?? "").toString();
        return result;
    };

    async function toggleVisible(row) {
        if (!canEdit) return;

        const updated = await apiFetch(`${API_URL}/animated-text/${row.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
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
            method: "DELETE",
        });

        setItems((prev) => prev.filter((i) => i.id !== id));
        showToast("Элемент удалён");
    }

    async function createItem() {
        if (!canEdit) return;

        const titleKey = buildTitleKey(createId);

        await createKeysBatch([
            {
                key: titleKey,
                values: Object.fromEntries(languages.map((l) => [l.code, createTranslations?.[l.code] || ""])),
            },
        ]);

        const maxOrder = items.length ? Math.max(...items.map((x) => x.order ?? 0)) : 0;
        const created = await apiFetch(`${API_URL}/animated-text`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: createId,
                titleKey,
                isVisible: createVisible,
                order: maxOrder + 1,
            }),
        });

        setItems((prev) => [...prev, normalizeAnimatedText(created.animatedText ?? created)]);

        const nextId = uuid();
        setCreateId(nextId);
        setCreateVisible(true);
        setCreateTranslations(makeEmptyMap(languages));

        showToast("Элемент создан");
    }

    function startEdit(row) {
        setEditingId(row.id);
        setEditingTranslations(getMapByKey(row.titleKey));
    }

    async function saveEdit(row) {
        if (!canEdit) return;

        const payload = Object.entries(editingTranslations || {}).map(([lang, value]) => ({
            key: row.titleKey,
            lang,
            value: value ?? "",
        }));

        await updateKeysBatch(payload);
        setEditingId(null);
        showToast("Сохранено");
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
                values: Object.fromEntries(languages.map((l) => [l.code, originalMap?.[l.code] || ""])),
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
            {key: "order", title: "Порядок", width: "110px", render: (v) => (v ?? 0)},
            {
                key: "titleKey",
                title: "titleKey",
                width: "360px",
                render: (_, row) => <a href={`/admin?key=${row.titleKey}`}>{row.titleKey}</a>,
            },
            {
                key: "preview",
                title: "Превью",
                render: (_, row) => <span>{getPreviewTextByKey(row.titleKey) || "-"}</span>,
            },
        ];

        if (canEdit) {
            base.push({
                key: "actions",
                title: "Действия",
                width: "180px",
                render: (_, row) => (
                    <div style={{display: "flex", gap: 8, justifyContent: "center"}}>
                        <button
                            type="button"
                            className="button button_icon"
                            title="Редактировать переводы"
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
    }, [canEdit, accessToken, translationMaps, languages, items]);

    const editingRow = editingId ? items.find((x) => x.id === editingId) : null;

    return (
        <div className="page animated-text-page">
            <div className="page__topbar page__topbar_sticky page__topbar_wrap">
                <div className="page__topbar-col">
                    <h1 className="page__header">Animated Text</h1>
                    <div className="page__topbar-title">Управление animatedText</div>
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
                <div style={{display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end"}}>
                    <div style={{minWidth: 260}}>
                        <div className="form__label">id</div>
                        <input className="input" value={createId} disabled/>
                    </div>

                    <div style={{minWidth: 420, flex: 1}}>
                        <div className="form__label">titleKey</div>
                        <input className="input" value={createTitleKey} disabled/>
                        <div style={{marginTop: 6, opacity: 0.7, fontSize: 12}}>
                            (формируется автоматически)
                        </div>
                    </div>

                    <div style={{width: 120}}>
                        <div className="form__label">Вкл</div>
                        <div style={{display: "flex", height: 40, alignItems: "center"}}>
                            <Toggle checked={!!createVisible} disabled={!canEdit}
                                    onChange={() => setCreateVisible((v) => !v)}/>
                        </div>
                    </div>

                    {canEdit && (
                        <button
                            type="button"
                            className="button button_border"
                            onClick={() => {
                                const nextId = uuid();
                                setCreateId(nextId);
                                setCreateTranslations(makeEmptyMap(languages));
                            }}
                            title="Сгенерировать новый id"
                        >
                            Новый id
                        </button>
                    )}
                </div>

                <div>
                    <div className="form__label">Переводы (создание)</div>
                    <div
                        style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10}}>
                        {(languages || []).map((lang) => (
                            <div key={lang.code}>
                                <div className="form__label" style={{opacity: 0.8}}>
                                    {lang.code}
                                </div>
                                <input
                                    className="input"
                                    value={createTranslations?.[lang.code] ?? ""}
                                    onChange={(e) =>
                                        setCreateTranslations((prev) => ({
                                            ...(prev || {}),
                                            [lang.code]: e.target.value,
                                        }))
                                    }
                                    disabled={!canEdit}
                                    placeholder={`Текст (${lang.code})`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="page__block page__block_card">
                <CustomTable columns={columns} data={items}/>
            </div>

            {canEdit && editingRow && (
                <div className="page__block page__block_card"
                     style={{display: "flex", flexDirection: "column", gap: 12}}>
                    <div style={{display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap"}}>
                        <div>
                            <div className="form__label">Редактирование</div>
                            <div style={{opacity: 0.8}}>
                                <a href={`/admin?key=${editingRow.titleKey}`}>{editingRow.titleKey}</a>
                            </div>
                        </div>

                        <div style={{display: "flex", gap: 8, alignItems: "flex-end"}}>
                            <button type="button" className="button" onClick={() => saveEdit(editingRow)}
                                    title="Сохранить">
                                <FiSave size={16} style={{marginRight: 8}}/>
                                Сохранить
                            </button>

                            <button type="button" className="button button_border" onClick={cancelEdit} title="Отмена">
                                <FiX size={16} style={{marginRight: 8}}/>
                                Отмена
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="form__label">Переводы</div>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                            gap: 10
                        }}>
                            {(languages || []).map((lang) => (
                                <div key={lang.code}>
                                    <div className="form__label" style={{opacity: 0.8}}>
                                        {lang.code}
                                    </div>
                                    <input
                                        className="input"
                                        value={editingTranslations?.[lang.code] ?? ""}
                                        onChange={(e) =>
                                            setEditingTranslations((prev) => ({
                                                ...(prev || {}),
                                                [lang.code]: e.target.value,
                                            }))
                                        }
                                        placeholder={`Текст (${lang.code})`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
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
