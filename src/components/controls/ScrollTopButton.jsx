import { useState, useEffect } from "react";
import { FiArrowUp } from "react-icons/fi";

export default function ScrollTopButton() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            setVisible(window.scrollY > 300);
        };

        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    if (!visible) return null;

    return (
        <button
            onClick={() =>
                window.scrollTo({ top: 0, behavior: "smooth" })
            }
            className="fab fab_scroll"
            title="Наверх"
            type="button"
        >
            <FiArrowUp />
        </button>
    );
}
