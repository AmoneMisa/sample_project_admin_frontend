import {NavLink, useNavigate} from "react-router-dom";
import {
    FiGrid,
    FiHome,
    FiLayers,
    FiLogOut,
    FiMenu,
    FiMessageSquare,
    FiPhone,
    FiUsers,
    FiChevronRight,
    FiChevronLeft
} from "react-icons/fi";
import {useAuth} from "../../hooks/authContext";
import {useEffect, useMemo, useRef, useState} from "react";

const LS_KEY = "adminMenu.floating.v1";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function getViewport() {
    return {w: window.innerWidth, h: window.innerHeight};
}

function clampPos(pos, size, padding = 12) {
    const {w, h} = getViewport();
    const maxX = Math.max(padding, w - size.w - padding);
    const maxY = Math.max(padding, h - size.h - padding);
    return {
        x: clamp(pos.x, padding, maxX),
        y: clamp(pos.y, padding, maxY),
    };
}

export default function AdminMenu() {
    const {user, logout} = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === "admin";
    const isModerator = user?.role === "moderator";
    const items = useMemo(() => {
        const base = [
            {to: "/", icon: FiHome, label: "Переводы"},
            {to: "/testimonials", icon: FiMessageSquare, label: "Отзывы"},
            {to: "/header-menu", icon: FiMenu, label: "Главное меню"},
            {to: "/feature-cards", icon: FiGrid, label: "Feature Cards"},
            {to: "/contacts", icon: FiPhone, label: "Контакты"},
            {to: "/menu", icon: FiMenu, label: "Футер меню"},
            {to: "/footer", icon: FiLayers, label: "Футер"},
            {to: "/offer-cards", icon: FiGrid, label: "Карточки предложений"},
        ];
        if (isAdmin) base.push({to: "/users", icon: FiUsers, label: "Пользователи"});
        if (isAdmin || isModerator) base.push({to: "/admin", icon: FiMenu, label: "Админка"});
        return base;
    }, [isAdmin, isModerator]);

    const rootRef = useRef(null);
    const [collapsed, setCollapsed] = useState(false);
    const [hydrated, setHydrated] = useState(false);
    const [pos, setPos] = useState(() => {
        return {x: 16, y: Math.max(16, Math.round(window.innerHeight * 0.25))};
    });

    const dragRef = useRef({
        dragging: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        baseX: 0,
        baseY: 0,
    });

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");

            if (typeof saved.collapsed === "boolean") setCollapsed(saved.collapsed);

            if (saved.pos && typeof saved.pos.x === "number" && typeof saved.pos.y === "number") {
                setPos(saved.pos);
            }
        } catch (e) {
            console.error("Trying to parse localStorage:", e);
        } finally {
            setHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!hydrated) return;

        try {
            localStorage.setItem(LS_KEY, JSON.stringify({collapsed, pos}));
        } catch (e){
            console.error("Trying to parse localStorage:", e);
        }
    }, [hydrated, collapsed, pos]);

    useEffect(() => {
        const fix = () => {
            const el = rootRef.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();

            setPos(prev => {
                const next = clampPos(prev, {w: rect.width, h: rect.height}, 12);
                if (next.x === prev.x && next.y === prev.y) return prev;
                return next;
            });
        };

        fix();
        window.addEventListener("resize", fix);
        return () => window.removeEventListener("resize", fix);
    }, [collapsed]);

    async function handleLogout() {
        await logout();
        navigate("/login", {replace: true});
    }

    const onDragStart = (e) => {
        if (e.target.closest("[data-nodrag='true']")) return;
        if (e.button != null && e.button !== 0) return;

        const el = rootRef.current;
        if (!el) return;

        dragRef.current.dragging = true;
        dragRef.current.pointerId = e.pointerId ?? null;
        dragRef.current.startX = e.clientX;
        dragRef.current.startY = e.clientY;
        dragRef.current.baseX = pos.x;
        dragRef.current.baseY = pos.y;

        if (e.currentTarget.setPointerCapture && e.pointerId != null) {
            e.currentTarget.setPointerCapture(e.pointerId);
        }

        e.preventDefault();
    };


    const onDragMove = (e) => {
        if (!dragRef.current.dragging) return;

        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        const el = rootRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const raw = {x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy};
        const next = clampPos(raw, {w: rect.width, h: rect.height}, 12);

        setPos(next);
    };

    const onDragEnd = () => {
        dragRef.current.dragging = false;
        dragRef.current.pointerId = null;
    };

    return (
        <nav
            ref={rootRef}
            className={
                "admin-menu admin-menu_floating" +
                (collapsed ? " admin-menu_collapsed" : "")
            }
            style={{left: pos.x, top: pos.y}}
            aria-label="Admin navigation"
        >
            <div
                className="admin-menu__handle"
                onPointerDown={onDragStart}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
                title="Перетащить меню"
            >
                <span className="admin-menu__handle-dots" aria-hidden="true"/>
                <button
                    type="button"
                    data-nodrag="true"
                    className="admin-menu__collapse-button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        setCollapsed(v => !v);
                    }}
                    title={collapsed ? "Открыть меню" : "Свернуть меню"}
                    aria-label={collapsed ? "Открыть меню" : "Свернуть меню"}
                >
                    {collapsed ? <FiChevronRight size={16}/> : <FiChevronLeft size={16}/>}
                </button>
            </div>

            {!collapsed && (
                <div className="admin-menu__list scrollbar">
                    {items.map(({to, icon: Icon, label}) => (
                        <NavLink
                            key={to}
                            to={to}
                            title={label}
                            className={({isActive}) =>
                                "admin-menu__item" + (isActive ? " admin-menu__item_active" : "")
                            }
                        >
              <span className="admin-menu__icon">
                <Icon size={18}/>
              </span>
                            <span className="admin-menu__text">{label}</span>
                        </NavLink>
                    ))}

                    <button
                        type="button"
                        className="admin-menu__item admin-menu__logout"
                        onClick={handleLogout}
                        title="Выйти"
                    >
            <span className="admin-menu__icon">
              <FiLogOut size={18}/>
            </span>
                        <span className="admin-menu__text">Выйти</span>
                    </button>
                </div>
            )}
        </nav>
    );
}
