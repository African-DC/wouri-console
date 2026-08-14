import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Wrench, Search, Sparkles, ShieldCheck } from "lucide-react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan } from "~/lib/authz/session";
import { cn } from "~/lib/cn";
import {
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PermissionDenied,
  StatCard,
  StatusBadge,
} from "~/components/ui";

export const Route = createFileRoute("/console/ai-ops")({ component: AiOpsPage });

/* APP-08 — comprendre une interaction sans jamais exposer le raisonnement brut
   du modele. On montre le CHEMIN d'execution : etapes, outils appeles, sources
   citees, garde-fous, versions et duree. Une abstention n'est pas une erreur :
   c'est le systeme qui refuse d'inventer faute de source, et l'ecran le dit. */

const STATUTS: Record<
  string,
  { label: string; tone: "positif" | "attention" | "critique" | "neutre"; aide?: string }
> = {
  succeeded: { label: "Réussie", tone: "positif" },
  abstained: {
    label: "Abstention",
    tone: "attention",
    aide: "WOURI a refusé de répondre faute de source fiable. Ce n'est pas une erreur.",
  },
  failed: { label: "Échec", tone: "critique" },
  running: { label: "En cours", tone: "neutre" },
};

const ETAPES: Record<string, { label: string; icon: typeof Wrench }> = {
  tool: { label: "Outil", icon: Wrench },
  retrieval: { label: "Recherche", icon: Search },
  generation: { label: "Rédaction", icon: Sparkles },
  guard: { label: "Garde-fou", icon: ShieldCheck },
};

function AiOpsPage() {
  if (!useCan(CAP.aiopsRead)) {
    return (
      <>
        <PageHeader title="AI Ops" />
        <PermissionDenied what="les traces d'exécution de la plateforme" />
      </>
    );
  }
  return <AiOpsView />;
}

function AiOpsView() {
  const [ouverte, setOuverte] = useState<string | null>(null);
  // Les listes sont plafonnees cote backend : les compteurs decrivent donc les
  // executions les plus recentes, jamais un total historique.
  const PLAFOND_TRACES = 100;
  const PLAFOND_ERREURS = 50;
  const traces = useQuery(api.aiops.traces.listTraces, { limit: PLAFOND_TRACES });
  const erreurs = useQuery(api.aiops.traces.listErrors, { limit: PLAFOND_ERREURS });

  if (traces === undefined) {
    return (
      <>
        <PageHeader title="AI Ops" />
        <LoadingState rows={4} />
      </>
    );
  }

  const parStatut = traces.reduce<Record<string, number>>((acc, t) => {
    acc[t.resultStatus] = (acc[t.resultStatus] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="AI Ops"
        description="Chemin d'exécution des interactions : outils appelés, sources citées, garde-fous et durées."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Exécutions récentes"
          value={traces.length >= PLAFOND_TRACES ? `${traces.length}+` : traces.length}
          hint={`${PLAFOND_TRACES} plus récentes au maximum`}
        />
        <StatCard
          label="Réussies"
          value={parStatut.succeeded ?? 0}
          tone="positif"
          hint="Parmi les exécutions affichées"
        />
        <StatCard
          label="Abstentions"
          value={parStatut.abstained ?? 0}
          tone="attention"
          hint="Refus de répondre faute de source"
        />
        <StatCard
          label="Erreurs signalées"
          value={
            (erreurs?.length ?? 0) >= PLAFOND_ERREURS
              ? `${erreurs?.length}+`
              : (erreurs?.length ?? 0)
          }
          tone={(erreurs?.length ?? 0) > 0 ? "critique" : "neutre"}
          hint={`${PLAFOND_ERREURS} plus récentes au maximum`}
        />
      </div>

      {traces.length === 0 ? (
        <EmptyState
          title="Aucune exécution tracée"
          description="Les interactions des agriculteurs avec WOURI apparaîtront ici, avec le détail de leur exécution."
        />
      ) : (
        <div className="space-y-3">
          {traces.map((trace) => (
            <TraceCard
              key={trace._id}
              trace={trace}
              ouverte={ouverte === trace._id}
              onToggle={() => setOuverte(ouverte === trace._id ? null : trace._id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

type Trace = {
  _id: string;
  resultStatus: string;
  intent?: string;
  language?: string;
  errorType?: string;
  latencyMs?: number;
  startedAt: number;
  completedAt?: number;
};

function TraceCard({
  trace,
  ouverte,
  onToggle,
}: {
  trace: Trace;
  ouverte: boolean;
  onToggle: () => void;
}) {
  const statut = STATUTS[trace.resultStatus] ?? {
    label: trace.resultStatus,
    tone: "neutre" as const,
  };
  const duree =
    trace.latencyMs ??
    (trace.completedAt ? trace.completedAt - trace.startedAt : undefined);

  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={ouverte}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statut.tone}>{statut.label}</StatusBadge>
            {trace.intent ? (
              <span className="font-titre text-sm font-semibold text-encre">
                {trace.intent}
              </span>
            ) : null}
            {trace.language ? (
              <span className="text-xs text-ardoise">{trace.language}</span>
            ) : null}
          </div>
          {statut.aide ? (
            <p className="mt-1 text-xs text-ardoise">{statut.aide}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          {duree !== undefined ? (
            <p className="font-titre text-sm font-semibold text-encre">
              {(duree / 1000).toFixed(1)} s
            </p>
          ) : null}
          <p className="text-xs text-ardoise">
            {new Date(trace.startedAt).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </button>

      {ouverte ? <TraceDetail traceId={trace._id} /> : null}
    </Card>
  );
}

/** Chronologie de l'exécution : chaque étape, son statut et sa durée. */
function TraceDetail({ traceId }: { traceId: string }) {
  const detail = useQuery(api.aiops.traces.getTrace, { traceId: traceId as never });

  if (detail === undefined) {
    return (
      <div className="border-t border-gris-clair px-5 py-5">
        <LoadingState rows={2} />
      </div>
    );
  }

  if (detail === null) {
    return (
      <div className="border-t border-gris-clair px-5 py-5 text-sm text-ardoise">
        Cette trace n'est plus disponible.
      </div>
    );
  }

  const { trace, steps } = detail;

  return (
    <div className="border-t border-gris-clair px-5 py-5">
      <dl className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Champ libelle="Prompt" valeur={versionLabel(trace.promptKey, trace.promptVersion)} />
        <Champ libelle="Politique" valeur={versionLabel(trace.policyKey, trace.policyVersion)} />
        <Champ libelle="Modèle" valeur={versionLabel(trace.modelConfigKey, trace.modelConfigVersion)} />
        <Champ
          libelle="Type d'erreur"
          valeur={trace.errorType ?? "Aucune"}
        />
      </dl>

      <h3 className="font-titre text-xs font-semibold uppercase tracking-wider text-ardoise">
        Chronologie
      </h3>

      {steps.length === 0 ? (
        <p className="mt-2 text-sm text-ardoise">
          Aucune étape enregistrée pour cette exécution.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {steps.map((step) => {
            const meta = ETAPES[step.kind] ?? { label: step.kind, icon: Wrench };
            const Icon = meta.icon;
            return (
              <li
                key={step._id}
                className="flex items-start gap-3 rounded-md bg-papier p-3"
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    step.status === "ok"
                      ? "text-vert"
                      : step.status === "error"
                        ? "text-[#b3261e]"
                        : "text-ardoise",
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-titre text-sm font-medium text-encre">
                      {step.name}
                    </span>
                    <span className="text-xs text-ardoise">{meta.label}</span>
                    <StatusBadge
                      tone={
                        step.status === "ok"
                          ? "positif"
                          : step.status === "error"
                            ? "critique"
                            : "neutre"
                      }
                    >
                      {step.status === "ok"
                        ? "OK"
                        : step.status === "error"
                          ? "Échec"
                          : "Ignorée"}
                    </StatusBadge>
                  </div>
                  {step.detail ? (
                    <p className="mt-1 break-words text-xs text-ardoise">
                      {step.detail}
                    </p>
                  ) : null}
                </div>
                {step.latencyMs !== undefined ? (
                  <span className="shrink-0 text-xs text-ardoise">
                    {step.latencyMs} ms
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-4 border-t border-gris-clair pt-4 text-xs text-ardoise">
        Le raisonnement interne du modèle n'est jamais enregistré ni affiché :
        seul le chemin d'exécution est conservé.
      </p>
    </div>
  );
}

function versionLabel(key?: string, version?: number): string {
  if (!key) return "Non renseigné";
  return version === undefined ? key : `${key} v${version}`;
}

function Champ({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div>
      <dt className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
        {libelle}
      </dt>
      <dd className="mt-0.5 text-sm text-encre">{valeur}</dd>
    </div>
  );
}
