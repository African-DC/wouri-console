import * as React from "react";
import { cn } from "~/lib/utils";

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-md border border-gris-clair bg-white px-3 text-sm text-encre outline-none transition-[border-color,box-shadow] placeholder:text-ardoise/70 focus:border-vert",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
