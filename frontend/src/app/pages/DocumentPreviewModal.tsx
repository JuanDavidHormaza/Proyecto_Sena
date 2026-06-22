import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    FileText, Tag, AlignLeft, Loader2, BookOpen,
    Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
    Sparkles, Hash,X
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface DocumentPreviewProps {
    doc: {
    id: string;
    name: string;
    fileType: string;
    size: string;
    uploadedAt: string;
    program: string;
    subjectName: string;
    objectUrl?: string;   // URL local (URL.createObjectURL)
    } | null;
    onClose: () => void;
}

interface AIAnalysis {
    description: string;
    keywords: string[];
    language: string;
    level: string;
}

// ─── Utilidad: leer texto de un archivo ──────────────────────────────────────
async function extractTextFromFile(file: File | null, url: string): Promise<string> {
  // Para archivos de texto plano o similares leemos directamente
    if (!file) return "";
    const textTypes = ["text/plain", "text/html", "text/csv"];
    if (textTypes.includes(file.type) || file.name.endsWith(".txt")) {
    return await file.text();
    }
  // Para el resto devolvemos un placeholder con el nombre del archivo
  // (en producción usarías pdf.js o mammoth.js para extraer el texto real)
    return `[Documento: ${file.name}] Tamaño: ${(file.size / 1024).toFixed(1)} KB. Tipo: ${file.type || file.name.split(".").pop()?.toUpperCase()}.`;
}

// ─── Llamada a la API de Anthropic ───────────────────────────────────────────
async function analyzeDocument(text: string, filename: string): Promise<AIAnalysis> {
    const prompt = `Eres un asistente educativo especializado en inglés para el SENA (Colombia).
Analiza el siguiente contenido de un documento educativo y devuelve un JSON con esta estructura exacta (sin markdown, solo el JSON):
{
    "description": "Descripción clara y concisa del documento en español (máximo 3 oraciones). Explica de qué trata y para qué sirve.",
    "keywords": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5", "palabra6", "palabra7", "palabra8"],
    "language": "Español o Inglés o Bilingüe",
    "level": "A1, A2, B1, B2, C1 o C2 (nivel de inglés del contenido, o N/A si no aplica)"
}

Las palabras clave deben ser términos relevantes del documento, idealmente en inglés si es material de aprendizaje.

Nombre del archivo: ${filename}
Contenido del documento:
${text.slice(0, 3000)}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
    }),
    });

    const data = await response.json();
    const raw = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
    try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
    return {
        description: "No se pudo analizar el contenido del documento automáticamente.",
        keywords: [],
        language: "Desconocido",
        level: "N/A",
        };
    }
}

// ─── Colores para las keywords (cíclicos) ────────────────────────────────────
const KW_COLORS = [
    "bg-sena-green/10 text-sena-green border-sena-green/20",
    "bg-sena-blue/10 text-sena-blue border-sena-blue/20",
    "bg-purple-100 text-purple-700 border-purple-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-cyan-100 text-cyan-700 border-cyan-200",
];

// ════════════════════════════════════════════════════════════════════════════
export function DocumentPreviewModal({ doc, onClose }: DocumentPreviewProps) {
    const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [zoom, setZoom] = useState(100);
    const iframeRef = useRef<HTMLIFrameElement>(null);

  // Cuando cambia el doc, arranca el análisis IA
    useEffect(() => {
    if (!doc) return;
    setAnalysis(null);
    setLoadingAI(true);

    (async () => {
        try {
        // Intentamos obtener texto si hay objectUrl (archivo local)
        let text = "";
        if (doc.objectUrl) {
          // Fetch del blob para leerlo como texto (funciona para txt, csv, etc.)
        try {
            const res = await fetch(doc.objectUrl);
            const blob = await res.blob();
            const file = new File([blob], doc.name);
            text = await extractTextFromFile(file, doc.name);
        } catch {
            text = `Documento: ${doc.name}`;
        }
        } else {
            text = `Documento: ${doc.name}, Programa: ${doc.program}, Asignatura: ${doc.subjectName}`;
        }

        const result = await analyzeDocument(text, doc.name);
        setAnalysis(result);
        } catch {
        setAnalysis({
            description: "No se pudo conectar con el servicio de análisis.",
            keywords: [],
            language: "Desconocido",
            level: "N/A",
        });
        } finally {
        setLoadingAI(false);
        }
    })();
    }, [doc?.id]);

    if (!doc) return null;

    const isPdf = doc.fileType === "PDF" || doc.name.toLowerCase().endsWith(".pdf");
    const isText = ["TXT", "CSV", "HTML"].includes(doc.fileType) ||
    ["txt", "csv", "html"].some(e => doc.name.toLowerCase().endsWith(`.${e}`));
    const canPreview = (isPdf || isText) && !!doc.objectUrl;

    return (
    <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-sena-green/5 to-sena-blue/5">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-sena-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-sena-green" />
                </div>
                <div className="min-w-0">
                <h2 className="font-bold text-foreground truncate text-lg">{doc.name}</h2>
                <p className="text-xs text-muted-foreground">{doc.size} · {doc.uploadedAt} · {doc.program}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                {doc.objectUrl && (
                <a
                    href={doc.objectUrl}
                    download={doc.name}
                    className="flex items-center gap-1.5 px-4 py-2 bg-sena-green text-white rounded-xl text-sm font-medium hover:bg-sena-green-dark transition-colors"
                >
                    <Download className="w-4 h-4" />
                    Descargar
                    </a>
                )}
                <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>
            </div>

          {/* ── Body: split layout ── */}
        <div className="flex flex-1 overflow-hidden">

            {/* ── Panel izquierdo: visor del documento ── */}
            <div className="flex-1 flex flex-col bg-gray-50 border-r border-border overflow-hidden">
              {/* Controles de zoom */}
            {canPreview && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-border">
                <button
                    onClick={() => setZoom(z => Math.max(50, z - 10))}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                >
                    <ZoomOut className="w-4 h-4 text-muted-foreground" />
                </button>
                <span className="text-xs font-medium text-muted-foreground w-12 text-center">{zoom}%</span>
                <button
                    onClick={() => setZoom(z => Math.min(200, z + 10))}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                >
                <ZoomIn className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => setZoom(100)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Restablecer
                </button>
                </div>
            )}

              {/* Visor */}
            <div className="flex-1 overflow-auto flex items-start justify-center p-4">
                {canPreview && doc.objectUrl ? (
                <div
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center", transition: "transform 0.2s ease" }}
                    className="w-full"
                >
                    <iframe
                    ref={iframeRef}
                    src={doc.objectUrl}
                    title={doc.name}
                    className="w-full bg-white rounded-xl shadow-lg border border-border"
                    style={{ minHeight: "65vh", height: "65vh" }}
                    />
                </div>
                ) : (
                  /* Placeholder cuando no hay preview */
                <div className="flex flex-col items-center justify-center h-full text-center py-16 px-8">
                    <div className="w-24 h-24 bg-muted rounded-2xl flex items-center justify-center mb-6">
                    <FileText className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                    Vista previa no disponible
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        {!doc.objectUrl
                        ? "El archivo no está disponible localmente. Descárgalo para verlo."
                        : `Los archivos .${doc.fileType.toLowerCase()} no se pueden previsualizar directamente. Descárgalo para abrirlo.`}
                    </p>    
                    {doc.objectUrl && (
                        <a
                        href={doc.objectUrl}
                        download={doc.name}
                        className="mt-6 flex items-center gap-2 bg-sena-green text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-sena-green-dark transition-colors"
                        >
                        <Download className="w-4 h-4" />
                        Descargar archivo
                    </a>
                    )}
                    </div>
                )}
            </div>
        </div>

            {/* ── Panel derecho: análisis IA ── */}
            <div className="w-80 flex flex-col overflow-y-auto bg-white">
              {/* Título del panel */}
            <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sena-green" />
                <h3 className="font-semibold text-foreground text-sm">Análisis del documento</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Generado por IA automáticamente</p>
            </div>

            <div className="flex-1 p-5 space-y-6">
                {/* ── Metadata del doc ── */}
                <div className="grid grid-cols-2 gap-3">
                {[
                    { label: "Tipo",       value: doc.fileType                          },
                    { label: "Tamaño",     value: doc.size                              },
                    { label: "Asignatura", value: doc.subjectName || "Sin asignar"      },
                    { label: "Programa",   value: doc.program || "—"                    },
                ].map((item) => (
                    <div key={item.label} className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="text-xs font-semibold text-foreground truncate">{item.value}</p>
                    </div>
                ))}
                </div>

                {loadingAI ? (
                  /* ── Skeleton loading ── */
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sena-green text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-medium">Analizando con IA...</span>
                    </div>
                    {[80, 100, 60, 90, 70].map((w, i) => (
                        <div key={i} className={`h-3 bg-muted rounded-full animate-pulse`} style={{ width: `${w}%` }} />
                    ))}
                    <div className="flex flex-wrap gap-2 mt-4">
                        {[60, 80, 50, 70, 55, 65].map((w, i) => (
                        <div key={i} className="h-6 bg-muted rounded-full animate-pulse" style={{ width: `${w}px` }} />
                        ))}
                    </div>
                    </div>
                ) : analysis ? (
                <>
                    {/* ── Nivel e idioma ── */}
                    <div className="flex gap-2">
                        <div className="flex-1 bg-sena-green/5 border border-sena-green/20 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Nivel</p>
                        <p className="text-lg font-bold text-sena-green">{analysis.level}</p>
                    </div>
                    <div className="flex-1 bg-sena-blue/5 border border-sena-blue/20 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Idioma</p>
                        <p className="text-sm font-bold text-sena-blue leading-tight">{analysis.language}</p>
                    </div>
                    </div>

                    {/* ── Descripción ── */}
                    <div>
                    <div className="flex items-center gap-2 mb-2">
                        <AlignLeft className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold text-foreground">Descripción</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-xl p-3">
                        {analysis.description}
                    </p>
                    </div>

                    {/* ── Keywords ── */}
                    <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold text-foreground">Palabras clave</h4>
                        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-auto">
                        {analysis.keywords.length}
                        </span>
                    </div>
                    {analysis.keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                        {analysis.keywords.map((kw, i) => (
                            <motion.span
                            key={kw}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${KW_COLORS[i % KW_COLORS.length]}`}
                            >
                            <Tag className="w-2.5 h-2.5" />
                            {kw}
                            </motion.span>
                        ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">No se encontraron palabras clave</p>
                    )}
                    </div>

                    {/* ── Sugerencia educativa ── */}
                    <div className="bg-gradient-to-br from-sena-green/5 to-sena-blue/5 rounded-xl p-4 border border-sena-green/10">
                    <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-sena-green" />
                        <h4 className="text-xs font-semibold text-sena-green">Uso recomendado</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Comparte este documento con estudiantes de nivel <strong>{analysis.level}</strong> para reforzar vocabulario y comprensión lectora en inglés.
                    </p>
                    </div>
                </>
                ) : null}
            </div>
            </div>
                </div>
            </motion.div>
        </div>
    </AnimatePresence>
    );
}