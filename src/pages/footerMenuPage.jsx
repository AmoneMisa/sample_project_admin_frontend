import {useEffect, useMemo, useState} from "react";
import {useAuth} from "../hooks/authContext";
import {useToast} from "../components/layout/ToastContext";
import {useTranslations} from "../hooks/useTranslations";
import apiFetch from "../utils/apiFetch";
import Toggle from "../components/controls/Toggle";
import CustomTable from "../components/customElems/CustomTable";
import {FiEdit, FiTrash} from "react-icons/fi";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import FooterMenuBlockDialog from "../components/footerMenuCreateComponents/FooterMenuBlockDialog";

export default function FooterMenuPage() {
    const API_URL = process.env.REACT_APP_API_URL || "/api";
    const {accessToken, user} = useAuth();
    const canEdit = !!user && (user.role === "admin" || user.role === "moderator");
    const {showToast} = useToast();
    const {
        languages,
        translationMaps,
        updateTranslation,
        loadLanguages,
        loadAllTranslations,
        createKeysBatch,
        updateKeysBatch,
        deleteKeys,
    } = useTranslations();


    const [blocks, setBlocks] = useState([]);
    const [expanded, setExpanded] = useState({}); // { [blockId]: boolean }

    const [creatingBlock, setCreatingBlock] = useState(false);
    const [editingBlock, setEditingBlock] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const load = async () => {
        const list = await apiFetch(`${API_URL}/footer/menu/blocks?all=true`, {
            headers: {Authorization: `Bearer ${accessToken}`},
        });

        setBlocks(list);
        setExpanded({});
    };

    useEffect(() => {
        if (!accessToken) return;
        (async () => {
            await loadLanguages();
            await loadAllTranslations();
            await load();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken]);

    async function saveBlockAggregate(block) {
        await apiFetch(`${API_URL}/footer/menu/blocks`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({blocks: [block]}),
        });

        await load();
    }

    async function handleSaveFromDialog({ block, translationPayload }) {
        if (!block) return;

        if (creatingBlock) {
            await createKeysBatch(translationPayload);

            await apiFetch(`${API_URL}/footer/menu/blocks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blocks: [block] }),
            });
        } else {
            await updateKeysBatch(
                translationPayload.flatMap((it) =>
                    Object.entries(it.values).map(([lang, value]) => ({
                        key: it.key,
                        lang,
                        value,
                    }))
                )
            );

            const prev = blocks.find((b) => b.id === block.id);
            const prevKeys = (prev?.links || []).map((l) => l.labelKey).filter(Boolean);
            const nextKeys = (block.links || []).map((l) => l.labelKey).filter(Boolean);

            const removed = prevKeys.filter((k) => !nextKeys.includes(k));
            if (removed.length) await deleteKeys(removed);

            await apiFetch(`${API_URL}/footer/menu/blocks`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blocks: [block] }),
            });
        }

        await load();
        showToast("Сохранено");
    }

    async function toggleBlockVisible(block) {
        if (!canEdit) return;
        const next = {...block, isVisible: !block.isVisible};
        await saveBlockAggregate(next);
    }

    async function deleteBlock(blockId) {
        if (!canEdit) return;

        await apiFetch(`${API_URL}/footer/menu/blocks`, {
            method: "DELETE",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ids: [blockId]}),
        });

        await load();
        showToast("Блок меню удалён");
    }

    const getRu = (key) => translationMaps?.[key]?.ru?.trim() || "(нет перевода)";

    const adminKeyHref = (key) => `/admin?key=${encodeURIComponent(key || "")}`;

    const columns = useMemo(() => {
        const base = [{key: "id", title: "ID", width: "90px"},
            {
                key: "titleKey",
                title: "Название блока",
                render: (_, row) => {
                    const text = getRu(row.titleKey);
                    return (
                        <div style={{display: "grid", gap: 4}}>
                            <a
                                href={adminKeyHref(row.titleKey)}
                                className="link"
                                title="Открыть в админке переводов"
                            >
                                {text}
                            </a>
                            <div style={{fontSize: 12, opacity: 0.7}}>{row.titleKey}</div>
                        </div>
                    );
                },
            },
            {
                key: "order",
                title: "Порядок",
                width: "120px",
                render: (v) => (v ?? 0),
            },
            {
                key: "isVisible",
                title: "Отображать",
                width: "140px",
                render: (value, row) => (
                    <div style={{display: "flex", justifyContent: "center"}}>
                        <Toggle
                            checked={!!value}
                            disabled={!canEdit}
                            onChange={() => toggleBlockVisible(row)}
                            title={canEdit ? "Показать / скрыть блок" : "Только просмотр"}
                        />
                    </div>
                ),
            },
        ];

        if (canEdit) {
            base.push({
                key: "actions",
                title: "Действия",
                width: "140px",
                render: (_, row) => (
                    <div style={{display: "flex", gap: 8, justifyContent: "center"}}>
                        <button
                            className="button button_icon"
                            title="Редактировать блок"
                            onClick={() => setEditingBlock(row)}
                        >
                            <FiEdit size={16}/>
                        </button>
                        <button
                            className="button button_icon button_reject"
                            title="Удалить блок"
                            onClick={() => setDeleteTarget(row.id)}
                        >
                            <FiTrash size={16}/>
                        </button>
                    </div>
                ),
            });
        }

        return base;
    }, [canEdit, expanded, translationMaps]);

    return (
        <div className="page footer-menu-page">
            <div className="page__topbar page__topbar_sticky page__topbar_wrap">
                <div className="page__topbar-col">
                    <h1 className="page__header">Меню футера</h1>
                    <div className="page__topbar-title">Управление блоками меню и пунктами</div>
                </div>

                {canEdit && (
                    <div className="page__row page__row_wrap" style={{justifyContent: "flex-end"}}>
                        <button
                            type="button"
                            className="button"
                            onClick={() => setCreatingBlock(true)}
                        >
                            Создать блок
                        </button>
                    </div>
                )}
            </div>

            <div className="page__block page__block_card">
                <CustomTable columns={columns} data={blocks}/>
            </div>

            {canEdit && creatingBlock && (
                <FooterMenuBlockDialog
                    open={true}
                    mode="create"
                    languages={languages.map((l) => l.code)}
                    translationMaps={translationMaps}
                    updateTranslation={updateTranslation}
                    onSave={handleSaveFromDialog}
                    onClose={() => {
                        setCreatingBlock(false);
                    }}
                />
            )}

            {canEdit && editingBlock && (
                <FooterMenuBlockDialog
                    open={true}
                    mode="edit"
                    initial={editingBlock}
                    languages={languages.map((l) => l.code)}
                    translationMaps={translationMaps}
                    updateTranslation={updateTranslation}
                    onSave={handleSaveFromDialog}
                    onClose={() => {
                        setEditingBlock(null);
                    }}
                />
            )}

            {canEdit && deleteTarget && (
                <ConfirmDialog
                    open={true}
                    title="Удалить блок?"
                    text="Вы уверены?"
                    onConfirm={() => {
                        deleteBlock(deleteTarget);
                        setDeleteTarget(null);
                    }}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
