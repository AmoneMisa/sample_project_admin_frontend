import {lazy, Suspense} from "react";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {ToastProvider} from "./components/layout/ToastContext";
import {AuthProvider} from "./hooks/authContext";
import {TranslationsProvider} from "./hooks/useTranslations";
import PrivateRoute from "./components/layout/PrivateRoute";
import AdminLayout from "./components/layout/AdminLayout";
import ScrollTopButton from "./components/controls/ScrollTopButton";
import ContactMeButton from "./components/controls/ContactMeButton";
import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/registerPage";

const Index = lazy(() => import("./pages"));
const Testimonials = lazy(() => import("./pages/testimonials"));
const HeaderMenu = lazy(() => import("./pages/headerMenu"));
const UsersPage = lazy(() => import("./pages/usersPage"));
const AdminPage = lazy(() => import("./pages/adminPage"));
const FeatureCardsPage = lazy(() => import("./pages/featureCardsPage"));
const ContactsPage = lazy(() => import("./pages/contactsPage"));
const FooterMenuPage = lazy(() => import("./pages/footerMenuPage"));
const OfferCardsPage = lazy(() => import("./pages/offerCardsPage"));
const ServicesPage = lazy(() => import("./pages/servicePages"));
const TabsPage = lazy(() => import("./pages/tabsPage"));
const AnimatedTextPage = lazy(() => import("./pages/animatedTextPage"));

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter basename="/admin">
                <ToastProvider>
                    <TranslationsProvider>
                        <Suspense fallback={<div className="page" style={{padding: 24}}/>}>
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
                        </Suspense>
                        <ScrollTopButton />
                        <ContactMeButton />
                    </TranslationsProvider>
                </ToastProvider>
            </BrowserRouter>
        </AuthProvider>
    );
}
