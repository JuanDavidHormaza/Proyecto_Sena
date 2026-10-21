/**
 * Política de sesión de Worklex (SENA).
 * - Todo el estado de sesión vive en `sessionStorage` (se destruye al cerrar pestaña/ventana/incógnito).
 * - Auto-logout tras 15 minutos sin actividad (`last_activity_time`).
 * - Rechazo inmediato de tokens JWT cuyo campo `exp` ya venció.
 *
 * Este módulo NO depende de otros módulos de la app para evitar importaciones circulares.
 */

export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos
export const SESSION_WARNING_MS = 2 * 60 * 1000; // aviso 2 minutos antes
export const LAST_ACTIVITY_KEY = 'last_activity_time';

export const IDLE_LOGOUT_MESSAGE = 'Tu sesión expiró por inactividad por motivos de seguridad.';
export const TOKEN_EXPIRED_MESSAGE = 'Tu sesión expiró. Inicia sesión nuevamente por motivos de seguridad.';

/** Claves de sesión que antes se guardaban (de forma persistente) en localStorage. */
const LEGACY_LOCAL_STORAGE_KEYS = [
  'accessToken', 'access_token', 'refreshToken', 'refresh_token', 'token',
  'user', 'user_data', 'userData', 'userId', 'userName', 'userRole', 'userEmail', 'userAvatar',
  'userPermissions', 'userProgram', 'userEnrolledPrograms', 'roles',
  'active_role', 'activeRole', 'active_context', 'is_dual_role', 'isDualRole',
  'activeFichaId', 'activeProgram',
  'quizScore', 'quizLevel', 'totalQuestions', 'correctAnswers', 'quizDuration', 'quizAnswers',
  'lastTestResult', 'lastTestSummary', 'studyStreak', 'studyLastActiveDate',
  'worklex_last_active', 'last_activity_time', 'auth_sync_event',
  'reset_email', 'recover_email', 'resetEmail', 'recover_step',
];

/**
 * Elimina de localStorage cualquier residuo de sesiones antiguas (migración a sessionStorage).
 * Las preferencias de accesibilidad / UI no se tocan.
 */
export function purgeLegacyLocalStorageSession(): void {
  if (typeof window === 'undefined') return;
  LEGACY_LOCAL_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  });
}

/** Decodifica el payload de un JWT (sin verificar firma; la verificación real es del backend). */
export function decodeJwtPayload(token: string | null | undefined): Record<string, any> | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** true si el token trae `exp` y `Date.now() >= exp * 1000`. */
export function isTokenExpired(token: string | null | undefined): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return Date.now() >= payload.exp * 1000;
}

/** Marca de actividad más reciente (ms epoch) o 0 si no existe. */
export function getLastActivityTime(): number {
  try {
    const raw = sessionStorage.getItem(LAST_ACTIVITY_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Registra actividad del usuario ahora mismo. */
export function touchActivity(): void {
  try {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch {
    // ignore
  }
}

/** true si hay marca de actividad y ya pasaron 15 minutos desde ella. */
export function isSessionInactive(now: number = Date.now()): boolean {
  const last = getLastActivityTime();
  if (!last) return false;
  return now - last >= SESSION_IDLE_TIMEOUT_MS;
}

/** Lee el token de acceso desde sessionStorage (sin validar). */
export function readRawAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      sessionStorage.getItem('accessToken') ||
      sessionStorage.getItem('access_token') ||
      sessionStorage.getItem('token')
    );
  } catch {
    return null;
  }
}

/** Destruye por completo la sesión del lado del cliente. */
export function destroyClientSession(): void {
  try {
    sessionStorage.clear();
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  } catch {
    // ignore
  }
  purgeLegacyLocalStorageSession();
}

/**
 * Devuelve el token de acceso SOLO si la sesión es válida:
 * - existe token,
 * - su `exp` no ha vencido,
 * - no se superaron 15 minutos de inactividad.
 * En caso contrario destruye la sesión y devuelve null.
 */
export function getValidAccessToken(): string | null {
  const token = readRawAccessToken();
  if (!token) return null;
  if (isTokenExpired(token) || isSessionInactive()) {
    destroyClientSession();
    return null;
  }
  return token;
}
