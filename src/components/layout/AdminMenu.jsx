import {NavLink, useNavigate} from "react-router-dom";
import {
    FiGrid,
    FiHome,
    FiLayers,
    FiLogOut,
    FiMenu,
    FiMessageSquare,
    FiPhone,
    FiUsers
} from "react-icons/fi";
import {useAuth} from "../../hooks/authContext";

export default function AdminMenu() {
    const {user, logout} = useAuth();
    const navigate = useNavigate();

    const isAdmin = user?.role === "admin";
    const isModerator = user?.role === "moderator";

    async function handleLogout() {
        await logout();
        navigate("/login", {replace: true});
    }

    return (
        <nav className="admin-menu">
            <NavLink
                to="/"
                className={({isActive}) =>
                    "admin-menu__item" + (isActive ? " admin-menu__item_active" : "")
                }
            >
                <FiHome size={18}/>
                <span>Переводы</span>
            </NavLink>

            <NavLink
                to="/testimonials"
                className={({isActive}) =>
                    "admin-menu__item" + (isActive ? " admin-menu__item_active" : "")
                }
            >
                <FiMessageSquare size={18}/>
                <span>Отзывы</span>
            </NavLink>

            <NavLink
                to="/header-menu"
                className={({isActive}) =>
                    "admin-menu__item" + (isActive ? " admin-menu__item_active" : "")
                }
            >
                <FiMenu size={18}/>
                <span>Главное меню</span>
            </NavLink>

            <NavLink
                to="/feature-cards"
                className={({isActive}) =>
                    "admin-menu__item" + (isActive ? " admin-menu__item_active" : "")
                }
            >
                <FiGrid size={18}/>
                <span>Feature Cards</span>
            </NavLink>

            <NavLink
                to="/contacts"
                className={({isActive}) =>
                    "admin-menu__item" + (isActive ? " admin-menu__item_active" : "")
                }
            >
                <FiPhone size={18}/>
                <span>Контакты</span>
            </NavLink>

            <NavLink
                to="/menu"
                className={({isActive}) =>
                    "admin-menu__item" + (isActive ? " admin-menu__item_active" : "")
                }
            >
                <FiMenu size={18}/>
                <span>Футер меню</span>
            </NavLink>

            <NavLink
                to="/footer"
                className={({isActive}) =>
                    "admin-menu__item" + (isActive ? " admin-menu__item_active" : "")
                }
            >
                <FiLayers size={18}/>
                <span>Футер</span>
            </NavLink>

            {isAdmin && (
                <NavLink
                    to="/users"
                    className={({isActive}) =>
                        "admin-menu__item" + (isActive ? " admin-menu__item_active" : "")
                    }
                >
                    <FiUsers size={18}/>
                    <span>Пользователи</span>
                </NavLink>
            )}

            {(isAdmin || isModerator) && (
                <NavLink
                    to="/admin"
                    className={({isActive}) =>
                        "admin-menu__item" + (isActive ? " admin-menu__item_active" : "")
                    }
                >
                    <FiMenu size={18}/>
                    <span>Админка</span>
                </NavLink>
            )}

            <button className="admin-menu__item admin-menu__logout" onClick={handleLogout}>
                <FiLogOut size={18}/>
                <span>Выйти</span>
            </button>
        </nav>
    );
}
