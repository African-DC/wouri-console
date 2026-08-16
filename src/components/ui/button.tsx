import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 font-titre text-sm font-semibold transition-[transform,color,background-color,border-color] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.96]",
  {
    variants: {
      variant: {
        default: "bg-vert text-white hover:bg-vert-profond",
        primary: "bg-vert text-white hover:bg-vert-profond",
        secondary:
          "border border-gris-clair bg-white text-encre hover:border-vert hover:text-vert",
        outline:
          "border border-gris-clair bg-white text-encre hover:border-vert hover:text-vert",
        ghost: "text-ardoise hover:bg-gris-clair/60 hover:text-encre",
        destructive: "bg-[#b3261e] text-white hover:bg-[#8f1e18]",
        danger: "bg-[#b3261e] text-white hover:bg-[#8f1e18]",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-10 px-3",
        icon: "h-11 w-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      loading?: boolean;
      variant?:
        | "default"
        | "primary"
        | "secondary"
        | "outline"
        | "ghost"
        | "destructive"
        | "danger";
    }
>(function Button(
  { className, variant = "primary", size, type = "button", disabled, loading, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

export { Button, buttonVariants };
