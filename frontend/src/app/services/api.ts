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
  passed?: boolean;
  threshold?: number;
  breakdown?: any;
  auto_feedback?: string;
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
    userAnswers?: Array<{
      questionId: number;
      question: string;
      difficulty?: string;
      userAnswer: number;
      correctAnswer: number;
      isCorrect: boolean;
      category: string;
      audioUrl?: string;
      writingAnswer?: string;
      pronunciationEvaluation?: any;
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

export interface ApiTrainingGroup {
  id: string;
  ficha: string;
  program: string;
  teachers: ApiUser[];
  students: ApiUser[];
  createdAt?: string | null;
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
  const token = localStorage.getItem('accessToken');
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

export async function getDocuments(): Promise<ApiDocument[]> {
  const response = await fetch(`${API_BASE}/dictionary/`, {
    headers: getAuthHeaders(),
  });
  
  return handleResponse<ApiDocument[]>(response);
}

export async function createDocument(docData: Partial<ApiDocument> & { subjectId?: string; ficha?: string }): Promise<ApiDocument> {
  // El backend (DigitalDictionary) espera claves en snake_case y el FK
  // de la asignatura bajo la llave "subject". Aqui traducimos lo que
  // envia el formulario del frontend (camelCase) a ese formato.
  
  const payload = {
  word_id: docData.wordId ?? docData.name,

  name: docData.name,

  subject: docData.subjectId,

  
definition: docData.definition,

  synonyms: docData.synonyms,

  image: docData.imageUrl,

  audio: docData.audioUrl,

  video: docData.videoUrl,

  program: docData.program,

  ficha: docData.ficha,
};
console.log("IMAGE =>", payload.image);
console.log("AUDIO =>", payload.audio);
console.log("VIDEO =>", payload.video);
console.log(payload);
  const response = await fetch(`${API_BASE}/dictionary/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
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

// ─── Test Results API ────────────────────────────────────────────────────────

export async function getTestResults(userId?: string): Promise<ApiTestResult[]> {
  const url = userId ? `${API_BASE}/results/?user_id=${userId}` : `${API_BASE}/results/`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  
  return handleResponse<ApiTestResult[]>(response);
}

export async function getGroups(): Promise<ApiTrainingGroup[]> {
  const response = await fetch(`${API_BASE}/groups/`, { headers: getAuthHeaders() });
  return handleResponse<ApiTrainingGroup[]>(response);
}

export async function getAvailableGroupStudents(program: string, groupId?: string): Promise<ApiUser[]> {
  const query = new URLSearchParams({ program });
  if (groupId) query.set('group_id', groupId);
  const response = await fetch(`${API_BASE}/groups/available-students/?${query}`, { headers: getAuthHeaders() });
  return handleResponse<ApiUser[]>(response);
}

export async function getAvailableGroupTeachers(): Promise<ApiUser[]> {
  const response = await fetch(`${API_BASE}/groups/available-teachers/`, { headers: getAuthHeaders() });
  return handleResponse<ApiUser[]>(response);
}

export async function saveGroup(data: { ficha: string; program: string; teacher_ids: string[]; student_ids: string[] }, groupId?: string): Promise<ApiTrainingGroup> {
  const response = await fetch(`${API_BASE}/groups/${groupId ? `${groupId}/` : ''}`, {
    method: groupId ? 'PUT' : 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
  });
  return handleResponse<ApiTrainingGroup>(response);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/groups/${groupId}/`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!response.ok) throw new ApiError('Error al eliminar la ficha', response.status);
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

export async function evaluatePronunciation(
  audioBlob: Blob,
  expectedText: string,
  storagePath?: string,
  level?: string,
): Promise<any> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "response.webm");
  formData.append("expected_text", expectedText);
  if (storagePath) {
    formData.append("storage_path", storagePath);
  }
  if (level) {
    formData.append("level", level);
  }


  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_BASE}/quiz/evaluate-pronunciation/`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  return handleResponse<any>(response);
}

export async function getStudentAudios(userId: string, level?: string): Promise<any> {
  const params = new URLSearchParams({ user_id: userId });
  if (level) params.set("level", level);

  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_BASE}/quiz/student-audios/?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return handleResponse<any>(response);
}

export async function fetchQuizQuestions(level: string, count = 5, program?: string): Promise<any> {
  const token = localStorage.getItem("accessToken");
  const params = new URLSearchParams({ level, count: String(count) });
  // El backend ya resuelve el programa del usuario autenticado si no se
  // envía, pero lo pasamos explícito cuando lo tenemos para asegurar que
  // el quiz siempre use el diccionario del programa correcto.
  if (program) params.set("program", program);
  const response = await fetch(`${API_BASE}/quiz/questions/?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return handleResponse<any>(response);
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
): Promise<{
  mfa_required: boolean;
  email?: string;
  // Cuando el rol es privilegiado (docente/admin/superadmin) el backend
  // devuelve directamente los tokens sin exigir OTP.
  access?: string;
  refresh?: string;
  user?: ApiUser;
}> {
  const response = await fetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(response);
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
  getGroups,
  getAvailableGroupStudents,
  getAvailableGroupTeachers,
  saveGroup,
  deleteGroup,
  createTestResult,
  addFeedback,
  getRanking,
  post,
};

export default api;