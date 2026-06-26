import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { Image, Video, X, Play, ChevronRight, Film, Camera, ZoomIn } from "lucide-react";
import { useState } from "react";

// ─── Datos de ejemplo ───────────────────────────────────────────────────────
// Reemplaza estos src por tus archivos reales importados con:
//   import miImagen from "./assets/foto.jpg";
//   import miVideo  from "./assets/video.mp4";

const IMAGES = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
    title: "Clase de conversación",
    category: "Aprendizaje",
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80",
    title: "Laboratorio de idiomas",
    category: "Instalaciones",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
    title: "Estudio individual",
    category: "Aprendizaje",
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&q=80",
    title: "Evaluación oral",
    category: "Evaluaciones",
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=800&q=80",
    title: "Trabajo en equipo",
    category: "Aprendizaje",
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&q=80",
    title: "Biblioteca SENA",
    category: "Instalaciones",
  },
];

const VIDEOS = [
  {
    id: 1,
    // Para video real: src: miVideo  (archivo .mp4 importado)
    src: "https://www.w3schools.com/html/mov_bbb.mp4",
    poster: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
    title: "Introducción al curso",
    duration: "2:34",
    category: "Tutorial",
  },
  {
    id: 2,
    src: "https://www.w3schools.com/html/movie.mp4",
    poster: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=800&q=80",
    title: "Pronunciación avanzada",
    duration: "5:12",
    category: "Pronunciación",
  },
  {
    id: 3,
    src: "https://www.w3schools.com/html/mov_bbb.mp4",
    poster: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&q=80",
    title: "Gramática esencial",
    duration: "8:45",
    category: "Gramática",
  },
];

type Tab = "images" | "videos" | "all";

// ─── Componente principal ────────────────────────────────────────────────────
export function MediaPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [lightboxImage, setLightboxImage] = useState<(typeof IMAGES)[0] | null>(null);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "all",    label: "Todo",      icon: Film   },
    { key: "images", label: "Imágenes",  icon: Camera },
    { key: "videos", label: "Videos",    icon: Video  },
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header (igual al LandingPage) ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg shadow-slate-900/15">
                <img src="/worklex.png" alt="WorkLex logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">English Level Test</h1>
                <p className="text-xs text-muted-foreground">Plataforma SENA</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-sena-blue text-white rounded-xl hover:bg-sena-blue-light transition-all duration-300 font-medium shadow-lg shadow-sena-blue/25"
            >
              Ingresar
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </header>

      {/* ── Hero de la sección ── */}
      <section className="pt-32 pb-10 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sena-green/5 via-transparent to-sena-blue/5" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-sena-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sena-blue/10 rounded-full blur-3xl" />

        <div className="container mx-auto max-w-6xl relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sena-green/10 text-sena-green rounded-full text-sm font-medium mb-6">
              <Image className="w-4 h-4" />
              Galería Multimedia
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              Recursos{" "}
              <span className="text-sena-green">Visuales</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Explora imágenes y videos del programa de inglés SENA
            </p>
          </motion.div>

          {/* Estadísticas rápidas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center gap-8 mt-10"
          >
            {[
              { icon: Camera, value: `${IMAGES.length}`, label: "Imágenes" },
              { icon: Video,  value: `${VIDEOS.length}`, label: "Videos"   },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-lg border border-border">
                <div className="w-10 h-10 bg-sena-green/10 rounded-xl flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-sena-green" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Tabs de filtro ── */}
      <section className="py-6 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center gap-3"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    active
                      ? "bg-sena-green text-white shadow-lg shadow-sena-green/30"
                      : "bg-white text-muted-foreground border border-border hover:border-sena-green/40 hover:text-sena-green"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Galería de Imágenes ── */}
      {(activeTab === "all" || activeTab === "images") && (
        <section className="py-8 px-6">
          <div className="container mx-auto max-w-6xl">
            {activeTab === "all" && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 mb-8"
              >
                <div className="w-10 h-10 bg-sena-green/10 rounded-xl flex items-center justify-center">
                  <Camera className="w-5 h-5 text-sena-green" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Imágenes</h3>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {IMAGES.map((img, index) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  whileHover={{ y: -6 }}
                  onClick={() => setLightboxImage(img)}
                  className="group relative bg-white rounded-2xl overflow-hidden shadow-lg border border-border cursor-pointer hover:shadow-xl transition-shadow duration-300"
                >
                  {/* Imagen */}
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={img.src}
                      alt={img.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Overlay al hover */}
                    <div className="absolute inset-0 bg-sena-green/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <ZoomIn className="w-6 h-6 text-sena-green" />
                      </div>
                    </div>
                    {/* Badge categoría */}
                    <span className="absolute top-3 left-3 bg-white/90 text-sena-green text-xs font-semibold px-3 py-1 rounded-full">
                      {img.category}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="p-4">
                    <p className="font-semibold text-foreground">{img.title}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Galería de Videos ── */}
      {(activeTab === "all" || activeTab === "videos") && (
        <section className="py-8 px-6 pb-20">
          <div className="container mx-auto max-w-6xl">
            {activeTab === "all" && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 mb-8"
              >
                <div className="w-10 h-10 bg-sena-blue/10 rounded-xl flex items-center justify-center">
                  <Video className="w-5 h-5 text-sena-blue" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Videos</h3>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {VIDEOS.map((vid, index) => (
                <motion.div
                  key={vid.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -6 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg border border-border hover:shadow-xl transition-all duration-300"
                >
                  {/* Video / Poster */}
                  <div className="relative aspect-video overflow-hidden bg-gray-900">
                    {playingVideo === vid.id ? (
                      <video
                        src={vid.src}
                        poster={vid.poster}
                        controls
                        autoPlay
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <img
                          src={vid.poster}
                          alt={vid.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                        />
                        {/* Overlay con botón Play */}
                        <div
                          className="absolute inset-0 flex items-center justify-center cursor-pointer"
                          onClick={() => setPlayingVideo(vid.id)}
                        >
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl"
                          >
                            <Play className="w-7 h-7 text-sena-blue fill-sena-blue ml-1" />
                          </motion.div>
                        </div>
                        {/* Duración */}
                        <span className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-medium px-2.5 py-1 rounded-lg">
                          {vid.duration}
                        </span>
                        {/* Categoría */}
                        <span className="absolute top-3 left-3 bg-white/90 text-sena-blue text-xs font-semibold px-3 py-1 rounded-full">
                          {vid.category}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex items-center justify-between">
                    <p className="font-semibold text-foreground">{vid.title}</p>
                    {playingVideo === vid.id && (
                      <button
                        onClick={() => setPlayingVideo(null)}
                        className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        Cerrar
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Lightbox de imagen ── */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImage.src}
                alt={lightboxImage.title}
                className="w-full object-contain max-h-[70vh]"
              />
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-lg">{lightboxImage.title}</p>
                  <p className="text-sm text-muted-foreground">{lightboxImage.category}</p>
                </div>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer (igual al LandingPage) ── */}
      <footer className="py-8 px-6 border-t border-border bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg shadow-slate-900/15">
                <img src="/worklex.png" alt="WorkLex logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-semibold text-foreground">English Level Test</p>
                <p className="text-sm text-muted-foreground">SENA - 2026</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Plataforma educativa para la evaluación de competencias en inglés
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}