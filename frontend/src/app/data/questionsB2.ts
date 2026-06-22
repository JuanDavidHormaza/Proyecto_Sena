export type Question = {
  id: number;
  type: 'multiple' | 'writing' | 'speaking';
  question: string;
  prompt?: string;
  options?: string[];
  correctAnswer?: number;
  difficulty: number;
  category: string;
};


export const questions: Question[] = [
  // Easy - Vocabulario
  {
    id: 1,
    type: 'multiple',
    question: 'What is a sprint in Agile?',
    options: ['A testing tool', 'A short development cycle', 'A bug', 'A deployment process'],
    correctAnswer: 1,
    difficulty: 5,
    category: 'Agile',
  },

];
export const getDifficultyLevel = (
  difficulty: number
): 'Easy' | 'Medium' | 'Hard' => {
  if (difficulty <= 4) return 'Easy';
  if (difficulty <= 7) return 'Medium';
  return 'Hard';
};

export const getLevelFromScore = (score: number): { level: string; description: string; message: string } => {
  if (score >= 91) return { level: 'C2', description: 'Maestría - Dominio completo', message: '¡Perfectamente! Eres prácticamente bilingüe' };
  if (score >= 76) return { level: 'C1', description: 'Avanzado - Muy dominado', message: '¡Muy bien! Dominas muy bien' };
  if (score >= 56) return { level: 'B2', description: 'Intermedio-Alto - Competente', message: '¡Excelente! Nivel competente' };
  if (score >= 36) return { level: 'B1', description: 'Intermedio - Desarrollo', message: '¡Vas bien! Continúa mejorando' };
  if (score >= 21) return { level: 'A2', description: 'Elemental - Bajo', message: 'Buen inicio, sigue practicando' };
  return { level: 'A1', description: 'Principiante - Muy básico', message: 'Necesitas más práctica fundamental' };
};
