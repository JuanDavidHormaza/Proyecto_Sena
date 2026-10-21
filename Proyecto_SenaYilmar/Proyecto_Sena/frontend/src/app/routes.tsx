import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RouteErrorBoundary } from "./components/ErrorBoundary";

// Componentes de páginas con carga perezosa (Lazy loading) para romper dependencias circulares y TDZ
const LandingPage = lazy(() => import("./pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const QuizPage = lazy(() => import("./pages/QuizPage").then((m) => ({ default: m.QuizPage })));
const ResultsPage = lazy(() => import("./pages/ResultsPage").then((m) => ({ default: m.ResultsPage })));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const UsersPage = lazy(() => import("./pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard").then((m) => ({ default: m.TeacherDashboard })));
const TeacherDictionariesPage = lazy(() => import("./pages/TeacherDictionariesPage").then((m) => ({ default: m.TeacherDictionariesPage })));
const DictionaryPage = lazy(() => import("./pages/DictionaryPage").then((m) => ({ default: m.DictionaryPage })));
const MediaPage = lazy(() => import("./pages/MediaPage").then((m) => ({ default: m.MediaPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/", element: withSuspense(LandingPage) },
      { path: "/login", element: withSuspense(LoginPage) },
      { path: "/register", element: withSuspense(RegisterPage) },
      { path: "/recuperar-cuenta", element: withSuspense(ResetPasswordPage) },
      { path: "/recuperar", element: withSuspense(ResetPasswordPage) },
      { path: "/reset-password", element: withSuspense(ResetPasswordPage) },
      { path: "/recover", element: withSuspense(ResetPasswordPage) },
      { path: "/404", element: withSuspense(NotFoundPage) },

      // Estudiante
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute allowedRoles={["student"]}>
            {withSuspense(DashboardPage)}
          </ProtectedRoute>
        ),
      },
      {
        path: "/quiz",
        element: (
          <ProtectedRoute allowedRoles={["student"]}>
            {withSuspense(QuizPage)}
          </ProtectedRoute>
        ),
      },
      {
        path: "/results",
        element: (
          <ProtectedRoute allowedRoles={["student"]}>
            {withSuspense(ResultsPage)}
          </ProtectedRoute>
        ),
      },
      {
        path: "/dictionary",
        element: (
          <ProtectedRoute allowedRoles={["student", "teacher", "admin", "superadmin"]}>
            {withSuspense(DictionaryPage)}
          </ProtectedRoute>
        ),
      },
      {
        path: "/diccionario",
        element: (
          <ProtectedRoute allowedRoles={["student", "teacher", "admin", "superadmin"]}>
            {withSuspense(DictionaryPage)}
          </ProtectedRoute>
        ),
      },

      // Profesor
      {
        path: "/teacher",
        element: (
          <ProtectedRoute allowedRoles={["teacher"]}>
            {withSuspense(TeacherDashboard)}
          </ProtectedRoute>
        ),
      },
      {
        path: "/instructor",
        element: <Navigate to="/teacher" replace />,
      },
      {
        path: "/instructor/dashboard",
        element: <Navigate to="/teacher" replace />,
      },
      {
        path: "/teacher/dictionaries",
        element: (
          <ProtectedRoute allowedRoles={["teacher"]}>
            {withSuspense(TeacherDictionariesPage)}
          </ProtectedRoute>
        ),
      },

      // Admin y SuperAdmin
      {
        path: "/admin",
        element: (
          <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
            {withSuspense(AdminDashboard)}
          </ProtectedRoute>
        ),
      },
      {
        path: "/users",
        element: (
          <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
            {withSuspense(UsersPage)}
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/users",
        element: (
          <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
            {withSuspense(UsersPage)}
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/solicitudes",
        element: <Navigate to="/admin" replace />,
      },

      // Compartida autenticados
      {
        path: "/media",
        element: (
          <ProtectedRoute allowedRoles={["student", "teacher", "admin", "superadmin"]}>
            {withSuspense(MediaPage)}
          </ProtectedRoute>
        ),
      },
      {
        path: "/profile",
        element: (
          <ProtectedRoute allowedRoles={["student", "teacher", "admin", "superadmin"]}>
            {withSuspense(ProfilePage)}
          </ProtectedRoute>
        ),
      },
      {
        path: "/settings",
        element: (
          <ProtectedRoute allowedRoles={["student", "teacher", "admin", "superadmin"]}>
            {withSuspense(SettingsPage)}
          </ProtectedRoute>
        ),
      },

      // Ruta catch-all (404 estilizada)
      { path: "*", element: withSuspense(NotFoundPage) },
    ],
  },
]);
