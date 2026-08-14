import { CatchBoundary, type ErrorComponentProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ErrorState } from "./ui";

/* §79-80 — une erreur dans un module ne doit pas emporter la console entière,
   et l'utilisateur doit repartir avec une référence exploitable par le support.

   Convex renvoie ses erreurs applicatives sous la forme
   « [Request ID: xxxx] Server Error ... ». On extrait cet identifiant : c'est
   exactement ce que le support recherchera dans les journaux. */

const REQUEST_ID = /\[Request ID:\s*([^\]]+)\]/;
const CONVEX_MESSAGE = /Uncaught (?:Error|ConvexError):\s*([^\n]+)/;

function referenceFrom(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  return REQUEST_ID.exec(error.message)?.[1]?.trim();
}

function messageFrom(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  // Le message serveur est plus parlant que la trace complète, mais on ne
  // remonte jamais la pile : elle exposerait des détails d'implémentation.
  const applicative = CONVEX_MESSAGE.exec(error.message)?.[1]?.trim();
  if (applicative) return applicative;
  const première = error.message.split("\n")[0]?.trim();
  return première && première.length <= 200 ? première : undefined;
}

/** Composant d'erreur du routeur : rendu quand une route entière échoue. */
export function RouteErrorComponent({ error, reset }: ErrorComponentProps) {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <ErrorState
        message={messageFrom(error)}
        reference={referenceFrom(error)}
        onRetry={reset}
      />
    </div>
  );
}

/**
 * Isole une section du tableau de bord. Une carte qui échoue n'empêche pas les
 * autres de s'afficher, et l'erreur ne remonte pas jusqu'au shell.
 */
export function SectionBoundary({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <CatchBoundary
      getResetKey={() => id}
      errorComponent={({ error, reset }) => (
        <ErrorState
          message={messageFrom(error)}
          reference={referenceFrom(error)}
          onRetry={reset}
        />
      )}
    >
      {children}
    </CatchBoundary>
  );
}
