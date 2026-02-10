import {BrowserRouter, Route, Routes} from "react-router-dom";
import Index from "./pages";
import Testimonials from "./pages/testimonials";
import {ToastProvider} from "./components/layout/ToastContext";
import AdminLayout from "./components/layout/AdminLayout";
import HeaderMenu from "./pages/headerMenu";
import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/registerPage";
import UsersPage from "./pages/usersPage";
import {AuthProvider} from "./hooks/authContext";
import PrivateRoute from "./components/layout/PrivateRoute";
import AdminPage from "./pages/adminPage";
import FeatureCardsPage from "./pages/featureCardsPage";
import ContactsPage from "./pages/contactsPage";
import FooterMenuPage from "./pages/footerMenuPage";
import OfferCardsPage from "./pages/offerCardsPage";
import ScrollTopButton from "./components/controls/ScrollTopButton";
import ContactMeButton from "./components/controls/ContactMeButton";
import ServicesPage from "./pages/servicePages";
import TabsPage from "./pages/tabsPage";
import AnimatedTextPage from "./pages/animatedTextPage";

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter basename="/admin">
                <ToastProvider>
                    <Routes>
                        <Route path="/login" element={<LoginPage/>}/>
                        <Route path="/register" element={<RegisterPage/>}/>
                        <Route
                            path="/"
                            element={
                                <PrivateRoute>
                                    <AdminLayout/>
                                </PrivateRoute>
                            }
                        >
                            <Route index element={<Index/>}/>
                            <Route path="testimonials" element={<Testimonials/>}/>
                            <Route path="header-menu" element={<HeaderMenu/>}/>
                            <Route path="contacts" element={<ContactsPage/>}/>
                            <Route path="menu" element={<FooterMenuPage/>}/>
                            <Route path="feature-cards" element={<FeatureCardsPage/>}/>
                            <Route path="offer-cards" element={<OfferCardsPage/>}/>
                            <Route path="services" element={<ServicesPage/>}/>
                            <Route path="tabs" element={<TabsPage/>}/>
                            <Route path="animated-text" element={<AnimatedTextPage/>}/>
                            <Route
                                path="admin"
                                element={
                                    <PrivateRoute allowedRoles={["admin", "moderator"]}>
                                        <AdminPage/>
                                    </PrivateRoute>
                                }
                            />

                            <Route
                                path="users"
                                element={
                                    <PrivateRoute allowedRoles={["admin"]}>
                                        <UsersPage/>
                                    </PrivateRoute>
                                }
                            />
                        </Route>
                    </Routes>
                    <ScrollTopButton />
                    <ContactMeButton />
                </ToastProvider>
            </BrowserRouter>
        </AuthProvider>
    );
}
