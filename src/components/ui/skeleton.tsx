import { cn } from "~/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gris-clair", className)} aria-hidden="true" />;
}

export { Skeleton };
