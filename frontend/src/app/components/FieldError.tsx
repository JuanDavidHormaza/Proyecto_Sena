import React from "react";
import { AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FieldErrorProps {
  error?: string | null;
  className?: string;
}

export function FieldError({ error, className = "" }: FieldErrorProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={`flex items-start gap-1.5 mt-1.5 text-xs text-rose-600 font-medium ${className}`}
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-500 mt-0.5" strokeWidth={2} />
          <span className="leading-tight">{error}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
