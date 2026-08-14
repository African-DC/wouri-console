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
  StatCard,
  StatusBadge,
} from "~/components/ui";

export const Route = createFileRoute("/console/alerts")({ component: AlertsPage });

const STATUS_LABELS: Record<string, { label: string; tone: "neutre" | "positif" | "attention" | "info" }> = {
  draft: { label: "Brouillon", tone: "neutre" },
  scheduled: { label: "Programmée", tone: "info" },
  sending: { label: "En diffusion", tone: "positif" },
  completed: { label: "Terminée", tone: "neutre" },
  canceled: { label: "Annulée", tone: "attention" },
};

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
  const alerts = useQuery(api.alerts.queries.listAlerts, { limit: 50 });
  const peutPublier = useCan(CAP.alertsPublish);

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
      />

      {alerts.length === 0 ? (
        <EmptyState
          title="Aucune alerte"
          description="Les alertes créées par votre organisation apparaîtront ici avec leur portée et leurs statuts de diffusion."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total" value={alerts.length} />
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
                    const statut = STATUS_LABELS[alert.status] ?? {
                      label: alert.status,
                      tone: "neutre" as const,
                    };
                    return (
                      <tr
                        key={alert._id}
                        className="border-b border-gris-clair last:border-0 hover:bg-papier"
                      >
                        <td className="max-w-md px-4 py-3">
                          <p className="truncate font-medium text-encre">{alert.message}</p>
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
