import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Lock, Loader2 } from "lucide-react";
import { cn } from "~/lib/cn";

/* ── Primitives du design system WOURI ────────────────────────────────────
   Un seul endroit pour les etats obligatoires (chargement, vide, refus,
   erreur) : chaque ecran les reutilise au lieu de reinventer un vide blanc.
   ──────────────────────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-titre text-2xl font-semibold text-vert-profond">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-ardoise">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-gris-clair bg-white p-5 shadow-[0_1px_2px_rgba(16,32,26,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutre",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutre" | "positif" | "attention" | "critique";
}) {
  const tones = {
    neutre: "text-encre",
    positif: "text-vert",
    // L'orange soleil de la charte tombe a 2,1:1 sur blanc : illisible pour un
    // chiffre. On garde la teinte ambre en la fonçant jusqu'a un contraste
    // suffisant, comme pour les badges.
    attention: "text-[#8a5600]",
    critique: "text-[#b3261e]",
  } as const;
  return (
    <Card>
      <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
        {label}
      </p>
      <p className={cn("mt-2 font-titre text-3xl font-semibold", tones[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ardoise">{hint}</p> : null}
    </Card>
  );
}

/** Barre de progression d'un quota (agriculteurs, opérateurs...). */
export function QuotaBar({
  used,
  limit,
  label,
}: {
  used: number;
  limit: number;
  label: string;
}) {
  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0;
  // Seuils 80/90/100 % exiges par le suivi d'abonnement.
  const tone =
    ratio >= 1 ? "bg-[#b3261e]" : ratio >= 0.9 ? "bg-orange" : ratio >= 0.8 ? "bg-jaune" : "bg-vert";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
          {label}
        </span>
        <span className="font-titre text-sm font-semibold text-encre">
          {used} / {limit}
        </span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gris-clair"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={label}
      >
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutre",
}: {
  children: ReactNode;
  tone?: "neutre" | "positif" | "attention" | "critique" | "info";
}) {
  const tones = {
    neutre: "bg-gris-clair text-ardoise",
    positif: "bg-vert/10 text-vert",
    attention: "bg-orange/12 text-[#8a5600]",
    critique: "bg-[#b3261e]/10 text-[#b3261e]",
    info: "bg-bleu/10 text-bleu-profond",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-titre text-[11px] font-semibold uppercase tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-gris-clair", className)}
      aria-hidden="true"
    />
  );
}

/** Chargement d'une page : squelettes plutot qu'un spinner plein ecran. */
export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement en cours</span>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center py-12 text-center">
      <Inbox className="h-8 w-8 text-ardoise" aria-hidden="true" />
      <p className="mt-3 font-titre font-semibold text-encre">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-ardoise">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

/** Refus d'acces : on explique, on ne laisse pas un ecran vide. */
export function PermissionDenied({ what }: { what: string }) {
  return (
    <Card className="flex flex-col items-center py-12 text-center">
      <Lock className="h-8 w-8 text-ardoise" aria-hidden="true" />
      <p className="mt-3 font-titre font-semibold text-encre">Accès non autorisé</p>
      {/* Formulation choisie pour rester correcte quel que soit le complement :
          « acceder a » imposerait une elision (au / aux / a la) que la
          concatenation ne sait pas produire. */}
      <p className="mt-1 max-w-md text-sm text-ardoise">
        Votre rôle ne permet pas de consulter {what}. Contactez un administrateur
        de votre organisation si vous pensez qu'il s'agit d'une erreur.
      </p>
    </Card>
  );
}

/** Erreur : la reference technique est affichee pour le support. */
export function ErrorState({
  message,
  reference,
  onRetry,
}: {
  message?: string;
  reference?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="flex flex-col items-center py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-[#8a5600]" aria-hidden="true" />
      <p className="mt-3 font-titre font-semibold text-encre">
        Une erreur est survenue
      </p>
      <p className="mt-1 max-w-md text-sm text-ardoise">
        {message ?? "Les données n'ont pas pu être chargées."}
      </p>
      {reference ? (
        <p className="mt-2 font-mono text-xs text-ardoise">Référence : {reference}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md border border-gris-clair px-3 py-2 text-sm font-semibold text-vert hover:bg-vert/5"
        >
          Réessayer
        </button>
      ) : null}
    </Card>
  );
}

export function Button({
  children,
  variant = "primary",
  type = "button",
  disabled,
  loading,
  onClick,
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const variants = {
    primary: "bg-vert text-white hover:bg-vert-profond disabled:bg-ardoise",
    secondary:
      "border border-gris-clair bg-white text-encre hover:border-vert hover:text-vert",
    ghost: "text-ardoise hover:bg-gris-clair/60 hover:text-encre",
    danger: "bg-[#b3261e] text-white hover:bg-[#8f1e18]",
  } as const;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        // Cible tactile >= 44px de haut sur mobile.
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 font-titre text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
