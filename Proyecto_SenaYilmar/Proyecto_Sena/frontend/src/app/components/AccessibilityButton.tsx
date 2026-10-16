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
      aria-label="Accesibilidad"
      onClick={handleClick}
      className={`w-11 h-11 bg-[#39A900] hover:bg-[#2d8500] rounded-full shadow-md fixed bottom-6 right-6 z-50 flex items-center justify-center text-white transition-all cursor-pointer border border-white/20 ${className}`}
    >
      <Accessibility className="w-5 h-5 text-white stroke-[2]" />
    </button>
  );
};

export default AccessibilityButton;
