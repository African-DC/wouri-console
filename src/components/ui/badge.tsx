import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 font-titre text-[11px] font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-gris-clair text-ardoise",
        secondary: "bg-gris-clair text-ardoise",
        outline: "border border-gris-clair text-ardoise",
        positif: "bg-vert/10 text-vert",
        attention: "bg-orange/12 text-[#8a5600]",
        critique: "bg-[#b3261e]/10 text-[#b3261e]",
        info: "bg-bleu/10 text-bleu-profond",
        destructive: "bg-[#b3261e]/10 text-[#b3261e]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
