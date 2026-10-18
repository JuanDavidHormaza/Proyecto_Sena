import React from 'react';

export interface BrandLogoProps {
  className?: string;
  showSena?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = '', 
  showSena = true,
  size = 'md',
  onClick,
}) => {
  const heightClasses = {
    sm: 'h-7 sm:h-8',
    md: 'h-9 sm:h-10',
    lg: 'h-12 sm:h-14',
  };

  const content = (
    <div className={`flex items-center gap-3 bg-transparent p-0 m-0 border-0 shadow-none ${className}`}>
      {/* Logo WorkLex sin fondo ni contenedores blancos */}
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
        className={`${heightClasses[size]} w-auto object-contain bg-transparent mix-blend-multiply dark:mix-blend-normal`}
        style={{ imageRendering: '-webkit-optimize-contrast' }}
      />

      {showSena && (
        <>
          {/* Separador fino institucional */}
          <div className="h-5 w-px bg-slate-300/80 dark:bg-slate-700" />

          {/* Logo SENA transparente */}
          <img
            src="/assets/logo-sena.svg"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.includes('logo-sena.png')) {
                img.src = '/assets/logo-sena.png';
              } else if (!img.src.includes('logo.svg')) {
                img.src = '/logo.svg';
              }
            }}
            alt="SENA"
            className={`${heightClasses[size]} w-auto object-contain bg-transparent mix-blend-multiply dark:mix-blend-normal`}
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />
        </>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="bg-transparent border-0 p-0 shadow-none text-left cursor-pointer focus:outline-none transition-opacity hover:opacity-90 inline-flex items-center"
        title="WorkLex & SENA"
      >
        {content}
      </button>
    );
  }

  return content;
};

export default BrandLogo;
