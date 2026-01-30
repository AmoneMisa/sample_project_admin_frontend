import { isValidPhoneNumber } from "react-phone-number-input";

// -----------------------------
// ЦЕЛОЕ ЧИСЛО > 0
// -----------------------------
export function validateInteger(value) {
    if (!value.trim()) return "Поле обязательно";
    if (!/^\d+$/.test(value)) return "Должно быть целым числом";
    if (Number(value) <= 0) return "Должно быть больше нуля";
    return null;
}

// -----------------------------
// ТЕЛЕФОН
// -----------------------------
export function validatePhone(value) {
    if (!value.trim()) return "Поле обязательно";
    if (!isValidPhoneNumber(value)) return "Некорректный номер телефона";
    return null;
}

// -----------------------------
// EMAIL
// -----------------------------
export function validateEmail(value) {
    if (!value.trim()) return "Поле обязательно";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Некорректный email";
    return null;
}

// -----------------------------
// URL
// -----------------------------
export function validateUrl(value) {
    if (!value.trim()) return "Поле обязательно";
    try {
        new URL(value);
        return null;
    } catch {
        return "Некорректная ссылка";
    }
}

// -----------------------------
// БЕЗОПАСНАЯ СТРОКА
// -----------------------------
export function validateSafeString(value) {
    if (!value.trim()) return "Поле обязательно";

    const forbidden = /<(script|style|code)[^>]*>/i;
    const anyTag = /<[^>]+>/;

    if (forbidden.test(value)) return "Запрещённый тег";
    if (anyTag.test(value)) return "Теги запрещены";

    return null;
}

export function validateContact(contact, translations, languages) {
    const t = translations[contact.id];
    const errs = {};

    // Техническое поле value
    if (contact.type === "phone") {
        errs.value = validatePhone(contact.value);
    }

    if (contact.type === "email") {
        errs.value = validateEmail(contact.value);
    }

    if (contact.type === "address") {
        errs.value = validateSafeString(contact.value);
    }

    if (contact.type === "social") {
        errs.value = validateUrl(contact.value);
        if (!contact.socialType) errs.socialType = "Выберите тип соцсети";
    }

    if (contact.type === "other") {
        errs.value = validateSafeString(contact.value);
    }

    const trErr = { label: {}, value: {} };
    let hasTrErr = false;

    for (const lang of languages.map(l => l.code)) {
        if (!t.label[lang]?.trim()) {
            trErr.label[lang] = "Обязательно";
            hasTrErr = true;
        }
    }

    if (hasTrErr) errs.translations = trErr;

    return Object.values(errs).some(Boolean) ? errs : null;
}