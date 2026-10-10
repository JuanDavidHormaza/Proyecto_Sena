import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";

import {
  Target,
  BarChart3,
  Clock,
  ChevronRight,
  Play,
  History,
  MessageSquare,
  Calendar,
  X,
  BookOpen,
  BookMarked,
  Volume2,
  Mic,
  MicOff,
  Search,
  CheckCircle,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Eye,
  ArrowRight,
  RotateCcw,
  Code,
  ZoomIn,
  Home,
  Menu,
  SlidersHorizontal,
  FileQuestion,
  Trophy,
  Layers,
  Languages,
} from "lucide-react";
import { getLevelFromScore } from "../data/questionsA1";
import { UserAccountMenu } from "../components/UserAccountMenu";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { resolveMediaUrl } from "../services/api";
import { ImageLightboxModal, LightboxDocItem } from "../components/ImageLightboxModal";
import { SafeImage } from "../components/SafeImage";
import { DictionaryProgramModal } from "../components/DictionaryProgramModal";
import { AccessibilityWidget } from "../components/AccessibilityWidget";
import { getTermsForProgram } from "../data/dictionariesByFicha";
import { questions } from "../data";
import { toast } from "../components/Toast";
import { playEnglishSpeech } from "../utils/speech";

const normalizeCompetency = (raw?: string): "Reading" | "Listening" | "Writing" | "Speaking" => {
  if (!raw) return "Reading";
  const lower = raw.trim().toLowerCase();
  if (lower.includes("listen") || lower.includes("escucha") || lower.includes("audio")) return "Listening";
  if (lower.includes("speak") || lower.includes("habla") || lower.includes("pronun") || lower.includes("oral")) return "Speaking";
  if (lower.includes("writ") || lower.includes("escrit") || lower.includes("redac")) return "Writing";
  return "Reading";
};

const getOptionSemanticText = (ans: any, answerValue: any): string => {
  if (answerValue === undefined || answerValue === null || answerValue === "") {
    return "Sin responder";
  }
  if (typeof answerValue === "string" && isNaN(Number(answerValue))) {
    return answerValue;
  }
  const idx = Number(answerValue);
  if (Array.isArray(ans.options) && ans.options[idx]) {
    return ans.options[idx];
  }
  const match = questions.find(
    (q) => q.id === ans.questionId || (q.question && ans.question && q.question.trim().toLowerCase() === ans.question.trim().toLowerCase())
  );
  if (match && Array.isArray(match.options) && match.options[idx]) {
    return match.options[idx];
  }
  if (ans.writingAnswer) {
    return ans.writingAnswer;
  }
  return typeof answerValue === "number" ? `Respuesta #${idx + 1}` : String(answerValue);
};

// ── Banco de Respaldo de 32 Términos Técnicos ADSO (CEFR A1-B2) ─────────────────
const FALLBACK_ADSO_TERMS: api.ApiDocument[] = [
  // A1
  {
    id: "adso-1",
    name: "Variable",
    wordId: "Variable",
    level: "A1",
    competence: "Grammar",
    definition: "A named storage location in memory containing data that can be modified during program execution.",
    synonyms: "identifier, container, data holder",
    audio: "variable.mp3",
    image: "variable.png",
    audioUrl: "/api/media/dictionary-audios/variable.mp3",
    imageUrl: "/api/media/dictionary-images/variable.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-2",
    name: "Button",
    wordId: "Button",
    level: "A1",
    competence: "Reading",
    definition: "A graphical user interface element clicked by a user to trigger a specific action or event in the system.",
    synonyms: "UI control, clickable element, trigger",
    audio: "button.mp3",
    image: "button.png",
    audioUrl: "/api/media/dictionary-audios/button.mp3",
    imageUrl: "/api/media/dictionary-images/button.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-3",
    name: "Code",
    wordId: "Code",
    level: "A1",
    competence: "Grammar",
    definition: "Instructions written in a structured programming language for a computer to execute.",
    synonyms: "source code, script, program instructions",
    audio: "code.mp3",
    image: "code.png",
    audioUrl: "/api/media/dictionary-audios/code.mp3",
    imageUrl: "/api/media/dictionary-images/code.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-4",
    name: "Input",
    wordId: "Input",
    level: "A1",
    competence: "Speaking",
    definition: "Data or signals provided to a computer program for processing by an external user or device.",
    synonyms: "entry data, user input, parameter",
    audio: "input.mp3",
    image: "input.png",
    audioUrl: "/api/media/dictionary-audios/input.mp3",
    imageUrl: "/api/media/dictionary-images/input.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-5",
    name: "Output",
    wordId: "Output",
    level: "A1",
    competence: "Speaking",
    definition: "Information produced and delivered by a software program after processing input data.",
    synonyms: "result, displayed data, return value",
    audio: "output.mp3",
    image: "output.png",
    audioUrl: "/api/media/dictionary-audios/output.mp3",
    imageUrl: "/api/media/dictionary-images/output.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-6",
    name: "File",
    wordId: "File",
    level: "A1",
    competence: "Reading",
    definition: "A digital resource recorded on a storage device that contains structured text, code, or media data.",
    synonyms: "document, record, digital resource",
    audio: "file.mp3",
    image: "file.png",
    audioUrl: "/api/media/dictionary-audios/file.mp3",
    imageUrl: "/api/media/dictionary-images/file.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-7",
    name: "Integer",
    wordId: "Integer",
    level: "A1",
    competence: "Grammar",
    definition: "A primitive numeric data type representing whole numbers without fractional components.",
    synonyms: "whole number, int, digit",
    audio: "integer.mp3",
    image: "integer.png",
    audioUrl: "/api/media/dictionary-audios/integer.mp3",
    imageUrl: "/api/media/dictionary-images/integer.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-8",
    name: "String",
    wordId: "String",
    level: "A1",
    competence: "Reading",
    definition: "An immutable sequence of characters used in programming to represent textual information.",
    synonyms: "text sequence, literal, string literal",
    audio: "string.mp3",
    image: "string.png",
    audioUrl: "/api/media/dictionary-audios/string.mp3",
    imageUrl: "/api/media/dictionary-images/string.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },

  // A2
  {
    id: "adso-9",
    name: "Function",
    wordId: "Function",
    level: "A2",
    competence: "Grammar",
    definition: "A reusable block of organized code designed to perform a single specific computation and optionally return a value.",
    synonyms: "method, procedure, routine",
    audio: "function.mp3",
    image: "function.png",
    audioUrl: "/api/media/dictionary-audios/function.mp3",
    imageUrl: "/api/media/dictionary-images/function.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-10",
    name: "Database",
    wordId: "Database",
    level: "A2",
    competence: "Reading",
    definition: "An organized collection of electronic data stored and accessed digitally through a database management system.",
    synonyms: "data store, DB, relational storage",
    audio: "database.mp3",
    image: "database.png",
    audioUrl: "/api/media/dictionary-audios/database.mp3",
    imageUrl: "/api/media/dictionary-images/database.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-11",
    name: "Array",
    wordId: "Array",
    level: "A2",
    competence: "Grammar",
    definition: "An ordered data structure that stores a collection of elements accessible by numerical indices.",
    synonyms: "list, vector, ordered collection",
    audio: "array.mp3",
    image: "array.png",
    audioUrl: "/api/media/dictionary-audios/array.mp3",
    imageUrl: "/api/media/dictionary-images/array.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-12",
    name: "Loop",
    wordId: "Loop",
    level: "A2",
    competence: "Speaking",
    definition: "A programming control flow structure that repeats a block of instructions continuously until a termination condition is met.",
    synonyms: "iteration, cycle, repetition",
    audio: "loop.mp3",
    image: "loop.png",
    audioUrl: "/api/media/dictionary-audios/loop.mp3",
    imageUrl: "/api/media/dictionary-images/loop.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-13",
    name: "Frontend",
    wordId: "Frontend",
    level: "A2",
    competence: "Reading",
    definition: "The client-side presentation layer of a software system with which end-users interact directly.",
    synonyms: "client-side, user interface, UI",
    audio: "frontend.mp3",
    image: "frontend.png",
    audioUrl: "/api/media/dictionary-audios/frontend.mp3",
    imageUrl: "/api/media/dictionary-images/frontend.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-14",
    name: "Backend",
    wordId: "Backend",
    level: "A2",
    competence: "Writing",
    definition: "The server-side component of an application responsible for data persistence, authentication, and core business logic.",
    synonyms: "server-side, API layer, core architecture",
    audio: "backend.mp3",
    image: "backend.png",
    audioUrl: "/api/media/dictionary-audios/backend.mp3",
    imageUrl: "/api/media/dictionary-images/backend.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-15",
    name: "Boolean",
    wordId: "Boolean",
    level: "A2",
    competence: "Grammar",
    definition: "A logical data type that expresses binary truth values: either true or false.",
    synonyms: "logical flag, binary condition, truth value",
    audio: "boolean.mp3",
    image: "boolean.png",
    audioUrl: "/api/media/dictionary-audios/boolean.mp3",
    imageUrl: "/api/media/dictionary-images/boolean.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-16",
    name: "Condition",
    wordId: "Condition",
    level: "A2",
    competence: "Reading",
    definition: "A logical statement evaluated by an if-statement or switch structure to decide program branching.",
    synonyms: "predicate, logic branch, decision rule",
    audio: "condition.mp3",
    image: "condition.png",
    audioUrl: "/api/media/dictionary-audios/condition.mp3",
    imageUrl: "/api/media/dictionary-images/condition.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },

  // B1
  {
    id: "adso-17",
    name: "Framework",
    wordId: "Framework",
    level: "B1",
    competence: "Reading",
    definition: "A foundational software architecture providing standardized libraries and patterns to accelerate application development.",
    synonyms: "development platform, software scaffold, architecture suite",
    audio: "framework.mp3",
    image: "framework.png",
    audioUrl: "/api/media/dictionary-audios/framework.mp3",
    imageUrl: "/api/media/dictionary-images/framework.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-18",
    name: "Algorithm",
    wordId: "Algorithm",
    level: "B1",
    competence: "Grammar",
    definition: "A finite, unambiguous sequence of computational instructions designed to solve a problem or calculate an outcome.",
    synonyms: "procedure, logical sequence, computational recipe",
    audio: "algorithm.mp3",
    image: "algorithm.png",
    audioUrl: "/api/media/dictionary-audios/algorithm.mp3",
    imageUrl: "/api/media/dictionary-images/algorithm.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-19",
    name: "Authentication",
    wordId: "Authentication",
    level: "B1",
    competence: "Writing",
    definition: "The security mechanism that validates the identity of a client or user before granting access to protected resources.",
    synonyms: "identity verification, login validation, credential check",
    audio: "authentication.mp3",
    image: "authentication.png",
    audioUrl: "/api/media/dictionary-audios/authentication.mp3",
    imageUrl: "/api/media/dictionary-images/authentication.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-20",
    name: "Endpoint",
    wordId: "Endpoint",
    level: "B1",
    competence: "Speaking",
    definition: "A dedicated URL address exposed by a web service or API where client HTTP requests are received and handled.",
    synonyms: "API route, service URI, web hook",
    audio: "endpoint.mp3",
    image: "endpoint.png",
    audioUrl: "/api/media/dictionary-audios/endpoint.mp3",
    imageUrl: "/api/media/dictionary-images/endpoint.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-21",
    name: "Refactoring",
    wordId: "Refactoring",
    level: "B1",
    competence: "Writing",
    definition: "The disciplined engineering practice of improving software internal structure and readability without altering external behavior.",
    synonyms: "code modernization, architectural cleanup, optimization",
    audio: "refactoring.mp3",
    image: "refactoring.png",
    audioUrl: "/api/media/dictionary-audios/refactoring.mp3",
    imageUrl: "/api/media/dictionary-images/refactoring.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-22",
    name: "Repository",
    wordId: "Repository",
    level: "B1",
    competence: "Grammar",
    definition: "A centralized version-controlled directory where software source files, branches, and historical commits are tracked.",
    synonyms: "codebase store, version control repo, Git archive",
    audio: "repository.mp3",
    image: "repository.png",
    audioUrl: "/api/media/dictionary-audios/repository.mp3",
    imageUrl: "/api/media/dictionary-images/repository.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-23",
    name: "Middleware",
    wordId: "Middleware",
    level: "B1",
    competence: "Reading",
    definition: "A software layer that intercepts incoming HTTP requests to perform authentication, logging, or header processing.",
    synonyms: "interceptor, request filter, pipeline handler",
    audio: "middleware.mp3",
    image: "middleware.png",
    audioUrl: "/api/media/dictionary-audios/middleware.mp3",
    imageUrl: "/api/media/dictionary-images/middleware.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-24",
    name: "Debugging",
    wordId: "Debugging",
    level: "B1",
    competence: "Speaking",
    definition: "The analytical process of finding, diagnosing, and resolving bugs or performance bottlenecks in computer programs.",
    synonyms: "troubleshooting, error isolation, code auditing",
    audio: "debugging.mp3",
    image: "debugging.png",
    audioUrl: "/api/media/dictionary-audios/debugging.mp3",
    imageUrl: "/api/media/dictionary-images/debugging.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },

  // B2
  {
    id: "adso-25",
    name: "Microservices",
    wordId: "Microservices",
    level: "B2",
    competence: "Reading",
    definition: "A distributed architectural style where an enterprise application is partitioned into independently deployable small services.",
    synonyms: "distributed services, decoupled architecture, modular backend",
    audio: "microservices.mp3",
    image: "microservices.png",
    audioUrl: "/api/media/dictionary-audios/microservices.mp3",
    imageUrl: "/api/media/dictionary-images/microservices.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-26",
    name: "Continuous Integration",
    wordId: "Continuous Integration",
    level: "B2",
    competence: "Writing",
    definition: "A modern DevOps engineering practice where team developers regularly merge code commits into a central branch with automated tests.",
    synonyms: "CI/CD pipeline, automated build, trunk integration",
    audio: "continuous_integration.mp3",
    image: "continuous_integration.png",
    audioUrl: "/api/media/dictionary-audios/continuous_integration.mp3",
    imageUrl: "/api/media/dictionary-images/continuous_integration.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-27",
    name: "Scalability",
    wordId: "Scalability",
    level: "B2",
    competence: "Speaking",
    definition: "The architectural capability of a system to sustain increased concurrent workloads by scaling hardware or software nodes.",
    synonyms: "elastic capacity, load tolerance, horizontal scaling",
    audio: "scalability.mp3",
    image: "scalability.png",
    audioUrl: "/api/media/dictionary-audios/scalability.mp3",
    imageUrl: "/api/media/dictionary-images/scalability.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-28",
    name: "Polymorphism",
    wordId: "Polymorphism",
    level: "B2",
    competence: "Grammar",
    definition: "An object-oriented principle that allows distinct classes to respond to identical method signatures with specialized implementations.",
    synonyms: "dynamic dispatch, interface contract, method override",
    audio: "polymorphism.mp3",
    image: "polymorphism.png",
    audioUrl: "/api/media/dictionary-audios/polymorphism.mp3",
    imageUrl: "/api/media/dictionary-images/polymorphism.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-29",
    name: "Vulnerability",
    wordId: "Vulnerability",
    level: "B2",
    competence: "Writing",
    definition: "A flaw in software code or configuration that can be leveraged by a malicious actor to breach system confidentiality or integrity.",
    synonyms: "security loophole, exploit surface, attack vector",
    audio: "vulnerability.mp3",
    image: "vulnerability.png",
    audioUrl: "/api/media/dictionary-audios/vulnerability.mp3",
    imageUrl: "/api/media/dictionary-images/vulnerability.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-30",
    name: "Asynchronous",
    wordId: "Asynchronous",
    level: "B2",
    competence: "Speaking",
    definition: "A non-blocking concurrency paradigm allowing long-running operations to execute without freezing the primary program thread.",
    synonyms: "non-blocking execution, event-driven, concurrent worker",
    audio: "asynchronous.mp3",
    image: "asynchronous.png",
    audioUrl: "/api/media/dictionary-audios/asynchronous.mp3",
    imageUrl: "/api/media/dictionary-images/asynchronous.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-31",
    name: "Deployment",
    wordId: "Deployment",
    level: "B2",
    competence: "Writing",
    definition: "The release workflow of packaging, configuring, and publishing tested software artifacts to a target production cloud server.",
    synonyms: "production release, system provisioning, software delivery",
    audio: "deployment.mp3",
    image: "deployment.png",
    audioUrl: "/api/media/dictionary-audios/deployment.mp3",
    imageUrl: "/api/media/dictionary-images/deployment.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
  {
    id: "adso-32",
    name: "Encryption",
    wordId: "Encryption",
    level: "B2",
    competence: "Reading",
    definition: "The cryptographic transformation of plain text into cipher text using mathematical keys to safeguard data at rest and in transit.",
    synonyms: "cryptographic cipher, data protection, secure hashing",
    audio: "encryption.mp3",
    image: "encryption.png",
    audioUrl: "/api/media/dictionary-audios/encryption.mp3",
    imageUrl: "/api/media/dictionary-images/encryption.png",
    subjectName: "ADSO",
    program: "ADSO",
    fileType: "DICT",
    size: "-",
    uploadedBy: "Sistema",
    uploadedAt: null,
    subjectId: "ADSO",
  },
];

// ─── Tarjeta de Vocabulario para Aprendiz (16:9, Audio en 1 Clic, Práctica de Voz, Sin Edición) ───
function StudentVocabCard({
  term,
  index,
  isPlaying,
  isListening,
  feedback,
  onPlayPronunciation,
  onVoicePractice,
  onOpenLightbox,
}: {
  term: api.ApiDocument;
  index: number;
  isPlaying: boolean;
  isListening: boolean;
  feedback?: { success: boolean; heard: string; message: string };
  onPlayPronunciation: (term: api.ApiDocument) => void;
  onVoicePractice: (term: api.ApiDocument) => void;
  onOpenLightbox?: (term: api.ApiDocument) => void;
}) {
  const termKey = term.wordId || term.name;
  const lvl = (term.level || "A1").toUpperCase();
  const competence = term.competence || "Grammar";

  const levelColors: Record<string, string> = {
    A1: "bg-emerald-50 text-emerald-700 border-emerald-200",
    A2: "bg-teal-50 text-teal-700 border-teal-200",
    B1: "bg-blue-50 text-blue-700 border-blue-200",
    B2: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  const levelBadge = levelColors[lvl] || "bg-emerald-50 text-emerald-700 border-emerald-200";

  const compColors: Record<string, string> = {
    Speaking: "bg-cyan-50 text-cyan-700 border-cyan-200",
    Writing: "bg-rose-50 text-rose-700 border-rose-200",
    Grammar: "bg-purple-50 text-purple-700 border-purple-200",
    Reading: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const compBadge = compColors[competence] || "bg-purple-50 text-purple-700 border-purple-200";

  const imageKey = term.image || (term.imageUrl ? term.imageUrl.replace(/^\/api\/media\/dictionary-images\//, "") : `${termKey.toLowerCase().replace(/\s+/g, "_")}.png`);
  const imageSrc = resolveMediaUrl(imageKey, "dictionary-images");

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="bg-white rounded-2xl border border-border shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between overflow-hidden"
    >
      <div>
        {/* 1. Imagen Técnica Superior con SafeImage, Skeleton Shimmer, Hover Zoom y Lightbox al Clic */}
        <div className="relative h-44 w-full bg-slate-50 overflow-hidden flex items-center justify-center border-b border-slate-100">
          <SafeImage
            src={imageSrc}
            alt={termKey}
            fallbackText={termKey}
            showHoverZoom={true}
            onClick={() => onOpenLightbox && onOpenLightbox(term)}
          />

          {/* Badges de Clasificación sobre la imagen */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs ${levelBadge}`}>
              {lvl}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-xs ${compBadge}`}>
              {competence}
            </span>
          </div>
        </div>

        {/* 2. Fila de Título y Botón de Altavoz en 1 Clic */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-lg font-bold text-foreground tracking-tight">{termKey}</h4>
            <button
              type="button"
              onClick={() => onPlayPronunciation(term)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isPlaying
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 animate-pulse ring-4 ring-emerald-100"
                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
              }`}
              title={`Escuchar pronunciación de ${termKey}`}
            >
              <Volume2 className={`w-4 h-4 ${isPlaying ? "animate-bounce" : ""}`} strokeWidth={1.8} />
            </button>
          </div>

          <p className="text-xs text-foreground/90 leading-relaxed min-h-[2.8rem]">
            {term.definition || `Concepto técnico clave para ${term.subjectName || "formación SENA"}.`}
          </p>

          {term.synonyms && (
            <div className="pt-2 border-t border-border/60">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground/80">Sinónimos: </span>
                {term.synonyms}
              </p>
            </div>
          )}

          {/* Feedback de voz si está activo */}
          {feedback && (
            <div
              className={`mt-2 p-2.5 rounded-xl text-xs border ${
                feedback.success
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {feedback.success ? (
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" strokeWidth={1.8} />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" strokeWidth={1.8} />
                )}
                <p className="text-[11px] leading-tight">{feedback.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Práctica de Pronunciación por Voz (Modo Estudio Aprendiz) */}
      <div className="px-4 pb-3 pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="font-semibold text-[11px] text-slate-600">Programa: {term.subjectName || term.program || "Técnico"}</span>
        <button
          type="button"
          onClick={() => onVoicePractice(term)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
            isListening
              ? "bg-destructive text-white animate-pulse"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
          title={`Practicar pronunciación de ${termKey}`}
        >
          {isListening ? (
            <>
              <MicOff className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span>Escuchando...</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span>Practicar Voz</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export function DashboardPage({ defaultTab }: { defaultTab?: "overview" | "study" } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateUser } = useAuth();
  const userName = user?.name || localStorage.getItem("userName") || "Usuario";

  // Tab de navegación principal: 'overview' (Evaluación y Progreso) vs 'study' (Espacio de Estudio)
  const isDictionaryPath = location.pathname.startsWith("/dictionary") || location.pathname.startsWith("/diccionario");
  const queryTab = searchParams.get("tab");
  const [activeMainTab, setActiveMainTab] = useState<"overview" | "study">(
    defaultTab === "study" || queryTab === "study" || isDictionaryPath ? "study" : "overview"
  );

  // Sub-vista de overview: 'main' (Progreso, Quiz CTA, Diccionario) vs 'stats' (Métricas e Historial)
  const [overviewSubTab, setOverviewSubTab] = useState<"main" | "stats">("main");
  const [showStatsDrawer, setShowStatsDrawer] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);


  // Soporte Multiprograma SENA
  const enrolledPrograms = useMemo(() => {
    if (user?.enrolledPrograms && user.enrolledPrograms.length > 0) {
      return user.enrolledPrograms;
    }
    const prog = user?.program || localStorage.getItem("userProgram") || "ADSO";
    return [prog];
  }, [user]);

  const activeProgram = user?.program || localStorage.getItem("userProgram") || enrolledPrograms[0] || "ADSO";

  const handleProgramSwitch = async (targetProg: string) => {
    if (targetProg === activeProgram) return;
    try {
      const updated = await api.switchProgram(targetProg);
      updateUser(updated);
    } catch (err) {
      console.error("Error al conmutar programa SENA:", err);
    }
  };

  // Smart Auto-hide Header al hacer scroll (Libera lienzo hacia abajo, reaparece hacia arriba)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 40) {
        setIsHeaderVisible(true);
      } else if (currentScrollY < lastScrollY) {
        // Al hacer el más mínimo scroll hacia arriba (incluso 1px), reaparece de inmediato
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY + 4 && currentScrollY > 40) {
        // Scroll hacia abajo: ocultar suavemente
        setIsHeaderVisible(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Aislamiento Multi-tenant de Diccionario por Ficha
  const [selectedDictProgram, setSelectedDictProgram] = useState<string>(() => {
    const qProg = searchParams.get("program");
    const savedActiveProg = localStorage.getItem("activeProgram") || localStorage.getItem("userProgram");
    return qProg || savedActiveProg || activeProgram;
  });
  const [isDictModalOpen, setIsDictModalOpen] = useState(false);

  useEffect(() => {
    const qProg = searchParams.get("program");
    if (qProg) {
      setSelectedDictProgram(qProg);
    } else if (activeProgram) {
      setSelectedDictProgram(activeProgram);
    }
  }, [activeProgram, searchParams]);

  const [testResults, setTestResults] = useState<api.ApiTestResult[]>([]);
  const [selectedTest, setSelectedTest] = useState<{
    id: string;
    date: string;
    score: number;
    level: string;
    duration: string;
    correctAnswers: number;
    totalQuestions: number;
    feedback?: string;
    answers?: Array<{
      questionId?: number;
      question: string;
      userAnswer?: any;
      correctAnswer?: any;
      isCorrect?: boolean;
      category?: string;
    }>;
  } | null>(null);

  const isInstructor = Boolean(
    user?.role === "teacher" ||
    user?.role === "admin" ||
    user?.role === "superadmin" ||
    user?.permissions?.canGiveFeedback
  );
  const [editingFeedback, setEditingFeedback] = useState<string>("");
  const [isSavingFeedback, setIsSavingFeedback] = useState<boolean>(false);

  useEffect(() => {
    if (selectedTest) {
      setEditingFeedback(selectedTest.feedback || "");
    }
  }, [selectedTest?.id, selectedTest?.feedback]);

  const handleSaveModalFeedback = async () => {
    if (!selectedTest) return;
    setIsSavingFeedback(true);
    try {
      if (selectedTest.id && selectedTest.id !== "fallback") {
        await api.addFeedback(selectedTest.id, editingFeedback);
      }
      setSelectedTest((prev) => (prev ? { ...prev, feedback: editingFeedback } : null));
      setTestResults((prev) =>
        prev.map((t) => (t.id === selectedTest.id ? { ...t, feedback: editingFeedback } : t))
      );
      toast.success("Retroalimentación guardada con éxito");
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar la retroalimentación");
    } finally {
      setIsSavingFeedback(false);
    }
  };

  // Estados del Espacio de Estudio de Vocabulario ADSO
  const [studyTerms, setStudyTerms] = useState<api.ApiDocument[]>(FALLBACK_ADSO_TERMS);
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedCompetence, setSelectedCompetence] = useState<string>("all");
  const initialSearch = searchParams.get("term") || "";
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [showDictionaryModal, setShowDictionaryModal] = useState<boolean>(false);

  // Estados de audio y pronunciación por voz
  const [playingTermId, setPlayingTermId] = useState<string | null>(null);
  const [listeningTerm, setListeningTerm] = useState<string | null>(null);
  const [speechFeedback, setSpeechFeedback] = useState<
    Record<string, { success: boolean; heard: string; message: string }>
  >({});
  const [selectedLightboxDoc, setSelectedLightboxDoc] = useState<LightboxDocItem | null>(null);

  const lastScore = Number(localStorage.getItem("quizScore") || "0");
  const lastCorrectAnswers = Number(localStorage.getItem("correctAnswers") || "0");
  const lastTotalQuestions = Number(localStorage.getItem("totalQuestions") || "0");
  const lastDuration = localStorage.getItem("quizDuration") || "00:00";

  const userId = user?.id || localStorage.getItem("userId") || undefined;

  // Sincronizar tab con URL query y rutas reactivas
  useEffect(() => {
    if (defaultTab === "study" || queryTab === "study" || isDictionaryPath) {
      setActiveMainTab("study");
    } else if (queryTab === "overview") {
      setActiveMainTab("overview");
    }
    const qProg = searchParams.get("program") || searchParams.get("ficha");
    if (qProg) {
      setSelectedDictProgram(qProg);
    }
    if (searchParams.get("term")) {
      setSearchQuery(searchParams.get("term") || "");
    }
  }, [defaultTab, queryTab, isDictionaryPath, searchParams]);

  // Cargar resultados de exámenes
  const [isLoadingResults, setIsLoadingResults] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (!userId) {
        setIsLoadingResults(false);
        return;
      }

      setIsLoadingResults(true);
      try {
        const results = await api.getTestResults(userId);
        const sortedResults = Array.isArray(results)
          ? results.sort(
              (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
            )
          : [];
        setTestResults(sortedResults);
      } catch (error) {
        console.error("No se pudieron cargar los resultados desde la base de datos:", error);
      } finally {
        setIsLoadingResults(false);
      }
    };

    fetchResults();
  }, [userId]);

  // Cargar términos del Diccionario Digital filtrado estrictamente por la ficha seleccionada
  useEffect(() => {
    let isCancelled = false;
    const fetchDictionary = async () => {
      setIsLoadingTerms(true);
      try {
        const docs = await api.getDocuments({
          program: selectedDictProgram,
          fichaId: selectedDictProgram,
        });
        if (isCancelled) return;
        if (Array.isArray(docs) && docs.length > 0) {
          setStudyTerms(docs);
        } else {
          // Si es ADSO o el programa principal con semillas, usar respaldo seguro
          const isAdso = (selectedDictProgram || "").toLowerCase().includes("adso") ||
            (selectedDictProgram || "").toLowerCase().includes("software") ||
            (selectedDictProgram || "").toLowerCase().includes("2670142");
          if (isAdso) {
            setStudyTerms(FALLBACK_ADSO_TERMS);
          } else {
            // Programa sin términos en BD -> Estado Vacío formal sin fallos
            setStudyTerms([]);
          }
        }
      } catch (err) {
        console.warn("Fallo al conectar con diccionario en API:", err);
        if (isCancelled) return;
        const isAdso = (selectedDictProgram || "").toLowerCase().includes("adso") ||
          (selectedDictProgram || "").toLowerCase().includes("software") ||
          (selectedDictProgram || "").toLowerCase().includes("2670142");
        if (isAdso) {
          setStudyTerms(FALLBACK_ADSO_TERMS);
        } else {
          setStudyTerms([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingTerms(false);
        }
      }
    };

    fetchDictionary();
    return () => {
      isCancelled = true;
    };
  }, [selectedDictProgram]);

  const latestResult = testResults[0];
  const hasQuizResult = Boolean(latestResult) || lastTotalQuestions > 0;
  const displayScore = latestResult?.score ?? lastScore;
  const displayCorrectAnswers = latestResult?.correctAnswers ?? lastCorrectAnswers;
  const displayTotalQuestions = latestResult?.totalQuestions ?? lastTotalQuestions;
  const displayDuration = latestResult?.duration ?? lastDuration;

  // Protección del Promedio Histórico y Nivel del Estudiante:
  // Solo se computan pruebas formalmente completadas (excluyendo 'Sin Nivel', 'No Presentado' e 'Invalidada')
  const validFinishedTests = useMemo(() => {
    return testResults.filter(
      (r) =>
        r.level !== "Sin Nivel" &&
        r.level !== "No Presentado" &&
        r.level !== "Invalidada" &&
        r.character !== "No Presentado" &&
        (r.totalQuestions > 0 || r.score > 0)
    );
  }, [testResults]);

  const latestValidResult = validFinishedTests[0] || (hasQuizResult && lastScore > 0 ? latestResult : null);
  const currentLevel = latestValidResult?.level ?? (hasQuizResult && lastScore > 0 ? getLevelFromScore(displayScore).level : "Sin nivel");

  const stats = {
    testsCompleted: validFinishedTests.length > 0 ? validFinishedTests.length : (hasQuizResult && lastScore > 0 ? 1 : 0),
    averageScore:
      validFinishedTests.length > 0
        ? Math.round(
            validFinishedTests.reduce((sum: number, result: api.ApiTestResult) => sum + result.score, 0) /
              validFinishedTests.length
          )
        : (hasQuizResult && lastScore > 0 ? displayScore : 0),
    currentLevel,
    currentStreak: 3, // Preservar indicador de racha activa
    quizDuration: displayDuration,
  };

  const recentTests = testResults.length > 0
    ? testResults.slice(0, 10).map((test) => ({
        id: test.id,
        date: new Date(test.completedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }),
        score: test.score,
        level: test.level,
        duration: test.duration || displayDuration,
        correctAnswers: test.correctAnswers,
        totalQuestions: test.totalQuestions,
        feedback: test.feedback,
        answers: test.answers || (test.process as any)?.answers || (test.process as any)?.userAnswers || [],
      }))
    : hasQuizResult
    ? [
        {
          id: "fallback",
          date: "Última prueba",
          score: displayScore,
          level: currentLevel,
          duration: displayDuration,
          correctAnswers: displayCorrectAnswers,
          totalQuestions: displayTotalQuestions,
          feedback: latestResult?.feedback,
          answers: latestResult?.answers || (latestResult?.process as any)?.answers || [],
        },
      ]
    : [];

  const feedbacks: Array<{ id: string; teacher: string; date: string; message: string }> = useMemo(() => {
    const list: Array<{ id: string; teacher: string; date: string; message: string }> = [];
    testResults.forEach((t) => {
      if (t.feedback && t.feedback.trim()) {
        list.push({
          id: t.id,
          teacher: "Instructor",
          date: new Date(t.completedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }),
          message: t.feedback,
        });
      }
    });
    if (list.length === 0 && latestResult?.feedback && latestResult.feedback.trim()) {
      list.push({
        id: latestResult.id,
        teacher: "Instructor",
        date: new Date(latestResult.completedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }),
        message: latestResult.feedback,
      });
    }
    return list;
  }, [testResults, latestResult]);

  // Filtrado de términos para el Espacio de Estudio
  const filteredTerms = useMemo(() => {
    return studyTerms.filter((term) => {
      // Nivel CEFR
      if (selectedLevel !== "all" && (term.level || "A1").toUpperCase() !== selectedLevel.toUpperCase()) {
        return false;
      }
      // Competencia
      if (selectedCompetence !== "all") {
        const comp = (term.competence || "Grammar").toLowerCase();
        if (selectedCompetence.toLowerCase() === "listening") {
          if (comp !== "listening" && comp !== "reading") return false;
        } else if (comp !== selectedCompetence.toLowerCase()) {
          return false;
        }
      }
      // Búsqueda de texto
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const termName = (term.wordId || term.name || "").toLowerCase();
        const def = (term.definition || "").toLowerCase();
        const syn = (term.synonyms || "").toLowerCase();
        return termName.includes(query) || def.includes(query) || syn.includes(query);
      }
      return true;
    });
  }, [studyTerms, selectedLevel, selectedCompetence, searchQuery]);

  // Reproducir pronunciación con fallback a SpeechSynthesis en inglés
  const handlePlayPronunciation = (term: api.ApiDocument) => {
    const termKey = term.wordId || term.name;
    setPlayingTermId(termKey);

    const mediaPath = term.audioUrl || term.audio;
    if (mediaPath) {
      const url = resolveMediaUrl(mediaPath, "dictionary-audios");
      const audio = new Audio(url);
      audio.onended = () => setPlayingTermId(null);
      audio.onerror = () => {
        speakWord(termKey);
        setPlayingTermId(null);
      };
      audio.play().catch(() => {
        speakWord(termKey);
        setPlayingTermId(null);
      });
    } else {
      speakWord(termKey);
      setTimeout(() => setPlayingTermId(null), 1200);
    }
  };

  const speakWord = (text: string) => {
    playEnglishSpeech(text, { rate: 0.85 });
  };

  // Práctica interactiva de pronunciación con el micrófono del navegador
  const handleVoicePractice = (term: api.ApiDocument) => {
    const termKey = term.wordId || term.name;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechFeedback((prev) => ({
        ...prev,
        [termKey]: {
          success: false,
          heard: "",
          message: "El reconocimiento de voz no está soportado en este navegador (se recomienda Chrome o Edge).",
        },
      }));
      return;
    }

    if (listeningTerm === termKey) {
      setListeningTerm(null);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListeningTerm(termKey);
    setSpeechFeedback((prev) => ({
      ...prev,
      [termKey]: {
        success: false,
        heard: "",
        message: "Escuchando... Pronuncia la palabra en inglés ahora.",
      },
    }));

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim().toLowerCase();
      const target = termKey.trim().toLowerCase();
      const isMatch = transcript === target || transcript.includes(target) || target.includes(transcript);

      setSpeechFeedback((prev) => ({
        ...prev,
        [termKey]: {
          success: isMatch,
          heard: event.results[0][0].transcript,
          message: isMatch
            ? `¡Excelente pronunciación! Coincidencia exacta: "${event.results[0][0].transcript}".`
            : `Detectado: "${event.results[0][0].transcript}". Continúa practicando la entonación.`,
        },
      }));
      setListeningTerm(null);
    };

    recognition.onerror = (e: any) => {
      setSpeechFeedback((prev) => ({
        ...prev,
        [termKey]: {
          success: false,
          heard: "",
          message: "No se detectó audio del micrófono. Verifica tus permisos de grabación.",
        },
      }));
      setListeningTerm(null);
    };

    recognition.onend = () => {
      setListeningTerm(null);
    };

    try {
      recognition.start();
    } catch {
      setListeningTerm(null);
    }
  };

  // Conteo de términos por nivel
  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0 };
    studyTerms.forEach((t) => {
      const lvl = (t.level || "A1").toUpperCase();
      if (counts[lvl] !== undefined) counts[lvl]++;
    });
    return counts;
  }, [studyTerms]);

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Encabezado Dinámico y Accesible (Smart Auto-hide con Scroll) ─── */}
      <header
        className={`sticky top-0 bg-background/95 dark:bg-card/95 backdrop-blur-md border-b border-border z-40 transition-transform duration-300 ease-in-out ${
          isHeaderVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="container mx-auto px-4 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-3">
            {/* Logo SENA con acceso directo al Home */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/")}
                title="Ir a la página principal de WorkLex (Inicio)"
                className="group flex items-center gap-2.5 p-1 rounded-xl hover:bg-muted/60 transition-all text-left"
              >
                <img
                  src="/worklex.png"
                  alt="WorkLex"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-emerald-500/30 shadow-md transition-transform hover:scale-105 flex-shrink-0"
                />
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-bold text-slate-900 dark:text-white high-contrast:text-white text-sm leading-none">WorkLex</h1>
                    <span className="p-0.5 rounded text-sena-green group-hover:translate-x-0.5 transition-transform">
                      <Home className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Plataforma SENA</p>
                </div>
              </button>

              {/* Selector de Programa Activo (List Box) */}
              <div
                className="relative hidden md:flex items-center bg-muted/60 hover:bg-muted border border-border/80 rounded-xl px-2.5 py-1 transition-colors"
                title="Programa de formación SENA activo. Haz clic para cambiar entre tus programas matriculados sin cerrar sesión."
              >
                <GraduationCap className="w-4 h-4 text-sena-blue mr-1.5 flex-shrink-0" strokeWidth={1.8} />
                <span className="text-[11px] text-muted-foreground mr-1">Ficha:</span>
                <select
                  value={activeProgram}
                  onChange={(e) => handleProgramSwitch(e.target.value)}
                  className="text-xs font-semibold bg-transparent text-foreground focus:outline-none cursor-pointer max-w-[200px] truncate"
                  aria-label="Seleccionar programa activo"
                >
                  {enrolledPrograms.map((prog) => (
                    <option key={prog} value={prog} className="bg-white text-foreground">
                      {prog}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Acciones del Header: Menú y Perfil */}
            <div className="flex items-center gap-2.5">

              {/* Botón Móvil Hamburguesa */}
              <button
                type="button"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Abrir menú de navegación móvil"
                aria-label="Menú móvil"
              >
                <Menu className="w-5 h-5" strokeWidth={1.8} />
              </button>

              <UserAccountMenu accent="green" />
            </div>
          </div>

          {/* Menú Colapsable Móvil (100% Limpio para Aprendiz) */}
          <AnimatePresence>
            {showMobileMenu && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-3 pt-3 border-t border-border flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-xl text-xs">
                  <span className="font-medium text-muted-foreground">Programa Activo:</span>
                  <select
                    value={activeProgram}
                    onChange={(e) => {
                      handleProgramSwitch(e.target.value);
                      setShowMobileMenu(false);
                    }}
                    className="font-semibold bg-transparent text-foreground focus:outline-none max-w-[200px]"
                  >
                    {enrolledPrograms.map((prog) => (
                      <option key={prog} value={prog}>
                        {prog}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">
              Hola, {userName.split(" ")[0]}
            </h2>
            <p className="text-sm text-muted-foreground">
              Continúa fortaleciendo tus competencias en inglés técnico para desarrollo de software.
            </p>
          </div>

          <div
            className="inline-flex items-center gap-2 bg-sena-green/10 text-sena-green px-3.5 py-1.5 rounded-full text-xs font-semibold self-start sm:self-auto border border-sena-green/20"
            title={`Programa SENA actualmente seleccionado: ${activeProgram}`}
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
            <span className="truncate max-w-[280px]">Programa Activo: {activeProgram}</span>
          </div>
        </motion.div>

        {/* Tab Switcher: Evaluación vs Espacio de Estudio */}
        <div className="flex items-center gap-2 mb-8 border-b border-border pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveMainTab("overview");
              setSearchParams({});
            }}
            title="Ver tu progreso actual y realizar pruebas de nivel"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeMainTab === "overview"
                ? "bg-sena-green text-white shadow-md shadow-sena-green/20 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <FileQuestion className="w-4 h-4" strokeWidth={1.8} />
            Evaluación y Progreso
          </button>
          <button
            type="button"
            onClick={() => {
              setIsDictModalOpen(true);
            }}
            title="Seleccionar ficha y explorar su Diccionario Técnico especializado"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeMainTab === "study"
                ? "bg-sena-green text-white shadow-md shadow-sena-green/20 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <BookOpen className="w-4 h-4" strokeWidth={1.8} />
            Diccionario Técnico SENA
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeMainTab === "study" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {studyTerms.length}
            </span>
          </button>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* VISTA 1: EVALUACIÓN Y PROGRESO (REDISEÑO: JERARQUÍA LIMPIA SIN SOBRECARGA)  */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeMainTab === "overview" && (
          <div className="space-y-8">
            {/* 1. Tarjeta Heroica: Progreso del programa seleccionado + CTA Examen */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-sena-green via-emerald-600 to-sena-blue rounded-3xl p-6 lg:p-8 text-white shadow-lg overflow-hidden relative"
            >
              <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-3 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wide">
                      Programa: {activeProgram}
                    </span>
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wide">
                      Evaluación Adaptativa A1 → B2
                    </span>
                  </div>

                  <h3 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
                    Prueba de Nivel de Inglés Técnico
                  </h3>
                  <p className="text-white/90 text-sm leading-relaxed">
                    Diagnostica y certifica tus competencias comunicativas en inglés con nuestro motor adaptativo con retroalimentación pedagógica instantánea.
                  </p>

                  {/* Progreso del nivel actual */}
                  <div className="pt-2 flex items-center gap-4">
                    <div className="bg-white/20 backdrop-blur-md px-3.5 py-2 rounded-xl">
                      <p className="text-[11px] text-white/80 font-medium">Nivel Registrado</p>
                      <p className="text-xl font-black">{stats.currentLevel}</p>
                    </div>
                    <div className="flex-1 bg-white/20 backdrop-blur-md p-2.5 rounded-xl">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/80">Puntuación Promedio</span>
                        <span className="font-bold">{stats.averageScore}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(stats.averageScore, 8)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón de Acción Principal */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0">
                  <motion.button
                    onClick={() => navigate("/quiz")}
                    title="Haz clic para iniciar tu evaluación de nivel con instrucciones previas y temporizador adaptativo"
                    className="flex items-center justify-center gap-2.5 bg-white text-sena-green hover:bg-white/95 px-8 py-4 rounded-2xl font-extrabold text-base shadow-xl transition-all cursor-pointer whitespace-nowrap"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FileQuestion className="w-5 h-5" strokeWidth={1.8} />
                    Comenzar Prueba de Nivel
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => {
                      const histEl = document.getElementById("historial-pruebas-section");
                      histEl?.scrollIntoView({ behavior: "smooth" });
                    }}
                    title="Ver el historial de intentos anteriores y detalles de puntuación"
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    <History className="w-4 h-4" strokeWidth={1.8} />
                    Ver Mis Intentos Anteriores
                  </button>
                </div>
              </div>
            </motion.div>

            {/* 2. Accesos Directos al Diccionario Técnico */}
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-sena-blue/10 flex items-center justify-center text-sena-blue">
                    <BookOpen className="w-6 h-6" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-base">
                      Diccionario Técnico Centralizado
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Base de datos multimedia compartida con aprendices e instructores SENA
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDictModalOpen(true)}
                  title="Seleccionar ficha y abrir el catálogo técnico de términos especializados"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sena-blue text-white text-xs font-semibold hover:bg-sena-blue/90 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
                >
                  <span>Abrir Diccionario Completo</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              </div>

              {/* Atajos por Competencia Lingüística */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {[
                  { comp: "Speaking", label: "Speaking", desc: "Pronunciación y fluidez", color: "cyan" },
                  { comp: "Writing", label: "Writing", desc: "Redacción y ortografía", color: "rose" },
                  { comp: "Grammar", label: "Grammar", desc: "Estructuras y sintaxis", color: "purple" },
                  { comp: "Reading", label: "Reading", desc: "Comprensión de lectura", color: "amber" },
                ].map((item) => (
                  <button
                    key={item.comp}
                    type="button"
                    onClick={() => {
                      setActiveMainTab("study");
                      setSelectedCompetence(item.comp);
                      setSearchParams({ tab: "study" });
                    }}
                    title={`Explorar términos de ${item.label}`}
                    className="p-3.5 rounded-xl border border-border hover:border-sena-blue/40 bg-muted/30 hover:bg-muted/70 text-left cursor-pointer group hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-xs text-foreground group-hover:text-sena-blue transition-colors">
                        {item.label}
                      </p>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. SECCIÓN ORDENADA EN LA PARTE INFERIOR: RENDIMIENTO, MÉTRICAS Y HISTORIAL */}
            <div id="historial-pruebas-section" className="space-y-6 pt-2">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sena-green/10 text-sena-green flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-base tracking-tight">
                      Métricas de Rendimiento Académico
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Progreso real, promedio general e historial de evaluaciones del aprendiz
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStatsDrawer(true)}
                  title="Abrir panel lateral rápido de métricas"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sena-blue" strokeWidth={1.8} />
                  <span>Panel Lateral</span>
                </button>
              </div>

              {/* Cuadrícula de 4 Métricas Dinámicas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Pruebas Realizadas",
                    value: stats.testsCompleted,
                    icon: BarChart3,
                    color: "sena-blue",
                    tip: "Total de evaluaciones completadas por el aprendiz",
                  },
                  {
                    label: "Nivel CEFR Actual",
                    value: stats.currentLevel || "A1",
                    icon: GraduationCap,
                    color: "sena-green",
                    tip: "Nivel de competencia lingüística según el MCER",
                  },
                  {
                    label: "Tiempo Invertido",
                    value: stats.quizDuration,
                    icon: Clock,
                    color: "sena-blue",
                    tip: "Tiempo invertido en la evaluación",
                  },
                  {
                    label: "Promedio General",
                    value: `${stats.averageScore}%`,
                    icon: Trophy,
                    color: "sena-green",
                    tip: "Calificación promedio real sobre 100",
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    title={stat.tip}
                    className="bg-white rounded-2xl p-5 border border-border shadow-xs hover:border-sena-green/40 hover:-translate-y-1 hover:shadow-md cursor-pointer transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-11 h-11 bg-${stat.color}/10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        <stat.icon className={`w-5 h-5 text-${stat.color}`} strokeWidth={1.8} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Historial de Pruebas Realizadas y Retroalimentación */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Historial */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-xs p-5">
                  <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                    <div className="flex items-center gap-2.5">
                      <History className="w-5 h-5 text-sena-blue" strokeWidth={1.8} />
                      <div>
                        <h4 className="font-bold text-foreground text-sm">Historial de Pruebas Realizadas</h4>
                        <p className="text-xs text-muted-foreground">Listado de evaluaciones y desglose de aciertos</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {recentTests.length} {recentTests.length === 1 ? "prueba" : "pruebas"}
                    </span>
                  </div>

                  <div className="divide-y divide-border">
                    {isLoadingResults ? (
                      <div className="py-6 px-3 space-y-4">
                        {[1, 2, 3].map((item) => (
                          <div key={item} className="flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-slate-200" />
                              <div className="space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-28" />
                                <div className="h-3 bg-slate-100 rounded w-40" />
                              </div>
                            </div>
                            <div className="w-6 h-6 bg-slate-100 rounded" />
                          </div>
                        ))}
                      </div>
                    ) : recentTests.length > 0 ? (
                      recentTests.map((test) => (
                        <div
                          key={test.id}
                          className="py-3.5 flex items-center justify-between hover:bg-muted/40 px-3 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xs group cursor-pointer"
                          onClick={() => setSelectedTest(test)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-2xs ${
                                test.score >= 80
                                  ? "bg-sena-green/10 text-sena-green"
                                  : test.score >= 60
                                  ? "bg-warning/10 text-warning"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {test.score}%
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-muted text-foreground border border-border">
                                  {test.level}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">
                                  {test.correctAnswers}/{test.totalQuestions} aciertos
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" strokeWidth={1.8} />
                                <span>{test.date}</span>
                                <span>•</span>
                                <Clock className="w-3 h-3" strokeWidth={1.8} />
                                <span>{test.duration}</span>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTest(test);
                            }}
                            title="Ver detalles pedagógicos y respuestas de esta prueba"
                            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center space-y-2">
                        <History className="w-10 h-10 text-muted-foreground/40 mx-auto" strokeWidth={1.8} />
                        <p className="text-xs text-muted-foreground">
                          Aún no has completado ninguna prueba de nivel.
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate("/quiz")}
                          className="text-xs text-sena-green font-semibold hover:underline"
                        >
                          Comenzar tu primera evaluación →
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Retroalimentación docente */}
                <div className="bg-white rounded-2xl border border-border shadow-xs p-5 space-y-4">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-border">
                    <MessageSquare className="w-5 h-5 text-sena-green" strokeWidth={1.8} />
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Retroalimentación del Instructor</h4>
                      <p className="text-xs text-muted-foreground">Observaciones pedagógicas</p>
                    </div>
                  </div>

                  {feedbacks.length > 0 ? (
                    feedbacks.map((f) => (
                      <div key={f.id} className="p-3.5 bg-muted/40 rounded-xl space-y-1.5 border border-border/60">
                        <p className="text-xs font-semibold text-foreground">{f.teacher} • {f.date}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{f.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 px-4 bg-muted/20 rounded-xl border border-dashed border-border/70 flex items-center gap-3 text-muted-foreground">
                      <Clock className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={1.8} />
                      <p className="text-xs leading-relaxed">
                        Pendiente de retroalimentación por parte del instructor asignado.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Panel Lateral Colapsable (Slide-over Drawer) ── */}
            <AnimatePresence>
              {showStatsDrawer && (
                <>
                  <div
                    className="fixed inset-0 bg-black/40 z-50 backdrop-blur-xs"
                    onClick={() => setShowStatsDrawer(false)}
                  />
                  <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto border-l border-border flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="w-5 h-5 text-sena-blue" strokeWidth={1.8} />
                          <h3 className="font-bold text-base text-foreground">Panel de Métricas</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowStatsDrawer(false)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                        >
                          <X className="w-5 h-5" strokeWidth={1.8} />
                        </button>
                      </div>

                      {/* Métricas compactas */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-4 bg-muted/40 rounded-xl border border-border">
                          <p className="text-xs text-muted-foreground">Pruebas</p>
                          <p className="text-xl font-bold text-foreground">{stats.testsCompleted}</p>
                        </div>
                        <div className="p-4 bg-muted/40 rounded-xl border border-border">
                          <p className="text-xs text-muted-foreground">Promedio</p>
                          <p className="text-xl font-bold text-sena-green">{stats.averageScore}%</p>
                        </div>
                        <div className="p-4 bg-muted/40 rounded-xl border border-border">
                          <p className="text-xs text-muted-foreground">Nivel Asignado</p>
                          <p className="text-xl font-bold text-sena-blue">{stats.currentLevel}</p>
                        </div>
                        <div className="p-4 bg-muted/40 rounded-xl border border-border">
                          <p className="text-xs text-muted-foreground">Programa</p>
                          <p className="text-xl font-bold text-sena-green">ADSO</p>
                        </div>
                      </div>

                      {/* Historial reciente rápido */}
                      <div>
                        <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3">
                          Últimas Evaluaciones
                        </h4>
                        <div className="space-y-2">
                          {recentTests.slice(0, 3).map((t) => (
                            <div
                              key={t.id}
                              className="p-3 bg-muted/30 hover:bg-muted/60 rounded-xl border border-border flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-semibold text-foreground">{t.level} • {t.score}%</p>
                                <p className="text-muted-foreground text-[11px]">{t.date}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTest(t);
                                  setShowStatsDrawer(false);
                                }}
                                className="text-sena-blue hover:underline font-medium"
                              >
                                Ver detalle
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-border mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewSubTab("stats");
                          setShowStatsDrawer(false);
                        }}
                        className="w-full py-2.5 rounded-xl bg-sena-green text-white font-semibold text-xs hover:bg-sena-green/90 transition-all cursor-pointer"
                      >
                        Abrir Historial Completo
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* VISTA 2: ESPACIO DE ESTUDIO (TARJETA ÚNICA ADSO Y MODAL DE ESTUDIO)      */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeMainTab === "study" && (
          <div className="space-y-6">
            {/* 1. Header Informativo Institucional */}
            <div className="bg-white rounded-2xl p-6 border border-border shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-2xs">
                    <BookMarked className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">
                      Diccionario Técnico SENA — {selectedDictProgram || activeProgram || "SENA"}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Centro institucional de vocabulario técnico en inglés especializado por ficha de formación.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsDictModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors shadow-2xs"
                    title="Cambiar ficha o programa de formación"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.8} />
                    <span>Cambiar Ficha ({selectedDictProgram})</span>
                  </button>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold self-start sm:self-auto">
                    <Eye className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.8} />
                    <span>Espacio de Estudio y Práctica</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. PANTALLA PRINCIPAL: TARJETA ENCAPSULADA DEL PROGRAMA */}
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                      PROGRAMA DE FORMACIÓN SENA
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      CEFR A1 — B2
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                    {selectedDictProgram} — Diccionario Técnico Especializado
                  </h3>
                  <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                    Repositorio central de vocabulario técnico, pronunciación nativa y recursos multimedia asociados a su ficha de formación.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDictModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors self-start md:self-auto"
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                  <span>Explorar Otra Ficha</span>
                </button>
              </div>

              {/* Métricas Consolidadas Reales: Palabras, Imágenes, Audios, Videos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Palabras</span>
                  <span className="text-2xl font-bold text-slate-800 font-mono">
                    {studyTerms.length}
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Términos Registrados</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Imágenes</span>
                  <span className="text-2xl font-bold text-slate-800 font-mono">
                    {studyTerms.filter(t => Boolean(t.image || t.imageUrl)).length}
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Recursos Visuales</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Audios</span>
                  <span className="text-2xl font-bold text-slate-800 font-mono">
                    {studyTerms.filter(t => Boolean(t.audio || t.audioUrl)).length}
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Pronunciación Nativa</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Videos</span>
                  <span className="text-2xl font-bold text-slate-800 font-mono">
                    {studyTerms.filter(t => Boolean(t.video || t.videoUrl)).length}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Videoclips Técnicos</span>
                </div>
              </div>

              {/* Botonera de Acción en la Tarjeta o Estado Vacío Formal */}
              {studyTerms.length === 0 ? (
                <div className="bg-slate-50/70 rounded-2xl border border-dashed border-border p-8 sm:p-10 text-center space-y-3">
                  <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" strokeWidth={1.8} />
                  <h4 className="text-xl font-bold text-foreground">Diccionario en construcción</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                    Actualmente no hay términos técnicos registrados para el programa{" "}
                    <strong className="text-foreground">{selectedDictProgram}</strong>. Tu instructor cargará el vocabulario técnico próximamente.
                  </p>
                  <div className="pt-3 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsDictModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sena-green hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span>Cambiar Ficha de Formación</span>
                    </button>
                    {(user?.role === "admin" || user?.role === "superadmin" || user?.role === "teacher") && (
                      <button
                        type="button"
                        onClick={() => navigate(user?.role === "teacher" ? "/teacher/dictionaries" : "/admin?tab=documents")}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-sena-green" />
                        <span>Cargar Vocabulario</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pt-2">
                  <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDictionaryModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-2 text-xs cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4" strokeWidth={1.8} />
                        <span>Modo Enfoque Pantalla Completa</span>
                      </button>
                    </div>

                    {(user?.role === "admin" || user?.role === "superadmin") && (
                      <button
                        type="button"
                        onClick={() => navigate("/admin?tab=documents")}
                        className="border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-2xs cursor-pointer"
                      >
                        <span>+ Agregar Término</span>
                      </button>
                    )}
                  </div>

                  {/* Barra de Filtros y Búsqueda Directa en la Página */}
                  <div className="bg-slate-50/80 rounded-2xl border border-border p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    {/* Buscador en Vivo */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                      <input
                        type="text"
                        placeholder="Buscar por término técnico o definición (ej. Polymorphism, Database, API)..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-9 py-2 rounded-xl border border-border bg-white text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="w-4 h-4" strokeWidth={1.8} />
                        </button>
                      )}
                    </div>

                    {/* Filtro por Competencia */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                      <span className="text-xs text-muted-foreground font-medium mr-1">Competencia:</span>
                      {["all", "Speaking", "Writing", "Grammar", "Listening"].map(comp => (
                        <button
                          key={comp}
                          type="button"
                          onClick={() => setSelectedCompetence(comp)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectedCompetence === comp
                              ? "bg-emerald-600 text-white shadow-xs font-semibold"
                              : "bg-white text-muted-foreground hover:text-foreground border border-slate-200"
                          }`}
                        >
                          {comp === "all" ? "Todas" : comp}
                        </button>
                      ))}
                    </div>

                    {/* Filtro por Nivel CEFR */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                      <span className="text-xs text-muted-foreground font-medium mr-1">Nivel:</span>
                      {["all", "A1", "A2", "B1", "B2"].map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSelectedLevel(lvl)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectedLevel === lvl
                              ? "bg-emerald-600 text-white shadow-xs font-semibold"
                              : "bg-white text-muted-foreground hover:text-foreground border border-slate-200"
                          }`}
                        >
                          {lvl === "all" ? "Todos" : lvl}
                        </button>
                      ))}

                      {(selectedLevel !== "all" || selectedCompetence !== "all" || searchQuery) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLevel("all");
                            setSelectedCompetence("all");
                            setSearchQuery("");
                          }}
                          className="ml-2 text-xs text-rose-600 hover:underline flex items-center gap-1 font-medium whitespace-nowrap cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" strokeWidth={1.8} />
                          Restablecer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cuadrícula de Términos Directamente Visible */}
                  {filteredTerms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {filteredTerms.map((term, index) => {
                        const termKey = term.wordId || term.name;
                        return (
                          <StudentVocabCard
                            key={term.id || `${termKey}-${index}`}
                            term={term}
                            index={index}
                            isPlaying={playingTermId === termKey}
                            isListening={listeningTerm === termKey}
                            feedback={speechFeedback[termKey]}
                            onPlayPronunciation={handlePlayPronunciation}
                            onVoicePractice={handleVoicePractice}
                            onOpenLightbox={(t) => setSelectedLightboxDoc(t)}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-white rounded-2xl border border-border p-8 shadow-xs space-y-3 max-w-lg mx-auto my-8">
                      <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto" strokeWidth={1.8} />
                      <h4 className="font-bold text-foreground text-base">No se encontraron términos</h4>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        No hay términos que coincidan con la búsqueda o filtros seleccionados en este momento.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. MODAL DESACOPLADO AMPLIO DE VOCABULARIO (max-w-7xl max-h-[92vh]) */}
            <AnimatePresence>
              {showDictionaryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="max-w-7xl w-full max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                  >
                    {/* Barra Superior Fija del Modal */}
                    <div className="p-5 sm:p-6 border-b border-border bg-white flex flex-col gap-4 sticky top-0 z-10 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-2xs">
                            <BookOpen className="w-5 h-5" strokeWidth={1.8} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-foreground tracking-tight">
                              Vocabulario Técnico {selectedDictProgram || activeProgram || "SENA"} — {studyTerms.length || 222} Términos
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Explorador multimedia de pronunciación nativa, conceptos técnicos y recursos gráficos
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowDictionaryModal(false)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                          title="Cerrar diccionario"
                        >
                          <X className="w-6 h-6" strokeWidth={1.8} />
                        </button>
                      </div>

                      {/* Filtros: Buscador en Vivo, Filtro por Asignatura y Nivel CEFR */}
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
                        {/* Buscador en Vivo */}
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                          <input
                            type="text"
                            placeholder="Buscar por término técnico o definición (ej. Polymorphism, Database, API)..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-9 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <X className="w-4 h-4" strokeWidth={1.8} />
                            </button>
                          )}
                        </div>

                        {/* Filtro por Competencia Lingüística */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                          <span className="text-xs text-muted-foreground font-medium mr-1">Competencia:</span>
                          {["all", "Speaking", "Writing", "Grammar", "Listening"].map(comp => (
                            <button
                              key={comp}
                              type="button"
                              onClick={() => setSelectedCompetence(comp)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                selectedCompetence === comp
                                  ? "bg-emerald-600 text-white shadow-xs font-semibold"
                                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                            >
                              {comp === "all" ? "Todas" : comp}
                            </button>
                          ))}
                        </div>

                        {/* Filtro por Nivel CEFR */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                          <span className="text-xs text-muted-foreground font-medium mr-1">Nivel:</span>
                          {["all", "A1", "A2", "B1", "B2"].map(lvl => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setSelectedLevel(lvl)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                selectedLevel === lvl
                                  ? "bg-emerald-600 text-white shadow-xs font-semibold"
                                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                            >
                              {lvl === "all" ? "Todos" : lvl}
                            </button>
                          ))}

                          {(selectedLevel !== "all" || selectedCompetence !== "all" || searchQuery) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLevel("all");
                                setSelectedCompetence("all");
                                setSearchQuery("");
                              }}
                              className="ml-2 text-xs text-rose-600 hover:underline flex items-center gap-1 font-medium whitespace-nowrap cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" strokeWidth={1.8} />
                              Restablecer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cuerpo del Modal: Grid Responsivo con scroll vertical */}
                    <div className="overflow-y-auto p-6 flex-1 bg-slate-50/50">
                      {studyTerms.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-border p-8 shadow-xs space-y-3 max-w-lg mx-auto my-8">
                          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" strokeWidth={1.8} />
                          <h4 className="font-bold text-foreground text-lg">Diccionario en construcción</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                            Actualmente no hay términos técnicos registrados para el programa{" "}
                            <strong className="text-foreground">{selectedDictProgram}</strong>. Tu instructor cargará el vocabulario técnico próximamente.
                          </p>
                        </div>
                      ) : filteredTerms.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                          {filteredTerms.map((term, index) => {
                            const termKey = term.wordId || term.name;
                            return (
                              <StudentVocabCard
                                key={term.id || `${termKey}-${index}`}
                                term={term}
                                index={index}
                                isPlaying={playingTermId === termKey}
                                isListening={listeningTerm === termKey}
                                feedback={speechFeedback[termKey]}
                                onPlayPronunciation={handlePlayPronunciation}
                                onVoicePractice={handleVoicePractice}
                                onOpenLightbox={(t) => setSelectedLightboxDoc(t)}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-border p-8 shadow-xs space-y-3 max-w-lg mx-auto my-8">
                          <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto" strokeWidth={1.8} />
                          <h4 className="font-bold text-foreground text-base">No se encontraron términos</h4>
                          <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            No hay términos que coincidan con la búsqueda o filtros seleccionados en este momento.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLevel("all");
                              setSelectedCompetence("all");
                              setSearchQuery("");
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.8} />
                            Limpiar Filtros
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Modal de Detalle de Prueba Histórica */}
      {/* Modal de Detalle de Prueba Histórica y Auditoría Pedagógica */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4 py-6">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-white p-6 sm:p-7 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedTest(null)}
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label="Cerrar detalle de prueba"
            >
              <X className="h-5 w-5" strokeWidth={1.8} />
            </button>

            <div className="mb-5 pr-10">
              <h3 className="text-xl font-bold leading-none text-foreground">Detalle y Auditoría de la Evaluación</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Información de desempeño, desglose pregunta a pregunta y retroalimentación del instructor.
              </p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border p-3.5 bg-muted/20">
                  <p className="text-xs text-muted-foreground">Nivel</p>
                  <p className="text-2xl font-black text-sena-green">{selectedTest.level}</p>
                </div>
                <div className="rounded-xl border border-border p-3.5 bg-muted/20">
                  <p className="text-xs text-muted-foreground">Puntuación</p>
                  <p className="text-2xl font-black text-foreground">{selectedTest.score}%</p>
                </div>
                <div className="rounded-xl border border-border p-3.5 bg-muted/20">
                  <p className="text-xs text-muted-foreground">Aciertos</p>
                  <p className="font-bold text-foreground text-lg">
                    {selectedTest.correctAnswers}/{selectedTest.totalQuestions}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3.5 bg-muted/20">
                  <p className="text-xs text-muted-foreground">Tiempo</p>
                  <p className="font-bold text-foreground text-lg">{selectedTest.duration}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sena-blue" strokeWidth={1.8} />
                  <p className="text-xs font-medium text-foreground">Fecha de presentación</p>
                </div>
                <p className="text-xs font-semibold text-muted-foreground">{selectedTest.date}</p>
              </div>

              {/* Desglose Pedagógico Pregunta a Pregunta */}
              <div className="rounded-2xl border border-border p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground">Auditoría Pedagógica de Preguntas</h4>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {selectedTest.answers?.length || selectedTest.totalQuestions || 0} reactivos
                  </span>
                </div>

                {selectedTest.answers && selectedTest.answers.length > 0 ? (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {selectedTest.answers.map((ans, idx) => (
                      <div
                        key={ans.questionId || idx}
                        className={`p-3 rounded-xl border text-xs transition-colors ${
                          ans.isCorrect
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                            : "bg-red-50/70 border-red-200 text-red-950"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="font-semibold text-slate-800">
                            {idx + 1}. {ans.question}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                              ans.isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {ans.isCorrect ? "Correcto" : "Incorrecto"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 mt-1.5 p-2 bg-white/80 rounded-lg border border-slate-200">
                          <p>
                            <strong className="text-slate-800">Tu respuesta:</strong>{" "}
                            <span className={ans.isCorrect ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
                              {getOptionSemanticText(ans, ans.userAnswer)}
                            </span>
                          </p>
                          <p>
                            <strong className="text-emerald-800">Respuesta correcta:</strong>{" "}
                            <span className="text-emerald-700 font-semibold">
                              {getOptionSemanticText(ans, ans.correctAnswer)}
                            </span>
                          </p>
                        </div>
                        {(ans.category || ans.competency) && (
                          <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                            Macro-habilidad: {normalizeCompetency(ans.competency || ans.category)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-4 bg-white rounded-xl text-center text-xs text-muted-foreground border border-dashed border-border">
                    Esta evaluación preliminar no registra desglose individual de preguntas.
                  </p>
                )}
              </div>

              {/* Retroalimentación del Instructor */}
              <div className="rounded-xl bg-muted/40 p-4 border border-border">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-sena-blue" strokeWidth={1.8} />
                    <p className="text-xs font-bold text-foreground">Retroalimentación del Instructor</p>
                  </div>
                  {isInstructor && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sena-green/10 text-sena-green">
                      Rol Instructor
                    </span>
                  )}
                </div>

                {isInstructor ? (
                  <div className="space-y-2.5 mt-2">
                    <textarea
                      value={editingFeedback}
                      onChange={(e) => setEditingFeedback(e.target.value)}
                      placeholder="Escribe tus observaciones y recomendaciones pedagógicas para el aprendiz..."
                      rows={3}
                      className="w-full text-xs p-3 bg-white rounded-lg border border-border focus:ring-2 focus:ring-sena-green/40 focus:outline-none resize-none transition-all placeholder:text-muted-foreground"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveModalFeedback}
                        disabled={isSavingFeedback}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sena-green hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{isSavingFeedback ? "Guardando..." : "Guardar Retroalimentación"}</span>
                      </button>
                    </div>
                  </div>
                ) : selectedTest.feedback ? (
                  <p className="whitespace-pre-line text-xs text-muted-foreground leading-relaxed mt-1">
                    {selectedTest.feedback}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs py-2 mt-1">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.8} />
                    <span>Pendiente de retroalimentación por parte del instructor asignado.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: Visor de Imágenes Lightbox HD en Pantalla Completa ══ */}
      <AnimatePresence>
        {selectedLightboxDoc && (
          <ImageLightboxModal
            item={selectedLightboxDoc}
            onClose={() => setSelectedLightboxDoc(null)}
          />
        )}
      </AnimatePresence>

      {/* ══ Modal: Selección / Confirmación de Ficha para Diccionario Técnico ══ */}
      <DictionaryProgramModal
        isOpen={isDictModalOpen}
        onClose={() => setIsDictModalOpen(false)}
        activeProgram={selectedDictProgram}
        enrolledPrograms={enrolledPrograms}
        onSelectProgram={(program) => {
          setSelectedDictProgram(program);
          handleProgramSwitch(program);
          setActiveMainTab("study");
        }}
      />
    </div>
  );
}
