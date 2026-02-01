import { FiSend } from "react-icons/fi";

export default function ContactMeButton() {
    return (
        <a
            href="https://t.me/whiteslove"
            target="_blank"
            rel="noopener noreferrer"
            className="fab fab_contact"
            title="Связаться в Telegram"
        >
            <FiSend />
        </a>
    );
}
