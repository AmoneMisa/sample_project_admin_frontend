import {useMemo, useState} from "react";
import {FiChevronLeft, FiChevronRight} from "react-icons/fi";

export default function CustomTable({columns, data}) {
    const [collapsedCols, setCollapsedCols] = useState(() => ({}));

    const toggleCol = (key) => {
        setCollapsedCols(prev => ({...prev, [key]: !prev[key]}));
    };

    const cols = useMemo(() => {
        return columns.map(c => ({
            ...c,
            __collapsed: collapsedCols[c.key] === true
        }));
    }, [columns, collapsedCols]);

    const stopSortClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <table className="table" style={{width: "100%", marginTop: 20}}>
            <thead>
            <tr className="table__header-row">
                {cols.map(col => {
                    const collapsed = col.__collapsed;

                    return (
                        <th
                            key={col.key}
                            className={
                                "table__header" + (collapsed ? " table__header_collapsed" : "")
                            }
                            style={
                                collapsed
                                    ? {width: 44, minWidth: 44}
                                    : (col.width ? {width: col.width} : {})
                            }
                        >
                            <div className="table__header-inner">
                                {!collapsed && (
                                    <span className="table__header-text gradient-text">
                      {col.title}
                    </span>
                                )}

                                <button
                                    type="button"
                                    className="table__collapse-btn"
                                    title={collapsed ? "Развернуть столбец" : "Свернуть столбец"}
                                    aria-label={collapsed ? "Развернуть столбец" : "Свернуть столбец"}
                                    onMouseDown={stopSortClick}
                                    onClick={(e) => {
                                        stopSortClick(e);
                                        toggleCol(col.key);
                                    }}
                                >
                                    {collapsed ? <FiChevronRight size={16}/> : <FiChevronLeft size={16}/>}
                                </button>
                            </div>
                        </th>
                    );
                })}
            </tr>
            </thead>

            <tbody>
            {data.map((row, rowIndex) => (
                <tr key={row.id || rowIndex} className="table__row">
                    {cols.map(col => {
                        const collapsed = col.__collapsed;

                        return (
                            <td
                                key={col.key}
                                className={
                                    "table__cell" + (collapsed ? " table__cell_collapsed" : "")
                                }
                                style={
                                    collapsed
                                        ? {width: 44, minWidth: 44, maxWidth: 44}
                                        : (col.width ? {width: col.width} : {})
                                }
                                title={
                                    collapsed
                                        ? (col.render ? "" : String(row[col.key] ?? ""))
                                        : undefined
                                }
                            >
                                {!collapsed && (
                                    <span className="table__cell-text">
                      {col.render
                          ? col.render(row[col.key], row, rowIndex)
                          : row[col.key]}
                    </span>
                                )}
                            </td>
                        );
                    })}
                </tr>
            ))}
            </tbody>
        </table>
    );
}
