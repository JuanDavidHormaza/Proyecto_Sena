// frontend/src/router.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RecoverAccountPage } from "./pages/RecoverAccountPage";
import { DashboardPage } from "./pages/DashboardPage";
import { QuizPage } from "./pages/QuizPage";
import { ResultsPage } from "./pages/ResultsPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { TeacherDashboard } from "./pages/TeacherDashboard";
import { TeacherDictionariesPage } from "./pages/TeacherDictionariesPage";
import { MediaPage } from "./pages/MediaPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/", Component: LandingPage },
  { path: "/login", Component: LoginPage },
  { path: "/register", Component: RegisterPage },
  { path: "/recuperar-cuenta", Component: RecoverAccountPage },
  { path: "/recuperar", Component: RecoverAccountPage },
  { path: "/reset-password", Component: RecoverAccountPage },
  { path: "/recover", Component: RecoverAccountPage },
  { path: "/404", Component: NotFoundPage },

  // Estudiante
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["student"]}>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/quiz",
    element: (
      <ProtectedRoute allowedRoles={["student"]}>
        <QuizPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/results",
    element: (
      <ProtectedRoute allowedRoles={["student"]}>
        <ResultsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dictionary",
    element: (
      <ProtectedRoute allowedRoles={["student", "teacher", "admin", "superadmin"]}>
        <DashboardPage defaultTab="study" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/diccionario",
    element: (
      <ProtectedRoute allowedRoles={["student", "teacher", "admin", "superadmin"]}>
        <DashboardPage defaultTab="study" />
      </ProtectedRoute>
    ),
  },

  // Profesor
  {
    path: "/teacher",
    element: (
      <ProtectedRoute allowedRoles={["teacher"]}>
        <TeacherDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/teacher/dictionaries",
    element: (
      <ProtectedRoute allowedRoles={["teacher"]}>
        <TeacherDictionariesPage />
      </ProtectedRoute>
    ),
  },

  // Admin y SuperAdmin
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/solicitudes",
    element: (
      <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
        <AdminDashboard initialTab="requests" />
      </ProtectedRoute>
    ),
  },

  // Compartida autenticados
  {
    path: "/media",
    element: (
      <ProtectedRoute allowedRoles={["student", "teacher", "admin", "superadmin"]}>
        <MediaPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute allowedRoles={["student", "teacher", "admin", "superadmin"]}>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute allowedRoles={["student", "teacher", "admin", "superadmin"]}>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },

  // Ruta catch-all (404 estilizada)
  { path: "*", Component: NotFoundPage },
]);