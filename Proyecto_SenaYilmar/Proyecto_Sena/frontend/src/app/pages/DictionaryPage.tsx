import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBook2,
  IconPlayerPlay,
  IconSearch,
  IconSparkles,
  IconPhoto,
  IconVolume,
  IconRefresh,
  IconAlertCircle,
  IconLock,
  IconBuildingStore,
} from '@tabler/icons-react';
import { Navbar } from '../components/Navbar';
import { DictionaryCard } from '../components/DictionaryCard';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

const SENA_PROGRAMS = [
  { id: 'ADSO', name: 'Análisis y Desarrollo de Software', ficha: '2670142' },
  { id: 'MECANICA', name: 'Mecánica Industrial', ficha: '3520681' },
  { id: 'MULTIMEDIA', name: 'Producción Multimedia', ficha: '2554901' },
];

export function DictionaryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  // Segmentación institucional por programa del usuario
  const userProgramRaw = user?.program || (typeof user?.ficha === 'string' ? user?.ficha : user?.ficha?.programa) || '';
  const userFichaCode = user?.ficha_code || (typeof user?.ficha === 'string' ? user?.ficha : user?.ficha?.code || user?.ficha?.ficha_id) || '';

  // Determinar programa inicial
  const matchedProgram = SENA_PROGRAMS.find((p) =>
    userProgramRaw.toLowerCase().includes(p.name.toLowerCase()) ||
    userProgramRaw.toLowerCase().includes(p.id.toLowerCase())
  )?.name;

  const initialProgram = isAdmin
    ? (matchedProgram || 'Análisis y Desarrollo de Software')
    : (userProgramRaw || matchedProgram || 'Análisis y Desarrollo de Software');

  const [selectedProgram, setSelectedProgram] = useState<string>(initialProgram);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCompetence, setSelectedCompetence] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Limpieza y normalización de parámetro para la API
  const getCleanProgramParam = (prog: string) => {
    const p = (prog || '').toLowerCase();
    if (p.includes('mecanic') || p.includes('mecánica')) return 'Mecanica';
    if (p.includes('multi') || p.includes('multimedia')) return 'Multimedia';
    if (p.includes('adso') || p.includes('software')) return 'ADSO';
    return prog.split('(')[0].strip ? prog.split('(')[0].trim() : prog;
  };

  // Carga de términos del diccionario (Segmentación estricta por programa y ficha)
  useEffect(() => {
    let isMounted = true;
    async function loadTerms() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (isAdmin) {
          if (selectedProgram) {
            queryParams.append('program', getCleanProgramParam(selectedProgram));
          }
        } else {
          // Aprendiz e Instructor: enviar parámetros de su programa y ficha activa
          if (userProgramRaw) {
            queryParams.append('program', getCleanProgramParam(userProgramRaw));
          }
          if (userFichaCode) {
            queryParams.append('ficha', String(userFichaCode));
          }
        }

        const qs = queryParams.toString();
        const url = `/dictionary/${qs ? `?${qs}` : ''}`;
        const data = await api.get<any[]>(url);
        if (isMounted) {
          setTerms(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('[DictionaryPage] Error cargando términos de diccionario:', err);
        if (isMounted) setTerms([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadTerms();
    return () => { isMounted = false; };
  }, [selectedProgram, isAdmin, userProgramRaw, userFichaCode]);

  // Contadores dinámicos calculados directamente con terms.length y recursos multimedia reales
  const totalTermsCount = terms.length;
  const totalAudiosCount = terms.filter((t) => Boolean(t.audio_url || t.audioUrl || t.audio)).length;
  const totalImagesCount = terms.filter((t) => Boolean(t.image_url || t.imageUrl || t.image)).length;

  // Filtrado de términos en el cliente
  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      const word = (term.word || term.wordId || term.name || '').toLowerCase();
      const def = (term.definition || '').toLowerCase();
      const trans = (term.spanish_translation || term.spanishTranslation || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || word.includes(q) || def.includes(q) || trans.includes(q);
      const matchesLevel = selectedLevel === 'all' || (term.level || '').toUpperCase() === selectedLevel.toUpperCase();
      const matchesComp = selectedCompetence === 'all' || (term.competence || term.skill || '').toLowerCase().includes(selectedCompetence.toLowerCase());

      return matchesSearch && matchesLevel && matchesComp;
    });
  }, [terms, searchQuery, selectedLevel, selectedCompetence]);

  const activeDisplayProgram = isAdmin ? selectedProgram : (userProgramRaw || selectedProgram);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Cabecera y Selector de Programa */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-2">
              <IconSparkles size={14} />
              <span>Plataforma Lingüística Especializada SENA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Diccionario Técnico Institucional
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Catálogo de vocabulario técnico segmentado por programa y ficha de formación con pronunciación asistida en inglés.
            </p>
          </div>

          {/* Selector de Programas SENA (Solo habilitado para perfil Administrador/SuperAdmin) */}
          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              {SENA_PROGRAMS.map((prog) => {
                const isSelected = selectedProgram.toLowerCase().includes(prog.name.toLowerCase()) || selectedProgram.toLowerCase().includes(prog.id.toLowerCase());
                return (
                  <button
                    key={prog.id}
                    type="button"
                    onClick={() => setSelectedProgram(prog.name)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200 dark:ring-emerald-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {prog.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800 rounded-2xl">
              <IconBuildingStore size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Programa Asignado
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-white">
                  {activeDisplayProgram} {userFichaCode ? `(Ficha: ${userFichaCode})` : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Cuadrícula de Contadores Reales de Recursos (Palabras, Ilustraciones, Audios) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Palabras Técnicas</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{totalTermsCount}</p>
              <p className="text-[10px] text-slate-400">Homologadas en Base de Datos</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <IconBook2 className="w-5 h-5" stroke={1.8} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ilustraciones Técnicas</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{totalImagesCount}</p>
              <p className="text-[10px] text-slate-400">Con Fallback Gráfico Vectorial</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <IconPhoto className="w-5 h-5" stroke={1.8} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Audios y Pronunciación</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{totalAudiosCount}</p>
              <p className="text-[10px] text-slate-400">Asistido por Síntesis Nativa</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <IconVolume className="w-5 h-5" stroke={1.8} />
            </div>
          </div>
        </div>

        {/* Sección de Términos */}
        <div className="space-y-6">
          {/* Barra de Búsqueda y Filtros */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar término en inglés, español o definición..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filtros de Nivel y Habilidad */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">Todos los Niveles</option>
                <option value="A1">Nivel A1</option>
                <option value="A2">Nivel A2</option>
                <option value="B1">Nivel B1</option>
                <option value="B2">Nivel B2</option>
              </select>

              <select
                value={selectedCompetence}
                onChange={(e) => setSelectedCompetence(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">Todas las Habilidades</option>
                <option value="Speaking">Speaking (Oral)</option>
                <option value="Reading">Reading (Lectura)</option>
                <option value="Writing">Writing (Escritura)</option>
                <option value="Grammar">Grammar (Gramática)</option>
              </select>

              {(searchQuery || selectedLevel !== 'all' || selectedCompetence !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedLevel('all');
                    setSelectedCompetence('all');
                  }}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Limpiar filtros"
                >
                  <IconRefresh size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Cuadrícula de Tarjetas o Estado Vacío Profesional */}
          {loading ? (
            <div className="py-20 text-center text-slate-500">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Cargando catálogo técnico homologado...</p>
            </div>
          ) : filteredTerms.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredTerms.map((term, idx) => (
                  <DictionaryCard
                    key={term.id || `${term.word}-${idx}`}
                    term={{
                      ...term,
                      program: term.program || activeDisplayProgram,
                    }}
                    activeProgram={activeDisplayProgram}
                  />
                ))}
              </div>

              {/* Botón de evaluación habilitado cuando hay términos */}
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#39A900] hover:bg-[#2e8600] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98"
                >
                  <IconPlayerPlay size={18} stroke={2} />
                  <span>Practicar Evaluación Técnica ({filteredTerms.length} Términos)</span>
                </button>
              </div>
            </div>
          ) : terms.length === 0 ? (
            /* EMPTY STATE ESTRICTO: Diccionario en construcción para esta ficha */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-amber-300 dark:border-amber-800/60 p-10 sm:p-14 text-center max-w-xl mx-auto space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-200 dark:border-amber-800">
                <IconAlertCircle className="w-8 h-8" stroke={1.8} />
              </div>

              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-lg sm:text-xl">
                  Diccionario en construcción: Aún no se han homologado términos para esta ficha formativa.
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Aún no se han homologado términos para esta ficha formativa <strong>{userFichaCode || activeDisplayProgram}</strong>.
                  El docente o instructor a cargo debe cargar el vocabulario técnico especializado correspondiente.
                </p>
              </div>

              {/* Aviso de evaluaciones deshabilitadas */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-left flex items-start gap-3">
                <IconLock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                  <strong>Evaluaciones técnicas deshabilitadas:</strong> No es posible iniciar cuestionarios adaptativos de competencia lingüística hasta que el vocabulario formativo esté activo para esta especialidad.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs cursor-not-allowed opacity-80"
                >
                  <IconLock size={16} />
                  <span>Evaluación Deshabilitada (Ficha sin vocabulario homologado)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Filtros no arrojaron resultados */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center max-w-lg mx-auto space-y-3">
              <IconBook2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" stroke={1.5} />
              <h3 className="font-bold text-slate-800 dark:text-white text-base">No se encontraron términos</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                No hay términos que coincidan con la búsqueda o combinación de filtros en <strong>{activeDisplayProgram}</strong>.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default DictionaryPage;
