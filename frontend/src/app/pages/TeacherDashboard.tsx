import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { 
  Search, Eye, MessageSquare, CheckCircle, XCircle,
  Users, BarChart3, TrendingUp, Send, X, Clock,
  Filter, Volume2, Headphones, Play, Download
} from "lucide-react";
import { TestResult, User } from "../data/users";
import * as api from "../services/api";
import { UserAccountMenu } from "../components/UserAccountMenu";
import { BrandLogo } from "../components/BrandLogo";
import { IconBadge } from "../components/ui/icon-badge";
import { StatCard } from "../components/ui/stat-card";
import { useAuth } from "../context/AuthContext";

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [feedback, setFeedback] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<User[]>([]);
  const [studentAudios, setStudentAudios] = useState<Record<string, any[]>>({});
  const [audiosLoading, setAudiosLoading] = useState(false);
  const [selectedAudioLevel, setSelectedAudioLevel] = useState<string>("A1");

  const teacherName = user?.name || localStorage.getItem("userName") || "Docente";

  // Cargar datos desde API
  const loadDataFromApi = async () => {
    setIsLoading(true);
    try {
      const [apiResults, apiUsers] = await Promise.all([
        api.getTestResults(),
        api.getUsers('student'),
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
        answers: r.answers || [],
      }));
      
      // Convertir estudiantes de API
      const convertedStudents = apiUsers.map((u) => ({
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
    } catch (error) {
      console.error("No fue posible cargar los grupos del docente", error);
      setResults([]);
      setStudents([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDataFromApi();
  }, []);

  const handleViewDetails = (result: TestResult) => {
    setSelectedResult(result);
    setFeedback(result.feedback || "");
  };

  const handleSaveFeedback = async () => {
    if (selectedResult) {
      try {
        // Intentar guardar en API
        await api.addFeedback(selectedResult.id, feedback);
      } catch (error) {
        console.log("[v0] Failed to save feedback to API", error);
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

  const filteredResults = results.filter(r => {
    const matchesSearch = r.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === "all" || r.level.startsWith(filterLevel);
    return matchesSearch && matchesLevel;
  });

  // La API ya devuelve exclusivamente aprendices de las fichas del docente.
  const programStudents = students;

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
    intermediate: filteredResults.filter(r => r.level === 'B1').length,
    advanced: filteredResults.filter(r => r.level === 'B2').length,
  };
  const totalFilteredTests = filteredResults.length || 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-border z-40">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo height="h-12" />
              <div className="hidden sm:block">
                <h1 className="font-semibold text-foreground">English Level Test</h1>
                <p className="text-xs text-muted-foreground">Panel de Docente</p>
              </div>
            </div>

            <UserAccountMenu accent="blue" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Bienvenido, {teacherName.split(' ')[0]}
          </h2>
          <p className="text-muted-foreground">
            Revisa el progreso de los estudiantes de tus fichas y brinda retroalimentación personalizada
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Estudiantes", value: stats.totalStudents, icon: Users, tone: "blue" as const },
            { label: "Pruebas Realizadas", value: stats.totalTests, icon: BarChart3, tone: "green" as const },
            { label: "Promedio General", value: `${stats.averageScore}%`, icon: TrendingUp, tone: "yellow" as const },
            { label: "Retroalimentaciones", value: stats.feedbackGiven, icon: MessageSquare, tone: "red" as const },
          ].map((stat, index) => (
            <StatCard key={index} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} delay={index * 0.1} />
          ))}
        </div>

        {/* Level Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="surface-card p-6 mb-8"
        >
          <h3 className="font-semibold text-foreground mb-4">Distribucion por Nivel</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Basico (A1-A2)", value: levelDistribution.basic, color: "#E21B3C", percentage: (levelDistribution.basic / totalFilteredTests) * 100 },
              { label: "Intermedio (B1)", value: levelDistribution.intermediate, color: "#D89E00", percentage: (levelDistribution.intermediate / totalFilteredTests) * 100 },
              { label: "Avanzado (B2)", value: levelDistribution.advanced, color: "#39A900", percentage: (levelDistribution.advanced / totalFilteredTests) * 100 },
            ].map((level, index) => (
              <div key={index} className="text-center">
                <div 
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white text-xl font-bold mb-2"
                  style={{ backgroundColor: level.color }}
                >
                  {level.value}
                </div>
                <p className="text-sm font-medium text-foreground">{level.label}</p>
                <p className="text-xs text-muted-foreground">{level.percentage.toFixed(0)}% del total</p>
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sena-blue/40"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="pl-12 pr-8 py-3 bg-white border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sena-blue/40 appearance-none cursor-pointer"
            >
              <option value="all">Todos los niveles</option>
              <option value="A">Basico (A1-A2)</option>
              <option value="B1">Intermedio (B1)</option>
              <option value="B2">Avanzado (B2)</option>
            </select>
          </div>
        </motion.div>

        {/* Students Results */}
        <div className="space-y-6">
          {studentEntries.map(([userId, userResults], index) => {
            const student = students.find(s => s.id === userId);
            const latestResult = userResults[0];
            const studentName = student?.name || latestResult?.userName || "Estudiante";
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
                className="surface-card overflow-hidden"
              >
                {/* Student Header */}
                <div className="p-5 border-b border-border/60 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-sena-green rounded-full flex items-center justify-center text-white font-medium text-lg">
                        {studentName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{studentName}</h3>
                        <p className="text-sm text-muted-foreground">
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
                      <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
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
                      <tr className="border-b border-border/60">
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
                        <tr key={result.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
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
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
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
                              <Clock className="w-4 h-4" />
                              {result.duration || '~9:00'}
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            {result.feedback ? (
                              <CheckCircle className="w-5 h-5 text-sena-green" />
                            ) : (
                              <XCircle className="w-5 h-5 text-muted-foreground/40" />
                            )}
                          </td>
                          <td className="py-4 px-5">
                            <button
                              onClick={() => handleViewDetails(result)}
                              className="flex items-center gap-2 px-4 py-2 bg-sena-blue text-white rounded-full hover:bg-sena-blue-light transition-colors text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" />
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
          })}
        </div>

        {studentEntries.length === 0 && (
          <div className="text-center py-16 surface-card">
            <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay resultados</h3>
            <p className="text-muted-foreground">No se encontraron pruebas que coincidan con tu busqueda</p>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedResult && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl my-8 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Detalle de Prueba</h3>
                  <p className="text-sm text-muted-foreground">{selectedResult.userName}</p>
                </div>
                <button
                  onClick={() => { setSelectedResult(null); setFeedback(""); }}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/50 rounded-2xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Puntuacion</p>
                    <p className={`text-3xl font-bold ${
                      selectedResult.score >= 80 ? 'text-sena-green' :
                      selectedResult.score >= 60 ? 'text-warning' : 'text-destructive'
                    }`}>{selectedResult.score}%</p>
                  </div>
                  <div className="bg-muted/50 rounded-2xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Nivel</p>
                    <p className="text-3xl font-bold text-foreground">{selectedResult.level}</p>
                  </div>
                  <div className="bg-muted/50 rounded-2xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Correctas</p>
                    <p className="text-3xl font-bold text-foreground">
                      {selectedResult.correctAnswers}/{selectedResult.totalQuestions}
                    </p>
                  </div>
                </div>

                {/* Student Speaking Audios */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <IconBadge tone="blue-soft" size="sm" className="bg-purple-100 text-purple-600">
                      <Headphones size={16} />
                    </IconBadge>
                    <h4 className="font-semibold text-foreground">Audios de Speaking del Estudiante</h4>
                  </div>

                  {/* Level tabs: A1, A2, B1, B2 */}
                  <div className="flex gap-2 mb-3">
                    {["A1", "A2", "B1", "B2"].map((level) => {
                      const levelAudios = studentAudios[level] || [];
                      const count = levelAudios.length;
                      return (
                        <button
                          key={level}
                          onClick={async () => {
                            setSelectedAudioLevel(level);
                            setAudiosLoading(true);
                            try {
                              const data = await api.getStudentAudios(selectedResult.userId, level);
                              setStudentAudios(data.audios || {});
                            } catch (err) {
                              console.error("Error loading student audios:", err);
                            }
                            setAudiosLoading(false);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            selectedAudioLevel === level
                              ? 'bg-purple-700 text-white'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          {level} {count > 0 && `(${count})`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Audio list for selected level */}
                  <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100">
                    {audiosLoading ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Cargando audios...</p>
                    ) : (studentAudios[selectedAudioLevel] || []).length > 0 ? (
                      <div className="space-y-2">
                        {(studentAudios[selectedAudioLevel] || []).map((audio: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-purple-100">
                            <Play className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            <audio controls src={audio.url} className="flex-1 h-8" preload="none">
                              Tu navegador no soporta audio.
                            </audio>
                            <a
                              href={audio.url}
                              download={audio.filename}
                              className="p-2 hover:bg-purple-100 rounded-full text-purple-600 transition-colors"
                              title="Descargar audio"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Volume2 className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No hay audios de speaking para el nivel {selectedAudioLevel}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Selecciona un nivel para cargar los audios
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Feedback Section */}
                <div>
                  <label className="flex items-center gap-2 font-semibold text-foreground mb-3">
                    <MessageSquare className="w-5 h-5 text-sena-blue" />
                    Retroalimentacion para el estudiante
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    placeholder="Escribe tus comentarios y recomendaciones para el estudiante..."
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sena-blue/40 resize-none"
                  />
                  {selectedResult.feedback && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Ultima retroalimentacion guardada
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-6 border-t border-border">
                <button
                  onClick={handleSaveFeedback}
                  className="flex-1 flex items-center justify-center gap-2 bg-sena-green text-white py-3 rounded-full hover:bg-sena-green-dark transition-all font-medium"
                >
                  <Send className="w-5 h-5" />
                  Enviar Retroalimentacion
                </button>
                <button
                  onClick={() => { setSelectedResult(null); setFeedback(""); }}
                  className="flex-1 bg-muted text-muted-foreground py-3 rounded-full hover:bg-muted/80 transition-all font-medium"
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
