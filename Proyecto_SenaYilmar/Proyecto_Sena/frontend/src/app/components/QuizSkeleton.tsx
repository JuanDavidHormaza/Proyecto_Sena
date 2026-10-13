import { motion } from "motion/react";
import { Loader2, Sparkles } from "lucide-react";

export function QuizSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sena-blue via-sena-blue-light to-sena-green relative overflow-hidden flex flex-col justify-start">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0YzAtMi4yMDkgMS43OTEtNCA0LTRzNCAxLjc5MSA0IDQtMS43OTEgNC00IDQtNC0xLjc5MS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

      <div className="container mx-auto max-w-4xl px-4 py-6 relative">
        {/* Header Skeleton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/25 border-2 border-white/40 shadow-lg animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-white/30 rounded-md animate-pulse" />
              <div className="h-3 w-48 bg-white/20 rounded-md animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-28 rounded-xl bg-white/20 border border-white/25 animate-pulse" />
        </motion.div>

        {/* Progress Bar & Header Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-28 rounded-full bg-emerald-400/40 animate-pulse" />
              <div className="h-4 w-24 rounded-md bg-white/25 animate-pulse" />
            </div>
            <div className="h-8 w-24 rounded-xl bg-black/30 border border-white/15 animate-pulse" />
          </div>
          <div className="h-2 bg-black/20 rounded-full overflow-hidden">
            <div className="h-full w-1/6 bg-emerald-400/50 rounded-full animate-pulse" />
          </div>
        </motion.div>

        {/* Main Question Card Skeleton */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-card rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6"
        >
          {/* Card Top Category & Stars */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-36 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 animate-pulse" />
              <div className="h-4 w-28 rounded-md bg-slate-100 dark:bg-muted animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-20 rounded-md bg-amber-100 dark:bg-amber-950/40 animate-pulse" />
            </div>
          </div>

          {/* Question Title Skeleton (2 lines) */}
          <div className="space-y-2.5">
            <div className="h-7 w-11/12 bg-slate-200 dark:bg-muted/80 rounded-xl animate-pulse" />
            <div className="h-7 w-3/4 bg-slate-200 dark:bg-muted/80 rounded-xl animate-pulse" />
          </div>

          {/* Prompt / Vocab Box Skeleton */}
          <div className="h-24 w-full rounded-2xl bg-slate-100 dark:bg-muted/40 border border-slate-200/80 dark:border-border p-4 flex flex-col justify-center space-y-2 animate-pulse">
            <div className="h-5 w-40 bg-slate-200 dark:bg-muted rounded-md" />
            <div className="h-4 w-5/6 bg-slate-200/70 dark:bg-muted/70 rounded-md" />
          </div>

          {/* Multiple Choice Options Skeleton (4 options) */}
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="h-14 sm:h-16 w-full rounded-2xl bg-slate-50 dark:bg-muted/30 border border-slate-200/80 dark:border-border p-4 flex items-center gap-3.5 animate-pulse"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-muted flex-shrink-0" />
                <div className="h-4 flex-1 bg-slate-200 dark:bg-muted rounded-md" />
              </div>
            ))}
          </div>

          {/* Institutional Loading Status Feedback */}
          <div className="pt-4 border-t border-border flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-500 dark:text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
            <span>Cargando y fijando banco adaptativo institucional...</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default QuizSkeleton;
