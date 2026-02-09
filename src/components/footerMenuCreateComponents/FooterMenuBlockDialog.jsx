import {useEffect, useMemo, useState} from "react";
import LabeledInput from "../controls/LabeledInput";
import MultilangInput from "../controls/MultilangInput";
import Toggle from "../controls/Toggle";
import {FiChevronDown, FiChevronRight, FiPlus, FiTrash} from "react-icons/fi";
import {v4 as uuid} from "uuid";
import Modal from "../modals/Modal";

const MAX_TITLE_LEN = 80;

/**
 * FooterMenuBlockDialog
 * - Цельная модалка редактирования агрегата "Блок меню" + "ссылки"
 * - Без одиночных запросов: onSave получает готовый блок целиком (и переводы по ключам)
 *
 * Props:
 *  open: boolean
 *  mode: "create" | "edit"
 *  initial?: MenuBlockDraft
 *  languages: string[]                       // ["ru","en",...]
 *  translationMaps: Record<string, Record<string,string>>
 *  updateTranslation: (key: string, map: Record<string,string>) => void
 *  onSave: (result: { block: MenuBlockDraft, translationPayload: TranslationBatchItem[] }) => Promise<void> | void
 *  onClose: () => void
 *
 * MenuBlockDraft:
 *  {
 *    id: string,
 *    titleKey: string,
 *    order: number,
 *    isVisible: boolean,
 *    links: Array<{
 *      id: string,
 *      labelKey: string,
 *      href: string,
 *      order: number,
 *      isVisible: boolean
 *    }>
 *  }
 *
 * TranslationBatchItem:
 *  { key: string, values: Record<string,string> }
 */
export default function FooterMenuBlockDialog({
                                                  open = true,
                                                  mode,
                                                  initial,
                                                  languages,
                                                  translationMaps,
                                                  updateTranslation,
                                                  onSave,
                                                  onClose,
                                              }) {
    const [errors, setErrors] = useState({});
    const [collapsedLinks, setCollapsedLinks] = useState(() => ({}));

    const [form, setForm] = useState(() => {
        if (initial) return structuredClone(initial);

        const blockId = uuid();
        return {
            id: blockId,
            titleKey: `footer.menu.blocks.${blockId}.title`,
            order: 0,
            isVisible: true,
            links: [],
        };
    });

    // при смене initial (редактирование другой записи)
    useEffect(() => {
        if (!initial) return;
        setForm(structuredClone(initial));
        setErrors({});
        setCollapsedLinks({});
    }, [initial?.id]);

    const toggleLinkCollapsed = (i) =>
        setCollapsedLinks((p) => ({...p, [i]: !p[i]}));

    const updateBlock = (recipe) => {
        setForm((prev) => {
            const next = structuredClone(prev);
            recipe(next);
            return next;
        });
    };

    const trimToMax = (value) => {
        if (value == null) return "";
        const s = String(value);
        return s.length > MAX_TITLE_LEN ? s.slice(0, MAX_TITLE_LEN) : s;
    };

    const normalizeMapToMax = (map) => {
        const next = {...(map || {})};
        for (const lang of languages) {
            if (typeof next[lang] === "string") next[lang] = trimToMax(next[lang]);
        }
        return next;
    };

    const getPreviewText = (key) => {
        const map = translationMaps?.[key] || {};
        for (const lang of languages) {
            const v = (map?.[lang] ?? "").toString().trim();
            if (v) return v;
        }
        for (const k of Object.keys(map)) {
            const v = (map?.[k] ?? "").toString().trim();
            if (v) return v;
        }
        return "Нет текста";
    };

    const extractLangErrors = (prefix) => {
        const result = {};
        for (const key in errors) {
            if (!key.startsWith(prefix)) continue;
            const lang = key.split(".").pop();
            result[lang] = errors[key];
        }
        return result;
    };

    const titleMap = translationMaps?.[form.titleKey] || {};
    const titleErrors = extractLangErrors("title.");

    const addLink = () =>
        updateBlock((b) => {
            const linkId = uuid();
            const i = b.links.length;

            b.links.push({
                id: linkId,
                labelKey: `footer.menu.blocks.${b.id}.links.${linkId}.label`,
                href: "",
                order: i,
                isVisible: true,
            });

            const empty = Object.fromEntries(languages.map((l) => [l, ""]));
            updateTranslation?.(b.links[i].labelKey, empty);

            setCollapsedLinks((p) => ({...p, [i]: false}));
        });

    const removeLink = (i) =>
        updateBlock((b) => {
            b.links.splice(i, 1);
            b.links = b.links.map((l, idx) => ({...l, order: idx}));
        });

    const validate = () => {
        const e = {};
        if (form.order < 0 || form.order === "" || Number.isNaN(Number(form.order))) {
            e.order = "Введите число ≥ 0";
        }

        for (const lang of languages) {
            if (!String(titleMap?.[lang] ?? "").trim()) {
                e[`title.${lang}`] = "Обязательное поле";
            }
        }

        form.links.forEach((l, i) => {
            if (!String(l.href ?? "").trim()) {
                e[`links.${i}.href`] = "Обязательное поле";
            }
            if (l.order < 0 || l.order === "" || Number.isNaN(Number(l.order))) {
                e[`links.${i}.order`] = "Введите число ≥ 0";
            }

            const lm = translationMaps?.[l.labelKey] || {};
            for (const lang of languages) {
                if (!String(lm?.[lang] ?? "").trim()) {
                    e[`links.${i}.label.${lang}`] = "Обязательное поле";
                }
            }
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const buildTranslationPayload = () => {
        const payload = [];

        payload.push({
            key: form.titleKey,
            values: Object.fromEntries(languages.map((l) => [l, titleMap?.[l] ?? ""])),
        });

        for (const l of form.links) {
            const lm = translationMaps?.[l.labelKey] || {};
            payload.push({
                key: l.labelKey,
                values: Object.fromEntries(languages.map((code) => [code, lm?.[code] ?? ""])),
            });
        }

        return payload;
    };

    const handleSave = async () => {
        if (!validate()) return;

        const normalized = structuredClone(form);
        normalized.order = Number(normalized.order) || 0;
        normalized.links = normalized.links
            .map((l, idx) => ({
                ...l,
                href: String(l.href ?? "").trim(),
                order: Number(l.order ?? idx) || 0,
                isVisible: l.isVisible !== false,
            }))
            .sort((a, b) => a.order - b.order);

        const translationPayload = buildTranslationPayload();

        await onSave?.({
            block: normalized,
            translationPayload,
        });

        onClose?.();
    };

    const linkRows = useMemo(() => form.links || [], [form.links]);

    if (!open) return null;

    return (
        <Modal open={true} onClose={onClose} width={760}>
            <h2>{mode === "edit" ? "Редактировать блок меню" : "Создать блок меню"}</h2>

            <div className="menu-modal__row">
                <div className="menu-modal__row-item">
                    <Toggle
                        label="Отображать блок"
                        checked={form.isVisible !== false}
                        onChange={() =>
                            updateBlock((b) => {
                                b.isVisible = b.isVisible === false ? true : !b.isVisible;
                            })
                        }
                    />
                </div>
            </div>

            <div className="menu-modal__row">
                <div className="menu-modal__row-item menu-modal__row_col">
                    <MultilangInput
                        label="Название блока"
                        placeholder="Название блока"
                        languages={languages}
                        valueMap={titleMap}
                        errors={titleErrors}
                        onChange={(next) => updateTranslation(form.titleKey, normalizeMapToMax(next))}
                    />
                </div>
            </div>

            <div className="menu-modal__row">
                <div className="menu-modal__row-item" style={{maxWidth: 220}}>
                    <LabeledInput
                        label="Порядок"
                        type="number"
                        value={form.order}
                        error={errors.order}
                        onChange={(v) =>
                            updateBlock((b) => {
                                b.order = Number(v);
                            })
                        }
                    />
                </div>
            </div>

            {/* LINKS */}
            <div className="menu-modal__row">
                <div className="menu-modal__row-item menu-modal__row_col">
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8
                    }}>
                        <div style={{fontWeight: 600}}>Ссылки</div>
                        <button type="button" className="button button_secondary" onClick={addLink}>
                            <FiPlus style={{marginRight: 8}} size={16}/>
                            Добавить ссылку
                        </button>
                    </div>

                    {linkRows.map((link, i) => {
                        const collapsed = collapsedLinks[i] === true;
                        const labelErrors = extractLangErrors(`links.${i}.label.`);
                        const preview = getPreviewText(link.labelKey);

                        return (
                            <div key={link.id || i} className="menu-modal__sub-item menu-modal__sub-item_col">
                                <div className="menu-modal__sub-item-row menu-modal__sub-item-row_between">
                                    <div className="menu-modal__sub-item-row_grow">
                                        {!collapsed ? (
                                            <MultilangInput
                                                placeholder={`Название ссылки ${i + 1}`}
                                                languages={languages}
                                                valueMap={translationMaps[link.labelKey] || {}}
                                                errors={labelErrors}
                                                onChange={(next) => updateTranslation(link.labelKey, normalizeMapToMax(next))}
                                            />
                                        ) : (
                                            <div className="menu-modal__collapsed-preview">{preview}</div>
                                        )}
                                    </div>

                                    <div className="menu-modal__sub-item-row"
                                         style={{width: "auto", alignSelf: "start"}}>
                                        <button
                                            type="button"
                                            className="button button_icon"
                                            title={collapsed ? "Развернуть" : "Свернуть"}
                                            onClick={() => toggleLinkCollapsed(i)}
                                        >
                                            {collapsed ? <FiChevronRight size={16}/> : <FiChevronDown size={16}/>}
                                        </button>

                                        <Toggle
                                            title="Отображать ссылку"
                                            checked={link.isVisible !== false}
                                            onChange={() =>
                                                updateBlock((b) => {
                                                    const cur = b.links[i].isVisible;
                                                    b.links[i].isVisible = cur === false ? true : !cur;
                                                })
                                            }
                                        />

                                        <button
                                            type="button"
                                            className="button button_icon button_reject"
                                            title="Удалить ссылку"
                                            onClick={() => removeLink(i)}
                                        >
                                            <FiTrash size={16}/>
                                        </button>
                                    </div>
                                </div>

                                {!collapsed && (
                                    <>
                                        <div className="menu-modal__sub-item-row">
                                            <div className="menu-modal__sub-item-row_fixed" style={{maxWidth: 220}}>
                                                <LabeledInput
                                                    label="Порядок"
                                                    type="number"
                                                    value={link.order}
                                                    error={errors[`links.${i}.order`] ?? ""}
                                                    onChange={(v) =>
                                                        updateBlock((b) => {
                                                            b.links[i].order = Number(v);
                                                        })
                                                    }
                                                />
                                            </div>

                                            <div className="menu-modal__sub-item-row">
                                                <LabeledInput
                                                    label="Ссылка"
                                                    placeholder="/category"
                                                    value={link.href}
                                                    error={errors[`links.${i}.href`] ?? ""}
                                                    onChange={(v) =>
                                                        updateBlock((b) => {
                                                            b.links[i].href = v;
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ACTIONS */}
            <div className="modal__actions">
                <button className="button button_accept" onClick={handleSave}>
                    Сохранить
                </button>
                <button className="button button_reject" onClick={onClose}>
                    Отменить
                </button>
            </div>
        </Modal>
    );
}
