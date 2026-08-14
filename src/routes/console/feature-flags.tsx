import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan, useSession } from "~/lib/authz/session";
import {
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PermissionDenied,
  StatusBadge,
} from "~/components/ui";

export const Route = createFileRoute("/console/feature-flags")({
  component: FeatureFlagsPage,
});

function FeatureFlagsPage() {
  if (!useCan(CAP.featureFlagsManage)) {
    return (
      <>
        <PageHeader title="Feature flags" />
        <PermissionDenied what="les drapeaux de fonctionnalité" />
      </>
    );
  }
  return <FeatureFlagsList />;
}

/* §55 — drapeaux par environnement. Une fonctionnalité expérimentale doit
   pouvoir être coupée sans redéploiement. La bascule depuis l'interface est une
   action sensible : elle viendra avec une confirmation explicite, elle n'est pas
   proposée tant qu'elle n'est pas sûre. */
function FeatureFlagsList() {
  const { environment } = useSession();
  const cible = environment === "production" ? "production" : "staging";
  const flags = useQuery(api.aiops.flags.listFlags, { environment: cible });

  if (flags === undefined) {
    return (
      <>
        <PageHeader title="Feature flags" />
        <LoadingState rows={4} />
      </>
    );
  }

  if (flags.length === 0) {
    return (
      <>
        <PageHeader title="Feature flags" />
        <EmptyState
          title="Aucun drapeau défini"
          description={`Aucune fonctionnalité n'est pilotée par drapeau sur l'environnement ${cible} pour le moment.`}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Feature flags"
        description={`Fonctionnalités activables sans redéploiement, sur l'environnement ${cible}.`}
      />
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">Drapeaux de fonctionnalité</caption>
            <thead>
              <tr className="border-b border-gris-clair bg-papier">
                <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                  Clé
                </th>
                <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                  Portée
                </th>
                <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                  État
                </th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag) => (
                <tr
                  key={flag._id}
                  className="border-b border-gris-clair last:border-0 hover:bg-papier"
                >
                  <td className="px-4 py-3 font-mono text-xs text-encre">{flag.key}</td>
                  <td className="px-4 py-3 text-ardoise">
                    {flag.organizationId ? "Organisation" : "Environnement"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={flag.enabled ? "positif" : "neutre"}>
                      {flag.enabled ? "Activé" : "Désactivé"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-ardoise">
        La bascule depuis l'interface n'est pas encore proposée : modifier un
        drapeau est une action sensible qui demandera une confirmation explicite.
      </p>
    </>
  );
}
