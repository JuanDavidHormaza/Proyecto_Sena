import React from "react";

export type BrandHeaderSize = "sm" | "md" | "lg";

export interface BrandHeaderProps {
  size?: BrandHeaderSize;
  className?: string;
  onClick?: () => void;
  showDivider?: boolean;
  showSena?: boolean;
}

const sizeConfig: Record<
  BrandHeaderSize,
  {
    worklex: string;
    sena: string;
    divider: string;
    gap: string;
  }
> = {
  sm: {
    worklex: "h-8 sm:h-9",
    sena: "h-7 sm:h-8",
    divider: "h-5 sm:h-6",
    gap: "gap-2.5 sm:gap-3",
  },
  md: {
    worklex: "h-9 sm:h-10 md:h-11",
    sena: "h-8 sm:h-9",
    divider: "h-6 sm:h-7",
    gap: "gap-3 sm:gap-3.5",
  },
  lg: {
    worklex: "h-12 sm:h-14 md:h-16",
    sena: "h-10 sm:h-12 md:h-14",
    divider: "h-8 sm:h-10",
    gap: "gap-3.5 sm:gap-4",
  },
};

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  size = "md",
  className = "",
  onClick,
  showDivider = true,
  showSena = true,
}) => {
  const config = sizeConfig[size] || sizeConfig.md;

  const content = (
    <div
      className={`bg-transparent border-0 p-0 shadow-none flex items-center ${config.gap} ${className}`}
    >
      {/* Logo WorkLex Transparente */}
      <img
        src="/worklex-transparent.png"
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src !== window.location.origin + "/worklex.png") {
            img.src = "/worklex.png";
          }
        }}
        alt="WorkLex Logo"
        className={`${config.worklex} w-auto object-contain bg-transparent mix-blend-multiply dark:mix-blend-normal transition-transform duration-200 group-hover:scale-105 hover:scale-105 select-none shrink-0`}
        style={{ imageRendering: "-webkit-optimize-contrast" }}
        loading="eager"
      />

      {/* Línea divisoria sutil estilo MatDash */}
      {showDivider && showSena && (
        <div
          className={`${config.divider} w-px bg-slate-200 dark:bg-slate-700 shrink-0`}
        />
      )}

      {/* Logo SENA Transparente */}
      {showSena && (
        <img
          src="/logo-sena.png"
          alt="SENA Logo"
          className={`${config.sena} w-auto object-contain bg-transparent mix-blend-multiply dark:mix-blend-normal transition-transform duration-200 group-hover:scale-105 hover:scale-105 select-none shrink-0 opacity-95`}
          style={{ imageRendering: "-webkit-optimize-contrast" }}
          loading="eager"
        />
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group inline-flex items-center bg-transparent border-0 p-0 shadow-none text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl transition-opacity hover:opacity-95"
        title="WorkLex & SENA"
      >
        {content}
      </button>
    );
  }

  return content;
};

export const AppLogo = BrandHeader;
export default BrandHeader;
