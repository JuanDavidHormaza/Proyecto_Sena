import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Eye, MessageSquare, CheckCircle, XCircle,
  Users, BarChart3, TrendingUp, Send, X, Clock,
  Filter,
  Languages,
  LifeBuoy,
  Inbox, Check, CheckCircle2, RefreshCw, UserCheck
} from "lucide-react";
import { TestResult, User } from "../data/users";
import * as api from "../services/api";
import { UserAccountMenu } from "../components/UserAccountMenu";
import { HeaderActionTools } from "../components/HeaderActionTools";
import { RoleSwitcher } from "../components/RoleSwitcher";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";
import { BrandLogo } from "../components/BrandLogo";
import { QuestionAuditCard } from "../components/QuestionAuditCard";

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"students" | "ficha_requests">("students");
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [feedback, setFeedback] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [selectedFicha, setSelectedFicha] = useState<string>("all");
  const [availableFichas, setAvailableFichas] = useState<string[]>([]);
  const [studentsTracking, setStudentsTracking] = useState<api.StudentTrackingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<User[]>([]);
  const [fichaRequests, setFichaRequests] = useState<api.ApiFichaRequest[]>([]);
  const [requestSearchTerm, setRequestSearchTerm] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"ALL" | "PENDIENTE" | "APROBADA" | "RECHAZADA">("ALL");
  const [isProcessingRequest, setIsProcessingRequest] = useState<number | null>(null);
  const [rejectModalRequest, setRejectModalRequest] = useState<api.ApiFichaRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const teacherName = user?.name || sessionStorage.getItem("userName") || "Instructor";
  const teacherProgram = user?.program || sessionStorage.getItem("userProgram") || "";

  // Cargar datos reales desde API (Seguimiento de Aprendices y Pruebas en PostgreSQL)
  const loadDataFromApi = async (fichaOverride?: string) => {
    setIsLoading(true);
    const activeFicha = fichaOverride !== undefined ? fichaOverride : selectedFicha;
    const trackingParams = activeFicha && activeFicha !== "all" ? { ficha: activeFicha } : undefined;

    try {
      const [trackingRes, apiResults, apiUsers, apiRequests] = await Promise.all([
        api.getTeacherStudentsTracking(trackingParams).catch(err => {
          console.warn("[TeacherDashboard] Error loading student tracking:", err);
          return [] as api.StudentTrackingItem[];
        }),
        api.getTestResults().catch(err => {
          console.warn("[TeacherDashboard] Error loading test results:", err);
          return [] as api.ApiTestResult[];
        }),
        api.getUsers('student').catch(() => [] as api.ApiUser[]),
        api.getFichaRequests().catch(err => {
          console.warn("[TeacherDashboard] Error loading ficha requests:", err);
          return [] as api.ApiFichaRequest[];
        }),
      ]);

      const trackingList = Array.isArray(trackingRes) ? trackingRes : [];
      setStudentsTracking(trackingList);

      // Extraer fichas disponibles para el filtro
      const fSet = new Set<string>();
      trackingList.forEach(s => {
        if (s.ficha) fSet.add(s.ficha);
      });
      (apiRequests || []).forEach(r => {
        if (r.ficha_code) fSet.add(r.ficha_code);
      });
      if (user?.ficha?.codigo) fSet.add(user.ficha.codigo);
      setAvailableFichas(Array.from(fSet));

      // Convertir resultados de API
      const convertedResults: TestResult[] = (apiResults || []).map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        studentProgram: r.studentProgram || r.student_program || "",
        score: r.score,
        level: r.level,
        correctAnswers: r.correctAnswers,
        totalQuestions: r.totalQuestions,
        feedback: r.feedback,
        completedAt: r.completedAt,
        duration: r.duration,
        answers: r.answers || (r.process as any)?.answers || (r.process as any)?.userAnswers || [],
      }));

      // Convertir estudiantes de API
      const convertedStudents = (apiUsers || [])
        .filter((u) => {
          const email = (u.email || "").toLowerCase();
          const name = (u.name || "").toLowerCase();
          return !email.includes("santiagolegarda") && !name.includes("legarda");
        })
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          password: '',
          role: u.role as 'student',
          permissions: u.permissions,
          status: u.status,
          createdAt: new Date().toISOString().split('T')[0],
          program: u.program || '',
        }));

      setResults(convertedResults);
      setStudents(convertedStudents);
      setFichaRequests(apiRequests || []);
    } catch (error) {
      console.error("[TeacherDashboard] Error al cargar datos del API institucional:", error);
      setStudentsTracking([]);
      setResults([]);
      setStudents([]);
      setFichaRequests([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDataFromApi();
  }, []);

  const handleApproveRequest = async (req: api.ApiFichaRequest) => {
    setIsProcessingRequest(req.request_id);
    try {
      await api.approveFichaRequest(req.request_id, String(user?.id || ''));
      toast.success(`Solicitud de ${req.learner_name} para ficha ${req.ficha_code} aprobada con éxito.`);
      await loadDataFromApi();
    } catch (error: any) {
      console.error("[TeacherDashboard] Error approving ficha request:", error);
      toast.error(error?.response?.data?.error || error?.message || "No se pudo aprobar la solicitud.");
    } finally {
      setIsProcessingRequest(null);
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectModalRequest) return;
    setIsProcessingRequest(rejectModalRequest.request_id);
    try {
      await api.rejectFichaRequest(rejectModalRequest.request_id, rejectReason || "Rechazada por el instructor de ficha.");
      toast.info(`Solicitud de ${rejectModalRequest.learner_name} rechazada.`);
      setRejectModalRequest(null);
      setRejectReason("");
      await loadDataFromApi();
    } catch (error: any) {
      console.error("[TeacherDashboard] Error rejecting ficha request:", error);
      toast.error(error?.response?.data?.error || error?.message || "No se pudo rechazar la solicitud.");
    } finally {
      setIsProcessingRequest(null);
    }
  };

  const handleViewDetails = async (result: TestResult) => {
    setSelectedResult(result);
    setFeedback(result.feedback || "");

    if (result.id) {
      try {
        const fullReview = await api.getExamReview(result.id);
        if (fullReview) {
          const resolvedAnswers = fullReview.audit_questions || fullReview.answers || result.answers || [];
          setSelectedResult(prev => ({
            ...prev,
            ...result,
            ...fullReview,
            answers: resolvedAnswers,
          }));
          if (fullReview.feedback) {
            setFeedback(fullReview.feedback);
          }
        }
      } catch (err) {
        console.warn("[TeacherDashboard] Could not fetch detailed review, using local:", err);
      }
    }
  };

  const handleSaveFeedback = async () => {
    if (selectedResult) {
      try {
        await api.addFeedback(selectedResult.id, feedback);
        toast.success("Retroalimentación guardada con éxito");
      } catch (error) {
        console.log("[v0] Failed to save feedback to API", error);
        toast.error("No se pudo guardar la retroalimentación en el servidor");
      }
      
      // Actualizar estado local
      const updatedResults = results.map(r => 
        r.id === selectedResult.id ? { ...r, feedback } : r
      );
      setResults(updatedResults);
      setSelectedResult(null);
      setFeedback("");
    }
  };

  const pendingRequestsCount = fichaRequests.filter(r => r.status === "PENDIENTE").length;

  // Conteo reactivo y dinámico de niveles basado en los registros reales de PostgreSQL
  const basicoCount = studentsTracking.filter(s => s.has_records && (s.last_level.includes('A1') || s.last_level.includes('A2') || s.last_level.startsWith('A'))).length;
  const avanzadoCount = studentsTracking.filter(s => s.has_records && (s.last_level.includes('B1') || s.last_level.includes('B2') || s.last_level.startsWith('B'))).length;
  const evaluatedStudents = studentsTracking.filter(s => s.has_records);
  const totalEvaluated = basicoCount + avanzadoCount || (evaluatedStudents.length || 1);

  const totalTestsCount = studentsTracking.reduce((acc, s) => acc + (s.total_tests || 0), 0);
  const avgOverallScore = evaluatedStudents.length
    ? Math.round(evaluatedStudents.reduce((acc, s) => acc + s.average_score, 0) / evaluatedStudents.length)
    : 0;

  const stats = {
    totalStudents: studentsTracking.length || students.length,
    totalTests: totalTestsCount || results.length,
    averageScore: avgOverallScore,
    feedbackGiven: results.filter(r => r.feedback).length,
  };

  const levelDistribution = {
    basic: basicoCount,
    intermediate: avanzadoCount,
  };

  // Filtrado reactivo de aprendices en tiempo real
  const filteredStudents = studentsTracking.filter(s => {
    const sTerm = searchTerm.toLowerCase().trim();
    const matchesSearch = !sTerm ||
      s.name.toLowerCase().includes(sTerm) ||
      s.email.toLowerCase().includes(sTerm) ||
      s.ficha.toLowerCase().includes(sTerm) ||
      s.program.toLowerCase().includes(sTerm);

    const matchesLevel =
      filterLevel === "all" ? true :
      filterLevel === "A" ? (s.has_records && (s.last_level.includes('A1') || s.last_level.includes('A2') || s.last_level.startsWith('A'))) :
      filterLevel === "B" ? (s.has_records && (s.last_level.includes('B1') || s.last_level.includes('B2') || s.last_level.startsWith('B'))) :
      filterLevel === "pending" ? !s.has_records : true;

    return matchesSearch && matchesLevel;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-40">
        <div className="container mx-auto px-4 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" showSena={true} onClick={() => navigate("/")} />
              <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
              <span className="hidden sm:inline-block text-xs text-slate-500 font-medium">Seguimiento Formativo</span>
            </div>

            <div className="flex items-center gap-3">
              <RoleSwitcher />
              <HeaderActionTools />
              <button
                onClick={() => navigate('/dictionary')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sena-green/10 text-sena-green hover:bg-sena-green hover:text-white border border-sena-green/30 font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                title="Gestión de Diccionarios Técnicos por Ficha"
              >
                <Languages className="w-4 h-4" />
                <span>Diccionarios Técnicos</span>
              </button>
              <UserAccountMenu accent="blue" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Bienvenido, {teacherName.split(' ')[0]}
          </h2>
          <p className="text-muted-foreground">
            Revisa el progreso de tus aprendices{teacherProgram ? ` de ${teacherProgram}` : ''} y brinda retroalimentación personalizada
          </p>
        </motion.div>

        {/* Acceso directo a Diccionarios Técnicos */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-sena-blue/10 via-sena-green/10 to-transparent border border-sena-blue/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-sena-blue text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Languages className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Gestión de Diccionarios Técnicos Especializados</h3>
              <p className="text-xs text-muted-foreground">
                Consulta y alimenta el vocabulario técnico de inglés para los aprendices de tus fichas asignadas.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dictionary')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sena-blue text-white hover:bg-sena-blue/90 text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap self-stretch sm:self-auto justify-center"
          >
            <span>Abrir Diccionario →</span>
          </button>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-8 border-b border-border pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "students"
                ? "bg-sena-green text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Aprendices y Evaluaciones</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ficha_requests")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "ficha_requests"
                ? "bg-sena-green text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Solicitudes de Ficha</span>
            {pendingRequestsCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeTab === "ficha_requests"
                  ? "bg-white text-sena-green"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === "students" ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Aprendices", value: stats.totalStudents, icon: Users, color: "sena-blue" },
            { label: "Pruebas Realizadas", value: stats.totalTests, icon: BarChart3, color: "sena-green" },
            { label: "Promedio General", value: `${stats.averageScore}%`, icon: TrendingUp, color: "warning" },
            { label: "Retroalimentaciones", value: stats.feedbackGiven, icon: MessageSquare, color: "destructive" },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-5 border border-border shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className={`w-11 h-11 bg-${stat.color}/10 rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}`} strokeWidth={1.8} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Level Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 border border-border shadow-sm mb-8"
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-foreground">Distribución por Nivel de Dominio CEFR</h3>
              <p className="text-xs text-muted-foreground">Conteo reactivo de aprendices evaluados en la ficha y programa activo</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {evaluatedStudents.length} de {studentsTracking.length} aprendices evaluados
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Básico (A1-A2)", value: basicoCount, color: "#2563EB", bg: "bg-blue-600", percentage: (basicoCount / totalEvaluated) * 100 },
              { label: "Intermedio / Avanzado (B1-B2)", value: avanzadoCount, color: "#059669", bg: "bg-emerald-600", percentage: (avanzadoCount / totalEvaluated) * 100 },
            ].map((level, index) => (
              <div key={index} className="text-center p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between gap-4">
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">{level.label}</p>
                  <p className="text-xs text-muted-foreground">{level.percentage.toFixed(0)}% del total evaluado</p>
                </div>
                <div 
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-xs ${level.bg}`}
                >
                  {level.value}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Search, Filter by Level and Filter by Ficha */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Buscar aprendiz por nombre, documento o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-blue/50 text-sm"
            />
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full pl-10 pr-8 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-blue/50 appearance-none cursor-pointer text-sm font-medium"
            >
              <option value="all">Todos los niveles</option>
              <option value="A">Básico (A1-A2)</option>
              <option value="B">Intermedio / Avanzado (B1-B2)</option>
              <option value="pending">Sin evaluar (Pendiente)</option>
            </select>
          </div>
          <div className="relative min-w-[180px]">
            <select
              value={selectedFicha}
              onChange={(e) => {
                const newFicha = e.target.value;
                setSelectedFicha(newFicha);
                loadDataFromApi(newFicha);
              }}
              className="w-full py-3 px-4 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-blue/50 text-sm font-semibold text-foreground cursor-pointer"
            >
              <option value="all">Todas mis Fichas</option>
              {availableFichas.map(f => (
                <option key={f} value={f}>Ficha: {f}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Students Results */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-border p-6 animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-36" />
                        <div className="h-3 bg-slate-100 rounded w-48" />
                      </div>
                    </div>
                    <div className="w-16 h-8 bg-slate-100 rounded-lg" />
                  </div>
                  <div className="h-16 bg-slate-50 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            filteredStudents.map((student, index) => {
              const studentDetailedTests = results.filter(r => r.userId === student.id);
              const effectiveTests: TestResult[] = studentDetailedTests.length > 0
                ? studentDetailedTests
                : (student.tests_history || []).map(h => ({
                    id: h.id,
                    userId: student.id,
                    userName: student.name,
                    studentProgram: student.program,
                    score: h.score,
                    level: h.level,
                    correctAnswers: h.correctAnswers || 0,
                    totalQuestions: h.totalQuestions || 0,
                    feedback: h.feedback,
                    completedAt: h.completedAt || h.date,
                    duration: h.duration || '~15:00',
                    answers: [],
                  }));

              const isAdvancedLevel = student.last_level.includes('B') || student.last_level.includes('C');
              const isBasicLevel = student.last_level.includes('A');

              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * Math.min(index, 10) }}
                  className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden"
                >
                  {/* Student Header */}
                  <div className="p-5 border-b border-border bg-muted/20">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sena-green rounded-xl flex items-center justify-center text-white font-medium text-lg shadow-xs flex-shrink-0">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 max-w-[340px]">
                          <h3 className="font-semibold text-foreground truncate" title={student.name}>
                            {student.name}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate" title={student.program}>
                            {student.program} {student.ficha ? `• Ficha: ${student.ficha}` : ''}
                          </p>
                          <div className="mt-1">
                            {student.has_records ? (
                              <span className="text-xs text-slate-500">
                                Última prueba: <strong className="text-slate-800">{student.last_test_date}</strong> • {student.total_tests} intento{student.total_tests !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                Pendiente por presentar evaluación
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Promedio</p>
                          {student.has_records ? (
                            <p className={`text-xl font-bold ${
                              student.average_score >= 70 ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {student.average_score}%
                            </p>
                          ) : (
                            <p className="text-sm font-semibold text-muted-foreground">0%</p>
                          )}
                        </div>

                        <div>
                          {student.has_records ? (
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-block ${
                              isAdvancedLevel
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {student.last_level}
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 inline-block">
                              Sin evaluar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Results Table or Pending State */}
                  {student.has_records && effectiveTests.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-slate-50/50">
                            <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                            <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Puntuación</th>
                            <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nivel</th>
                            <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Correctas</th>
                            <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duración</th>
                            <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feedback</th>
                            <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {effectiveTests.map((result) => (
                            <tr key={result.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="py-3.5 px-5 text-sm text-foreground">
                                {result.completedAt ? new Date(result.completedAt).toLocaleDateString('es-ES', {
                                  day: 'numeric', month: 'short', year: 'numeric'
                                }) : '-'}
                              </td>
                              <td className="py-3.5 px-5">
                                <span className={`text-base font-bold ${
                                  result.score >= 70 ? 'text-emerald-600' : 'text-amber-600'
                                }`}>
                                  {result.score}%
                                </span>
                              </td>
                              <td className="py-3.5 px-5">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  result.level.startsWith('B') || result.level.startsWith('C')
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {result.level}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-sm text-muted-foreground">
                                {result.totalQuestions ? `${result.correctAnswers}/${result.totalQuestions}` : '-'}
                              </td>
                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Clock className="w-3.5 h-3.5" strokeWidth={1.8} />
                                  {result.duration || '~15:00'}
                                </div>
                              </td>
                              <td className="py-3.5 px-5">
                                {result.feedback ? (
                                  <CheckCircle className="w-5 h-5 text-sena-green" strokeWidth={1.8} />
                                ) : (
                                  <XCircle className="w-5 h-5 text-muted-foreground/40" strokeWidth={1.8} />
                                )}
                              </td>
                              <td className="py-3.5 px-5">
                                <button
                                  onClick={() => handleViewDetails(result)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sena-blue text-white rounded-lg hover:bg-sena-blue-light transition-colors text-xs font-medium cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />
                                  Revisar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-5 py-6 text-sm text-muted-foreground italic flex items-center gap-2 bg-slate-50/30">
                      <Clock className="w-4 h-4 text-muted-foreground/60" strokeWidth={1.8} />
                      <span>Pendiente por presentar evaluación. Aún no registra intentos en la plataforma.</span>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {!isLoading && filteredStudents.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-border">
            <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1.8} />
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay resultados</h3>
            <p className="text-muted-foreground">No se encontraron aprendices que coincidan con la búsqueda o ficha seleccionada</p>
          </div>
        )}
        </>
        ) : (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sena-green/10 flex items-center justify-center text-sena-green">
                  <UserCheck className="w-6 h-6" strokeWidth={1.8} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">
                    Gestión de Solicitudes de Ficha
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Como docente responsable, revisa y aprueba o rechaza a los aprendices postulados para tus fichas formativas.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadDataFromApi()}
                  className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  title="Actualizar solicitudes"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pendientes</span>
                  <h4 className="text-2xl font-extrabold text-amber-600 mt-1">
                    {fichaRequests.filter(r => r.status === "PENDIENTE").length}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Por validar por ti</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Aprobadas</span>
                  <h4 className="text-2xl font-extrabold text-emerald-600 mt-1">
                    {fichaRequests.filter(r => r.status === "APROBADA").length}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Aprendices vinculados</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rechazadas</span>
                  <h4 className="text-2xl font-extrabold text-rose-600 mt-1">
                    {fichaRequests.filter(r => r.status === "RECHAZADA").length}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">No matriculadas</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <X className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Solicitudes</span>
                  <h4 className="text-2xl font-extrabold text-foreground mt-1">
                    {fichaRequests.length}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Tus fichas asignadas</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sena-blue/10 text-sena-blue flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-border p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={requestSearchTerm}
                  onChange={(e) => setRequestSearchTerm(e.target.value)}
                  placeholder="Buscar aprendiz, email o código de ficha..."
                  className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-sena-green focus:border-transparent bg-background"
                />
                {requestSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setRequestSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {(["ALL", "PENDIENTE", "APROBADA", "RECHAZADA"] as const).map((st) => {
                  const count = st === "ALL" ? fichaRequests.length : fichaRequests.filter(r => r.status === st).length;
                  const labels: Record<string, string> = {
                    ALL: "Todas",
                    PENDIENTE: "Pendientes",
                    APROBADA: "Aprobadas",
                    RECHAZADA: "Rechazadas",
                  };
                  const isActive = requestStatusFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setRequestStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isActive
                          ? "bg-sena-green text-white shadow-xs"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{labels[st]}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              {(() => {
                const filtered = fichaRequests.filter((req) => {
                  const matchesStatus = requestStatusFilter === "ALL" || req.status === requestStatusFilter;
                  const term = requestSearchTerm.toLowerCase().trim();
                  if (!term) return matchesStatus;
                  const matchesSearch =
                    (req.learner_name || "").toLowerCase().includes(term) ||
                    (req.learner_email || "").toLowerCase().includes(term) ||
                    (req.ficha_code || "").toLowerCase().includes(term) ||
                    (req.program_name || "").toLowerCase().includes(term);
                  return matchesStatus && matchesSearch;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-16 text-center text-muted-foreground space-y-2">
                      <Inbox className="w-10 h-10 mx-auto text-slate-300" strokeWidth={1.5} />
                      <p className="text-sm font-semibold">No hay solicitudes de ficha pendientes o con los filtros seleccionados</p>
                      <p className="text-xs text-muted-foreground">Las solicitudes de aprendices para tus fichas asignadas aparecerán aquí.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                          <th className="py-3.5 px-4">Aprendiz</th>
                          <th className="py-3.5 px-4">Programa Actual</th>
                          <th className="py-3.5 px-4">Ficha Solicitada</th>
                          <th className="py-3.5 px-4">Fecha Solicitud</th>
                          <th className="py-3.5 px-4">Estado</th>
                          <th className="py-3.5 px-4 text-right">Acciones de Docente</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-xs">
                        {filtered.map((req) => (
                          <tr key={req.request_id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3.5 px-4 min-w-0 max-w-[240px]">
                              <p className="font-bold text-foreground text-sm truncate" title={req.learner_name}>{req.learner_name}</p>
                              <p className="text-muted-foreground text-xs truncate" title={req.learner_email}>{req.learner_email}</p>
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground font-medium">
                              {req.current_program || "Programa inicial"}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-sena-blue text-xs">{req.ficha_code}</span>
                              <p className="text-xs text-muted-foreground truncate max-w-xs">{req.program_name}</p>
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground">
                              {new Date(req.created_at).toLocaleDateString("es-CO", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                                  req.status === "APROBADA"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : req.status === "RECHAZADA"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {req.status === "APROBADA"
                                  ? "Aprobada"
                                  : req.status === "RECHAZADA"
                                  ? "Rechazada"
                                  : "Pendiente"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {req.status === "PENDIENTE" ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    disabled={isProcessingRequest === req.request_id}
                                    onClick={() => handleApproveRequest(req)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sena-green hover:bg-sena-green-dark text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                                    title="Aprobar y asignar a ficha"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Aprobar y Asignar a Ficha</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isProcessingRequest === req.request_id}
                                    onClick={() => {
                                      setRejectModalRequest(req);
                                      setRejectReason("");
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer"
                                    title="Rechazar solicitud"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Rechazar</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground font-medium">
                                  {req.status === "APROBADA" ? "Matriculado en tu ficha" : (req.admin_notes || "Solicitud rechazada")}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModalRequest && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <X className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">Rechazar Solicitud de Ficha</h3>
                </div>
                <button
                  onClick={() => setRejectModalRequest(null)}
                  className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Estás a punto de rechazar la solicitud de <strong className="text-foreground">{rejectModalRequest.learner_name}</strong> para la ficha <strong className="text-sena-blue">{rejectModalRequest.ficha_code}</strong> ({rejectModalRequest.program_name}).
                </p>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Motivo o Justificación (Opcional):
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Ej. Cupo completo, ficha no correspondiente, prerrequisitos pendientes..."
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500/50 resize-none bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 p-4 border-t border-border bg-muted/20">
                <button
                  type="button"
                  onClick={() => setRejectModalRequest(null)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isProcessingRequest === rejectModalRequest.request_id}
                  onClick={handleRejectRequest}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedResult && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Detalle de Prueba</h3>
                  <p className="text-sm text-muted-foreground">{selectedResult.userName}</p>
                </div>
                <button
                  onClick={() => { setSelectedResult(null); setFeedback(""); }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" strokeWidth={1.8} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Puntuacion</p>
                    <p className={`text-3xl font-bold ${
                      selectedResult.score >= 80 ? 'text-sena-green' :
                      selectedResult.score >= 60 ? 'text-warning' : 'text-destructive'
                    }`}>{selectedResult.score}%</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Nivel</p>
                    <p className="text-3xl font-bold text-foreground">{selectedResult.level}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Correctas</p>
                    <p className="text-3xl font-bold text-foreground">
                      {selectedResult.correctAnswers}/{selectedResult.totalQuestions}
                    </p>
                  </div>
                </div>

                {/* Question-by-Question Pedagogical Audit */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-foreground">Auditoría Pedagógica de Preguntas</h4>
                    <span className="text-xs text-muted-foreground">
                      {selectedResult.answers?.length || selectedResult.totalQuestions || 0} reactivos auditados
                    </span>
                  </div>

                  {selectedResult.answers && selectedResult.answers.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {selectedResult.answers.map((ans, idx) => (
                        <QuestionAuditCard
                          key={(ans as any).question_id || ans.questionId || idx}
                          item={ans as any}
                          index={idx}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="p-4 bg-muted/40 rounded-xl text-center text-xs text-muted-foreground border border-dashed border-border">
                      No hay desglose individual de reactivos disponible para este intento.
                    </p>
                  )}
                </div>

                {/* Feedback Section */}
                <div>
                  <label className="flex items-center gap-2 font-semibold text-foreground mb-3">
                    <MessageSquare className="w-5 h-5 text-sena-blue" strokeWidth={1.8} />
                    Retroalimentación para el aprendiz
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    placeholder="Escribe tus comentarios y recomendaciones pedagógicas para el aprendiz..."
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-blue/50 resize-none"
                  />
                  {selectedResult.feedback ? (
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-sena-green shrink-0" />
                      <span>Última retroalimentación guardada: "{selectedResult.feedback}"</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Pendiente de retroalimentación por parte del instructor asignado.</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-6 border-t border-border">
                <button
                  onClick={handleSaveFeedback}
                  className="flex-1 flex items-center justify-center gap-2 bg-sena-green text-white py-3 rounded-xl hover:bg-sena-green-dark transition-all font-medium cursor-pointer"
                >
                  <Send className="w-5 h-5" strokeWidth={1.8} />
                  Enviar Retroalimentación
                </button>
                <button
                  onClick={() => { setSelectedResult(null); setFeedback(""); }}
                  className="flex-1 bg-muted text-muted-foreground py-3 rounded-xl hover:bg-muted/80 transition-all font-medium cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TeacherDashboard;
