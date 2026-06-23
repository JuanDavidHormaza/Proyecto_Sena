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
  // Easy - Vocabulario Técnico (difficulty 2)
  {
    id: 1,
    type: 'multiple',
    question: 'The part of a system where users interact, such as a screen or display, is called an:',
    options: ['Output', 'Interface', 'Display', 'Panel'],
    correctAnswer: 1,
    difficulty: 2,
    category: 'UI Design',
  },
  {
    id: 2,
    type: 'multiple',
    question: 'The system where applications run or where users interact with software is called a:',
    options: ['Server', 'Network', 'Platform', 'Environment'],
    correctAnswer: 2,
    difficulty: 3,
    category: 'Tools',
  },
  {
    id: 3,
    type: 'multiple',
    question: 'A sudden failure when a program unexpectedly stops working is called a:',
    options: ['Bug', 'Crash', 'Error', 'Freeze'],
    correctAnswer: 1,
    difficulty: 2,
    category: 'Software QA',
  },
  {
    id: 4,
    type: 'multiple',
    question: 'A piece of work or activity that needs to be completed is called a:',
    options: ['Sprint', 'Task', 'Issue', 'Step'],
    correctAnswer: 1,
    difficulty: 1,
    category: 'Project Management',
  },
  {
    id: 5,
    type: 'multiple',
    question: 'A text data type used to store characters and words is called a:',
    options: ['Char', 'Text', 'String', 'Word'],
    correctAnswer: 2,
    difficulty: 2,
    category: 'Programming',
  },
  {
    id: 6,
    type: 'multiple',
    question: 'A number data type used to store whole numbers without decimals is called an:',
    options: ['Float', 'Double', 'Number', 'Integer'],
    correctAnswer: 3,
    difficulty: 2,
    category: 'Programming',
  },
  {
    id: 7,
    type: 'multiple',
    question: 'A data type that represents a binary value that can only be true or false is called a:',
    options: ['Bit', 'Flag', 'Boolean', 'Binary'],
    correctAnswer: 2,
    difficulty: 2,
    category: 'Programming',
  },
  {
    id: 8,
    type: 'multiple',
    question: 'A single database entry or record in a table is called a:',
    options: ['Column', 'Field', 'Row', 'Cell'],
    correctAnswer: 2,
    difficulty: 3,
    category: 'Databases',
  },
  {
    id: 9,
    type: 'multiple',
    question: 'A data field that stores a specific type of information in a table is called a:',
    options: ['Row', 'Column', 'Entry', 'Index'],
    correctAnswer: 1,
    difficulty: 3,
    category: 'Databases',
  },
];
export const getDifficultyLevel = (
  difficulty: number
): 'Easy' | 'Medium' | 'Hard' => {
  if (difficulty <= 2) return 'Easy';
  if (difficulty <= 3) return 'Medium';
  return 'Hard';
};

export interface LevelResult {
  level: string;
  status: 'Failed' | 'Developing' | 'Competent' | 'Mastered';
  description: string;
  message: string;
  passed: boolean;
  canAdvance: boolean;
}

export const getLevelFromScore = (score: number): LevelResult => {

  if (score < 50) {
    return {
      level: 'A1',
      status: 'Failed',
      description: 'Not Passed',
      message: 'You need more practice with basic English concepts.',
      passed: false,
      canAdvance: false,
    };
  }

  if (score < 80) {
    return {
      level: 'A1',
      status: 'Developing',
      description: 'Basic Understanding',
      message: 'You passed the level, but more practice is recommended.',
      passed: true,
      canAdvance: false,
    };
  }

  if (score < 95) {
    return {
      level: 'A1',
      status: 'Competent',
      description: 'Good Performance',
      message: 'You have a solid understanding of A1 content.',
      passed: true,
      canAdvance: false,
    };
  }

  return {
    level: 'A1',
    status: 'Mastered',
    description: 'Excellent Performance',
    message: 'Congratulations! A2 has been unlocked.',
    passed: true,
    canAdvance: true,
  };
};
export const getRandomQuestions = (count: number = 9): Question[] => {
  return [...questions]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
};

