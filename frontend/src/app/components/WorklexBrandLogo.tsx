import React from "react";

export type WorklexLogoSize = "sm" | "md" | "lg";

export interface WorklexBrandLogoProps {
  size?: WorklexLogoSize;
  showText?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

const sizeConfig: Record<
  WorklexLogoSize,
  {
    container: string;
    text: string;
    subtitle: string;
    badge: string;
  }
> = {
  sm: {
    container: "w-9 h-9 sm:w-10 sm:h-10 p-1",
    text: "text-sm sm:text-base font-bold",
    subtitle: "text-[11px] sm:text-xs",
    badge: "text-[10px] sm:text-[11px] px-2 py-0.5",
  },
  md: {
    container: "w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 p-1.5 sm:p-2",
    text: "text-base sm:text-lg md:text-xl font-extrabold",
    subtitle: "text-xs sm:text-sm",
    badge: "text-[11px] sm:text-xs px-2.5 py-0.5",
  },
  lg: {
    container: "w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 p-2 sm:p-2.5",
    text: "text-xl sm:text-2xl lg:text-3xl font-extrabold",
    subtitle: "text-sm sm:text-base",
    badge: "text-xs sm:text-sm px-3 py-1",
  },
};

export const WorklexBrandLogo: React.FC<WorklexBrandLogoProps> = ({
  size = "md",
  showText = false,
  showBadge = false,
  badgeText = "Ecosistema Digital",
  subtitle,
  className = "",
  onClick,
}) => {
  const config = sizeConfig[size] || sizeConfig.md;
  const hasTextContent = showText || showBadge || Boolean(subtitle);

  const logoAvatar = (
    <div
      className={`bg-transparent border-0 shadow-none flex items-center justify-center transition-transform duration-200 group-hover:scale-105 hover:scale-105 shrink-0 ${config.container}`}
    >
      <img
        src="/assets/logo-worklex.png"
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.src.includes('logo-worklex.png')) {
            img.src = '/logo-worklex.png';
          } else if (!img.src.includes('worklex-transparent.png')) {
            img.src = '/worklex-transparent.png';
          }
        }}
        alt="WorkLex"
        className="w-full h-full object-contain bg-transparent mix-blend-multiply dark:mix-blend-normal select-none"
        style={{ imageRendering: "-webkit-optimize-contrast" }}
        loading="eager"
      />
    </div>
  );

  const content = hasTextContent ? (
    <div className={`flex items-center gap-3 sm:gap-3.5 ${className}`}>
      {logoAvatar}
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {showText && (
            <span
              className={`text-slate-900 dark:text-white tracking-tight leading-none ${config.text}`}
            >
              WorkLex
            </span>
          )}
          {showBadge && (
            <span
              className={`inline-flex items-center rounded-full font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 leading-none shrink-0 ${config.badge}`}
            >
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p
            className={`text-slate-500 dark:text-slate-400 font-medium leading-tight mt-1 ${config.subtitle}`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  ) : (
    <div className={`inline-flex items-center ${className}`}>{logoAvatar}</div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl transition-all"
        title="WorkLex"
      >
        {content}
      </button>
    );
  }

  return content;
};

export default WorklexBrandLogo;
