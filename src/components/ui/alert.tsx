import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "~/lib/utils";

function Alert({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-lg border border-gris-clair bg-white p-4 text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

function AlertTitle({ children }: { children: React.ReactNode }) {
  return <p className="font-titre font-semibold text-encre">{children}</p>;
}

function AlertDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-ardoise">{children}</p>;
}

function AlertIcon() {
  return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#8a5600]" aria-hidden="true" />;
}

export { Alert, AlertTitle, AlertDescription, AlertIcon };
