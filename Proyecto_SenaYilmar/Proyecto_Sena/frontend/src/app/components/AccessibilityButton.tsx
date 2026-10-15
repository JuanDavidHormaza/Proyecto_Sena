import React, { FC } from "react";
import { Accessibility } from "lucide-react";

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
      aria-label="Abrir panel de accesibilidad institucional"
      onClick={handleClick}
      className={`accessibility-trigger-btn fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full bg-[#39A900] shadow-2xl flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-[#39A900]/30 ${className}`}
    >
      <Accessibility className="w-10 h-10 text-white stroke-[2.4]" size={40} strokeWidth={2.4} />
    </button>
  );
};

export default AccessibilityButton;
