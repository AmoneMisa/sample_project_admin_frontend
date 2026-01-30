import LabeledInput from "../controls/LabeledInput";
import LabeledSelect from "../controls/LabeledSelect";

export default function FiltersPanel({
                                         search,
                                         setSearch,
                                         filterStatus,
                                         setFilterStatus
                                     }) {
    return (
        <div style={{display: "flex", gap: 12}}>
            <LabeledInput
                label="Поиск"
                placeholder="Ключ или значение"
                value={search}
                onChange={setSearch}
            />

            <LabeledSelect
                label="Статус:"
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                    {value: "all", label: "Все"},
                    {value: "complete", label: "Полные"},
                    {value: "incomplete", label: "Неполные"},
                ]}
            />
        </div>
    );
}
