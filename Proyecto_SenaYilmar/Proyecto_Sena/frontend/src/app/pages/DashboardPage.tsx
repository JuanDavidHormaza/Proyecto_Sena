import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo, useRef } from "react";

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
  VolumeX,
  Mic,
  MicOff,
  PenTool,
  Search,
  CheckCircle,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Eye,
  ArrowRight,
  RotateCcw,
  Code,
  Code2,
  Terminal,
  FileCode,
  Cpu,
  ZoomIn,
  Home,
  Menu,
  SlidersHorizontal,
  FileQuestion,
  Trophy,
  Layers,
  Languages,
  LifeBuoy,
  Plus,
  GitBranch,
} from "lucide-react";
import { getLevelFromScore } from "../data/questionsA1";
import { UserAccountMenu } from "../components/UserAccountMenu";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { resolveMediaUrl } from "../services/api";
import { ImageLightboxModal, LightboxDocItem } from "../components/ImageLightboxModal";
import { SafeImage } from "../components/SafeImage";
import { DictionaryProgramModal } from "../components/DictionaryProgramModal";
import { HeaderActionTools } from "../components/HeaderActionTools";
import { getTermsForProgram } from "../data/dictionariesByFicha";
import { questions } from "../data";
import { toast } from "../components/Toast";
import { playEnglishSpeech } from "../utils/speech";
import { WorklexBrandLogo } from "../components/WorklexBrandLogo";
import { RoleSwitcher } from "../components/RoleSwitcher";

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

// ── Validación Estricta de Ficha ADSO (Análisis y Desarrollo de Software) ────
export const isAdsoFicha = (prog?: string | null): boolean => {
  if (!prog) return false;
  const p = prog.toLowerCase().trim();
  return (
    (p.includes("adso") || p.includes("software") || p.includes("2670142")) &&
    !p.includes("datos") &&
    !p.includes("data") &&
    !p.includes("analítica")
  );
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

// ─── Tarjeta de Vocabulario para Aprendiz (16:9, Audio Resiliente 404, Práctica de Voz, Sin Edición) ───
function StudentVocabCard({
  term,
  index,
  isPlaying,
  isListening,
  feedback,
  isAudioUnavailable,
  onPlayPronunciation,
  onVoicePractice,
  onOpenLightbox,
}: {
  term: api.ApiDocument;
  index: number;
  isPlaying: boolean;
  isListening: boolean;
  feedback?: { success: boolean; heard: string; message: string };
  isAudioUnavailable?: boolean;
  onPlayPronunciation: (term: api.ApiDocument) => void;
  onVoicePractice: (term: api.ApiDocument) => void;
  onOpenLightbox?: (term: api.ApiDocument) => void;
}) {
  const [imgError, setImgError] = useState(false);
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

  const getTermSemanticIcon = (word: string) => {
    const w = (word || "").toLowerCase().trim();
    if (
      w.includes("branch") ||
      w.includes("git") ||
      w.includes("repo") ||
      w.includes("merge") ||
      w.includes("commit") ||
      w.includes("pull") ||
      w.includes("checkout")
    ) {
      return GitBranch;
    }
    if (
      w.includes("terminal") ||
      w.includes("debug") ||
      w.includes("test") ||
      w.includes("cli") ||
      w.includes("console") ||
      w.includes("shell") ||
      w.includes("script") ||
      w.includes("command")
    ) {
      return Terminal;
    }
    if (
      w.includes("layer") ||
      w.includes("middle") ||
      w.includes("microservice") ||
      w.includes("service") ||
      w.includes("cloud") ||
      w.includes("server") ||
      w.includes("api") ||
      w.includes("backend") ||
      w.includes("docker") ||
      w.includes("deploy")
    ) {
      return Layers;
    }
    return Code2;
  };
  const SemanticIcon = getTermSemanticIcon(termKey);

  const rawImageSrc = term.imageUrl || term.image;
  const imageKey = term.image || (term.imageUrl ? term.imageUrl.replace(/^\/api\/media\/dictionary-images\//, "") : `${termKey.toLowerCase().replace(/\s+/g, "_")}.png`);
  const imageSrc = rawImageSrc ? resolveMediaUrl(rawImageSrc, "dictionary-images") : resolveMediaUrl(imageKey, "dictionary-images");

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between overflow-hidden"
    >
      <div>
        {/* 1. Imagen Técnica Superior con Manejo Resiliente de Fallback SVG (Evita Layout Shift) */}
        <div className="relative aspect-video w-full bg-slate-50 dark:bg-slate-800/40 overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
          {!imgError && imageSrc ? (
            <div className="relative w-full h-full group flex items-center justify-center">
              <img
                src={imageSrc}
                alt={termKey}
                loading="lazy"
                decoding="async"
                onError={() => {
                  console.warn(`[MediaProxy 404] Imagen no encontrada para ${termKey}: ${imageSrc}`);
                  setImgError(true);
                }}
                onClick={() => onOpenLightbox && onOpenLightbox(term)}
                className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105 cursor-pointer"
              />
              {onOpenLightbox && (
                <div
                  onClick={() => onOpenLightbox(term)}
                  className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer pointer-events-none"
                  title="Clic para ampliar imagen"
                >
                  <div className="w-8 h-8 rounded-full bg-white/95 text-slate-800 flex items-center justify-center shadow-md">
                    <ZoomIn className="w-4 h-4 text-emerald-700" strokeWidth={1.8} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 text-center">
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-700/90 border border-slate-200 dark:border-slate-600 flex items-center justify-center mb-1.5 shadow-xs text-slate-600 dark:text-slate-300">
                <SemanticIcon className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-tight truncate max-w-full px-2">
                {termKey}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                Recurso institucional
              </span>
            </div>
          )}

          {/* Badges de Clasificación sobre la imagen */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${levelBadge}`}>
              {lvl}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs inline-flex items-center gap-1 ${compBadge}`}>
              {competence === "Speaking" && <Mic className="w-3 h-3 shrink-0" />}
              {competence === "Writing" && <PenTool className="w-3 h-3 shrink-0" />}
              {competence === "Grammar" && <Languages className="w-3 h-3 shrink-0" />}
              {competence === "Reading" && <BookOpen className="w-3 h-3 shrink-0" />}
              <span>{competence}</span>
            </span>
          </div>
        </div>

        {/* 2. Fila de Título y Botón de Altavoz en 1 Clic con Tolerancia 404 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{termKey}</h4>
            <button
              type="button"
              onClick={() => onPlayPronunciation(term)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isPlaying
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-4 ring-emerald-100"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
              }`}
              title={isPlaying ? `Pausar pronunciación de ${termKey}` : `Escuchar pronunciación de ${termKey}`}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" strokeWidth={1.8} />
              ) : (
                <Volume2 className="w-4 h-4" strokeWidth={1.8} />
              )}
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

          {/* Video Embebido por URL (YouTube/Vimeo o Video Técnico) */}
          {Boolean(term.videoUrl) && (
            <div className="pt-2 border-t border-border/60">
              {api.getEmbedVideoUrl(term.videoUrl) ? (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border bg-black shadow-xs">
                  <iframe
                    src={api.getEmbedVideoUrl(term.videoUrl)!}
                    title={`Video demostrativo de ${termKey}`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <a
                  href={api.resolveMediaUrl(term.videoUrl!)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sena-blue hover:underline py-1"
                >
                  <Play className="w-3.5 h-3.5" />
                  Ver video técnico complementario
                </a>
              )}
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

export function formatProgramFichaHeader(raw?: string | null): string {
  if (!raw) return "Programa: SENA - Ficha: General";
  const str = raw.trim();
  if (str.toLowerCase().startsWith("programa:") && str.toLowerCase().includes("ficha:")) {
    return str;
  }
  // Check pattern "Programa Name - Ficha 123456" or "Programa Name - 123456"
  const match = str.match(/^(.*?)\s*[-–—]\s*(?:ficha\s*:?\s*)?(\d+.*)$/i);
  if (match) {
    const prog = match[1].replace(/^programa\s*:?\s*/i, "").trim();
    const ficha = match[2].trim();
    return `Programa: ${prog} - Ficha: ${ficha}`;
  }
  // Check pattern "ADSO (2670142)"
  const matchParen = str.match(/^(.*?)\s*\((?:ficha\s*:?\s*)?(\d+.*)\)$/i);
  if (matchParen) {
    const prog = matchParen[1].replace(/^programa\s*:?\s*/i, "").trim();
    const ficha = matchParen[2].trim();
    return `Programa: ${prog} - Ficha: ${ficha}`;
  }
  return `Programa: ${str}`;
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
  const [activeProgramKey, setActiveProgramKey] = useState(0);

  useEffect(() => {
    const handleProgChanged = () => {
      setActiveProgramKey((k) => k + 1);
    };
    window.addEventListener("programChanged", handleProgChanged);
    window.addEventListener("storage", handleProgChanged);
    return () => {
      window.removeEventListener("programChanged", handleProgChanged);
      window.removeEventListener("storage", handleProgChanged);
    };
  }, []);

  const enrolledPrograms = useMemo(() => {
    let list: string[] = user?.enrolledPrograms || [];
    if (!list || list.length === 0) {
      try {
        const stored = localStorage.getItem("userEnrolledPrograms");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) list = parsed;
        }
      } catch {}
    }
    if (list.length > 0) {
      return Array.from(new Set(list.filter(Boolean)));
    }
    const prog = user?.program || localStorage.getItem("userProgram") || "ADSO";
    return [prog];
  }, [user, activeProgramKey]);

  const activeProgram = user?.ficha?.programa || user?.program || localStorage.getItem("userProgram") || enrolledPrograms[0] || "ADSO";

  const handleProgramSwitch = async (targetProg: string) => {
    if (targetProg === activeProgram) return;
    try {
      const updated = await api.switchProgram(targetProg);
      updateUser(updated);
      setSelectedDictProgram(targetProg);
      localStorage.setItem("activeProgram", targetProg);
      localStorage.setItem("userProgram", targetProg);
      toast.success(`Ficha activa: ${targetProg}`);
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

  // Estados del Espacio de Estudio de Vocabulario (Aislamiento Estricto por Ficha)
  const [studyTerms, setStudyTerms] = useState<api.ApiDocument[]>(() => {
    const isTargetAdso = isAdsoFicha(activeProgram);
    return isTargetAdso ? FALLBACK_ADSO_TERMS : [];
  });
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedCompetence, setSelectedCompetence] = useState<string>("all");
  const initialSearch = searchParams.get("term") || "";
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [showDictionaryModal, setShowDictionaryModal] = useState<boolean>(false);

  // Estados de audio y pronunciación por voz (reproductor controlado play/pause con fallback nativo)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingTermId, setPlayingTermId] = useState<string | null>(null);
  const [audioErrorMap, setAudioErrorMap] = useState<Record<string, boolean>>({});
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
  }, [userId, activeProgram, activeProgramKey]);

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
          // Si es ADSO y el usuario está en ADSO, cargar banco de respaldo; de lo contrario estado vacío formal
          const isTargetAdso = isAdsoFicha(selectedDictProgram) || isAdsoFicha(activeProgram);
          if (isTargetAdso) {
            setStudyTerms(FALLBACK_ADSO_TERMS);
          } else {
            // Programa sin términos en BD -> Estado Vacío formal sin fallos
            setStudyTerms([]);
          }
        }
      } catch (err) {
        console.warn("Fallo al conectar con diccionario en API:", err);
        if (isCancelled) return;
        const isTargetAdso = isAdsoFicha(selectedDictProgram) || isAdsoFicha(activeProgram);
        if (isTargetAdso) {
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
  }, [selectedDictProgram, activeProgram]);

  const latestResult = testResults[0];
  const hasQuizResult = Boolean(latestResult) || lastTotalQuestions > 0;
  const displayScore = latestResult?.score ?? lastScore;
  const displayCorrectAnswers = latestResult?.correctAnswers ?? lastCorrectAnswers;
  const displayTotalQuestions = latestResult?.totalQuestions ?? lastTotalQuestions;
  const displayDuration = latestResult?.duration ?? lastDuration;

  // Filtrado de evaluaciones por el programa/ficha activo
  const activeProgramFilteredResults = useMemo(() => {
    if (!activeProgram) return testResults;
    const cleanActive = activeProgram.toLowerCase().trim();
    const fichaMatch = cleanActive.match(/\d{4,8}/);
    const fichaCode = fichaMatch ? fichaMatch[0] : null;

    const hasTaggedResults = testResults.some(
      (r) => Boolean(r.studentProgram || (r as any).student_program || (r as any).program)
    );
    if (!hasTaggedResults) return testResults;

    return testResults.filter((r) => {
      const prog = (r.studentProgram || (r as any).student_program || (r as any).program || "").toLowerCase().trim();
      if (!prog) return true;
      if (fichaCode && prog.includes(fichaCode)) return true;
      return prog.includes(cleanActive) || cleanActive.includes(prog);
    });
  }, [testResults, activeProgram]);

  // Protección del Promedio Histórico y Nivel del Estudiante:
  // Solo se computan pruebas formalmente completadas (excluyendo 'Sin Nivel', 'No Presentado', 'Invalidada' e 'Incompleto')
  const validFinishedTests = useMemo(() => {
    return activeProgramFilteredResults.filter(
      (r) =>
        r.level !== "Sin Nivel" &&
        r.level !== "No Presentado" &&
        r.level !== "Invalidada" &&
        r.level !== "Incompleto" &&
        r.character !== "No Presentado" &&
        r.character !== "Incompleto" &&
        (r.totalQuestions > 0 || r.score > 0)
    );
  }, [activeProgramFilteredResults]);

  const latestValidResult = validFinishedTests[0] || (hasQuizResult && lastScore > 0 ? latestResult : null);
  const currentLevel = latestValidResult?.level ?? (hasQuizResult && lastScore > 0 ? getLevelFromScore(displayScore).level : "Sin nivel");

  const stats = {
    testsCompleted: validFinishedTests.length > 0 ? validFinishedTests.length : (hasQuizResult && lastScore > 0 ? 1 : 0),
    averageScore: (() => {
      const val =
        validFinishedTests.length > 0
          ? Math.round(
              validFinishedTests.reduce((sum: number, result: api.ApiTestResult) => sum + result.score, 0) /
                validFinishedTests.length
            )
          : (hasQuizResult && lastScore > 0 ? displayScore : 0);
      return Number.isFinite(val) ? Math.min(Math.max(val, 0), 100) : 0;
    })(),
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

  // Filtrado estricto acumulativo (AND) de términos para el Espacio de Estudio
  const filteredTerms = useMemo(() => {
    return studyTerms.filter((term) => {
      // 1. Filtro por búsqueda de texto
      const termName = (term.wordId || term.name || "").toLowerCase();
      const def = (term.definition || "").toLowerCase();
      const syn = (term.synonyms || "").toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        termName.includes(query) ||
        def.includes(query) ||
        syn.includes(query);

      // 2. Filtro por Habilidad (Category / Skill / Competence)
      const termSkill = (term.competence || (term as any).skill || (term as any).category || "Grammar").toLowerCase();
      const targetSkill = selectedCompetence.toLowerCase();
      const matchesSkill = selectedCompetence === "all" || 
        selectedCompetence === "Todas" || 
        selectedCompetence === "Todos" ||
        termSkill === targetSkill ||
        (targetSkill === "listening" && (termSkill.includes("listen") || termSkill.includes("read")));

      // 3. Filtro por Nivel CEFR (A1, A2, B1, B2)
      const termLevel = (term.level || "A1").toUpperCase();
      const targetLevel = selectedLevel.toUpperCase();
      const matchesLevel = selectedLevel === "all" || 
        selectedLevel === "Todos" || 
        selectedLevel === "Todas" ||
        termLevel === targetLevel;

      return matchesSearch && matchesSkill && matchesLevel;
    });
  }, [studyTerms, selectedLevel, selectedCompetence, searchQuery]);

  // Reproductor de pronunciación controlado con estado (Play/Pause) y fallback nativo Web Speech API
  const speakFallback = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      setPlayingTermId(text);
      utterance.onend = () => setPlayingTermId(null);
      utterance.onerror = () => setPlayingTermId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingTermId(null);
    }
  };

  const handlePlayPronunciation = (term: api.ApiDocument) => {
    const termKey = term.wordId || term.name;

    // 1. Si vuelve a presionar el mismo término, pausarlo inmediatamente
    if (audioRef.current && playingTermId === termKey) {
      audioRef.current.pause();
      audioRef.current = null;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setPlayingTermId(null);
      return;
    }

    // 2. Detener cualquier reproducción previa
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const mediaPath = term.audioUrl || term.audio;
    if (mediaPath) {
      const url = resolveMediaUrl(mediaPath, "dictionary-audios");
      const audio = new Audio(url);
      audio.loop = false; // Asegurar que ningún audio quede en bucle infinito
      audioRef.current = audio;
      setPlayingTermId(termKey);

      audio.onended = () => {
        setPlayingTermId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        // Fallback automático fluido y silencioso con SpeechSynthesis sin spam de toasts
        speakFallback(termKey);
      };

      audio.play().catch(() => {
        speakFallback(termKey);
      });
    } else {
      speakFallback(termKey);
    }
  };

  // Práctica interactiva de pronunciación con el micrófono del navegador
  const handleVoicePractice = (term: api.ApiDocument) => {
    const termKey = term.wordId || term.name;

    // 1. Pausar cualquier audio o síntesis de voz en reproducción para liberar el audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlayingTermId(null);

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
  // Conteo de términos dinámico por nivel y por competencia lingüística
  const dynamicLevelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: filteredTerms.length, A1: 0, A2: 0, B1: 0, B2: 0 };
    studyTerms.forEach((t) => {
      const termSkill = (t.competence || (t as any).skill || (t as any).category || "Grammar").toLowerCase();
      const targetSkill = selectedCompetence.toLowerCase();
      const matchesSkill = selectedCompetence === "all" || selectedCompetence === "Todas" || selectedCompetence === "Todos" || termSkill === targetSkill;
      
      const termName = (t.wordId || t.name || "").toLowerCase();
      const def = (t.definition || "").toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || termName.includes(query) || def.includes(query);

      if (matchesSkill && matchesSearch) {
        const lvl = (t.level || "A1").toUpperCase();
        if (counts[lvl] !== undefined) counts[lvl]++;
      }
    });
    return counts;
  }, [studyTerms, selectedCompetence, searchQuery, filteredTerms.length]);

  const dynamicCompCounts = useMemo(() => {
    const counts: Record<string, number> = { all: filteredTerms.length, Speaking: 0, Writing: 0, Grammar: 0, Reading: 0, Listening: 0 };
    studyTerms.forEach((t) => {
      const termLevel = (t.level || "A1").toUpperCase();
      const targetLevel = selectedLevel.toUpperCase();
      const matchesLevel = selectedLevel === "all" || selectedLevel === "Todos" || selectedLevel === "Todas" || termLevel === targetLevel;

      const termName = (t.wordId || t.name || "").toLowerCase();
      const def = (t.definition || "").toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || termName.includes(query) || def.includes(query);

      if (matchesLevel && matchesSearch) {
        const c = t.competence || "Grammar";
        if (counts[c] !== undefined) counts[c]++;
        else if (c.toLowerCase().includes("listen")) counts.Listening++;
      }
    });
    return counts;
  }, [studyTerms, selectedLevel, searchQuery, filteredTerms.length]);

  const levelCounts = dynamicLevelCounts;

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Encabezado Dinámico y Accesible (Smart Auto-hide con Scroll) ─── */}
      <header
        className={`sticky top-0 h-16 sm:h-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40 transition-transform duration-300 ease-in-out ${
          isHeaderVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="h-16 sm:h-20 flex items-center justify-between gap-3">
            {/* Isotipo/Logos e Identidad Institucional Worklex */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => navigate("/")}
                title="Ir a la página principal de WorkLex (Inicio)"
                className="group flex items-center gap-2.5 sm:gap-3.5 p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left cursor-pointer"
              >
                <WorklexBrandLogo size="md" showText={true} />
                <span className="h-6 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
                <img
                  src="/logo-sena.png"
                  alt="SENA"
                  className="h-8 sm:h-9 w-auto object-contain shrink-0 opacity-90"
                />
              </button>
              <div className="hidden lg:flex items-center">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ecosistema Digital Worklex
                </span>
              </div>
            </div>

            {/* Menú de navegación centrado con enlaces limpios */}
            <nav className="hidden md:flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveMainTab("overview");
                  setOverviewSubTab("main");
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeMainTab === "overview" && overviewSubTab === "main"
                    ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 font-semibold"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                Evaluación y Progreso
              </button>
              <button
                type="button"
                onClick={() => setActiveMainTab("study")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeMainTab === "study"
                    ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 font-semibold"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                Diccionario Técnico
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMainTab("overview");
                  setOverviewSubTab("stats");
                  setShowStatsDrawer(true);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeMainTab === "overview" && overviewSubTab === "stats"
                    ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 font-semibold"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                Historial y Métricas
              </button>
            </nav>

            {/* Acciones del Header: Menú y Perfil */}
            <div className="flex items-center gap-2">
              <RoleSwitcher />
              <HeaderActionTools />

              {/* Botón Móvil Hamburguesa */}
              <button
                type="button"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
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
                className="md:hidden mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveMainTab("overview");
                    setShowMobileMenu(false);
                  }}
                  className="text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Evaluación y Progreso
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMainTab("study");
                    setShowMobileMenu(false);
                  }}
                  className="text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Diccionario Técnico
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 lg:px-8 py-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 space-y-2"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 mb-2 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 text-xs sm:text-sm font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Plataforma Inteligente de Aprendizaje
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Hola, {userName.split(" ")[0]}
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 mt-1">
                Continúa fortaleciendo tus competencias en inglés técnico para desarrollo de software.
              </p>
            </div>
            <div
              className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700"
              title={`Programa SENA actualmente seleccionado: ${activeProgram}`}
            >
              <GraduationCap className="w-4 h-4 text-[#39A900] flex-shrink-0" strokeWidth={1.8} />
              <span className="truncate max-w-[420px]">{formatProgramFichaHeader(activeProgram)}</span>
            </div>
          </div>
        </motion.div>

        {/* Sistema de Pestañas (Tabs) Formal y Plano */}
        <div className="flex items-center gap-6 mb-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveMainTab("overview");
              setSearchParams({});
            }}
            title="Ver tu progreso actual y realizar pruebas de nivel"
            className={`inline-flex items-center gap-2 pb-3 px-1 border-b-2 text-sm transition-colors whitespace-nowrap cursor-pointer -mb-px ${
              activeMainTab === "overview"
                ? "border-[#39A900] text-slate-900 dark:text-white font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
            }`}
          >
            <FileQuestion className="w-4 h-4" strokeWidth={1.8} />
            <span>Evaluación y Progreso</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMainTab("study");
            }}
            title="Explorar el Diccionario Técnico especializado de tu ficha"
            className={`inline-flex items-center gap-2 pb-3 px-1 border-b-2 text-sm transition-colors whitespace-nowrap cursor-pointer -mb-px ${
              activeMainTab === "study"
                ? "border-[#39A900] text-slate-900 dark:text-white font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
            }`}
          >
            <BookOpen className="w-4 h-4" strokeWidth={1.8} />
            <span>Diccionario Técnico SENA</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                activeMainTab === "study"
                  ? "bg-emerald-50 text-[#39A900] border border-emerald-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {studyTerms.length}
            </span>
          </button>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* VISTA 1: EVALUACIÓN Y PROGRESO                                            */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeMainTab === "overview" && (
          <div className="space-y-5">
            {/* 1. Tarjeta de "Prueba de Nivel" (Con Bloqueo Condicional si no hay Diccionario Asignado) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-[#39A900] rounded-2xl p-6 sm:p-7 shadow-sm"
            >
              {studyTerms.length === 0 ? (
                /* Estado bloqueado si no hay diccionario asignado a la ficha */
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Evaluación Pendiente de Asignación
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                      Prueba de Nivel de Inglés Técnico
                    </h3>
                    <p className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm leading-relaxed">
                      No hay un diccionario asignado a tu ficha actualmente. El examen estará disponible una vez tu instructor asigne el contenido.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
                    <button
                      type="button"
                      disabled={true}
                      title="No hay un diccionario asignado a tu ficha actualmente. El examen estará disponible una vez tu instructor asigne el contenido."
                      className="h-12 px-6 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-not-allowed opacity-50 shadow-none border border-slate-200 dark:border-slate-700"
                    >
                      <FileQuestion className="w-5 h-5" strokeWidth={1.8} />
                      <span>Comenzar Prueba de Nivel</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#39A900] uppercase tracking-wider">
                        Evaluación Adaptativa A1 → B2
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                      Prueba de Nivel de Inglés Técnico
                    </h3>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                      Diagnostica y certifica tus competencias comunicativas en inglés con nuestro motor adaptativo y retroalimentación pedagógica instantánea.
                    </p>
                  </div>

                  {/* Progreso compacto y Botón de Acción a la derecha */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 lg:gap-6 flex-shrink-0">
                    <div className="flex items-center gap-4 sm:border-r sm:border-slate-200 dark:sm:border-slate-700 sm:pr-5">
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium">Nivel actual</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.currentLevel}</p>
                      </div>
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium">Promedio</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{stats.averageScore}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#39A900] rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(Math.max(stats.averageScore, 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigate("/quiz")}
                        title="Haz clic para iniciar tu evaluación de nivel con instrucciones previas y temporizador adaptativo"
                        className="h-12 px-6 bg-[#39A900] hover:bg-[#2e8600] text-white rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
                      >
                        <FileQuestion className="w-5 h-5" strokeWidth={1.8} />
                        <span>Comenzar Prueba de Nivel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const histEl = document.getElementById("historial-pruebas-section");
                          histEl?.scrollIntoView({ behavior: "smooth" });
                        }}
                        title="Ver el historial de intentos anteriores y detalles de puntuación"
                        className="h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <History className="w-4 h-4" strokeWidth={1.8} />
                        <span className="hidden sm:inline">Intentos</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* 2. Accesos Directos al Diccionario Técnico */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">
                      Diccionario Técnico Centralizado
                    </h4>
                    <p className="text-xs text-slate-500">
                      Base de datos multimedia compartida con aprendices e instructores SENA
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDictModalOpen(true)}
                  title="Seleccionar ficha y abrir el catálogo técnico de términos especializados"
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-sena-blue text-white text-xs font-semibold hover:bg-sena-blue/90 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
                >
                  <span>Abrir Diccionario Completo</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              </div>

              {/* Atajos por Competencia Lingüística */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {[
                  { comp: "Speaking", label: "Speaking", desc: "Pronunciación y fluidez", icon: Mic, color: "cyan" },
                  { comp: "Writing", label: "Writing", desc: "Redacción y ortografía", icon: PenTool, color: "rose" },
                  { comp: "Grammar", label: "Grammar", desc: "Estructuras y sintaxis", icon: Languages, color: "purple" },
                  { comp: "Reading", label: "Reading", desc: "Comprensión de lectura", icon: BookOpen, color: "amber" },
                ].map((item) => {
                  const CompIcon = item.icon;
                  return (
                    <button
                      key={item.comp}
                      type="button"
                      onClick={() => {
                        setActiveMainTab("study");
                        setSelectedCompetence(item.comp);
                        setSearchParams({ tab: "study" });
                      }}
                      title={`Explorar términos de ${item.label}`}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100/80 text-left cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <CompIcon className="w-4 h-4 text-sena-blue" strokeWidth={1.8} />
                          <p className="font-semibold text-xs text-slate-900 dark:text-white">
                            {item.label}
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. SECCIÓN ORDENADA EN LA PARTE INFERIOR: RENDIMIENTO, MÉTRICAS Y HISTORIAL */}
            <div id="historial-pruebas-section" className="space-y-4 pt-0">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-emerald-600" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                      Métricas de Rendimiento Académico
                    </h4>
                    <p className="text-xs text-slate-500">
                      Progreso real, promedio general e historial de evaluaciones del aprendiz
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStatsDrawer(true)}
                  title="Abrir panel lateral rápido de métricas"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sena-blue" strokeWidth={1.8} />
                  <span>Panel Lateral</span>
                </button>
              </div>

              {/* Cuadrícula de 4 Métricas Profesionales MatDash */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Pruebas Realizadas",
                    value: stats.testsCompleted,
                    icon: BarChart3,
                    iconBox: "bg-blue-50 text-blue-600",
                    tip: "Total de evaluaciones completadas por el aprendiz",
                  },
                  {
                    label: "Nivel CEFR Actual",
                    value: stats.currentLevel || "A1",
                    icon: GraduationCap,
                    iconBox: "bg-emerald-50 text-emerald-600",
                    tip: "Nivel de competencia lingüística según el MCER",
                  },
                  {
                    label: "Tiempo Invertido",
                    value: stats.quizDuration,
                    icon: Clock,
                    iconBox: "bg-blue-50 text-blue-600",
                    tip: "Tiempo invertido en la evaluación",
                  },
                  {
                    label: "Promedio General",
                    value: `${stats.averageScore}%`,
                    icon: Trophy,
                    iconBox: "bg-amber-50 text-amber-500",
                    tip: "Calificación promedio real sobre 100",
                  },
                ].map((stat, index) => (
                  <div
                    key={index}
                    title={stat.tip}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{stat.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg ${stat.iconBox} flex items-center justify-center shrink-0`}>
                      <stat.icon className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Historial de Pruebas Realizadas y Retroalimentación */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Historial */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
                    <div className="flex items-center gap-2.5">
                      <History className="w-5 h-5 text-sena-blue" strokeWidth={1.8} />
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">Historial de Pruebas Realizadas</h4>
                        <p className="text-xs text-slate-500">Listado de evaluaciones y desglose de aciertos</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {recentTests.length} {recentTests.length === 1 ? "prueba" : "pruebas"}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {isLoadingResults ? (
                      <div className="py-6 px-3 space-y-4">
                        {[1, 2, 3].map((item) => (
                          <div key={item} className="flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-lg bg-slate-200" />
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
                          className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 px-3 rounded-lg transition-colors group cursor-pointer"
                          onClick={() => setSelectedTest(test)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs border ${
                                test.score >= 80
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : test.score >= 60
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {test.score}%
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                  {test.level}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  {test.correctAnswers}/{test.totalQuestions} aciertos
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
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
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          >
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center space-y-2">
                        <History className="w-10 h-10 text-slate-300 mx-auto" strokeWidth={1.8} />
                        <p className="text-xs text-slate-500">
                          Aún no has completado ninguna prueba de nivel.
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate("/quiz")}
                          className="text-xs text-[#39A900] font-semibold hover:underline"
                        >
                          Comenzar tu primera evaluación →
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Retroalimentación docente */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <MessageSquare className="w-5 h-5 text-[#39A900]" strokeWidth={1.8} />
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Retroalimentación del Instructor</h4>
                      <p className="text-xs text-slate-500">Observaciones pedagógicas</p>
                    </div>
                  </div>

                  {feedbacks.length > 0 ? (
                    feedbacks.map((f) => (
                      <div key={f.id} className="p-3.5 bg-slate-50 rounded-lg space-y-1.5 border border-slate-200">
                        <p className="text-xs font-semibold text-slate-900">{f.teacher} • {f.date}</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{f.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 px-4 bg-slate-50/70 rounded-lg border border-dashed border-slate-200 flex items-center gap-3 text-slate-500">
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
                    {filteredTerms.length}
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Términos Filtrados</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Imágenes</span>
                  <span className="text-2xl font-bold text-slate-800 font-mono">
                    {filteredTerms.filter(t => Boolean(t.image || t.imageUrl || (t as any).image_url || (t as any).has_image)).length}
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Recursos Visuales</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Audios</span>
                  <span className="text-2xl font-bold text-slate-800 font-mono">
                    {filteredTerms.filter(t => Boolean(t.audio || t.audioUrl || (t as any).audio_url || (t as any).has_audio)).length}
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Pronunciación Nativa</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Videos</span>
                  <span className="text-2xl font-bold text-slate-800 font-mono">
                    {filteredTerms.filter(t => Boolean(t.video || t.videoUrl || (t as any).video_url || (t as any).has_video)).length}
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
                  <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    {/* Buscador en Vivo */}
                    <div className="relative flex-1">
                      <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                      <input
                        type="text"
                        placeholder="Buscar por término técnico o definición (ej. Polymorphism, Database, API)..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-12 pl-12 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#39A900]/40 focus:border-[#39A900] transition-all"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-5 h-5" strokeWidth={1.8} />
                        </button>
                      )}
                    </div>

                    {/* Filtro por Competencia con Contadores Dinámicos */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                      <span className="text-xs text-slate-500 font-medium mr-1 whitespace-nowrap">Habilidad:</span>
                      {["all", "Speaking", "Writing", "Grammar", "Listening"].map(comp => (
                        <button
                          key={comp}
                          type="button"
                          onClick={() => setSelectedCompetence(comp)}
                          className={`h-10 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                            selectedCompetence === comp
                              ? "bg-[#39A900] text-white shadow-xs font-semibold"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {comp === "all" ? `Todas (${dynamicCompCounts.all || filteredTerms.length})` : `${comp} (${dynamicCompCounts[comp] || 0})`}
                        </button>
                      ))}
                    </div>

                    {/* Filtro por Nivel CEFR con Contadores Dinámicos */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                      <span className="text-xs text-slate-500 font-medium mr-1 whitespace-nowrap">Nivel:</span>
                      {["all", "A1", "A2", "B1", "B2"].map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSelectedLevel(lvl)}
                          className={`h-10 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                            selectedLevel === lvl
                              ? "bg-[#39A900] text-white shadow-xs font-semibold"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {lvl === "all" ? `Todos (${dynamicLevelCounts.all || filteredTerms.length})` : `${lvl} (${dynamicLevelCounts[lvl] || 0})`}
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
                          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.8} />
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
                            isAudioUnavailable={Boolean(audioErrorMap[termKey])}
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
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                              Vocabulario Técnico {selectedDictProgram || activeProgram || "SENA"} — {filteredTerms.length === studyTerms.length ? `${studyTerms.length} Términos` : `${filteredTerms.length} de ${studyTerms.length} Términos`}
                            </h3>
                            <p className="text-xs text-slate-500">
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
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-1">
                        {/* Buscador en Vivo */}
                        <div className="relative flex-1">
                          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                          <input
                            type="text"
                            placeholder="Buscar por término técnico o definición (ej. Polymorphism, Database, API)..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-12 pl-12 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#39A900]/40 focus:border-[#39A900] transition-all"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery("")}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <X className="w-5 h-5" strokeWidth={1.8} />
                            </button>
                          )}
                        </div>

                        {/* Filtro por Competencia Lingüística con Contadores Dinámicos */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                          <span className="text-xs text-slate-500 font-medium mr-1 whitespace-nowrap">Habilidad:</span>
                          {["all", "Speaking", "Writing", "Grammar", "Listening"].map(comp => (
                            <button
                              key={comp}
                              type="button"
                              onClick={() => setSelectedCompetence(comp)}
                              className={`h-10 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                selectedCompetence === comp
                                  ? "bg-[#39A900] text-white shadow-xs font-semibold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {comp === "all" ? `Todas (${dynamicCompCounts.all || filteredTerms.length})` : `${comp} (${dynamicCompCounts[comp] || 0})`}
                            </button>
                          ))}
                        </div>

                        {/* Filtro por Nivel CEFR con Contadores Dinámicos */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                          <span className="text-xs text-slate-500 font-medium mr-1 whitespace-nowrap">Nivel:</span>
                          {["all", "A1", "A2", "B1", "B2"].map(lvl => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setSelectedLevel(lvl)}
                              className={`h-10 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                selectedLevel === lvl
                                  ? "bg-[#39A900] text-white shadow-xs font-semibold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {lvl === "all" ? `Todos (${dynamicLevelCounts.all || filteredTerms.length})` : `${lvl} (${dynamicLevelCounts[lvl] || 0})`}
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
                              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.8} />
                              Restablecer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cuerpo del Modal: Grid Responsivo con scroll vertical */}
                    <div className="overflow-y-auto p-6 flex-1 bg-slate-50/50 space-y-5">
                      {/* Métricas Consolidadas Reales en Tiempo Real */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
                          <span className="text-[11px] text-slate-500 font-medium block">Palabras</span>
                          <span className="text-xl font-bold text-slate-800 dark:text-white font-mono">
                            {filteredTerms.length}
                          </span>
                          <span className="text-[10px] text-emerald-600 block font-medium">Términos Filtrados</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
                          <span className="text-[11px] text-slate-500 font-medium block">Imágenes</span>
                          <span className="text-xl font-bold text-slate-800 dark:text-white font-mono">
                            {filteredTerms.filter(t => Boolean(t.image || t.imageUrl || (t as any).image_url || (t as any).has_image)).length}
                          </span>
                          <span className="text-[10px] text-emerald-600 block font-medium">Recursos Visuales</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
                          <span className="text-[11px] text-slate-500 font-medium block">Audios</span>
                          <span className="text-xl font-bold text-slate-800 dark:text-white font-mono">
                            {filteredTerms.filter(t => Boolean(t.audio || t.audioUrl || (t as any).audio_url || (t as any).has_audio)).length}
                          </span>
                          <span className="text-[10px] text-emerald-600 block font-medium">Pronunciación Nativa</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
                          <span className="text-[11px] text-slate-500 font-medium block">Videos</span>
                          <span className="text-xl font-bold text-slate-800 dark:text-white font-mono">
                            {filteredTerms.filter(t => Boolean(t.video || t.videoUrl || (t as any).video_url || (t as any).has_video)).length}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium">Videoclips Técnicos</span>
                        </div>
                      </div>

                      {studyTerms.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-border p-8 shadow-xs space-y-3 max-w-lg mx-auto my-8">
                          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" strokeWidth={1.8} />
                          <h4 className="font-bold text-foreground text-lg">Diccionario en construcción</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                            No hay un diccionario asignado a tu ficha actualmente. El examen y el vocabulario estarán disponibles una vez tu instructor asigne el contenido a la ficha{" "}
                            <strong className="text-foreground">{selectedDictProgram}</strong>.
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
                                isAudioUnavailable={Boolean(audioErrorMap[termKey])}
                                onPlayPronunciation={handlePlayPronunciation}
                                onVoicePractice={handleVoicePractice}
                                onOpenLightbox={(t) => setSelectedLightboxDoc(t)}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 shadow-xs space-y-4 max-w-lg mx-auto my-8">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                            <BookOpen className="w-7 h-7" strokeWidth={1.8} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">No se encontraron términos para estos filtros</h4>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed mt-1">
                              No hay términos técnicos que coincidan con la combinación actual de búsqueda, habilidad o nivel CEFR.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLevel("all");
                              setSelectedCompetence("all");
                              setSearchQuery("");
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs"
                          >
                            <RotateCcw className="w-4 h-4" strokeWidth={1.8} />
                            <span>Restablecer Filtros</span>
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
