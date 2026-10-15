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
      aria-label="Opciones de accesibilidad"
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#39A900] hover:bg-[#2e8600] text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-white/20 ${className}`}
    >
      <Accessibility className="w-6 h-6 text-white stroke-[2.2]"/>
    </button>
  );
};

export default AccessibilityButton;
