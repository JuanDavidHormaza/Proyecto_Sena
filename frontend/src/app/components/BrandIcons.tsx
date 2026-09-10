// =======================================================================
// BrandIcons — Íconos SVG propios de WorkLex
// Diseñados para coincidir con los elementos del logo:
// libro abierto, engranaje/bombillo, figura humana, trofeo.
// NO vienen de ninguna librería genérica.
// =======================================================================

interface IconProps {
  className?: string;
  size?: number;
}

/** Libro abierto con bandera (inspirado en el logo) */
export function IconBook({ className = "", size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M8 12C8 10.9 8.9 10 10 10H22V38H10C8.9 38 8 37.1 8 36V12Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M40 12C40 10.9 39.1 10 38 10H26V38H38C39.1 38 40 37.1 40 36V12Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 16H20M14 22H19M30 16H34M30 22H33" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="24" cy="8" r="3" fill="currentColor" fillOpacity="0.3"/>
    </svg>
  );
}

/** Reloj/cronómetro estilizado */
export function IconTimer({ className = "", size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="26" r="16" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M24 16V26L30 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 6H28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M24 6V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M36 14L38 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

/** Persona/estudiante con gorro (del logo) */
export function IconStudent({ className = "", size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="16" r="8" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M12 40C12 33.4 17.4 28 24 28C30.6 28 36 33.4 36 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M16 12L24 8L32 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32 12V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/** Trofeo/resultado */
export function IconTrophy({ className = "", size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M16 8H32V22C32 26.4 28.4 30 24 30C19.6 30 16 26.4 16 22V8Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M16 12H10C10 12 9 20 16 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32 12H38C38 12 39 20 32 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M24 30V36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M18 36H30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="24" cy="18" r="2" fill="currentColor" fillOpacity="0.4"/>
    </svg>
  );
}

/** Preguntas/cuestionario */
export function IconQuiz({ className = "", size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="10" y="6" width="28" height="36" rx="4" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M18 16H30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M18 24H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M18 32H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="34" cy="34" r="8" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2"/>
      <path d="M32 33C32 31.3 33 30 34 30C35 30 36 31 36 32C36 33.2 34 33.5 34 35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="34" cy="37" r="0.8" fill="currentColor"/>
    </svg>
  );
}

/** Engranaje (del logo) */
export function IconGear({ className = "", size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="8" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M24 4V10M24 38V44M4 24H10M38 24H44M9.9 9.9L14.1 14.1M33.9 33.9L38.1 38.1M38.1 9.9L33.9 14.1M14.1 33.9L9.9 38.1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
