import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UserAccountMenu } from "./UserAccountMenu";
import { HeaderActionTools } from "./HeaderActionTools";
import { useAuth } from "../context/AuthContext";

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
  const { user } = useAuth();

  const currentPath = activePath || location.pathname;

  const defaultLinks: NavLinkItem[] = [
    { label: "Inicio", path: "/" },
    { label: "Evaluación", path: user?.role === "student" ? "/dashboard" : user?.role === "teacher" ? "/teacher" : "/admin" },
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

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
      <div className="container mx-auto px-4 lg:px-8 h-full flex items-center justify-between">
        {/* Isotipo/Logos a la izquierda */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            title="Ir a la página principal de WorkLex"
            className="group flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
          >
            <img
              src="/logo-sena.png"
              alt="SENA"
              className="h-9 w-auto object-contain shrink-0"
            />
            <span className="h-6 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
            <img
              src="/worklex.png"
              alt="Worklex SENA"
              className="h-8 w-auto object-contain shrink-0"
            />
          </button>
        </div>

        {/* Menú de navegación centrado con enlaces en text-slate-600 hover:text-slate-900 text-sm font-medium */}
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

        {/* Perfil con avatar discreto y badge de rol a la derecha */}
        <div className="flex items-center gap-2.5">
          <HeaderActionTools />
          <UserAccountMenu accent="green" />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
