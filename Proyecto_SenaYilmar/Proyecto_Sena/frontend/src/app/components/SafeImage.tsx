import { useState, useEffect } from "react";
import { Code, ZoomIn } from "lucide-react";
import { getMediaUrl } from "../services/api";

export interface SafeImageProps {
  src?: string;
  alt: string;
  fallbackText?: string;
  className?: string;
  containerClassName?: string;
  onClick?: () => void;
  showHoverZoom?: boolean;
  aspectRatio?: string;
  loading?: "eager" | "lazy";
}

export function SafeImage({
  src,
  alt,
  fallbackText,
  className = "",
  containerClassName = "",
  onClick,
  showHoverZoom = false,
  loading = "eager",
}: SafeImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const resolvedSrc = src ? getMediaUrl("dictionary-images", src) : "";
  const [hasError, setHasError] = useState(!resolvedSrc);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(!resolvedSrc);
  }, [resolvedSrc]);

  const initials = (fallbackText || alt || "ADSO").trim().slice(0, 3).toUpperCase();

  return (
    <div
      onClick={onClick}
      className={`relative w-full h-full bg-slate-50 overflow-hidden flex items-center justify-center ${
        onClick ? "cursor-pointer group" : ""
      } ${containerClassName}`}
      title={onClick ? "Clic para ampliar imagen en alta resolución" : alt}
    >
      {/* 1. Skeleton Loader Shimmer Suave mientras descarga */}
      {!isLoaded && !hasError && resolvedSrc && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center z-0">
          <div className="w-7 h-7 rounded-full border-2 border-slate-300 border-t-emerald-600 animate-spin" />
        </div>
      )}

      {/* 2. Imagen con object-contain para evitar recortes y carga eager */}
      {resolvedSrc && !hasError ? (
        <img
          src={resolvedSrc}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            console.warn(`Error al cargar imagen: ${resolvedSrc}`);
            setHasError(true);
            setIsLoaded(true);
          }}
          className={`w-full h-full object-contain p-2 transition-transform duration-300 ${
            onClick ? "group-hover:scale-105" : ""
          } ${isLoaded ? "opacity-100" : "opacity-0"} ${className}`}
        />
      ) : null}

      {/* 3. Placeholder Institucional Estilizado si no hay imagen o falla (Cero Cajas Negras) */}
      {hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 flex flex-col items-center justify-center text-slate-400 p-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-100/80 border border-emerald-200/80 text-emerald-700 flex items-center justify-center mb-1.5 shadow-2xs">
            <Code className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-xs font-bold text-slate-700 tracking-wider">
            {initials}
          </span>
          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px] mt-0.5">
            {fallbackText || alt}
          </span>
        </div>
      )}

      {/* 4. Overlay sutil de Hover Zoom (Lupa/Ojo) */}
      {showHoverZoom && !hasError && isLoaded && onClick && (
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
          <div className="w-9 h-9 rounded-full bg-white/95 text-slate-800 flex items-center justify-center shadow-lg backdrop-blur-xs transform scale-90 group-hover:scale-100 transition-transform">
            <ZoomIn className="w-4 h-4 text-emerald-700" />
          </div>
        </div>
      )}
    </div>
  );
}
