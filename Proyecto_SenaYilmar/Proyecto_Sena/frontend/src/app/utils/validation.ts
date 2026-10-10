import React from "react";
import { AlertCircle } from "lucide-react";

/**
 * Utilidades centralizadas y estrictas de validación para campos de formulario en Worklex SENA.
 * Alineadas con RFC 5322, directrices SENA y serializadores Django REST Framework.
 */

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

// ─── 1. VALIDACIÓN DE NOMBRES Y APELLIDOS ──────────────────────────────────
// Solo letras (con tildes, diéresis y eñes) y espacios simples.
const NAME_ALLOWED_CHARS_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/;

export function validateName(
  value: string,
  fieldLabel = "Nombres",
  isRequired = true
): ValidationResult {
  const trimmed = (value || "").trim();

  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, error: `${fieldLabel} es obligatorio.` };
    }
    return { isValid: true, error: null };
  }

  // Verificar caracteres prohibidos (números, arrobas, símbolos)
  if (!NAME_ALLOWED_CHARS_REGEX.test(value)) {
    return {
      isValid: false,
      error: "Solo se permiten letras y espacios. No se aceptan números ni caracteres especiales.",
    };
  }

  // Verificar espacios dobles consecutivos
  if (/\s{2,}/.test(value)) {
    return {
      isValid: false,
      error: "No se permiten múltiples espacios consecutivos.",
    };
  }

  // Longitud mínima y máxima (2 - 50 caracteres)
  if (isRequired && trimmed.length < 2) {
    return {
      isValid: false,
      error: `${fieldLabel} debe tener al menos 2 caracteres.`,
    };
  }

  if (trimmed.length > 50) {
    return {
      isValid: false,
      error: `${fieldLabel} no puede exceder los 50 caracteres.`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Sanitiza en tiempo real la entrada de nombres impidiendo caracteres inválidos.
 */
export function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "").slice(0, 50);
}

// ─── 2. VALIDACIÓN DE CORREO ELECTRÓNICO ───────────────────────────────────
// Formato estándar RFC 5322 sin espacios ni caracteres ilegales.
const EMAIL_RFC5322_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateEmail(
  value: string,
  isRequired = true
): ValidationResult {
  const raw = value || "";
  const trimmed = raw.trim();

  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, error: "El correo electrónico es obligatorio." };
    }
    return { isValid: true, error: null };
  }

  // Restricción estricta de espacios en blanco
  if (/\s/.test(raw)) {
    return {
      isValid: false,
      error:
        "Ingresa un correo electrónico válido (ej. usuario@ejemplo.com). No se permiten espacios ni caracteres inválidos.",
    };
  }

  // Restricción de caracteres especiales no estándar
  if (!EMAIL_RFC5322_REGEX.test(trimmed) || trimmed.includes("..")) {
    return {
      isValid: false,
      error:
        "Ingresa un correo electrónico válido (ej. usuario@ejemplo.com). No se permiten espacios ni caracteres inválidos.",
    };
  }

  if (trimmed.length > 100) {
    return {
      isValid: false,
      error: "El correo electrónico no puede exceder los 100 caracteres.",
    };
  }

  return { isValid: true, error: null };
}

/**
 * Sanitiza en tiempo real la entrada de correo electrónico eliminando espacios.
 */
export function sanitizeEmail(value: string): string {
  return value.replace(/\s+/g, "").slice(0, 100);
}

// ─── 3. VALIDACIÓN DE NÚMERO DE DOCUMENTO ──────────────────────────────────
export const NUMERIC_DOC_TYPES = ["CC", "TI", "CE", "TE", "NIT"];

export function isNumericDocType(docType: string): boolean {
  return NUMERIC_DOC_TYPES.includes((docType || "").toUpperCase());
}

export function validateDocumentNumber(
  value: string,
  docType = "CC",
  isRequired = true
): ValidationResult {
  const trimmed = (value || "").trim();

  if (!trimmed) {
    if (isRequired) {
      return {
        isValid: false,
        error: "El número de documento es obligatorio.",
      };
    }
    return { isValid: true, error: null };
  }

  const numeric = isNumericDocType(docType);

  if (numeric) {
    // Si contiene letras o símbolos
    if (!/^\d+$/.test(trimmed)) {
      return {
        isValid: false,
        error:
          "El número de documento debe contener únicamente dígitos numéricos (entre 6 y 10 dígitos) sin puntos, comas ni espacios.",
      };
    }

    // Validación de longitud colombiana (Cédula 6 a 10 dígitos, TI / CE hasta 12)
    const maxLen = docType.toUpperCase() === "CC" ? 10 : 12;
    if (trimmed.length < 6 || trimmed.length > maxLen) {
      return {
        isValid: false,
        error: `El número de documento debe contener únicamente dígitos numéricos (entre 6 y ${maxLen} dígitos) sin puntos, comas ni espacios.`,
      };
    }
  } else {
    // Alfanumérico (Pasaporte, PEP, etc.)
    if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
      return {
        isValid: false,
        error:
          "El número de documento debe contener únicamente caracteres alfanuméricos (entre 6 y 15 caracteres) sin símbolos ni espacios.",
      };
    }

    if (trimmed.length < 6 || trimmed.length > 15) {
      return {
        isValid: false,
        error:
          "El número de documento debe contener entre 6 y 15 caracteres alfanuméricos.",
      };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Sanitiza la entrada de documento según el tipo seleccionado.
 */
export function sanitizeDocumentNumber(
  value: string,
  docType = "CC"
): string {
  if (isNumericDocType(docType)) {
    const maxLen = docType.toUpperCase() === "CC" ? 10 : 12;
    return value.replace(/\D/g, "").slice(0, maxLen);
  }
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 15);
}

// ─── 4. VALIDACIÓN DE TELÉFONO CELULAR ──────────────────────────────────────
export function validatePhoneNumber(
  value: string,
  country = "Colombia",
  isRequired = true
): ValidationResult {
  const raw = value || "";
  const trimmed = raw.replace(/\s+/g, "");

  if (!trimmed) {
    if (isRequired) {
      return {
        isValid: false,
        error: "El teléfono celular es obligatorio.",
      };
    }
    return { isValid: true, error: null };
  }

  // Verificar que contenga únicamente dígitos numéricos
  if (!/^\d+$/.test(trimmed)) {
    return {
      isValid: false,
      error: "Ingresa un número de teléfono celular válido (solo dígitos numéricos, 10 dígitos).",
    };
  }

  const isColombia = (country || "").toLowerCase() === "colombia";

  if (isColombia) {
    // Celular en Colombia: exactamente 10 dígitos comenzando por 3 (ej. 3001234567)
    if (!/^3\d{9}$/.test(trimmed)) {
      return {
        isValid: false,
        error: "Ingresa un número de teléfono celular válido (solo dígitos numéricos, 10 dígitos).",
      };
    }
  } else {
    // Internacional: entre 7 y 15 dígitos numéricos
    if (trimmed.length < 7 || trimmed.length > 15) {
      return {
        isValid: false,
        error: "Ingresa un número de teléfono celular válido (entre 7 y 15 dígitos).",
      };
    }
  }

  return { isValid: true, error: null };
}

export function sanitizePhoneNumber(value: string, country = "Colombia"): string {
  const digits = (value || "").replace(/\D/g, "");
  const isColombia = (country || "").toLowerCase() === "colombia";
  return isColombia ? digits.slice(0, 10) : digits.slice(0, 15);
}

// ─── 5. VALIDACIÓN DE CONTRASEÑA ───────────────────────────────────────────
export function validatePassword(
  value: string,
  fieldLabel = "Nueva contraseña",
  isRequired = true
): ValidationResult {
  const trimmed = value || "";

  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, error: `${fieldLabel} es obligatoria.` };
    }
    return { isValid: true, error: null };
  }

  if (trimmed.length < 8) {
    return {
      isValid: false,
      error: "La contraseña debe tener al menos 8 caracteres.",
    };
  }

  const hasLetter = /[a-zA-Z]/.test(trimmed);
  const hasNumber = /\d/.test(trimmed);

  if (!hasLetter || !hasNumber) {
    return {
      isValid: false,
      error: "La contraseña debe incluir al menos una letra y un número.",
    };
  }

  return { isValid: true, error: null };
}

export function validatePasswordMatch(
  newPass: string,
  confirmPass: string
): ValidationResult {
  if (!confirmPass) {
    return { isValid: false, error: "Debes confirmar la nueva contraseña." };
  }
  if (newPass !== confirmPass) {
    return { isValid: false, error: "Las contraseñas no coinciden." };
  }
  return { isValid: true, error: null };
}

// ─── 6. ESTILOS VISUALES DINÁMICOS PARA INPUTS ──────────────────────────────
export function getFieldValidationClass(
  isTouched: boolean,
  error?: string | null,
  value?: string,
  isValid?: boolean
): string {
  if (error) {
    return "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 ring-1 ring-rose-400 bg-rose-50/20 text-rose-950 transition-all";
  }
  const isTrulyValid = isValid !== undefined ? isValid : (value !== undefined && value.trim().length > 0);
  if (isTouched && !error && isTrulyValid) {
    return "border-emerald-500/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 ring-1 ring-emerald-400/40 bg-emerald-50/15 transition-all";
  }
  return "border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all";
}
