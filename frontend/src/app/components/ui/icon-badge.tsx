import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

// =======================================================================
// IconBadge
// Círculo de color sólido con ícono blanco al centro — el tratamiento
// visual usado en la plantilla de referencia (círculos B, engranaje, etc.)
// en vez de cajas cuadradas con fondo tenue.
// =======================================================================

const iconBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-full shrink-0 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        green: "bg-sena-green text-white",
        blue: "bg-sena-blue text-white",
        orange: "bg-worklex-orange text-white",
        yellow: "bg-worklex-yellow text-white",
        teal: "bg-worklex-teal text-white",
        navy: "bg-worklex-navy text-white",
        red: "bg-destructive text-white",
        white: "bg-white text-sena-green shadow-soft",
        "green-soft": "bg-sena-green/10 text-sena-green",
        "blue-soft": "bg-sena-blue/10 text-sena-blue",
      },
      size: {
        sm: "w-8 h-8 [&_svg]:w-4 [&_svg]:h-4",
        md: "w-10 h-10 [&_svg]:w-5 [&_svg]:h-5",
        lg: "w-12 h-12 [&_svg]:w-6 [&_svg]:h-6",
        xl: "w-16 h-16 [&_svg]:w-7 [&_svg]:h-7",
      },
    },
    defaultVariants: {
      tone: "green",
      size: "md",
    },
  },
);

export interface IconBadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof iconBadgeVariants> {}

function IconBadge({ className, tone, size, ...props }: IconBadgeProps) {
  return (
    <span
      data-slot="icon-badge"
      className={cn(iconBadgeVariants({ tone, size, className }))}
      {...props}
    />
  );
}

export { IconBadge, iconBadgeVariants };
