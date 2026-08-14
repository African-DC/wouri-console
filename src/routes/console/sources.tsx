import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan } from "~/lib/authz/session";
import {
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PermissionDenied,
  StatusBadge,
} from "~/components/ui";

export const Route = createFileRoute("/console/sources")({ component: SourcesPage });

/* §34-35 — provenance. Toute information servie par WOURI doit pouvoir être
   rattachée à une source identifiée et à une version. C'est ce qui distingue une
   réponse institutionnelle d'une réponse inventée. */
function SourcesPage() {
  if (!useCan(CAP.knowledgeRead)) {
    return (
      <>
        <PageHeader title="Sources & données" />
        <PermissionDenied what="les sources de connaissance" />
      </>
    );
  }
  return <SourcesList />;
}

function SourcesList() {
  const sources = useQuery(api.knowledge.queries.listKnowledgeSources, {});

  if (sources === undefined) {
    return (
      <>
        <PageHeader title="Sources & données" />
        <LoadingState rows={4} />
      </>
    );
  }

  if (sources.length === 0) {
    return (
      <>
        <PageHeader title="Sources & données" />
        <EmptyState
          title="Aucune source accessible"
          description="Les jeux de données et documents auxquels votre organisation a accès apparaîtront ici, avec leur provenance."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Sources & données"
        description="Origine des informations servies par WOURI. Chaque source porte son autorité, sa licence et son statut."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {sources.map((source) => (
          <Card key={source._id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-titre text-base font-semibold text-encre">
                  {source.authority}
                </p>
                <p className="mt-0.5 truncate text-xs text-ardoise">
                  {source.canonicalLocator}
                </p>
              </div>
              <StatusBadge tone={source.visibility === "global" ? "info" : "neutre"}>
                {source.visibility === "global" ? "Globale" : "Organisation"}
              </StatusBadge>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-gris-clair pt-3">
              <div>
                <dt className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  Licence
                </dt>
                <dd className="mt-0.5 text-sm text-encre">{source.license}</dd>
              </div>
              <div>
                <dt className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  Statut
                </dt>
                <dd className="mt-0.5">
                  <StatusBadge tone={source.status === "active" ? "positif" : "neutre"}>
                    {source.status === "active" ? "Active" : "Archivée"}
                  </StatusBadge>
                </dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
    </>
  );
}
