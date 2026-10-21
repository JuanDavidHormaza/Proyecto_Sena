import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, LogIn } from "lucide-react";
import { UserAccountMenu } from "./UserAccountMenu";
import { HeaderActionTools } from "./HeaderActionTools";
import { RoleSwitcher } from "./RoleSwitcher";
import { useAuth } from "../context/AuthContext";
import { BrandLogo } from "./BrandLogo";

interface NavLinkItem {
  label: string;
  path: string;
}

interface NavbarProps {
  links?: NavLinkItem[];
  activePath?: string;
  onLinkClick?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ links, activePath, onLinkClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const token = typeof window !== "undefined"
    ? sessionStorage.getItem("accessToken") || sessionStorage.getItem("access_token") || sessionStorage.getItem("token")
    : null;
  const hasValidSession = Boolean(token && isAuthenticated && user);

  const currentPath = activePath || location.pathname;

  const defaultLinks: NavLinkItem[] = [
    { label: "Inicio", path: "/" },
    {
      label: "Evaluación",
      path: user?.role === "student" ? "/dashboard" : user?.role === "teacher" ? "/teacher" : "/admin",
    },
    { label: "Diccionario Técnico", path: "/dictionary" },
  ];

  const navLinks = links || defaultLinks;

  const handleLinkClick = (path: string) => {
    if (onLinkClick) {
      onLinkClick(path);
    } else {
      navigate(path);
    }
  };

  const getDashboardPath = () => {
    const role = (user?.role || sessionStorage.getItem("userRole") || "").toLowerCase();
    if (role === "admin" || role === "superadmin") return "/admin";
    if (role === "teacher") return "/teacher";
    return "/dashboard";
  };

  return (
    <header className="h-16 sm:h-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors">
      <div className="container mx-auto px-4 lg:px-8 h-full flex items-center justify-between">
        {/* Identidad de marca WorkLex y SENA a la izquierda */}
        <div className="flex items-center">
          <BrandLogo size="sm" onClick={() => navigate("/")} />
        </div>

        {/* Menú de navegación centrado */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const isActive = currentPath === link.path;
            return (
              <button
                key={link.path}
                type="button"
                onClick={() => handleLinkClick(link.path)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 font-semibold"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Controles de usuario a la derecha */}
        <div className="flex items-center gap-2.5">
          {hasValidSession ? (
            <>
              <RoleSwitcher />
              <button
                type="button"
                onClick={() => navigate(getDashboardPath())}
                className="hidden sm:inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                title="Ir al panel principal"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Ir al Panel</span>
              </button>
              <HeaderActionTools />
              <UserAccountMenu accent="green" />
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="h-10 bg-[#39A900] hover:bg-[#2e8600] text-white font-semibold text-xs sm:text-sm px-4 sm:px-5 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Ingresar</span>
              <LogIn className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
