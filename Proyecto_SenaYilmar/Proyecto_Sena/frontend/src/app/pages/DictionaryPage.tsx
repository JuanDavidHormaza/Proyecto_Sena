import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBook2,
  IconPlayerPlay,
  IconSearch,
  IconSparkles,
  IconFilter,
  IconLayersLinked,
  IconRefresh,
} from '@tabler/icons-react';
import { Navbar } from '../components/Navbar';
import { DictionaryCard } from '../components/DictionaryCard';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { ProgramVideo } from '../services/api';

const SENA_PROGRAMS = [
  { id: 'MULTIMEDIA', name: 'Producción Multimedia', ficha: '2554901' },
  { id: 'ADSO', name: 'Análisis y Desarrollo de Software', ficha: '2670142' },
  { id: 'MECANICA', name: 'Mecánica Industrial', ficha: '3520681' },
];

export function DictionaryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Programa por defecto basado en la cuenta o Producción Multimedia
  const userProgramName = user?.program || user?.ficha?.programa || '';
  const initialProgram = SENA_PROGRAMS.find((p) =>
    userProgramName.toLowerCase().includes(p.name.toLowerCase()) ||
    userProgramName.toLowerCase().includes(p.id.toLowerCase())
  )?.name || 'Producción Multimedia';

  const [activeTab, setActiveTab] = useState<'vocabulary' | 'videos'>('vocabulary');
  const [selectedProgram, setSelectedProgram] = useState<string>(initialProgram);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCompetence, setSelectedCompetence] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [terms, setTerms] = useState<any[]>([]);
  const [videos, setVideos] = useState<ProgramVideo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingVideos, setLoadingVideos] = useState<boolean>(false);

  // Carga de términos del diccionario (sin tope de 20 términos, pagination_class = None)
  useEffect(() => {
    let isMounted = true;
    async function loadTerms() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedProgram) queryParams.append('program', selectedProgram);
        const url = `/dictionary/?${queryParams.toString()}`;
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
  }, [selectedProgram]);

  // Carga de catálogo de videos técnicos por programa (streaming optimizado con preload=metadata)
  useEffect(() => {
    let isMounted = true;
    async function loadVideos() {
      setLoadingVideos(true);
      try {
        const vids = await api.getProgramVideos(selectedProgram);
        if (isMounted) {
          setVideos(vids);
        }
      } catch (err) {
        console.warn('[DictionaryPage] Error cargando catálogo de videos:', err);
      } finally {
        if (isMounted) setLoadingVideos(false);
      }
    }
    loadVideos();
    return () => { isMounted = false; };
  }, [selectedProgram]);

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
              Diccionario Técnico y Recursos Multimedia
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Catálogo completo de vocabulario especializado, pronunciación con soporte offline y streaming de videos formativos en alta definición.
            </p>
          </div>

          {/* Selector de los 3 Programas SENA */}
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
        </div>

        {/* 1. Conmutador Superior de Pestañas: [Vocabulario Técnico] vs [Videos de Formación (3 Videos)] */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('vocabulary')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'vocabulary'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200/80 dark:ring-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <IconBook2 size={18} />
            <span>Vocabulario Técnico ({filteredTerms.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'videos'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200/80 dark:ring-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <IconPlayerPlay size={18} />
            <span>Videos de Formación ({videos.length} Videos)</span>
          </button>
        </div>

        {/* Vista 1: Vocabulario Técnico */}
        {activeTab === 'vocabulary' && (
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
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Limpiar filtros"
                  >
                    <IconRefresh size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Cuadrícula de Tarjetas de Vocabulario (Renderizado Dinámico sin imágenes rotas) */}
            {loading ? (
              <div className="py-20 text-center text-slate-500">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium">Cargando catálogo completo de términos...</p>
              </div>
            ) : filteredTerms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredTerms.map((term, idx) => (
                  <DictionaryCard
                    key={term.id || `${term.word}-${idx}`}
                    term={{
                      ...term,
                      program: term.program || selectedProgram,
                    }}
                    activeProgram={selectedProgram}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center max-w-lg mx-auto space-y-3">
                <IconBook2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" stroke={1.5} />
                <h3 className="font-bold text-slate-800 dark:text-white text-base">No se encontraron términos</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  No hay términos que coincidan con la búsqueda o combinación de filtros en <strong>{selectedProgram}</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vista 2: Videos de Formación (3 Videos) con Streaming Optimizado (preload="metadata") */}
        {activeTab === 'videos' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Contenido Audiovisual Formativo — {selectedProgram}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Streaming bajo demanda con pre-carga exclusiva de metadatos (cero congelamiento del navegador).
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {videos.length} Módulos Activos
              </span>
            </div>

            {loadingVideos ? (
              <div className="py-20 text-center text-slate-500">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium">Cargando módulos de video...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((vid) => (
                  <div
                    key={vid.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Contenedor de Video con preload="metadata" para rendimiento optimizado */}
                      <div className="relative w-full h-48 bg-slate-950 rounded-t-xl overflow-hidden flex items-center justify-center">
                        <video
                          controls
                          preload="metadata"
                          src={vid.url}
                          className="w-full h-48 rounded-xl bg-slate-900 object-cover shadow-md"
                        />
                        <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-black/80 text-white backdrop-blur-xs pointer-events-none">
                          {vid.duration}
                        </span>
                      </div>

                      {/* Información Pedagógica */}
                      <div className="p-4 space-y-2">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight line-clamp-1" title={vid.title}>
                          {vid.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {vid.description}
                        </p>
                      </div>
                    </div>

                    {/* Metadatos de Pie */}
                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Programa: <strong className="text-slate-700 dark:text-slate-300">{selectedProgram}</strong></span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Streaming HD</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default DictionaryPage;
