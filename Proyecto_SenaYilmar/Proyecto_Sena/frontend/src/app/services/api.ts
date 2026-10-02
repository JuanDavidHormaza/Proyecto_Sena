// ─── Configuracion Base de la API ────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
  status: 'active' | 'inactive';
  permissions: UserPermissions;
  docType?: string;
  program?: string | null;
  docNum?: string;
  phoneNum?: number;
  firstName?: string;
  lastName?: string;
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
  program?: string;
  role_id?: 'SUPERADMIN' | 'ADMIN' | 'APRENDIZ' | 'MONITOR' | 'INSTRUCTOR';
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

class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

function getAuthHeaders(includeJsonContentType = true): HeadersInit {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const headers: HeadersInit = {};

  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function post<T = any>(path: string, body: BodyInit): Promise<T> {
  const isFormData = body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(!isFormData),
    body,
  });

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error de conexion' }));
    console.log("HANDLE RESPONSE ERROR:", error, "STATUS:", response.status);
    
    // Solo intentar refresh si hay token guardado (no en login)
    if (response.status === 401 && localStorage.getItem('accessToken')) {
      const refreshed = await refreshToken();
      if (!refreshed) {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    
    throw new ApiError(error.error || error.detail || 'Error en la peticion', response.status);
  }

  return response.json();
}
 

async function refreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem('refreshToken');
  if (!refresh) return false;
  
  try {
    const response = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    localStorage.setItem('accessToken', data.access);
    return true;
  } catch {
    return false;
  }
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  
  return handleResponse<AuthResponse>(response);
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  return handleResponse<AuthResponse>(response);
}

export async function getMe(): Promise<ApiUser> {
  const response = await fetch(`${API_BASE}/auth/me/`, {
    headers: getAuthHeaders(),
  });
  
  return handleResponse<ApiUser>(response);
}

// ─── Acceso privilegiado sin JWT (sesión) ─────────────────────────────

export async function privilegedLogin(credentials: LoginCredentials): Promise<{ user: ApiUser }> {
  const response = await fetch(`${API_BASE}/auth/privileged-login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  // Devuelve un objeto: { user }
  return handleResponse<{ user: ApiUser }>(response);
}

export async function privilegedMe(): Promise<{ user: ApiUser }> {
  const response = await fetch(`${API_BASE}/auth/privileged-me/`, {
    method: 'GET',
  });

  return handleResponse<{ user: ApiUser }>(response);
}


// ─── Users API ───────────────────────────────────────────────────────────────

export async function getUsers(role?: string): Promise<ApiUser[]> {
  const url = role ? `${API_BASE}/users/?role=${role}` : `${API_BASE}/users/`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  
  return handleResponse<ApiUser[]>(response);
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
  const response = await fetch(`${API_BASE}/users/${userId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });
  
  return handleResponse<ApiUser>(response);
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/users/${userId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new ApiError('Error al eliminar usuario', response.status);
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
}): Promise<ApiDocument[]> {
  const query = new URLSearchParams();
  if (params?.subject && params.subject !== 'all') query.append('subject', params.subject);
  if (params?.level && params.level !== 'all') query.append('level', params.level);
  if (params?.competence && params.competence !== 'all') query.append('competence', params.competence);
  if (params?.search && params.search.trim()) query.append('search', params.search.trim());

  const qs = query.toString();
  const url = `${API_BASE}/dictionary/${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  
  return handleResponse<ApiDocument[]>(response);
}

export async function createDocument(docData: Partial<ApiDocument>): Promise<ApiDocument> {
  const response = await fetch(`${API_BASE}/dictionary/`, {
    method: 'POST',
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

  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
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

export async function getTestResults(userId?: string): Promise<ApiTestResult[]> {
  const url = userId ? `${API_BASE}/results/?user_id=${userId}` : `${API_BASE}/results/`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  
  return handleResponse<ApiTestResult[]>(response);
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
  const response = await fetch(`${API_BASE}/ranking/`, {
    headers: getAuthHeaders(),
  });

  return handleResponse<any[]>(response);
}
export async function requestLogin(
  email: string,
  password: string
): Promise<{ mfa_required: boolean; email: string }> {
  const response = await fetch(`${API_BASE}/auth/login/`, {
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
  const response = await fetch(`${API_BASE}/auth/verify-otp/`, {
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
  const response = await fetch(`${API_BASE}/auth/resend-otp/`, {
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
  const response = await fetch(`${API_BASE}/auth/register-send-otp/`, {
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
  const response = await fetch(`${API_BASE}/auth/register-verify-otp/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  return handleResponse<AuthResponse>(response);
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
  return `/api/media/${defaultBucket}/${pureKey}`;
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

  const token = localStorage.getItem('accessToken');
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

  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/exam/evaluate-speaking/`, {
    method: 'POST',
    headers,
    body: formData,
  });

  return handleResponse<SpeakingEvaluationResponse>(response);
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

export async function startAdaptiveExam(userId?: string | number): Promise<AdaptiveExamStartResponse> {
  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/exam/start/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: userId }),
  });

  return handleResponse<AdaptiveExamStartResponse>(response);
}

export async function getAdaptiveBank(params?: { level?: string; competence?: string }): Promise<{
  total: number;
  level: string;
  competence: string;
  questions: any[];
}> {
  const query = new URLSearchParams();
  if (params?.level && params.level !== 'all') query.append('level', params.level);
  if (params?.competence && params.competence !== 'all') query.append('competence', params.competence);

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
  deleteDocument,
  getTestResults,
  createTestResult,
  addFeedback,
  getRanking,
  post,
  uploadSpeakingAudio,
  evaluateSpeakingAudio,
  uploadMediaFile,
  generateExamTTS,
  resolveMediaUrl,
  getMediaUrl,
  startAdaptiveExam,
  getAdaptiveBank,
  evaluateAdaptiveStep,
};

export default api;
