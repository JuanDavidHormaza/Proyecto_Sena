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

export const questionsB2 = [

{
  id: 21,
  level: "B2",
  skill: "grammar",
  type: "multiple",
  category: "Grammar",
  question: "Had I known about the update, I ____ earlier.",
  options: [
    "would install it",
    "would have installed it",
    "install",
    "had install"
  ],
  correctAnswer: 1,
  points: 10,
},

{
  id: 22,
  level: "B2",
  skill: "reading",
  type: "multiple",
  category: "Cybersecurity",
  question: "A phishing attack usually attempts to...",
  options: [
    "Steal sensitive information",
    "Improve performance",
    "Create backups",
    "Increase RAM"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 23,
  level: "B2",
  skill: "vocabulary",
  type: "multiple",
  category: "Programming",
  question: "Inheritance is a concept in...",
  options: [
    "Object-Oriented Programming",
    "HTML",
    "CSS",
    "SQL"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 24,
  level: "B2",
  skill: "grammar",
  type: "multiple",
  category: "Grammar",
  question: "Choose the correct sentence.",
  options: [
    "Rarely have I seen such innovation.",
    "I have rarely seen such innovation.",
    "Rarely I have seen.",
    "Rarely seen I."
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 25,
  level: "B2",
  skill: "reading",
  type: "multiple",
  category: "Networks",
  question: "VPN stands for...",
  options: [
    "Virtual Private Network",
    "Verified Protected Node",
    "Visual Programming Network",
    "Virtual Public Network"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 26,
  level: "B2",
  skill: "grammar",
  type: "multiple",
  category: "Grammar",
  question: "Not until yesterday ____ the issue.",
  options: [
    "did they solve",
    "they solved",
    "they solve",
    "they had solve"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 27,
  level: "B2",
  skill: "reading",
  type: "multiple",
  category: "Cloud Computing",
  question: "Which cloud service provides virtual machines and storage?",
  options: [
    "IaaS",
    "SaaS",
    "PaaS",
    "DNS"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 28,
  level: "B2",
  skill: "vocabulary",
  type: "multiple",
  category: "Software",
  question: "Scalable software means...",
  options: [
    "It handles increased demand efficiently",
    "It is smaller",
    "It is free",
    "It runs offline"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 29,
  level: "B2",
  skill: "reading",
  type: "multiple",
  category: "Databases",
  question: "Normalization helps databases by...",
  options: [
    "Reducing redundancy",
    "Increasing viruses",
    "Deleting users",
    "Speeding hardware"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 30,
  level: "B2",
  skill: "grammar",
  type: "multiple",
  category: "Grammar",
  question: "No sooner ____ than the server crashed.",
  options: [
    "had we deployed",
    "we deployed",
    "did we deploy",
    "deploy we"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 31,
  level: "B2",
  skill: "grammar",
  type: "multiple",
  category: "Grammar",
  question: "Which sentence is grammatically correct?",
  options: [
    "Had she studied harder, she would pass the exam.",
    "Had she studied harder, she would have passed the exam.",
    "Had she studies harder, she passed the exam.",
    "Had she study harder, she will pass the exam."
  ],
  correctAnswer: 1,
  points: 10,
},

{
  id: 32,
  level: "B2",
  skill: "vocabulary",
  type: "multiple",
  category: "Programming",
  question: "What is the main purpose of an API?",
  options: [
    "To allow communication between software applications",
    "To store images",
    "To create passwords",
    "To increase internet speed"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 33,
  level: "B2",
  skill: "reading",
  type: "multiple",
  category: "Cybersecurity",
  question: "Two-factor authentication improves security because it...",
  options: [
    "Requires two different forms of verification",
    "Uses two passwords",
    "Creates two user accounts",
    "Connects two computers"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 34,
  level: "B2",
  skill: "grammar",
  type: "multiple",
  category: "Grammar",
  question: "Choose the correct sentence.",
  options: [
    "Little did I know the server was offline.",
    "Little I knew the server was offline.",
    "Little I know the server was offline.",
    "Little did knew I the server was offline."
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 35,
  level: "B2",
  skill: "vocabulary",
  type: "multiple",
  category: "Databases",
  question: "A primary key is used to...",
  options: [
    "Uniquely identify each record",
    "Delete records",
    "Encrypt data",
    "Compress files"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 36,
  level: "B2",
  skill: "reading",
  type: "multiple",
  category: "Software Engineering",
  question: "What is Agile methodology mainly focused on?",
  options: [
    "Iterative development and collaboration",
    "Writing longer documentation",
    "Building hardware devices",
    "Reducing internet traffic"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 37,
  level: "B2",
  skill: "grammar",
  type: "multiple",
  category: "Grammar",
  question: "Choose the correct sentence.",
  options: [
    "Were I you, I would apply for the internship.",
    "Was I you, I would apply for the internship.",
    "If I was you, I will apply.",
    "Were I you, I will apply."
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 38,
  level: "B2",
  skill: "vocabulary",
  type: "multiple",
  category: "Networks",
  question: "Bandwidth refers to...",
  options: [
    "The maximum amount of data transmitted over a network",
    "The size of a monitor",
    "The number of users in a database",
    "The memory of a processor"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 39,
  level: "B2",
  skill: "reading",
  type: "multiple",
  category: "Cloud Computing",
  question: "Which cloud deployment model is owned and operated by a third-party provider?",
  options: [
    "Public Cloud",
    "Private Cloud",
    "Hybrid Cloud",
    "Local Cloud"
  ],
  correctAnswer: 0,
  points: 10,
},

{
  id: 40,
  level: "B2",
  skill: "reading",
  type: "multiple",
  category: "Software Development",
  question: "Continuous Integration (CI) is a practice that...",
  options: [
    "Frequently merges code changes into a shared repository",
    "Creates multiple databases",
    "Formats hard drives automatically",
    "Blocks unauthorized users"
  ],
  correctAnswer: 0,
  points: 10,
}

];

export default questionsB2;

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
      level: 'B2',
      status: 'Mastered',
      description: 'Excellent Performance',
      message: 'Congratulations! You have completed all available levels.',
      canAdvance: false,
    };

  if (score >= 80)
    return {
      level: 'B2',
      status: 'Competent',
      description: 'Good Performance',
      message: 'You have a solid understanding of B2.',
      canAdvance: false,
    };

  if (score >= 50)
    return {
      level: 'B2',
      status: 'Developing',
      description: 'Basic Understanding',
      message: 'You passed B2, but more practice is recommended.',
      canAdvance: false,
    };

  return {
    level: 'B2',
    status: 'Failed',
    description: 'Not Passed',
    message: 'You need more practice with B2.',
    canAdvance: false,
  };
};

