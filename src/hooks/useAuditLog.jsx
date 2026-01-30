import {useCallback, useMemo, useState} from "react";

export function useAuditLog({applyUpdate, applyDelete, applyRestoreMap}) {
    const [history, setHistory] = useState([]); // [{ timestamp, items: [...] }]
    const [index, setIndex] = useState(-1);     // указывает на последний применённый батч

    const canUndo = index >= 0;
    const canRedo = index + 1 < history.length;

    const logBatch = useCallback((items) => {
        if (!items || items.length === 0) return;

        const batch = {
            timestamp: new Date().toISOString(),
            items
        };

        setHistory(prev => {
            const trimmed = prev.slice(0, index + 1); // обрезаем хвост redo
            return [...trimmed, batch];
        });
        setIndex(prev => prev + 1);
    }, [index]);

    const undo = useCallback(async () => {
        if (index < 0) return;

        const batch = history[index];

        // откатываем в обратном порядке
        for (const item of [...batch.items].reverse()) {
            if (item.type === "update") {
                await applyUpdate(item.key, item.lang, item.oldValue);
            } else if (item.type === "delete") {
                await applyRestoreMap(item.key, item.oldMap);
            }
        }

        setIndex(i => i - 1);
    }, [history, index, applyUpdate, applyRestoreMap]);

    const redo = useCallback(async () => {
        if (index + 1 >= history.length) return;

        const batch = history[index + 1];

        for (const item of batch.items) {
            if (item.type === "update") {
                await applyUpdate(item.key, item.lang, item.newValue);
            } else if (item.type === "delete") {
                await applyDelete(item.key);
            }
        }

        setIndex(i => i + 1);
    }, [history, index, applyUpdate, applyDelete]);

    const getHistory = useCallback(() => history, [history]);

    const groupedHistory = useMemo(
        () => history,
        [history]
    );

    return {
        logBatch,
        undo,
        redo,
        canUndo,
        canRedo,
        getHistory: () => groupedHistory
    };
}
