import * as React from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";

import { cn } from "./utils";
import { IconBadge, type IconBadgeProps } from "./icon-badge";

// =======================================================================
// StatCard
// Tarjeta de estadística con ícono circular, valor grande y etiqueta.
// Reemplaza el patrón repetido "bg-white rounded-2xl p-5 border ... w-11 h-11
// bg-{color}/10 rounded-xl" usado en Dashboard/Teacher/Admin.
// =======================================================================

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: IconBadgeProps["tone"];
  delay?: number;
  className?: string;
}

function StatCard({ label, value, icon: Icon, tone = "green", delay = 0, className }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn("surface-card p-5", className)}
    >
      <div className="flex items-start justify-between mb-3">
        <IconBadge tone={tone} size="md">
          <Icon />
        </IconBadge>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
}

export { StatCard };
