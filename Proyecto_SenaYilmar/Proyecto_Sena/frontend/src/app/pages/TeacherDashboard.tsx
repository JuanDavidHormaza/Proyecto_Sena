import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
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
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";
import { WorklexBrandLogo } from "../components/WorklexBrandLogo";

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
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<User[]>([]);
  const [fichaRequests, setFichaRequests] = useState<api.ApiFichaRequest[]>([]);
  const [requestSearchTerm, setRequestSearchTerm] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"ALL" | "PENDIENTE" | "APROBADA" | "RECHAZADA">("ALL");
  const [isProcessingRequest, setIsProcessingRequest] = useState<number | null>(null);
  const [rejectModalRequest, setRejectModalRequest] = useState<api.ApiFichaRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const teacherName = user?.name || localStorage.getItem("userName") || "Instructor";
  const teacherProgram = user?.program || localStorage.getItem("userProgram") || "";

  // Cargar datos desde API
  const loadDataFromApi = async () => {
    setIsLoading(true);
    try {
      const [apiResults, apiUsers, apiRequests] = await Promise.all([
        api.getTestResults(),
        api.getUsers('student'),
        api.getFichaRequests().catch(err => {
          console.warn("[TeacherDashboard] Error loading ficha requests:", err);
          return [] as api.ApiFichaRequest[];
        }),
      ]);
      
      // Convertir resultados de API
      const convertedResults: TestResult[] = apiResults.map((r) => ({
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
      
      // Convertir estudiantes de API (excluyendo cuentas de prueba)
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

  const handleViewDetails = (result: TestResult) => {
    setSelectedResult(result);
    setFeedback(result.feedback || "");
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

  const teacherProgramKey = normalizeText(teacherProgram);

  const filteredResults = results.filter(r => {
    const student = students.find(s => s.id === r.userId);
    const resultProgram = r.studentProgram || student?.program || "";
    const matchesProgram = !teacherProgramKey || normalizeText(resultProgram) === teacherProgramKey;
    const matchesSearch = r.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === "all" || r.level.startsWith(filterLevel);
    return matchesProgram && matchesSearch && matchesLevel;
  });

  const programStudents = teacherProgram
    ? students.filter(student => normalizeText(student.program) === teacherProgramKey)
    : students;

  // Group results by student
  const studentResults = filteredResults.reduce((acc, result) => {
    if (!acc[result.userId]) {
      acc[result.userId] = [];
    }
    acc[result.userId].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  const visibleProgramStudentEntries = programStudents
    .filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
      const hasMatchingLevel = filterLevel === "all" || Boolean(studentResults[student.id]?.length);
      return matchesSearch && hasMatchingLevel;
    })
    .map(student => [student.id, studentResults[student.id] || []] as const);

  const programStudentIds = new Set(programStudents.map(student => student.id));
  const resultOnlyEntries = Object.entries(studentResults)
    .filter(([userId, userResults]) => {
      if (programStudentIds.has(userId)) return false;
      const latestResult = userResults[0];
      return latestResult?.userName.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .map(([userId, userResults]) => [userId, userResults] as const);

  const studentEntries = [...visibleProgramStudentEntries, ...resultOnlyEntries];
  const totalStudentIds = new Set([
    ...programStudents.map(student => student.id),
    ...filteredResults.map(result => result.userId),
  ]);

  // Stats
  const stats = {
    totalStudents: totalStudentIds.size,
    totalTests: filteredResults.length,
    averageScore: filteredResults.length
      ? Math.round(filteredResults.reduce((acc, r) => acc + r.score, 0) / filteredResults.length)
      : 0,
    feedbackGiven: filteredResults.filter(r => r.feedback).length,
  };

  const levelDistribution = {
    basic: filteredResults.filter(r => r.level.startsWith('A')).length,
    intermediate: filteredResults.filter(r => r.level.startsWith('B')).length,
  };
  const totalFilteredTests = filteredResults.length || 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-40">
        <div className="container mx-auto px-4 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
              <WorklexBrandLogo
                size="md"
                showText={true}
                subtitle="Seguimiento Formativo"
              />
            </div>

            <div className="flex items-center gap-3">
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
          <h3 className="font-semibold text-foreground mb-4">Distribucion por Nivel</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Basico (A1-A2)", value: levelDistribution.basic, color: "#E21B3C", percentage: (levelDistribution.basic / totalFilteredTests) * 100 },
              { label: "Intermedio / Avanzado (B1-B2)", value: levelDistribution.intermediate, color: "#39A900", percentage: (levelDistribution.intermediate / totalFilteredTests) * 100 },
            ].map((level, index) => (
              <div key={index} className="text-center">
                <div 
                  className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white text-xl font-bold mb-2"
                  style={{ backgroundColor: level.color }}
                >
                  {level.value}
                </div>
                <p className="text-sm font-medium text-foreground">{level.label}</p>
                <p className="text-xs text-muted-foreground">{level.percentage.toFixed(0)}%</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Buscar aprendiz..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-blue/50"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.8} />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="pl-12 pr-8 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-blue/50 appearance-none cursor-pointer"
            >
              <option value="all">Todos los niveles</option>
              <option value="A">Basico (A1-A2)</option>
              <option value="B">Intermedio / Avanzado (B1-B2)</option>
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
            studentEntries.map(([userId, userResults], index) => {
            const student = students.find(s => s.id === userId);
            const latestResult = userResults[0];
            const studentName = student?.name || latestResult?.userName || "Aprendiz";
            const studentProgram = student?.program || latestResult?.studentProgram || "Programa SENA";
            const avgScore = userResults.length
              ? Math.round(userResults.reduce((acc, r) => acc + r.score, 0) / userResults.length)
              : 0;
            
            return (
              <motion.div
                key={userId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
              >
                {/* Student Header */}
                <div className="p-5 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-sena-green rounded-xl flex items-center justify-center text-white font-medium text-lg">
                        {studentName.charAt(0)}
                      </div>
                      <div className="min-w-0 max-w-[280px]">
                        <h3 className="font-semibold text-foreground truncate" title={studentName}>{studentName}</h3>
                        <p className="text-sm text-muted-foreground truncate" title={studentProgram}>
                          {studentProgram} - {userResults.length} prueba{userResults.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-muted-foreground">Promedio</p>
                        <p className={`text-xl font-bold ${
                          avgScore >= 80 ? 'text-sena-green' : avgScore >= 60 ? 'text-warning' : 'text-destructive'
                        }`}>{avgScore}%</p>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
                        latestResult?.level?.startsWith('C') ? 'bg-sena-green/10 text-sena-green' :
                        latestResult?.level?.startsWith('B') ? 'bg-sena-blue/10 text-sena-blue' :
                        'bg-warning/10 text-warning'
                      }`}>
                        {latestResult?.level || 'Sin nivel'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results Table */}
                {userResults.length > 0 ? (
                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">Fecha</th>
                        <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">Puntuacion</th>
                        <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">Nivel</th>
                        <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">Correctas</th>
                        <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">Duracion</th>
                        <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">Feedback</th>
                        <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userResults.map((result) => (
                        <tr key={result.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-5 text-sm">
                            {new Date(result.completedAt).toLocaleDateString('es-ES', { 
                              day: 'numeric', month: 'short', year: 'numeric' 
                            })}
                          </td>
                          <td className="py-4 px-5">
                            <span className={`text-lg font-bold ${
                              result.score >= 80 ? 'text-sena-green' : 
                              result.score >= 60 ? 'text-warning' : 'text-destructive'
                            }`}>
                              {result.score}%
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                              result.level.startsWith('C') ? 'bg-sena-green/10 text-sena-green' :
                              result.level.startsWith('B') ? 'bg-sena-blue/10 text-sena-blue' :
                              'bg-warning/10 text-warning'
                            }`}>
                              {result.level}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-sm text-muted-foreground">
                            {result.correctAnswers}/{result.totalQuestions}
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" strokeWidth={1.8} />
                              {result.duration || '~9:00'}
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            {result.feedback ? (
                              <CheckCircle className="w-5 h-5 text-sena-green" strokeWidth={1.8} />
                            ) : (
                              <XCircle className="w-5 h-5 text-muted-foreground/40" strokeWidth={1.8} />
                            )}
                          </td>
                          <td className="py-4 px-5">
                            <button
                              onClick={() => handleViewDetails(result)}
                              className="flex items-center gap-2 px-4 py-2 bg-sena-blue text-white rounded-lg hover:bg-sena-blue-light transition-colors text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" strokeWidth={1.8} />
                              Revisar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                ) : (
                  <div className="px-5 py-6 text-sm text-muted-foreground">
                    Sin pruebas registradas.
                  </div>
                )}
              </motion.div>
            );
          })
        )}
        </div>

        {!isLoading && studentEntries.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-border">
            <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1.8} />
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay resultados</h3>
            <p className="text-muted-foreground">No se encontraron pruebas que coincidan con tu busqueda</p>
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
                                    title="Aprobar ingreso a la ficha"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Aprobar</span>
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
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {selectedResult.answers.map((ans, idx) => (
                        <div
                          key={ans.questionId || idx}
                          className={`p-3.5 rounded-xl border text-xs transition-colors ${
                            ans.isCorrect
                              ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                              : "bg-red-50/60 border-red-200 text-red-950"
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600 mt-1">
                            <p>
                              <strong className="text-slate-700">Respuesta del aprendiz:</strong>{" "}
                              Opción {(ans.userAnswer !== undefined && ans.userAnswer !== null) ? Number(ans.userAnswer) + 1 : "Sin responder"}
                            </p>
                            <p>
                              <strong className="text-emerald-700">Respuesta correcta:</strong>{" "}
                              Opción {(ans.correctAnswer !== undefined && ans.correctAnswer !== null) ? Number(ans.correctAnswer) + 1 : "N/A"}
                            </p>
                          </div>
                          {ans.category && (
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">
                              Competencia: {ans.category}
                            </p>
                          )}
                        </div>
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
