import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@wouri/convex-api";
import { CAP, ORGANIZATION_KINDS } from "~/lib/authz/capabilities";
import { useCan, useSession } from "~/lib/authz/session";
import {
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  QuotaBar,
  StatCard,
  StatusBadge,
} from "~/components/ui";

export const Route = createFileRoute("/console/")({ component: DashboardPage });

/* Le tableau de bord n'est pas le meme pour tout le monde : chaque bloc est
   conditionne par une capability, jamais par un type d'organisation code en
   dur. Un partenaire meteo, une cooperative et la plateforme voient donc trois
   pages differentes construites avec les memes briques. */
function DashboardPage() {
  const { organization, capabilities } = useSession();
  const kind = organization.kind ? ORGANIZATION_KINDS[organization.kind] : null;

  return (
    <>
      <PageHeader
        title={organization.legalName ?? "Vue d'ensemble"}
        description={
          kind
            ? `${kind} · ${capabilities.length} permissions actives sur votre compte.`
            : undefined
        }
        actions={
          organization.status ? (
            <StatusBadge tone={organization.status === "active" ? "positif" : "attention"}>
              {organization.status === "active" ? "Active" : organization.status}
            </StatusBadge>
          ) : null
        }
      />

      <div className="space-y-6">
        {useCan(CAP.alertsRead) ? <DiffusionSection /> : null}
        {useCan(CAP.farmersRead) ? <AbonnementSection /> : null}
        {useCan(CAP.knowledgeRead) ? <ConnaissanceSection /> : null}
        {useCan(CAP.aiopsRead) ? <PlateformeSection /> : null}
        {capabilities.length === 0 ? (
          <EmptyState
            title="Aucune permission active"
            description="Votre compte est authentifié mais aucun rôle ne lui est attribué. Un administrateur doit vous affecter un rôle pour accéder aux modules."
          />
        ) : null}
      </div>
    </>
  );
}

/** Diffusion des alertes : le funnel ciblés → envoyés → délivrés → lus → réponses. */
function DiffusionSection() {
  const alerts = useQuery(api.alerts.queries.listAlerts, { limit: 50 });

  if (alerts === undefined) return <LoadingState rows={2} />;

  const total = alerts.length;
  const enCours = alerts.filter((a) => a.status === "sending").length;
  const brouillons = alerts.filter((a) => a.status === "draft").length;

  return (
    <section aria-labelledby="diffusion-title">
      <h2
        id="diffusion-title"
        className="mb-3 font-titre text-sm font-semibold uppercase tracking-wider text-ardoise"
      >
        Diffusion
      </h2>
      {total === 0 ? (
        <EmptyState
          title="Aucune alerte pour l'instant"
          description="Les alertes que votre organisation publie apparaîtront ici, avec leur portée et leurs statuts de diffusion."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Alertes" value={total} hint="Sur la période récente" />
          <StatCard label="En cours de diffusion" value={enCours} tone="positif" />
          <StatCard label="Brouillons" value={brouillons} tone="neutre" />
          <StatCard
            label="Publiées"
            value={total - brouillons}
            hint="Alertes sorties du brouillon"
          />
        </div>
      )}
    </section>
  );
}

/** Quota d'abonnement : la consommation par rapport aux limites du plan. */
function AbonnementSection() {
  const { entitlements } = useSession();
  const maxFarmers = entitlements.find((e) => e.key === "maxFarmers");
  const farmers = useQuery(api.farmers.queries.listFarmers, {
    paginationOpts: { numItems: 100, cursor: null },
  });

  if (farmers === undefined) return <LoadingState rows={2} />;

  const count = farmers.page.length;

  return (
    <section aria-labelledby="abonnement-title">
      <h2
        id="abonnement-title"
        className="mb-3 font-titre text-sm font-semibold uppercase tracking-wider text-ardoise"
      >
        Agriculteurs et abonnement
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {maxFarmers?.limit ? (
            <QuotaBar
              used={count}
              limit={maxFarmers.limit}
              label="Agriculteurs enregistrés"
            />
          ) : (
            <div>
              <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                Agriculteurs enregistrés
              </p>
              <p className="mt-2 font-titre text-3xl font-semibold">{count}</p>
              <p className="mt-1 text-xs text-ardoise">
                Aucune limite de plan définie pour votre organisation.
              </p>
            </div>
          )}
        </Card>
        <StatCard
          label="Fonctions du plan"
          value={entitlements.filter((e) => e.enabled).length}
          hint={
            entitlements.length > 0
              ? entitlements
                  .filter((e) => e.enabled)
                  .map((e) => e.key)
                  .join(", ")
              : "Aucun droit configuré"
          }
        />
      </div>
    </section>
  );
}

/** Sources et connaissances disponibles pour l'organisation. */
function ConnaissanceSection() {
  const sources = useQuery(api.knowledge.queries.listKnowledgeSources, {});

  if (sources === undefined) return <LoadingState rows={2} />;

  return (
    <section aria-labelledby="connaissance-title">
      <h2
        id="connaissance-title"
        className="mb-3 font-titre text-sm font-semibold uppercase tracking-wider text-ardoise"
      >
        Connaissance
      </h2>
      {sources.length === 0 ? (
        <EmptyState
          title="Aucune source accessible"
          description="Les jeux de données et documents auxquels votre organisation a accès s'afficheront ici avec leur provenance."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.slice(0, 6).map((source) => (
            <Card key={source._id}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-titre text-sm font-semibold text-encre">
                  {source.authority}
                </p>
                <StatusBadge tone={source.visibility === "global" ? "info" : "neutre"}>
                  {source.visibility === "global" ? "Globale" : "Organisation"}
                </StatusBadge>
              </div>
              <p className="mt-2 truncate text-xs text-ardoise">
                {source.canonicalLocator}
              </p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

/** Vue plateforme : santé de l'exécution, réservée aux rôles AI Ops. */
function PlateformeSection() {
  const traces = useQuery(api.aiops.traces.listTraces, { limit: 50 });

  if (traces === undefined) return <LoadingState rows={2} />;

  const abstentions = traces.filter((t) => t.resultStatus === "abstained").length;
  const echecs = traces.filter((t) => t.resultStatus === "failed").length;
  const succes = traces.filter((t) => t.resultStatus === "succeeded").length;

  return (
    <section aria-labelledby="plateforme-title">
      <h2
        id="plateforme-title"
        className="mb-3 font-titre text-sm font-semibold uppercase tracking-wider text-ardoise"
      >
        Plateforme
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Exécutions tracées" value={traces.length} />
        <StatCard label="Réussies" value={succes} tone="positif" />
        <StatCard
          label="Abstentions"
          value={abstentions}
          tone="attention"
          hint="Réponse refusée faute de source : ce n'est pas une erreur"
        />
        <StatCard label="Échecs" value={echecs} tone={echecs > 0 ? "critique" : "neutre"} />
      </div>
    </section>
  );
}
