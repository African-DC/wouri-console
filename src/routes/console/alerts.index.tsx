import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan } from "~/lib/authz/session";
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PermissionDenied,
  StatCard,
  StatusBadge,
} from "~/components/ui";
import { CreationAlerte } from "~/features/alerts/creation";
import { LIBELLES_STATUT } from "~/features/alerts/libelles";

export const Route = createFileRoute("/console/alerts/")({ component: AlertsPage });

function AlertsPage() {
  if (!useCan(CAP.alertsRead)) {
    return (
      <>
        <PageHeader title="Alertes" />
        <PermissionDenied what="les alertes de cette organisation" />
      </>
    );
  }
  return <AlertsList />;
}

function AlertsList() {
  // Plafond backend : les compteurs portent sur les alertes affichées.
  const PLAFOND = 50;
  const alerts = useQuery(api.alerts.queries.listAlerts, { limit: PLAFOND });
  const peutPublier = useCan(CAP.alertsPublish);
  const peutCreer = useCan(CAP.alertsCreate);
  const [creation, setCreation] = useState(false);

  if (alerts === undefined) {
    return (
      <>
        <PageHeader title="Alertes" />
        <LoadingState rows={4} />
      </>
    );
  }

  const parStatut = alerts.reduce<Record<string, number>>((acc, alert) => {
    acc[alert.status] = (acc[alert.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Alertes"
        description={
          peutPublier
            ? "Alertes de votre organisation, de la rédaction à la diffusion."
            : "Alertes de votre organisation, en consultation."
        }
        actions={
          peutCreer && !creation ? (
            <Button onClick={() => setCreation(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nouvelle alerte
            </Button>
          ) : null
        }
      />

      {creation ? <CreationAlerte onFerme={() => setCreation(false)} /> : null}

      {alerts.length === 0 ? (
        <EmptyState
          title="Aucune alerte"
          description="Les alertes créées par votre organisation apparaîtront ici avec leur portée et leurs statuts de diffusion."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Alertes affichées"
              value={alerts.length >= PLAFOND ? `${alerts.length}+` : alerts.length}
              hint={`${PLAFOND} plus récentes au maximum`}
            />
            <StatCard label="En diffusion" value={parStatut.sending ?? 0} tone="positif" />
            <StatCard label="Brouillons" value={parStatut.draft ?? 0} />
            <StatCard label="Terminées" value={parStatut.completed ?? 0} />
          </div>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <caption className="sr-only">Alertes de l'organisation</caption>
                <thead>
                  <tr className="border-b border-gris-clair bg-papier">
                    <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                      Message
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                      Statut
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                      Source
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                      Créée le
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => {
                    const statut = LIBELLES_STATUT[alert.status] ?? {
                      label: alert.status,
                      tone: "neutre" as const,
                    };
                    return (
                      <tr
                        key={alert._id}
                        className="border-b border-gris-clair last:border-0 hover:bg-papier"
                      >
                        <td className="max-w-md px-4 py-3">
                          {/* §87 — chaque alerte a une adresse partageable. */}
                          <Link
                            to="/console/alerts/$alertId"
                            params={{ alertId: alert._id }}
                            className="block truncate font-medium text-encre hover:text-vert hover:underline"
                          >
                            {alert.message}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={statut.tone}>{statut.label}</StatusBadge>
                        </td>
                        <td className="px-4 py-3 text-ardoise">
                          {alert.sourceVersionId ? "Sourcée" : "—"}
                        </td>
                        <td className="px-4 py-3 text-ardoise">
                          {new Date(alert.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
