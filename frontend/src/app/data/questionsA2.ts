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
  },
  {
    id: 6,
    level: "A2",
    skill: "grammar",
    type: "multiple",
    category: "ADSO - Git Workflow",
    question: "Complete: The developer ____ the code changes to GitHub yesterday.",
    options: ["pushed", "push", "pushing", "pushes"],
    correctAnswer: 0,
    points: 5,
  },
  {
    id: 7,
    level: "A2",
    skill: "vocabulary",
    type: "multiple",
    category: "ADSO - Programming",
    question: "A reusable block of code that performs a specific action and returns a value is a:",
    options: ["Function", "Comment", "Pixel", "Monitor"],
    correctAnswer: 0,
    points: 5,
  },
  {
    id: 8,
    level: "A2",
    skill: "reading",
    type: "multiple",
    category: "ADSO - Web APIs",
    question: "Read the message: 'Error 404: Resource Not Found'. What does it mean?",
    options: [
      "The server cannot find the requested URL",
      "The server is completely powered off",
      "The user password was correct",
      "The file was successfully downloaded"
    ],
    correctAnswer: 0,
    points: 5,
  },
  {
    id: 9,
    level: "A2",
    skill: "vocabulary",
    type: "multiple",
    category: "ADSO - Agile Scrum",
    question: "In Scrum methodology, the short daily meeting where teammates share progress is called:",
    options: ["Daily Standup", "Annual Review", "Final Exam", "Contract Signing"],
    correctAnswer: 0,
    points: 5,
  },
  {
    id: 10,
    level: "A2",
    skill: "grammar",
    type: "multiple",
    category: "ADSO - QA Testing",
    question: "Choose the correct sentence for QA reporting:",
    options: [
      "We tested the login module and found two critical bugs.",
      "We test the login module yesterday and finding bugs.",
      "We was testing the login module without no problems.",
      "We are test the login module two days ago."
    ],
    correctAnswer: 0,
    points: 5,
  },
  {
    id: 11,
    level: "A2",
    skill: "vocabulary",
    type: "multiple",
    category: "ADSO - Frontend Development",
    question: "Which technology is responsible for styling colors, layouts, and fonts in web interfaces?",
    options: ["CSS", "SQL", "Python", "Bash"],
    correctAnswer: 0,
    points: 5,
  },
  {
    id: 12,
    level: "A2",
    skill: "reading",
    type: "multiple",
    category: "ADSO - Databases",
    question: "Which SQL command is used to retrieve data from a database table?",
    options: ["SELECT", "DELETE", "DROP", "ALTER"],
    correctAnswer: 0,
    points: 5,
  },
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