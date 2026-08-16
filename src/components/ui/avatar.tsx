import * as React from "react";
import { cn } from "~/lib/utils";

function Avatar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-vert font-titre text-xs font-bold text-white outline outline-1 outline-black/10",
        className,
      )}
    >
      {children}
    </span>
  );
}

function AvatarFallback({ children }: { children: React.ReactNode }) {
  return <span>{children}</span>;
}

export { Avatar, AvatarFallback };
