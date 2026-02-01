import { isValidPhoneNumber } from "react-phone-number-input";

export function validateInteger(value) {
    if (!value.trim()) return "Поле обязательно";
    if (!/^\d+$/.test(value)) return "Должно быть целым числом";
    if (Number(value) <= 0) return "Должно быть больше нуля";
    return null;
}

export function validatePhone(value) {
    if (!value.trim()) return "Поле обязательно";
    if (!isValidPhoneNumber(value)) return "Некорректный номер телефона";
    return null;
}

export function validateEmail(value) {
    if (!value.trim()) return "Поле обязательно";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Некорректный email";
    return null;
}

export function validateUrl(value) {
    if (!value.trim()) return "Поле обязательно";
    try {
        new URL(value);
        return null;
    } catch {
        return "Некорректная ссылка";
    }
}

export function validateSafeString(value) {
    if (!value.trim()) return "Поле обязательно";

    const forbidden = /<(script|style|code)[^>]*>/i;
    const anyTag = /<[^>]+>/;

    if (forbidden.test(value)) return "Запрещённый тег";
    if (anyTag.test(value)) return "Теги запрещены";

    return null;
}