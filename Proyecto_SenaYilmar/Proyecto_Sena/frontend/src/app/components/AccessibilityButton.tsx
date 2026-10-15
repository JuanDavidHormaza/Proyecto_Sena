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
      className={`fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-[#39A900] hover:bg-[#2e8600] text-white shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-white/20 ${className}`}
    >
      <Accessibility className="w-5 h-5 text-white" />
    </button>
  );
};

export default AccessibilityButton;
