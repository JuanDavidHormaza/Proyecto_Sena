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
  // Campos PERSONS del modelo de BD
  docType?: string;
  docNum?: string;
  firstName?: string;
  lastName?: string;
  phoneNum?: string;
  title?: string;
  country?: string;
  program?: string;
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

// Mock users database
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Administrador SENA',
    email: 'admin@gmail.com',
    password: '123',
    role: 'admin',
    permissions: getDefaultPermissions('admin'),
    status: 'active',
    createdAt: '2026-01-01',
  },
  {
    id: '2',
    name: 'Carlos Martinez',
    email: 'docente@gmail.com',
    password: '123',
    role: 'teacher',
    program: 'Desarrollo de Software',
    permissions: getDefaultPermissions('teacher'),
    status: 'active',
    createdAt: '2026-01-15',
  },
  {
    id: '3',
    name: 'Juan David Perez',
    email: 'juan@gmail.com',
    password: '123',
    role: 'student',
    country: 'Colombia',
    program: 'Desarrollo de Software',
    permissions: getDefaultPermissions('student'),
    status: 'active',
    createdAt: '2026-02-01',
  },
  {
    id: '4',
    name: 'Maria Garcia Lopez',
    email: 'maria@gmail.com',
    password: '123',
    role: 'student',
    country: 'Colombia',
    program: 'Analisis de Datos',
    permissions: getDefaultPermissions('student'),
    status: 'active',
    createdAt: '2026-02-05',
  },
  {
    id: '5',
    name: 'Carlos Andres Lopez',
    email: 'carlos@gmail.com',
    password: '123',
    role: 'student',
    country: 'Colombia',
    program: 'Redes y Telecomunicaciones',
    permissions: getDefaultPermissions('student'),
    status: 'inactive',
    createdAt: '2026-02-10',
  },
  {
    id: '6',
    name: 'Ana Sofia Rodriguez',
    email: 'ana@gmail.com',
    password: '123',
    role: 'teacher',
    program: 'Analisis de Datos',
    permissions: {
      ...getDefaultPermissions('teacher'),
      canManageSubjects: true,
    },
    status: 'active',
    createdAt: '2026-02-15',
  },
];

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

// Mock test results
export const mockTestResults: TestResult[] = [
  {
    id: 'r1',
    userId: '3',
    userName: 'Juan David Perez',
    score: 85,
    level: 'B2',
    correctAnswers: 17,
    totalQuestions: 20,
    completedAt: '2026-04-10T10:30:00',
    duration: '8:45',
    answers: [],
  },
  {
    id: 'r2',
    userId: '3',
    userName: 'Juan David Perez',
    score: 70,
    level: 'B1',
    correctAnswers: 14,
    totalQuestions: 20,
    completedAt: '2026-04-05T14:20:00',
    duration: '9:12',
    answers: [],
    feedback: 'Buen progreso Juan. Te recomiendo practicar mas los tiempos verbales condicionales.',
  },
  {
    id: 'r3',
    userId: '4',
    userName: 'Maria Garcia Lopez',
    score: 92,
    level: 'C1',
    correctAnswers: 18,
    totalQuestions: 20,
    completedAt: '2026-04-12T09:15:00',
    duration: '7:30',
    answers: [],
  },
  {
    id: 'r4',
    userId: '5',
    userName: 'Carlos Andres Lopez',
    score: 60,
    level: 'B1',
    correctAnswers: 12,
    totalQuestions: 20,
    completedAt: '2026-04-08T16:45:00',
    duration: '10:15',
    answers: [],
  },
];

// SENA Programs
export const senaPrograms = [
  'Desarrollo de Software',
  'Analisis de Datos',
  'Redes y Telecomunicaciones',
  'Diseño Grafico',
  'Marketing Digital',
  'Contabilidad y Finanzas',
  'Gestion Empresarial',
  'Produccion Multimedia',
  'Seguridad Informatica',
  'Automatizacion Industrial',
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
