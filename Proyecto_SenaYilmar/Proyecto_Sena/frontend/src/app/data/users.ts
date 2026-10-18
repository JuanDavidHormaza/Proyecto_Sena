export type UserRole = 'admin' | 'teacher' | 'student';

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

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  roles?: string[];
  // Campos PERSONS del modelo de BD
  docType?: string;
  docNum?: string;
  firstName?: string;
  lastName?: string;
  phoneNum?: string;
  title?: string;
  country?: string;
  program?: string;
  programs?: Array<{ id?: string | number; name: string; ficha_code?: string }>;
  permissions: UserPermissions;
  status: 'active' | 'inactive';
  createdAt: string;
  avatar?: string;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
}

export interface Document {
  id: string;
  name: string;
  subjectId: string | null;
  subjectName: string;
  program: string;
  uploadedAt: string;
  fileType: string;
  size: string;
  uploadedBy: string;
  // Campos DIGITAL_DICTIONARIES del modelo de BD
  wordId?: string;
  definition?: string;
  synonyms?: string;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  level?: string;
}

export interface TestResult {
  id: string;
  userId: string;
  userName: string;
  studentProgram?: string;
  score: number;
  level: string;
  correctAnswers: number;
  totalQuestions: number;
  answers: {
    questionId: number;
    question: string;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    category: string;
  }[];
  feedback?: string;
  completedAt: string;
  duration?: string;
}

// Default permissions by role
export const getDefaultPermissions = (role: UserRole): UserPermissions => {
  switch (role) {
    case 'admin':
      return {
        canManageUsers: true,
        canManageDocuments: true,
        canViewStatistics: true,
        canGiveFeedback: true,
        canTakeQuiz: false,
        canViewResults: true,
        canManageSubjects: true,
        canConfigureLevels: true,
      };
    case 'teacher':
      return {
        canManageUsers: false,
        canManageDocuments: true,
        canViewStatistics: true,
        canGiveFeedback: true,
        canTakeQuiz: false,
        canViewResults: true,
        canManageSubjects: false,
        canConfigureLevels: false,
      };
    case 'student':
      return {
        canManageUsers: false,
        canManageDocuments: false,
        canViewStatistics: false,
        canGiveFeedback: false,
        canTakeQuiz: true,
        canViewResults: true,
        canManageSubjects: false,
        canConfigureLevels: false,
      };
  }
};

// Mock subjects
export const mockSubjects: Subject[] = [
  {
    id: 'sub1',
    name: 'Ingles Tecnico',
    description: 'Vocabulario y expresiones tecnicas en ingles',
    color: '#39A900',
    createdAt: '2026-01-15',
  },
  {
    id: 'sub2',
    name: 'Gramatica Basica',
    description: 'Fundamentos gramaticales del idioma ingles',
    color: '#1F4E78',
    createdAt: '2026-01-20',
  },
  {
    id: 'sub3',
    name: 'Comprension Lectora',
    description: 'Desarrollo de habilidades de lectura en ingles',
    color: '#D89E00',
    createdAt: '2026-02-01',
  },
  {
    id: 'sub4',
    name: 'Conversacion',
    description: 'Practica de expresion oral en ingles',
    color: '#E21B3C',
    createdAt: '2026-02-10',
  },
];

// Mock users database (empty - loaded dynamically from Django API)
export const mockUsers: User[] = [];

// Mock documents
export const mockDocuments: Document[] = [
  {
    id: 'doc1',
    name: 'Diccionario Basico A1-A2.pdf',
    subjectId: 'sub2',
    subjectName: 'Gramatica Basica',
    program: 'Todos los programas',
    uploadedAt: '2026-04-01',
    fileType: 'PDF',
    size: '2.5 MB',
    uploadedBy: 'Administrador SENA',
  },
  {
    id: 'doc2',
    name: 'Vocabulario Tecnico Software.pdf',
    subjectId: 'sub1',
    subjectName: 'Ingles Tecnico',
    program: 'Desarrollo de Software',
    uploadedAt: '2026-04-05',
    fileType: 'PDF',
    size: '1.8 MB',
    uploadedBy: 'Carlos Martinez',
  },
  {
    id: 'doc3',
    name: 'Lecturas Nivel Intermedio.docx',
    subjectId: 'sub3',
    subjectName: 'Comprension Lectora',
    program: 'Todos los programas',
    uploadedAt: '2026-04-10',
    fileType: 'DOCX',
    size: '3.2 MB',
    uploadedBy: 'Administrador SENA',
  },
  {
    id: 'doc4',
    name: 'Phrasal Verbs Comunes.xlsx',
    subjectId: null,
    subjectName: 'Sin asignar',
    program: 'Todos los programas',
    uploadedAt: '2026-04-12',
    fileType: 'XLSX',
    size: '890 KB',
    uploadedBy: 'Ana Sofia Rodriguez',
  },
];

// Mock test results (empty - loaded dynamically from Django API)
export const mockTestResults: TestResult[] = [];

// SENA Programs
export const senaPrograms = [
  'ADSO (Análisis y Desarrollo de Software)',
  'Análisis de Datos (Programación para Analítica de Datos)',
  'Mecánica Industrial',
  'Redes y Telecomunicaciones',
  'Producción Multimedia',
  'Seguridad Informática',
  'Automatización Industrial',
  'Gestión Empresarial',
  'Diseño Gráfico',
];

// Helper functions
export const authenticateUser = (email: string, password: string): User | null => {
  const user = mockUsers.find(u => u.email === email && u.password === password && u.status === 'active');
  return user || null;
};

export const getUsersByRole = (role: UserRole): User[] => {
  return mockUsers.filter(u => u.role === role);
};

export const getTestResultsByUser = (userId: string): TestResult[] => {
  return mockTestResults.filter(r => r.userId === userId);
};

export const getDocumentsBySubject = (subjectId: string): Document[] => {
  return mockDocuments.filter(d => d.subjectId === subjectId);
};

export const getSubjectById = (subjectId: string): Subject | undefined => {
  return mockSubjects.find(s => s.id === subjectId);
};
