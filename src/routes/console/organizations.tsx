import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@wouri/convex-api";
import { CAP, ORGANIZATION_KINDS } from "~/lib/authz/capabilities";
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

export const Route = createFileRoute("/console/organizations")({
  component: OrganizationsPage,
});

function OrganizationsPage() {
  if (!useCan(CAP.platformManage)) {
    return (
      <>
        <PageHeader title="Organisations" />
        <PermissionDenied what="la liste des organisations de la plateforme" />
      </>
    );
  }
  return <OrganizationsList />;
}

/* §16 — vue plateforme. Seul le rôle qui administre la plateforme y accède :
   une organisation cliente ne voit que la sienne, par une autre requête. */
function OrganizationsList() {
  const organisations = useQuery(api.organizations.queries.listOrganizations, {});

  if (organisations === undefined) {
    return (
      <>
        <PageHeader title="Organisations" />
        <LoadingState rows={5} />
      </>
    );
  }

  if (organisations.length === 0) {
    return (
      <>
        <PageHeader title="Organisations" />
        <EmptyState
          title="Aucune organisation"
          description="Les organisations partenaires et clientes apparaîtront ici une fois provisionnées."
        />
      </>
    );
  }

  const actives = organisations.filter((o) => o.status === "active").length;
  const agriculteurs = organisations.reduce((total, o) => total + o.agriculteurs, 0);

  return (
    <>
      <PageHeader
        title="Organisations"
        description="Partenaires et clients de la plateforme, avec leur type, leur statut et leur consommation."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Organisations" value={organisations.length} />
        <StatCard label="Actives" value={actives} tone="positif" />
        <StatCard
          label="Agriculteurs inscrits"
          value={agriculteurs}
          hint="Toutes organisations confondues"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <caption className="sr-only">Organisations de la plateforme</caption>
            <thead>
              <tr className="border-b border-gris-clair bg-papier">
                <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                  Organisation
                </th>
                <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                  Statut
                </th>
                <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                  Agriculteurs
                </th>
                <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                  Droits actifs
                </th>
              </tr>
            </thead>
            <tbody>
              {organisations.map((organisation) => {
                const quota = organisation.maxFarmers;
                const ratio = quota ? organisation.agriculteurs / quota : 0;
                return (
                  <tr
                    key={organisation.organizationId}
                    className="border-b border-gris-clair last:border-0 hover:bg-papier"
                  >
                    <td className="px-4 py-3 font-medium text-encre">
                      {organisation.legalName ?? organisation.organizationId}
                    </td>
                    <td className="px-4 py-3 text-ardoise">
                      {organisation.kind
                        ? (ORGANIZATION_KINDS[organisation.kind] ?? organisation.kind)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={
                          organisation.status === "active"
                            ? "positif"
                            : organisation.status === "suspended"
                              ? "critique"
                              : "attention"
                        }
                      >
                        {organisation.status === "active"
                          ? "Active"
                          : organisation.status === "suspended"
                            ? "Suspendue"
                            : "En provisionnement"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "font-titre font-semibold",
                          ratio >= 1
                            ? "text-[#b3261e]"
                            : ratio >= 0.8
                              ? "text-[#8a5600]"
                              : "text-encre",
                        )}
                      >
                        {organisation.agriculteurs}
                        {organisation.agriculteursPlafonnes ? "+" : ""}
                      </span>
                      {quota ? (
                        <span className="text-ardoise"> / {quota}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-ardoise">{organisation.droits}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
