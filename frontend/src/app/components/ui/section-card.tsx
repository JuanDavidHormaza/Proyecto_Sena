import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "./utils";
import { IconBadge, type IconBadgeProps } from "./icon-badge";

// =======================================================================
// SectionCard
// Contenedor de sección con encabezado uniforme: ícono circular + título +
// subtítulo opcional + acción a la derecha. Usado para reemplazar los
// bloques repetidos "bg-white rounded-2xl border ... flex items-center
// justify-between p-5 border-b" de Dashboard/Teacher/Admin/Media.
// =======================================================================

export interface SectionCardProps extends React.ComponentProps<"div"> {
  icon?: LucideIcon;
  tone?: IconBadgeProps["tone"];
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  bodyClassName?: string;
}

function SectionCard({
  icon: Icon,
  tone = "green",
  title,
  subtitle,
  action,
  className,
  bodyClassName,
  children,
  ...props
}: SectionCardProps) {
  const hasHeader = Boolean(Icon || title || subtitle || action);

  return (
    <div className={cn("surface-card", className)} {...props}>
      {hasHeader && (
        <div className="flex items-center justify-between gap-4 p-5 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <IconBadge tone={tone} size="md">
                <Icon />
              </IconBadge>
            )}
            {(title || subtitle) && (
              <div className="min-w-0">
                {title && <h3 className="font-semibold text-foreground truncate">{title}</h3>}
                {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}

export { SectionCard };
