import {
  getValidAccessToken,
  isSessionInactive,
  purgeLegacyLocalStorageSession,
  readRawAccessToken,
} from '../utils/sessionManager';

const API_BASE = (() => {
  if (typeof window !== 'undefined') {
    // Si corre en Vite (5173) o Nginx (80/443/custom), usar ruta relativa '/api' para evitar fallos de CORS y accesos móviles
    return '/api';
  }
  return import.meta.env.VITE_API_URL || '/api';
})();

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface AuthResponse {
  access: string;
  refresh: string;
  user: ApiUser;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student';
  active_role?: string;
  activeRole?: string;
  roles?: string[];
  is_dual_role?: boolean;
  isDualRole?: boolean;
  is_special_case?: boolean;
  isSpecialCase?: boolean;
  active_context?: {
    role: string;
    ficha_id?: string | number;
    ficha_code?: string;
    program_name?: string;
    is_active?: boolean;
  };
  available_contexts?: Array<{
    role: string;
    ficha_id?: string | number;
    ficha_code?: string;
    program_name?: string;
    is_active?: boolean;
  }>;
  programs?: Array<{
    id?: string | number;
    name: string;
    ficha_code?: string;
  }>;
  ficha?: {
    codigo?: string;
    programa?: string;
  };
  status: 'active' | 'inactive';
  permissions: UserPermissions;
  docType?: string;
  program?: string | null;
  enrolledPrograms?: string[];
  availableRoles?: string[];
  docNum?: string;
  phoneNum?: string | number;
  country?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  createdAt?: string;
}

export interface UserPermissions {
  canManageUsers: boolean;
  canManageDocuments: boolean;
  canViewStatistics: boolean;
  canGiveFeedback: boolean;
  canTakeQuiz: boolean;
  canViewResults: boolean;
  canManageSubjects: boolean;
  canConfigureLevels: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  doc_type: string;
  doc_num: string;
  first_name: string;
  last_name: string;
  phone_num?: number;
  country?: string;
  program?: string;
  role_id?: 'SUPERADMIN' | 'ADMIN' | 'APRENDIZ' | 'MONITOR' | 'INSTRUCTOR';
  is_alternate_program?: boolean;
  accepted_terms?: boolean;
}

export interface ApiSubject {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string | null;
}

export interface ApiDocument {
  id: string;
  name: string;
  subjectId: string | null;
  subjectName: string;
  program: string;
  uploadedAt: string | null;
  fileType: string;
  size: string;
  uploadedBy: string;
  wordId?: string;
  definition?: string;
  synonyms?: string;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  level?: string;
  competence?: string;
}

export interface ApiTestResult {
  id: string;
  userId: string;
  userName: string;
  studentProgram?: string | null;
  student_program?: string | null;
  program?: string | null;
  ficha?: string | null;
  score: number;
  level: string;
  correctAnswers: number;
  totalQuestions: number;
  feedback?: string;
  duration?: string;
  completedAt: string;
  process?: {
    answers?: Array<{
      questionId: number;
      question: string;
      userAnswer: number;
      correctAnswer: number;
      isCorrect: boolean;
      category: string;
    }>;
    writingAnswers?: Array<{
      questionId: number;
      question: string;
      writingAnswer: string;
      category: string;
    }>;
    speakingAnswers?: Array<{
      questionId: number;
      question: string;
      audioUrl: string;
      category: string;
    }>;
  };
  answers: Array<{
    questionId: number;
    question: string;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    category: string;
  }>;
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  data: any;
  detail: string;
  error: string;
  response: { data: any; status: number };

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
    this.data = data;
    this.detail = (data && (data.detail || data.error || data.message)) || message;
    this.error = (data && (data.error || data.detail || data.message)) || message;
    this.response = { data: data || { detail: message, error: message }, status };
  }
}

/**
 * Purga total de tokens, identificadores de usuario y estado de sesión.
 * Elimina residuos de localStorage, sessionStorage y cookies de autenticación
 * para evitar mezclas o retención de perfiles entre cuentas diferentes en el mismo navegador.
 */
export function clearAllTokens(): void {
  try {
    const authKeys = [
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'token',
      'user',
      'user_data',
      'userData',
      'userId',
      'userName',
      'userRole',
      'userEmail',
      'userAvatar',
      'userPermissions',
      'userProgram',
      'userEnrolledPrograms',
      'quizScore',
      'quizLevel',
      'totalQuestions',
      'correctAnswers',
      'quizDuration',
      'quizAnswers',
      'lastTestResult',
      'lastTestSummary',
      'studyStreak',
      'studyLastActiveDate',
      'worklex_last_active',
      'last_activity_time',
      'reset_email',
      'recover_email',
      'resetEmail',
      'recover_step',
    ];

    // Residuos heredados de versiones anteriores que guardaban la sesión en localStorage
    authKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    });
    purgeLegacyLocalStorageSession();

    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }

    if (typeof document !== 'undefined' && document.cookie) {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
        }
      }
    }
  } catch (err) {
    console.error('Error al purgar tokens y almacenamiento:', err);
  }
}

/**
 * Devuelve el token de acceso solo si la sesión es válida (JWT sin vencer y < 20 min de inactividad).
 * Si la sesión venció, la destruye y redirige a /login con el motivo correspondiente.
 */
function getAccessTokenOrExpire(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = readRawAccessToken();
  if (!raw) return null;

  const inactive = isSessionInactive();
  const valid = getValidAccessToken();
  if (valid) return valid;

  clearAllTokens();
  const reason = inactive ? 'idle_timeout' : 'session_expired';
  if (window.location.pathname !== '/login') {
    window.location.href = `/login?reason=${reason}`;
  }
  return null;
}

function getAuthHeaders(includeJsonContentType = true): HeadersInit {
  const token = typeof window !== 'undefined'
    ? getAccessTokenOrExpire()
    : null;
  const headers: HeadersInit = {};

  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

function extractErrorMessage(data: any, status: number): string {
  if (data) {
    if (typeof data === 'string' && data.trim()) return data;
    if (data.error && typeof data.error === 'string' && data.error.trim()) return data.error;
    if (data.detail && typeof data.detail === 'string' && data.detail.trim()) return data.detail;
    if (data.message && typeof data.message === 'string' && data.message.trim()) return data.message;

    // DRF non_field_errors
    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
      return String(data.non_field_errors[0]);
    }

    // DRF field validation errors (e.g. { email: ["..."], password: ["..."] })
    if (typeof data === 'object' && !Array.isArray(data)) {
      const keys = Object.keys(data);
      if (keys.length > 0) {
        const firstKey = keys[0];
        const val = data[firstKey];
        if (Array.isArray(val) && val.length > 0) {
          const fieldNames: Record<string, string> = {
            email: 'Correo electrónico',
            password: 'Contraseña',
            first_name: 'Nombre',
            last_name: 'Apellidos',
            doc_num: 'Número de documento',
            doc_type: 'Tipo de documento',
            phone_num: 'Teléfono',
            country: 'País',
          };
          const fieldName = fieldNames[firstKey] || firstKey;
          return `${fieldName}: ${val[0]}`;
        }
        if (typeof val === 'string') {
          return `${firstKey}: ${val}`;
        }
      }
    }
  }

  // Fallback según código de estado HTTP
  switch (status) {
    case 400:
      return 'Datos de solicitud inválidos. Por favor verifica la información ingresada.';
    case 401:
      return 'Credenciales incorrectas o sesión expirada.';
    case 403:
      return 'Acceso denegado o permisos insuficientes.';
    case 404:
      return 'El recurso solicitado no fue encontrado en el servidor.';
    case 409:
      return 'Conflicto: El registro ya existe en el sistema.';
    case 429:
      return 'Demasiadas solicitudes. Por favor espera unos momentos antes de reintentar.';
    case 502:
    case 503:
    case 504:
      return 'El servicio no está disponible temporalmente. Intente nuevamente en unos segundos.';
    default:
      if (status >= 500) {
        return 'Error interno del servidor. Por favor contacta al soporte técnico.';
      }
      return 'Error al procesar la solicitud.';
  }
}

export async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err: any) {
    console.error('Error de red al consultar API:', err);
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifica que los servicios estén activos y tu conexión de red.',
      0
    );
  }
}

export async function get<T = any>(path: string, options?: { headers?: HeadersInit }): Promise<T> {
  const token = typeof window !== 'undefined'
    ? (sessionStorage.getItem('token') ||
       sessionStorage.getItem('accessToken') ||
       sessionStorage.getItem('access_token') ||
       getAccessTokenOrExpire())
    : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options?.headers || {}),
  };

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const response = await safeFetch(`${API_BASE}${cleanPath}`, {
    method: 'GET',
    headers,
  });

  return handleResponse<T>(response);
}

export async function post<T = any>(path: string, body: BodyInit): Promise<T> {
  const isFormData = body instanceof FormData;
  const response = await safeFetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(!isFormData),
    body,
  });

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let rawError: any = null;
    try {
      rawError = await response.json();
    } catch {
      rawError = null;
    }

    const message = extractErrorMessage(rawError, response.status);

    // Detección de rutas públicas y llamadas de comprobación de privilegios / sesión
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const isPublicRoute = pathname === '/' || pathname === '/login' || pathname === '/register' || pathname === '/recover' || pathname.startsWith('/reset-password');
    const isPrivilegedOrAuthProbe = response.url && (
      response.url.includes('/auth/privileged-me') ||
      response.url.includes('/auth/privileged-login') ||
      response.url.includes('/auth/me')
    );

    // Si el status es 401 en llamadas de comprobación de privilegios mientras el usuario está en rutas públicas (/, /login, /register),
    // no arrojar console.warn ni alertas innecesarias
    const suppressLog = response.status === 401 && (isPublicRoute || isPrivilegedOrAuthProbe);

    if (!suppressLog) {
      console.warn("API Error Response:", { status: response.status, url: response.url, message, rawError });
    }

    // Solo intentar refresh si hay token guardado y no es un endpoint de login/registro ni una ruta pública
    const isAuthEndpoint = response.url && (
      response.url.includes("/auth/login") ||
      response.url.includes("/auth/register") ||
      response.url.includes("/auth/check-document") ||
      response.url.includes("/auth/verify-otp") ||
      response.url.includes("/auth/privileged-me")
    );
    const hasToken = typeof window !== 'undefined' && Boolean(
      readRawAccessToken()
    );

    if (response.status === 401 && hasToken && !isAuthEndpoint && !isPublicRoute) {
      const refreshed = await refreshToken();
      if (!refreshed) {
        clearAllTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login?reason=session_expired";
        }
      }
    }

    throw new ApiError(message, response.status, rawError);
  }

  return response.json();
}
 

async function refreshToken(): Promise<boolean> {
  const refresh = sessionStorage.getItem('refreshToken');
  if (!refresh) return false;
  
  try {
    const response = await safeFetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    sessionStorage.setItem('accessToken', data.access);
    return true;
  } catch {
    return false;
  }
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await safeFetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  
  return handleResponse<AuthResponse>(response);
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await safeFetch(`${API_BASE}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  return handleResponse<AuthResponse>(response);
}

export async function getMe(): Promise<ApiUser> {
  const token = typeof window !== 'undefined'
    ? getAccessTokenOrExpire()
    : null;

  if (!token) {
    throw new ApiError('No hay sesión activa', 401);
  }

  const response = await safeFetch(`${API_BASE}/auth/me/`, {
    headers: getAuthHeaders(),
  });
  
  return handleResponse<ApiUser>(response);
}

// ─── Acceso privilegiado sin JWT (sesión) ─────────────────────────────

export async function privilegedLogin(credentials: LoginCredentials): Promise<{ user: ApiUser }> {
  const response = await safeFetch(`${API_BASE}/auth/privileged-login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  // Devuelve un objeto: { user }
  return handleResponse<{ user: ApiUser }>(response);
}

export async function privilegedMe(): Promise<{ user: ApiUser } | null> {
  const token = typeof window !== 'undefined'
    ? getAccessTokenOrExpire()
    : null;

  // Si no hay token en el cliente, no ejecutar la llamada para evitar el 401 innecesario
  if (!token) {
    return null;
  }

  try {
    const response = await safeFetch(`${API_BASE}/auth/privileged-me/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (response.status === 401) {
      return null;
    }

    return handleResponse<{ user: ApiUser }>(response);
  } catch (err: any) {
    if (err?.status === 401) {
      return null;
    }
    throw err;
  }
}


// ─── Users API ───────────────────────────────────────────────────────────────

export async function getUsers(roleOrParams?: string | { role?: string; search?: string }): Promise<ApiUser[]> {
  let url = `${API_BASE}/users/`;
  if (typeof roleOrParams === 'string' && roleOrParams) {
    url += `?role=${encodeURIComponent(roleOrParams)}`;
  } else if (roleOrParams && typeof roleOrParams === 'object') {
    const query = new URLSearchParams();
    if (roleOrParams.role && roleOrParams.role !== 'all') query.set('role', roleOrParams.role);
    if (roleOrParams.search) query.set('search', roleOrParams.search);
    const qs = query.toString();
    if (qs) url += `?${qs}`;
  }
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  
  const data = await handleResponse<any>(response);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export async function createUser(userData: Partial<ApiUser> & { password: string }): Promise<ApiUser> {
  const response = await fetch(`${API_BASE}/users/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });
  
  return handleResponse<ApiUser>(response);
}

export async function updateUser(userId: string, userData: Partial<ApiUser>): Promise<ApiUser> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });
  
  if (!response.ok && response.status === 404) {
    const fallbackResponse = await fetch(`${API_BASE}/users/${userId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return handleResponse<ApiUser>(fallbackResponse);
  }

  return handleResponse<ApiUser>(response);
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/users/${userId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  if (response.status === 204) {
    return;
  }

  if (!response.ok) {
    let errorMsg = 'Error al eliminar usuario';
    try {
      const data = await response.json();
      errorMsg = data.detail || data.error || errorMsg;
    } catch {
      // ignore
    }
    throw new ApiError(errorMsg, response.status);
  }
}

export async function toggleUserStatus(userId: string): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/users/${userId}/toggle_status/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  
  return handleResponse<{ status: string }>(response);
}

export async function changeUserRole(userId: string, role: string): Promise<{ role: string }> {
  const response = await fetch(`${API_BASE}/users/${userId}/change_role/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  });
  
  return handleResponse<{ role: string }>(response);
}

// ─── Subjects API ────────────────────────────────────────────────────────────

export async function getSubjects(): Promise<ApiSubject[]> {
  const response = await fetch(`${API_BASE}/subjects/`, {
    headers: getAuthHeaders(),
  });
  
  return handleResponse<ApiSubject[]>(response);
}

export async function createSubject(subjectData: { name: string; description: string; color?: string }): Promise<ApiSubject> {
  const response = await fetch(`${API_BASE}/subjects/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(subjectData),
  });
  
  return handleResponse<ApiSubject>(response);
}

export async function deleteSubject(subjectId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/subjects/${subjectId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new ApiError('Error al eliminar asignatura', response.status);
  }
}

// ─── Documents (Dictionary) API ──────────────────────────────────────────────

export interface MediaUploadResponse {
  file_key: string;
  bucket: string;
  proxy_url: string;
  url: string;
  size: number;
  content_type: string;
}

export async function getDocuments(params?: {
  subject?: string;
  level?: string;
  competence?: string;
  search?: string;
  program?: string;
  fichaId?: string;
}): Promise<ApiDocument[]> {
  const query = new URLSearchParams();
  if (params?.subject && params.subject !== 'all') query.append('subject', params.subject);
  if (params?.level && params.level !== 'all') query.append('level', params.level);
  if (params?.competence && params.competence !== 'all') query.append('competence', params.competence);
  if (params?.search && params.search.trim()) query.append('search', params.search.trim());
  if (params?.program && params.program !== 'all') query.append('program', params.program);
  if (params?.fichaId && params.fichaId !== 'all') query.append('fichaId', params.fichaId);

  const qs = query.toString();
  const url = `${API_BASE}/dictionary/${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  
  return handleResponse<ApiDocument[]>(response);
}

export const getDictionary = getDocuments;

export async function createDocument(docData: Partial<ApiDocument>): Promise<ApiDocument> {
  const response = await fetch(`${API_BASE}/dictionary/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(docData),
  });
  
  return handleResponse<ApiDocument>(response);
}

export async function updateDocument(docId: string, docData: Partial<ApiDocument>): Promise<ApiDocument> {
  const response = await fetch(`${API_BASE}/dictionary/${docId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(docData),
  });
  return handleResponse<ApiDocument>(response);
}

export async function deleteDocument(docId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/dictionary/${docId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new ApiError('Error al eliminar documento', response.status);
  }
}

export async function uploadMediaFile(
  file: File,
  bucket: 'dictionary-images' | 'dictionary-audios' | 'dictionary-videos' | 'exam-submissions' = 'dictionary-images'
): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);

  const token = getAccessTokenOrExpire();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/media/upload/`, {
    method: 'POST',
    headers,
    body: formData,
  });

  return handleResponse<MediaUploadResponse>(response);
}

// ─── Test Results API ────────────────────────────────────────────────────────

export interface AuditedQuestion {
  question_id?: string | number;
  question_text: string;
  type?: string;
  user_answer_text: string;
  correct_answer_text: string;
  is_correct: boolean;
  is_unanswered?: boolean;
  technical_term?: string;
  feedback?: string;
  options?: string[];
  competence?: string;
  category?: string;
  userAnswer?: any;
  correctAnswer?: any;
  question?: string;
  isCorrect?: boolean;
}

export interface StudentTrackingHistoryItem {
  id: string;
  score: number;
  level: string;
  date: string;
  completedAt?: string;
  correctAnswers?: number;
  totalQuestions?: number;
  duration?: string;
  feedback?: string;
  answers?: AuditedQuestion[];
}

export interface StudentTrackingItem {
  id: string;
  full_name: string;
  name: string;
  email: string;
  document_number: string;
  program: string;
  ficha: string;
  has_records: boolean;
  total_tests: number;
  average_score: number;
  last_level: string;
  last_test_date: string | null;
  tests_history: StudentTrackingHistoryItem[];
}

export async function getTeacherStudentsTracking(params?: { ficha?: string; program?: string }): Promise<StudentTrackingItem[]> {
  const query = new URLSearchParams();
  if (params?.ficha && params.ficha !== 'all') query.append('ficha', params.ficha);
  if (params?.program && params.program !== 'all') query.append('program', params.program);
  const qStr = query.toString() ? `?${query.toString()}` : '';

  const response = await fetch(`${API_BASE}/instructor/students-tracking/${qStr}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<StudentTrackingItem[]>(response);
}

export async function getTestResults(userId?: string): Promise<ApiTestResult[]> {
  const url = userId ? `${API_BASE}/results/?user_id=${userId}` : `${API_BASE}/results/`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  
  return handleResponse<ApiTestResult[]>(response);
}

export async function getExamReview(resultId: string | number): Promise<any> {
  const response = await fetch(`${API_BASE}/exam/review/${resultId}/`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<any>(response);
}

export async function getExamHistory(userId?: string): Promise<ApiTestResult[]> {
  try {
    const url = userId ? `${API_BASE}/exam/history/?user_id=${userId}` : `${API_BASE}/exam/history/`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      return await handleResponse<ApiTestResult[]>(response);
    }
  } catch (err) {
    console.warn("Falla en /exam/history/, usando fallback /results/:", err);
  }
  return getTestResults(userId);
}

export async function createTestResult(data: any): Promise<ApiTestResult> {
  const response = await fetch(`${API_BASE}/results/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse<ApiTestResult>(response);
}

export async function addFeedback(resultId: string, feedback: string): Promise<{ feedback: string }> {
  const response = await fetch(`${API_BASE}/results/${resultId}/add_feedback/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ feedback }),
  });
  
  return handleResponse<{ feedback: string }>(response);
}

// ─── Ranking / Leaderboard API ───────────────────────────────────────────────

export async function getRanking(): Promise<any[]> {
  const response = await safeFetch(`${API_BASE}/ranking/`, {
    headers: getAuthHeaders(),
  });

  return handleResponse<any[]>(response);
}
export async function requestLogin(
  email: string,
  password: string
): Promise<{ mfa_required: boolean; email: string }> {
  const response = await safeFetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ mfa_required: boolean; email: string }>(response);
}
 
/**
 * Paso 2 del login: verifica el OTP y devuelve tokens JWT.
 */
export async function verifyLoginOTP(
  email: string,
  code: string
): Promise<AuthResponse> {
  const response = await safeFetch(`${API_BASE}/auth/verify-otp/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  return handleResponse<AuthResponse>(response);
}
 
/**
 * Reenvía el OTP del login.
 */
export async function resendLoginOTP(
  email: string
): Promise<{ message: string }> {
  const response = await safeFetch(`${API_BASE}/auth/resend-otp/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse<{ message: string }>(response);
}
 
// ── MFA Registro ───────────────────────────────────────────────────────────
 
/**
 * Paso 1 del registro: valida datos, verifica dominio de correo y envía OTP.
 * NO crea la cuenta todavía.
 */
export async function registerSendOTP(
  data: RegisterData
): Promise<{ message: string; email: string }> {
  const response = await safeFetch(`${API_BASE}/auth/register-send-otp/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<{ message: string; email: string }>(response);
}
 
/**
 * Paso 2 del registro: verifica el OTP y crea la cuenta definitivamente.
 */
export async function registerVerifyOTP(
  email: string,
  code: string
): Promise<AuthResponse> {
  const response = await safeFetch(`${API_BASE}/auth/register-verify-otp/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  return handleResponse<AuthResponse>(response);
}

export interface CheckDocumentResponse {
  exists: boolean;
  personId?: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNum?: number;
  country?: string;
  docType?: string;
  docNum?: string;
  enrolledPrograms?: string[];
}

export async function checkDocument(docType: string, docNum: string): Promise<CheckDocumentResponse> {
  const response = await safeFetch(`${API_BASE}/auth/check-document/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc_type: docType, doc_num: docNum }),
  });
  return handleResponse<CheckDocumentResponse>(response);
}

export interface CheckEmailResponse {
  exists: boolean;
  email: string;
}

export async function checkEmail(email: string): Promise<CheckEmailResponse> {
  const response = await safeFetch(`${API_BASE}/auth/check-email/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  return handleResponse<CheckEmailResponse>(response);
}

export async function switchProgram(program: string): Promise<ApiUser> {
  const response = await safeFetch(`${API_BASE}/users/switch-program/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ program }),
  });
  return handleResponse<ApiUser>(response);
}

export async function enrollFicha(data: string | { ficha: string; program?: string }): Promise<ApiUser> {
  const payload = typeof data === 'string' ? { ficha: data } : data;
  const response = await safeFetch(`${API_BASE}/users/enroll-ficha/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<ApiUser>(response);
}

export async function switchRole(role?: string): Promise<ApiUser> {
  const response = await safeFetch(`${API_BASE}/users/switch-role/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  });
  return handleResponse<ApiUser>(response);
}

export async function switchContext(data: {
  ficha_id?: string | number;
  role?: string;
  ficha_code?: string;
  program_name?: string;
}): Promise<any> {
  const response = await safeFetch(`${API_BASE}/auth/switch-context/`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<any>(response);
}

// ── Solicitudes de Ficha Alterna (Multi-programa SENA) ─────────────────────

export interface ApiFichaRequest {
  request_id: number;
  user: number;
  person: number;
  learner_name: string;
  learner_email: string;
  current_program: string;
  ficha_code: string;
  program_name: string;
  status: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  admin_notes?: string;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: number | null;
  reviewed_by_name?: string | null;
  assigned_instructor?: number | null;
  assigned_instructor_name?: string | null;
}

export async function getFichaRequests(): Promise<ApiFichaRequest[]> {
  const response = await safeFetch(`${API_BASE}/ficha-requests/`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<ApiFichaRequest[]>(response);
}

export async function createFichaRequest(ficha_code: string, program?: string): Promise<ApiFichaRequest> {
  const response = await safeFetch(`${API_BASE}/ficha-requests/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ficha_code, program, program_name: program }),
  });
  return handleResponse<ApiFichaRequest>(response);
}

export const requestFichaEnrollment = createFichaRequest;

export async function approveFichaRequest(requestId: number, instructorId?: string, notes?: string): Promise<ApiFichaRequest> {
  const response = await safeFetch(`${API_BASE}/ficha-requests/${requestId}/approve/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ instructor_id: instructorId, notes }),
  });
  return handleResponse<ApiFichaRequest>(response);
}

export async function resetPassword(data: {
  email: string;
  otp?: string;
  code?: string;
  new_password?: string;
  newPassword?: string;
  confirm_password?: string;
  confirmPassword?: string;
}): Promise<{ message?: string; detail?: string; success: boolean }> {
  const email = (data.email || '').trim().toLowerCase();
  const otpCode = String(data.otp || data.code || '').trim();
  const newPass = data.new_password || data.newPassword || '';
  const confirmPass = data.confirm_password || data.confirmPassword || '';

  const payload: Record<string, string> = {
    email,
    otp: otpCode,
    code: otpCode,
    new_password: newPass,
    newPassword: newPass,
    password: newPass,
  };
  if (confirmPass) {
    payload.confirm_password = confirmPass;
    payload.confirmPassword = confirmPass;
  }

  const response = await safeFetch(`${API_BASE}/auth/reset-password/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ message?: string; detail?: string; success: boolean }>(response);
}

export async function rejectFichaRequest(requestId: number, notes?: string): Promise<ApiFichaRequest> {
  const response = await safeFetch(`${API_BASE}/ficha-requests/${requestId}/reject/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ notes }),
  });
  return handleResponse<ApiFichaRequest>(response);
}

// ── Tickets de Soporte / PQRS ─────────────────────────────────────────────

export interface ApiSupportTicket {
  ticket_id: number;
  user?: number;
  person?: number;
  user_name: string;
  user_email: string;
  user_role: string;
  subject: string;
  category: 'TECNICA' | 'EXAMEN' | 'CALIFICACION' | 'SUGERENCIA' | 'RECLAMO' | 'OTRO';
  description: string;
  screenshot?: string | null;
  screenshot_url?: string | null;
  status: 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO';
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  resolved_by?: number | null;
  resolved_by_name?: string | null;
}

export async function getSupportTickets(): Promise<ApiSupportTicket[]> {
  const response = await safeFetch(`${API_BASE}/tickets/`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<ApiSupportTicket[]>(response);
}

export async function createSupportTicket(data: {
  subject: string;
  category: string;
  description: string;
  screenshot?: File | null;
} | FormData): Promise<ApiSupportTicket> {
  let headers: HeadersInit;
  let body: BodyInit;

  if (data instanceof FormData) {
    headers = getAuthHeaders(false);
    body = data;
  } else if (data.screenshot) {
    const formData = new FormData();
    formData.append('subject', data.subject);
    formData.append('category', data.category);
    formData.append('description', data.description);
    formData.append('screenshot', data.screenshot);
    headers = getAuthHeaders(false);
    body = formData;
  } else {
    headers = getAuthHeaders(true);
    body = JSON.stringify({
      subject: data.subject,
      category: data.category,
      description: data.description,
    });
  }

  const response = await safeFetch(`${API_BASE}/tickets/`, {
    method: 'POST',
    headers,
    body,
  });
  return handleResponse<ApiSupportTicket>(response);
}

export async function updateSupportTicket(
  ticketId: number,
  data: { status?: string; admin_notes?: string }
): Promise<ApiSupportTicket> {
  const response = await safeFetch(`${API_BASE}/tickets/${ticketId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<ApiSupportTicket>(response);
}

/**
 * Convierte enlaces directos de YouTube o Vimeo a URLs reproducibles en un <iframe> responsivo.
 */
export function getEmbedVideoUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // YouTube watch?v=ID o youtu.be/ID o embed/ID o shorts/ID
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  // Vimeo
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+))/i);
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
  }
  return null;
}

// ─── Exam Multimedia (Speaking & ElevenLabs TTS) ─────────────────────────────

export interface SpeakingUploadResponse {
  audio_url: string;
  file_key: string;
  bucket: string;
  status: string;
}

export interface TTSResponse {
  audio_url: string | null;
  cached: boolean;
  fallback?: string;
  error?: string;
}

export function getMediaUrl(bucket: string, fileKey?: string): string {
  if (!fileKey) return '';

  let clean = fileKey.trim();

  // URLs externas absolutas (CDNs o servicios externos)
  if ((clean.startsWith('http://') || clean.startsWith('https://')) && !clean.includes(':9000/')) {
    return clean;
  }

  // Si contiene referencia a puerto 9000 o MinIO interno, extraer la ruta
  if (clean.includes(':9000/')) {
    const afterPort = clean.split(':9000/')[1] || '';
    clean = afterPort.startsWith('/') ? afterPort : `/${afterPort}`;
  }

  // Quitar prefijos conocidos para normalizar a la clave limpia
  const knownBuckets = ['dictionary-images', 'dictionary-audios', 'dictionary-videos', 'exam-audios', 'exam-submissions'];
  for (const b of knownBuckets) {
    clean = clean.replace(new RegExp(`^/?api/media/${b}/`, 'i'), '');
    clean = clean.replace(new RegExp(`^/?${b}/`, 'i'), '');
  }
  clean = clean.replace(/^\/+/, '');

  return `/api/media/${bucket}/${clean}`;
}

export function resolveMediaUrl(pathOrUrl?: string, defaultBucket: string = 'dictionary-images'): string {
  if (!pathOrUrl) return '';

  let clean = pathOrUrl.trim();

  // URLs externas válidas (ej. CDNs o Unsplash sin puerto 9000)
  if ((clean.startsWith('http://') || clean.startsWith('https://')) && !clean.includes(':9000/')) {
    return clean;
  }

  // Si contiene referencia a puerto 9000 o MinIO interno
  if (clean.includes(':9000/')) {
    const afterPort = clean.split(':9000/')[1] || '';
    clean = afterPort.startsWith('/') ? afterPort : `/${afterPort}`;
  }

  // Rutas que ya apuntan a /api/media/...
  if (clean.startsWith('/api/media/')) {
    return clean;
  }
  if (clean.startsWith('api/media/')) {
    return `/${clean}`;
  }

  // Si viene con bucket conocido
  const knownBuckets = ['dictionary-images', 'dictionary-audios', 'dictionary-videos', 'exam-audios', 'exam-submissions'];
  for (const b of knownBuckets) {
    if (clean.startsWith(`${b}/`)) {
      return `/api/media/${clean}`;
    }
    if (clean.startsWith(`/${b}/`)) {
      return `/api/media${clean}`;
    }
  }

  // Si es solo la clave del archivo (ej. 'input.png' o 'code.mp3')
  const pureKey = clean.replace(/^\/+/, '');
  let bucket = defaultBucket;
  if (pureKey.endsWith('.mp3') || pureKey.endsWith('.wav') || pureKey.endsWith('.ogg')) {
    bucket = 'dictionary-audios';
  } else if (pureKey.endsWith('.mp4') || pureKey.endsWith('.webm')) {
    bucket = 'dictionary-videos';
  } else if (pureKey.endsWith('.png') || pureKey.endsWith('.jpg') || pureKey.endsWith('.jpeg') || pureKey.endsWith('.webp') || pureKey.endsWith('.svg')) {
    bucket = 'dictionary-images';
  }
  return `/api/media/${bucket}/${pureKey}`;
}

export async function uploadSpeakingAudio(
  audioBlob: Blob,
  questionId: number | string,
  level: string,
  userId?: string
): Promise<SpeakingUploadResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, `speaking_q${questionId}.webm`);
  formData.append('question_id', String(questionId));
  formData.append('level', level);
  if (userId) {
    formData.append('user_id', userId);
  }

  const token = getAccessTokenOrExpire();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/exam/speaking/`, {
    method: 'POST',
    headers,
    body: formData,
  });

  return handleResponse<SpeakingUploadResponse>(response);
}

export interface SpeakingEvaluationResponse {
  success: boolean;
  score: number;
  transcription: string;
  target: string;
  spoken_text?: string;
  expected_text?: string;
  ipa?: string;
  is_correct: boolean;
  feedback: string;
  phonetic_tips?: string;
  audio_url?: string;
}

export async function evaluateSpeakingAudio(
  audioBlob: Blob,
  targetWord: string,
  questionId?: number | string,
  level?: string,
  transcript?: string
): Promise<SpeakingEvaluationResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, `speaking_${questionId || 'eval'}.webm`);
  formData.append('target_word', targetWord);
  if (questionId) formData.append('question_id', String(questionId));
  if (level) formData.append('level', level);
  if (transcript) formData.append('transcript', transcript);

  const token = getAccessTokenOrExpire();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${API_BASE}/exam/evaluate-speaking/`, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const result: SpeakingEvaluationResponse = await response.json();
      return result;
    }
  } catch (err) {
    console.warn("Fallo o timeout en evaluación de audio por red:", err);
  }

  // Fallback seguro ante fallo de red o error de servidor: NUNCA aprobar automáticamente
  return {
    success: false,
    score: 0,
    transcription: transcript || "",
    spoken_text: transcript || "",
    target: targetWord,
    expected_text: targetWord,
    ipa: `/${targetWord.toLowerCase()}/`,
    is_correct: false,
    feedback: "No se pudo conectar con el servicio de evaluación de pronunciación. Verifica tu conexión e intenta de nuevo.",
    phonetic_tips: "Verifica que el micrófono funcione correctamente y articula claramente cada término técnico.",
    audio_url: "",
  };
}

export async function generateExamTTS(
  text: string,
  questionId?: number | string
): Promise<TTSResponse> {
  const response = await fetch(`${API_BASE}/exam/tts/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text, question_id: questionId }),
  });

  return handleResponse<TTSResponse>(response);
}

// ─── Motor de Examen Adaptativo Dinámico (Diccionario ADSO) ──────────────────

export interface AdaptiveExamStartResponse {
  session_id: string;
  user_id?: string | number;
  current_level: string;
  unlocked_levels: string[];
  difficulty: number;
  difficulty_tier: string;
  first_question: any;
  dictionary_questions_count: number;
  questions: any[];
  message: string;
}

export async function startAdaptiveExam(userId?: string | number, program?: string): Promise<AdaptiveExamStartResponse> {
  const token = getAccessTokenOrExpire();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/exam/start/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: userId, program }),
  });

  return handleResponse<AdaptiveExamStartResponse>(response);
}

export async function getAdaptiveBank(params?: { level?: string; competence?: string; program?: string }): Promise<{
  total: number;
  level: string;
  competence: string;
  questions: any[];
}> {
  const query = new URLSearchParams();
  if (params?.level && params.level !== 'all') query.append('level', params.level);
  if (params?.competence && params.competence !== 'all') query.append('competence', params.competence);
  if (params?.program && params.program !== 'all') query.append('program', params.program);

  const qs = query.toString();
  const url = `${API_BASE}/exam/adaptive-bank/${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  return handleResponse<{ total: number; level: string; competence: string; questions: any[] }>(response);
}

export async function evaluateAdaptiveStep(
  currentLevel: string,
  answers: any[]
): Promise<{
  action: 'next_question' | 'level_up' | 'exam_completed';
  next_level: string;
  message: string;
  percentage: number;
  passed: boolean;
}> {
  const response = await fetch(`${API_BASE}/exam/evaluate-step/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ current_level: currentLevel, answers }),
  });

  return handleResponse(response);
}

export interface AdminMetrics {
  total_users: number;
  active_users: number;
  distribution?: {
    students: number;
    instructors: number;
    admins: number;
  };
  dictionaries?: number;
  total_dictionaries: number;
  terms?: number;
  total_terms: number;
  competencies?: number;
  competencies_count: number;
  competencies_list?: string[];
  media?: {
    audios: number;
    videos: number;
    images?: number;
  };
}

const emptyAdminMetrics: AdminMetrics = {
  total_users: 0,
  active_users: 0,
  distribution: {
    students: 0,
    instructors: 0,
    admins: 0,
  },
  dictionaries: 0,
  total_dictionaries: 0,
  terms: 0,
  total_terms: 0,
  competencies: 4,
  competencies_count: 4,
  media: {
    audios: 0,
    videos: 0,
    images: 0,
  },
};

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const token = typeof window !== 'undefined'
    ? (sessionStorage.getItem('token') ||
       sessionStorage.getItem('accessToken') ||
       sessionStorage.getItem('access_token') ||
       getAccessTokenOrExpire())
    : null;

  if (!token) {
    // Si no hay sesión activa, retorna métricas vacías seguras sin disparar 401
    return emptyAdminMetrics;
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  try {
    const response = await fetch(`${API_BASE}/admin/metrics/`, {
      headers,
    });
    if (response.ok) {
      const data = await response.json();
      return { ...emptyAdminMetrics, ...data };
    }
    if (response.status === 401 || response.status === 403) {
      console.warn(`[getAdminMetrics] Acceso administrativo no autorizado (${response.status})`);
      return emptyAdminMetrics;
    }

    // Fallback con /admin/dashboard-stats/
    const statsResponse = await fetch(`${API_BASE}/admin/dashboard-stats/`, {
      headers,
    });
    if (statsResponse.ok) {
      const data = await statsResponse.json();
      return { ...emptyAdminMetrics, ...data };
    }
  } catch (err) {
    console.warn('[getAdminMetrics] Error al obtener métricas del servidor:', err);
  }

  return emptyAdminMetrics;
}

export interface ProgramVideo {
  id: number;
  title: string;
  duration: string;
  url: string;
  description: string;
}

export async function getProgramVideos(program?: string): Promise<ProgramVideo[]> {
  const query = program ? `?program=${encodeURIComponent(program)}` : '';
  try {
    const res = await safeFetch(`${API_BASE}/dictionary/videos/${query}`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      return await handleResponse<ProgramVideo[]>(res);
    }
  } catch {
    // fallback
  }

  const progUpper = (program || '').toUpperCase();
  if (progUpper.includes('MECANICA') || progUpper.includes('3520681')) {
    return [
      { id: 1, title: 'Mecanizado CNC y Herramientas Rotativas', duration: '14:30', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', description: 'Operación de tornos, fresadoras y metrología.' },
      { id: 2, title: 'Tribología y Sistemas de Lubricación', duration: '11:15', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', description: 'Reducción de fricción y mantenimiento predictivo industrial.' },
      { id: 3, title: 'Tolerancias Geométricas e ISO', duration: '16:40', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', description: 'Ajustes, holguras y calibración dimensional.' },
    ];
  }
  if (progUpper.includes('MULTI') || progUpper.includes('2554901') || progUpper.includes('DISEÑO')) {
    return [
      { id: 1, title: 'Composición Digital y Animación 2D', duration: '13:50', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', description: 'Principios de animación, keyframes y renderizado vectorial.' },
      { id: 2, title: 'Diseño UI/UX y Prototipado Interactivo', duration: '17:25', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', description: 'Jerarquía visual, wireframes y experiencia de usuario.' },
      { id: 3, title: 'Producción y Masterización Audiovisual', duration: '19:00', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', description: 'Captura, sincronización de sonido y códecs de compresión.' },
    ];
  }
  return [
    { id: 1, title: 'Fundamentos de Desarrollo de Software', duration: '12:45', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', description: 'Introducción al ciclo de vida del software y metodologías ágiles.' },
    { id: 2, title: 'Arquitectura de APIs RESTful y Django', duration: '15:20', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', description: 'Diseño y consumo de servicios backend estructurados.' },
    { id: 3, title: 'Control de Versiones y Flujos Git', duration: '18:10', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', description: 'Gestión de repositorios, ramas y despliegue continuo.' },
  ];
}


export const getAdminDashboardStats = getAdminMetrics;
export const getMetrics = getAdminMetrics;

export interface DayStreakItem {
  day: string;
  day_name: string;
  date: string;
  active: boolean;
  is_today: boolean;
  is_past: boolean;
}

export interface StudyStreak {
  current_streak: number;
  longest_streak: number;
  is_at_risk: boolean;
  practiced_today: boolean;
  has_activity_today: boolean;
  last_activity_date: string | null;
  weekly_activity: DayStreakItem[];
  status: 'active' | 'inactive';
}

export async function getStudyStreak(): Promise<StudyStreak> {
  const response = await fetch(`${API_BASE}/profile/streak/`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<StudyStreak>(response);
}

export async function recordStreakActivity(transaction = 'PRACTICA_VOCABULARIO'): Promise<StudyStreak> {
  const response = await fetch(`${API_BASE}/profile/streak/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ transaction }),
  });
  return handleResponse<StudyStreak>(response);
}

// ─── Export para compatibilidad ──────────────────────────────────────────────

export const api = {
  login,
  register,
  getMe,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  changeUserRole,
  getSubjects,
  createSubject,
  deleteSubject,
  getDocuments,
  createDocument,
  getAdminMetrics,
  getAdminDashboardStats,
  getMetrics,
  getProgramVideos,
  get,
  getStudyStreak,
  recordStreakActivity,
  updateDocument,
  deleteDocument,
  getTestResults,
  getExamHistory,
  createTestResult,
  addFeedback,
  getRanking,
  post,
  enrollFicha,
  switchProgram,
  switchRole,
  uploadSpeakingAudio,
  evaluateSpeakingAudio,
  uploadMediaFile,
  generateExamTTS,
  resolveMediaUrl,
  getMediaUrl,
  startAdaptiveExam,
  getAdaptiveBank,
  evaluateAdaptiveStep,
  getFichaRequests,
  createFichaRequest,
  requestFichaEnrollment,
  approveFichaRequest,
  rejectFichaRequest,
  getSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  getEmbedVideoUrl,
  requestLogin,
  verifyLoginOTP,
  resendLoginOTP,
  registerSendOTP,
  registerVerifyOTP,
  checkDocument,
  checkEmail,
  resetPassword,
};

export default api;
