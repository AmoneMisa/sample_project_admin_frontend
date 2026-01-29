import {useState} from "react";
import LabeledInput from "../controls/LabeledInput";

export default function AddKeyBar({onAdd, existingKeys}) {
    const [newKey, setNewKey] = useState("");
    const [error, setError] = useState("");

    function handleAdd() {
        const key = newKey.trim();

        if (!key) {
            setError("Введите ключ");
            return;
        }

        if (existingKeys.includes(key)) {
            setError("Такой ключ уже существует");
            return;
        }

        onAdd(key);
        setNewKey("");
        setError("");
    }

    return (
        <div className="field" style={{display: "flex", gap: 12, alignItems: "center"}}>
            <LabeledInput
                label="Новый ключ"
                placeholder="Новый ключ"
                value={newKey}
                onChange={(val) => {
                    setNewKey(val);
                    setError("");
                }}
                error={error}
            />

            <button className="button" onClick={handleAdd}>
                Добавить
            </button>
        </div>
    );
}
