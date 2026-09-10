// =======================================================================
// BrandLogo
// Logo circular de WorkLex: el círculo es el contenedor y el asset completo
// se adapta dentro con object-contain. Así no se deforma ni se corta.
// =======================================================================

interface BrandLogoProps {
  /** Clase de altura actual usada por los consumidores, por ejemplo h-10. */
  height?: string;
  /** Refuerza el contraste sobre fondos oscuros. */
  boxed?: boolean;
  /** Clases extra para el contenedor circular. */
  className?: string;
  alt?: string;
}

const widthByHeight: Record<string, string> = {
  "h-6": "w-6",
  "h-8": "w-8",
  "h-9": "w-9",
  "h-10": "w-10",
  "h-11": "w-11",
  "h-12": "w-12",
  "h-14": "w-14",
  "h-16": "w-16",
  "h-20": "w-20",
  "h-24": "w-24",
};

export function BrandLogo({
  height = "h-10",
  boxed = false,
  className = "",
  alt = "WorkLex English SENA",
}: BrandLogoProps) {
  const width = widthByHeight[height] ?? "w-10";

  return (
    <span
      className={[
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white",
        "border border-worklex-blue/15 shadow-sm",
        height,
        width,
        boxed ? "ring-2 ring-white/90 shadow-lg shadow-black/20" : "",
        className,
      ].join(" ")}
      aria-label={alt}
      title={alt}
    >
      <img
        src="/worklex.png"
        alt={alt}
        className="h-full w-full object-contain p-[8%] select-none"
        draggable={false}
      />
    </span>
  );
}

export default BrandLogo;
