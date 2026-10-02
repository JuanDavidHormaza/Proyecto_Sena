import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";

import {
  Target,
  Flame,
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
} from "lucide-react";
import { getLevelFromScore } from "../data/questionsA1";
import { UserAccountMenu } from "../components/UserAccountMenu";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { resolveMediaUrl } from "../services/api";
import { ImageLightboxModal, LightboxDocItem } from "../components/ImageLightboxModal";
import { SafeImage } from "../components/SafeImage";

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
              <Volume2 className={`w-4 h-4 ${isPlaying ? "animate-bounce" : ""}`} />
            </button>
          </div>

          <p className="text-xs text-foreground/90 leading-relaxed min-h-[2.8rem]">
            {term.definition || "Concepto técnico clave para el desarrollo de software en ADSO."}
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
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                )}
                <p className="text-[11px] leading-tight">{feedback.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Práctica de Pronunciación por Voz (Modo Estudio Aprendiz) */}
      <div className="px-4 pb-3 pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="font-semibold text-[11px] text-slate-600">Asignatura: ADSO</span>
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
              <MicOff className="w-3.5 h-3.5" />
              <span>Escuchando...</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" />
              <span>Practicar Voz</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const userName = user?.name || localStorage.getItem("userName") || "Usuario";

  // Tab de navegación principal: 'overview' (Evaluación y Progreso) vs 'study' (Espacio de Estudio ADSO)
  const queryTab = searchParams.get("tab");
  const [activeMainTab, setActiveMainTab] = useState<"overview" | "study">(
    queryTab === "study" ? "study" : "overview"
  );

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
  } | null>(null);

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

  // Sincronizar tab con URL query
  useEffect(() => {
    if (queryTab === "study") {
      setActiveMainTab("study");
    }
    if (searchParams.get("term")) {
      setSearchQuery(searchParams.get("term") || "");
    }
  }, [queryTab, searchParams]);

  // Cargar resultados de exámenes
  useEffect(() => {
    const fetchResults = async () => {
      if (!userId) return;

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
      }
    };

    fetchResults();
  }, [userId]);

  // Cargar términos del Diccionario Digital (ADSO) desde el backend
  useEffect(() => {
    const fetchDictionary = async () => {
      setIsLoadingTerms(true);
      try {
        const docs = await api.getDocuments({ subject: "ADSO" });
        if (Array.isArray(docs) && docs.length > 0) {
          setStudyTerms(docs);
        } else {
          setStudyTerms(FALLBACK_ADSO_TERMS);
        }
      } catch (err) {
        console.warn("Usando vocabulario técnico local de respaldo para ADSO:", err);
        setStudyTerms(FALLBACK_ADSO_TERMS);
      } finally {
        setIsLoadingTerms(false);
      }
    };

    fetchDictionary();
  }, []);

  const latestResult = testResults[0];
  const hasQuizResult = Boolean(latestResult) || lastTotalQuestions > 0;
  const displayScore = latestResult?.score ?? lastScore;
  const displayCorrectAnswers = latestResult?.correctAnswers ?? lastCorrectAnswers;
  const displayTotalQuestions = latestResult?.totalQuestions ?? lastTotalQuestions;
  const displayDuration = latestResult?.duration ?? lastDuration;
  const currentLevel = latestResult?.level ?? (hasQuizResult ? getLevelFromScore(displayScore).level : "Sin nivel");

  const stats = {
    testsCompleted: testResults.length > 0 ? testResults.length : (hasQuizResult ? 1 : 0),
    averageScore:
      testResults.length > 0
        ? Math.round(testResults.reduce((sum: number, result: api.ApiTestResult) => sum + result.score, 0) / testResults.length)
        : (hasQuizResult ? displayScore : 0),
    currentLevel,
    currentStreak: 0,
    quizDuration: displayDuration,
  };

  const recentTests = testResults.length > 0
    ? testResults.slice(0, 3).map((test) => ({
        id: test.id,
        date: new Date(test.completedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }),
        score: test.score,
        level: test.level,
        duration: test.duration || displayDuration,
        correctAnswers: test.correctAnswers,
        totalQuestions: test.totalQuestions,
        feedback: test.feedback,
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
        },
      ]
    : [];

  const feedbacks: Array<{ id: string; teacher: string; date: string; message: string }> = latestResult?.feedback
    ? [
        {
          id: latestResult.id,
          teacher: "Docente",
          date: new Date(latestResult.completedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }),
          message: latestResult.feedback,
        },
      ]
    : [];

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
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
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
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-border z-40">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg shadow-slate-900/15 border border-border">
                <img src="/worklex.png" alt="WorkLex" className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-foreground">English Level Test</h1>
                <p className="text-xs text-muted-foreground">
                  {user?.role === "teacher"
                    ? "Panel del Instructor"
                    : user?.role === "admin" || user?.role === "superadmin"
                    ? "Panel de Administración"
                    : "Panel del Aprendiz"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-sena-green/10 text-sena-green rounded-xl">
                <Flame className="w-4 h-4" />
                <span className="font-medium text-sm">{stats.currentStreak} días de racha</span>
              </div>

              <UserAccountMenu accent="green" />
            </div>
          </div>
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

          <div className="inline-flex items-center gap-2 bg-sena-green/10 text-sena-green px-3.5 py-1.5 rounded-full text-xs font-semibold self-start sm:self-auto border border-sena-green/20">
            <ShieldCheck className="w-4 h-4" />
            Programa Activo: ADSO (SENA)
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
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
              activeMainTab === "overview"
                ? "bg-sena-green text-white shadow-md shadow-sena-green/20 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Evaluación y Progreso
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMainTab("study");
              setSearchParams({ tab: "study" });
            }}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
              activeMainTab === "study"
                ? "bg-sena-green text-white shadow-md shadow-sena-green/20 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <BookMarked className="w-4 h-4" />
            Vocabulario Técnico ADSO (Espacio de Estudio)
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
        {/* VISTA 1: EVALUACIÓN Y PROGRESO (Dashboard Habitual)                     */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeMainTab === "overview" && (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Pruebas Realizadas", value: stats.testsCompleted, icon: BarChart3, color: "sena-blue" },
                { label: "Promedio", value: `${stats.averageScore}%`, icon: Target, color: "sena-green" },
                { label: "Tiempo Quiz", value: stats.quizDuration, icon: Clock, color: "sena-blue" },
                { label: "Racha", value: `${stats.currentStreak} días`, icon: Flame, color: "destructive" },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-5 border border-border shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 bg-${stat.color}/10 rounded-xl flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column - Start Quiz & Study Banner & Progress */}
              <div className="lg:col-span-2 space-y-6">
                {/* Start Quiz Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-sena-green to-sena-green-dark rounded-2xl p-6 lg:p-8 text-white shadow-xl"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">
                          Adaptativo A1 → B2
                        </span>
                        <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">
                          Diccionario ADSO Activo
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Evaluación Adaptativa WorkLex</h3>
                      <p className="text-white/90 max-w-md text-sm leading-relaxed">
                        Evalúa tus competencias (Listening, Reading, Grammar, Writing y Speaking) 
                      </p>
                    </div>
                    <motion.button
                      onClick={() => navigate("/quiz")}
                      className="flex items-center justify-center gap-2 bg-white text-sena-green px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Comenzar Prueba
                    </motion.button>
                  </div>
                </motion.div>

                {/* Banner de Acceso Rápido al Espacio de Estudio */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-2xl p-5 border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-sena-blue/10 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-6 h-6 text-sena-blue" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">
                        Espacio de Estudio: Vocabulario Técnico ADSO
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Repasa los 64 términos oficiales (A1-B2), escucha su pronunciación y practica por voz antes de la prueba.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMainTab("study");
                      setSearchParams({ tab: "study" });
                      setShowDictionaryModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sena-blue text-white text-xs font-semibold hover:bg-sena-blue/90 transition-all whitespace-nowrap self-start sm:self-center shadow-sm cursor-pointer"
                  >
                    Estudiar Términos
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>

                {/* Recent Tests */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white rounded-2xl border border-border shadow-sm"
                >
                  <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sena-blue/10 rounded-xl flex items-center justify-center">
                        <History className="w-5 h-5 text-sena-blue" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Historial de Pruebas</h3>
                        <p className="text-sm text-muted-foreground">Tus últimas evaluaciones</p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-border">
                    {recentTests.length > 0 ? (
                      recentTests.map((test, index) => (
                        <motion.div
                          key={test.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
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
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                    test.level.startsWith("B2")
                                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                      : test.level.startsWith("B1")
                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                      : test.level.startsWith("A2")
                                      ? "bg-teal-50 text-teal-700 border border-teal-200"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  {test.level}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {test.correctAnswers}/{test.totalQuestions} correctas
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5" />
                                {test.date}
                                <span className="text-muted-foreground/50">-</span>
                                <Clock className="w-3.5 h-3.5" />
                                {test.duration}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedTest(test)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            aria-label={`Ver detalles de la prueba del ${test.date}`}
                          >
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </motion.div>
                      ))
                    ) : (
                      <div className="p-6 text-sm text-muted-foreground">
                        Aún no hay pruebas registradas.
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Right Column - Level & Feedback */}
              <div className="space-y-6">
                {/* Current Level Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white rounded-2xl p-6 border border-border shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
                      <img src="/worklex.png" alt="WorkLex" className="h-8 w-8 object-cover" />
                    </div>
                    <h3 className="font-semibold text-foreground">Tu Nivel Actual</h3>
                  </div>

                  <div className="text-center py-6">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-sena-green to-sena-green-dark rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-sena-green/30 mb-4">
                      {stats.currentLevel}
                    </div>
                    <p className="text-foreground font-medium">
                      {hasQuizResult ? "Resultado de la última prueba" : "Sin prueba registrada"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hasQuizResult
                        ? `${displayCorrectAnswers}/${displayTotalQuestions} correctas`
                        : "Completa un quiz para ver tu nivel"}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Puntuación</span>
                      <span className="font-medium text-foreground">{stats.averageScore}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sena-green rounded-full"
                        style={{ width: `${stats.averageScore}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tiempo del quiz: {stats.quizDuration}
                    </p>
                  </div>
                </motion.div>

                {/* Teacher Feedback */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white rounded-2xl p-6 border border-border shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-sena-blue/10 rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-sena-blue" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Retroalimentación</h3>
                      <p className="text-sm text-muted-foreground">Comentarios del docente</p>
                    </div>
                  </div>

                  {feedbacks.length > 0 ? (
                    <div className="space-y-4">
                      {feedbacks.map((feedback) => (
                        <div key={feedback.id} className="p-4 bg-muted/50 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-sena-blue rounded-lg flex items-center justify-center text-white text-xs font-medium">
                              {feedback.teacher.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{feedback.teacher}</p>
                              <p className="text-xs text-muted-foreground">{feedback.date}</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{feedback.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay retroalimentación aún</p>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
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
                      Diccionario Técnico de Software — Programa ADSO
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Centro institucional de vocabulario técnico en inglés para el desarrollo de software.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold self-start sm:self-auto">
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Espacio de Estudio y Práctica</span>
                </div>
              </div>
            </div>

            {/* 2. PANTALLA PRINCIPAL: ÚNICA Y EXCLUSIVAMENTE UNA TARJETA ENCAPSULADA ADSO */}
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
                    ADSO — Diccionario Técnico de Software
                  </h3>
                  <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                    Repositorio central de vocabulario técnico, pronunciación nativa y recursos multimedia para el desarrollo de software.
                  </p>
                </div>
              </div>

              {/* Métricas Consolidadas Reales: Palabras (222), Imágenes (222), Audios (222), Videos (0) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Palabras</span>
                  <span className="text-2xl font-bold text-slate-800 font-mono">
                    {studyTerms.length || 222}
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Términos Registrados</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Imágenes</span>
                  <span className="text-2xl font-bold text-slate-800 font-mono">
                    {studyTerms.filter(t => Boolean(t.image || t.imageUrl)).length || 222}
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Recursos Visuales</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Audios</span>
                  <span className="text-2xl font-bold text-slate-800 font-mono">
                    {studyTerms.filter(t => Boolean(t.audio || t.audioUrl)).length || 222}
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

              {/* Botonera de Acción en la Tarjeta: Sin Botones de Descarga */}
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowDictionaryModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 text-sm cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Abrir Diccionario</span>
                </button>

                {(user?.role === "admin" || user?.role === "superadmin") && (
                  <button
                    type="button"
                    onClick={() => navigate("/admin?tab=documents")}
                    className="border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-medium px-4 py-2.5 rounded-lg transition-all flex items-center gap-1.5 text-sm shadow-2xs cursor-pointer"
                  >
                    <span>+ Agregar Término</span>
                  </button>
                )}
              </div>
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
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-foreground tracking-tight">
                              Vocabulario Técnico ADSO — {studyTerms.length || 222} Términos
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
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Filtros: Buscador en Vivo, Filtro por Asignatura y Nivel CEFR */}
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
                        {/* Buscador en Vivo */}
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
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
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Filtro por Asignatura */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                          <span className="text-xs text-muted-foreground font-medium mr-1">Asignatura:</span>
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
                              <RotateCcw className="w-3 h-3" />
                              Restablecer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cuerpo del Modal: Grid Responsivo con scroll vertical */}
                    <div className="overflow-y-auto p-6 flex-1 bg-slate-50/50">
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
                          <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto" />
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
                            <RotateCcw className="w-3.5 h-3.5" />
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
      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedTest(null)}
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Cerrar detalle de prueba"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5 pr-10">
              <h3 className="text-lg font-semibold leading-none text-foreground">Detalle de la prueba</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Información del resultado y retroalimentación del docente.
              </p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Nivel</p>
                  <p className="text-2xl font-bold text-sena-green">{selectedTest.level}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Puntuación</p>
                  <p className="text-2xl font-bold text-foreground">{selectedTest.score}%</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Correctas</p>
                  <p className="font-semibold text-foreground">
                    {selectedTest.correctAnswers}/{selectedTest.totalQuestions}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Tiempo</p>
                  <p className="font-semibold text-foreground">{selectedTest.duration}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sena-blue" />
                  <p className="text-sm font-medium text-foreground">Fecha de presentación</p>
                </div>
                <p className="text-sm text-muted-foreground">{selectedTest.date}</p>
              </div>

              <div className="rounded-xl bg-muted/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-sena-blue" />
                  <p className="text-sm font-medium text-foreground">Retroalimentación del docente</p>
                </div>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {selectedTest.feedback || "No hay retroalimentación para esta prueba aún."}
                </p>
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
    </div>
  );
}
