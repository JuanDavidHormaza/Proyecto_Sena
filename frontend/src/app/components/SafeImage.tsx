import { useState, useEffect } from "react";
import { ImageIcon, ZoomIn } from "lucide-react";
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

      {/* 3. Placeholder Limpio si no hay imagen o falla (Cero texto residual o insignias) */}
      {hasError && (
        <div className="absolute inset-0 bg-slate-50 flex items-center justify-center text-slate-300 p-3">
          <ImageIcon className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
        </div>
      )}

      {/* 4. Overlay sutil de Hover Zoom (Lupa/Ojo) */}
      {showHoverZoom && !hasError && isLoaded && onClick && (
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
          <div className="w-9 h-9 rounded-full bg-white/95 text-slate-800 flex items-center justify-center shadow-lg backdrop-blur-xs transform scale-90 group-hover:scale-100 transition-transform">
            <ZoomIn className="w-4 h-4 text-emerald-700" strokeWidth={1.8} />
          </div>
        </div>
      )}
    </div>
  );
}
