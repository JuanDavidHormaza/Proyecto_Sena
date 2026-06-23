export const questionsA2 = [
  {
    id: 1,
    level: "A2",
    skill: "grammar",
    type: "multiple",
    category: "Grammar",
    question: "Choose the correct sentence.",
    options: [
      "She don't like coffee.",
      "She doesn't like coffee.",
      "She not like coffee.",
      "She isn't like coffee."
    ],
    correctAnswer: 1,
    points: 5
  },
  {
    id: 2,
    level: "A2",
    skill: "vocabulary",
    type: "multiple",
    category: "Technology",
    question: "What is a keyboard used for?",
    options: [
      "Typing text",
      "Printing documents",
      "Playing music",
      "Scanning files"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 3,
    level: "A2",
    skill: "grammar",
    type: "multiple",
    category: "Grammar",
    question: "Complete: They ____ soccer every weekend.",
    options: ["play", "plays", "playing", "played"],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 4,
    level: "A2",
    skill: "reading",
    type: "multiple",
    category: "Computers",
    question: "What does a computer mouse do?",
    options: [
      "Moves the cursor",
      "Stores files",
      "Prints pages",
      "Creates networks"
    ],
    correctAnswer: 0,
    points: 5
  },
  {
    id: 5,
    level: "A2",
    skill: "vocabulary",
    type: "multiple",
    category: "Internet",
    question: "What is a website?",
    options: [
      "A page on the internet",
      "A printer",
      "A keyboard",
      "A monitor"
    ],
    correctAnswer: 0,
    points: 5
  }
];

export default questionsA2;

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
      message: 'Congratulations! B1 has been unlocked.',
      canAdvance: true,
    };

  if (score >= 80)
    return {
      level: 'A2',
      status: 'Competent',
      description: 'Good Performance',
      message: 'You have a solid understanding of A2.',
      canAdvance: false,
    };

  if (score >= 50)
    return {
      level: 'A2',
      status: 'Developing',
      description: 'Basic Understanding',
      message: 'You passed A2, but more practice is recommended.',
      canAdvance: false,
    };

  return {
    level: 'A2',
    status: 'Failed',
    description: 'Not Passed',
    message: 'You need more practice with A2.',
    canAdvance: false,
  };
};