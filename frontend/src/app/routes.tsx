// frontend/src/router.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { QuizPage } from "./pages/QuizPage";
import { ResultsPage } from "./pages/ResultsPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { TeacherDashboard } from "./pages/TeacherDashboard";
import { MediaPage } from "./pages/MediaPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/", Component: LandingPage },
  { path: "/login", Component: LoginPage },
  { path: "/register", Component: RegisterPage },

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

  // Profesor
  {
    path: "/teacher",
    element: (
      <ProtectedRoute allowedRoles={["teacher"]}>
        <TeacherDashboard />
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

  // Compartida autenticados
  {
    path: "/media",
    element: (
      <ProtectedRoute allowedRoles={["student", "teacher", "admin", "superadmin"]}>
        <MediaPage />
      </ProtectedRoute>
    ),
  },

  // Ruta catch-all
  { path: "*", element: <Navigate to="/login" replace /> },
]);