export type Question = {
  id: number;
  type: "multiple" | "writing" | "speaking" | "listening";
  question: string;
  prompt?: string;
  audio?: string;
  options?: string[];
  correctAnswer?: number;
  difficulty?: number;
  points?: number;
  category: string;
};

export const questionsB1 = [
  {
    id: 1,
    level: "B1",
    skill: "grammar",
    type: "multiple",
    category: "Grammar",
    question: "Which sentence is correct?",
    options: [
      "I have worked here since two years.",
      "I have been working here for two years.",
      "I work here since two years.",
      "I am working here since two years."
    ],
    correctAnswer: 1,
    points: 5
  },
  {
    id: 2,
    level: "B1",
    skill: "grammar",
    type: "multiple",
    category: "Grammar",
    question: "Choose the correct modal verb.",
    options: [
      "You must to finish the report.",
      "You should finish the report.",
      "You should finishing the report.",
      "You should finished the report."
    ],
    correctAnswer: 1,
    points: 5
  },
  {
    id: 3,
    level: "B1",
    skill: "vocabulary",
    type: "multiple",
    category: "Software",
    question: "What does 'update software' mean?",
    options: [
      "Install a newer version",
      "Delete the program",
      "Restart the computer",
      "Disconnect the internet"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 4,
    level: "B1",
    skill: "reading",
    type: "multiple",
    category: "Networks",
    question: "A firewall protects a network by...",
    options: [
      "Blocking unauthorized access",
      "Increasing internet speed",
      "Deleting files",
      "Creating passwords"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 5,
    level: "B1",
    skill: "grammar",
    type: "multiple",
    category: "Grammar",
    question: "Complete the sentence: If I had more time, I ____ English every day.",
    options: [
      "study",
      "would study",
      "studied",
      "will study"
    ],
    correctAnswer: 1,
    points: 5
  },
  {
    id: 6,
    level: "B1",
    skill: "vocabulary",
    type: "multiple",
    category: "Technology",
    question: "What is a browser?",
    options: [
      "A web navigation program",
      "A programming language",
      "A printer",
      "A database"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 7,
    level: "B1",
    skill: "reading",
    type: "multiple",
    category: "Programming",
    question: "What is the purpose of HTML?",
    options: [
      "Create web page structure",
      "Store databases",
      "Run servers",
      "Protect networks"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 8,
    level: "B1",
    skill: "grammar",
    type: "multiple",
    category: "Grammar",
    question: "Choose the correct sentence.",
    options: [
      "They has finished.",
      "They have finished.",
      "They having finished.",
      "They finishs."
    ],
    correctAnswer: 1,
    points: 5
  },
  {
    id: 9,
    level: "B1",
    skill: "vocabulary",
    type: "multiple",
    category: "Networks",
    question: "LAN means...",
    options: [
      "Local Area Network",
      "Large Access Node",
      "Long Application Network",
      "Local Access Number"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 10,
    level: "B1",
    skill: "grammar",
    type: "multiple",
    category: "Grammar",
    question: "She ____ to work before 8 a.m.",
    options: [
      "always goes",
      "always go",
      "goes always",
      "going always"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 11,
    level: "B1",
    skill: "reading",
    type: "multiple",
    category: "Technology",
    question: "Cloud storage allows users to...",
    options: [
      "Save files online",
      "Repair computers",
      "Create hardware",
      "Install Windows"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 12,
    level: "B1",
    skill: "vocabulary",
    type: "multiple",
    category: "Programming",
    question: "What is a variable?",
    options: [
      "A value that can change",
      "A monitor",
      "A browser",
      "A server"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 13,
    level: "B1",
    skill: "grammar",
    type: "multiple",
    category: "Grammar",
    question: "Complete: They ____ working here since 2023.",
    options: [
      "have been",
      "has been",
      "had",
      "were"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 14,
    level: "B1",
    skill: "reading",
    type: "multiple",
    category: "Security",
    question: "Why should passwords be strong?",
    options: [
      "To improve security",
      "To speed up Windows",
      "To reduce RAM",
      "To update software"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 15,
    level: "B1",
    skill: "vocabulary",
    type: "multiple",
    category: "Databases",
    question: "SQL is mainly used for...",
    options: [
      "Managing databases",
      "Editing videos",
      "Playing games",
      "Sending emails"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 16,
    level: "B1",
    skill: "grammar",
    type: "multiple",
    category: "Grammar",
    question: "Choose the correct preposition.",
    options: [
      "Interested in",
      "Interested on",
      "Interested at",
      "Interested with"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 17,
    level: "B1",
    skill: "reading",
    type: "multiple",
    category: "Software",
    question: "Version control helps developers...",
    options: [
      "Track code changes",
      "Print documents",
      "Format disks",
      "Install drivers"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 18,
    level: "B1",
    skill: "grammar",
    type: "multiple",
    category: "Grammar",
    question: "Choose the correct sentence.",
    options: [
      "I haven't seen him yet.",
      "I didn't saw him yet.",
      "I not saw him yet.",
      "I haven't saw him yet."
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 19,
    level: "B1",
    skill: "vocabulary",
    type: "multiple",
    category: "Programming",
    question: "Debugging means...",
    options: [
      "Finding and fixing errors",
      "Installing Windows",
      "Formatting disks",
      "Creating hardware"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 20,
    level: "B1",
    skill: "reading",
    type: "multiple",
    category: "Technology",
    question: "An operating system manages...",
    options: [
      "Computer resources",
      "The internet only",
      "Printers only",
      "Databases only"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 100,
    level: "B1",
    type: "writing",
    question: "Describe your daily routine.",
    prompt: "Write 50 words.",
    difficulty: 3,
    category: "Writing"
  },
  {
    id: 101,
    level: "B1",
    type: "writing",
    question: "Describe your daily routine.",
    prompt: "Write 50 words.",
    difficulty: 3,
    category: "Writing"
  }
];

export default questionsB1;

export const getLevelFromScore = (
  score: number
): {
  level: string;
  status: string;
  description: string;
  message: string;
  canAdvance: boolean;
} => {
  if (score >= 95)
    return {
      level: 'B1',
      status: 'Mastered',
      description: 'Excellent Performance',
      message: 'Congratulations! B2 has been unlocked.',
      canAdvance: true,
    };

  if (score >= 80)
    return {
      level: 'B1',
      status: 'Competent',
      description: 'Good Performance',
      message: 'You have a solid understanding of B1.',
      canAdvance: false,
    };

  if (score >= 50)
    return {
      level: 'B1',
      status: 'Developing',
      description: 'Basic Understanding',
      message: 'You passed B1, but more practice is recommended.',
      canAdvance: false,
    };

  return {
    level: 'B1',
    status: 'Failed',
    description: 'Not Passed',
    message: 'You need more practice with B1.',
    canAdvance: false,
  };
};
