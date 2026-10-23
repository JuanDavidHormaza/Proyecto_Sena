import React, { FC } from "react";
import { IconWheelchair } from "@tabler/icons-react";

interface AccessibilityButtonProps {
  onClick?: () => void;
  className?: string;
}

export const AccessibilityButton: FC<AccessibilityButtonProps> = ({
  onClick,
  className = "",
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.dispatchEvent(new CustomEvent("toggle-worklex-accessibility"));
    }
  };

  return (
    <button
      type="button"
      id="accessibility-trigger-btn"
      aria-label="Accesibilidad"
      onClick={handleClick}
      className={`fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 h-9 sm:h-10 px-3 rounded-full bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 shadow-md hover:shadow-lg border border-slate-200/90 dark:border-slate-700 backdrop-blur-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer ${className}`}
    >
      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
        <IconWheelchair size={18} stroke={1.8} />
      </div>
      <span className="hidden sm:inline text-xs font-bold">Accesibilidad</span>
    </button>
  );
};

export default AccessibilityButton;
