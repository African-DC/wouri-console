import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@wouri/convex-api";
import { cn } from "~/lib/cn";
import { CAP } from "~/lib/authz/capabilities";
import { useCan, useSession } from "~/lib/authz/session";
import {
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PermissionDenied,
} from "~/components/ui";

export const Route = createFileRoute("/console/audit")({ component: AuditPage });

// Plafond de lecture : le journal complet se consulte par export, pas ici.
const PLAFOND = 100;

// Libellés français des actions journalisées par le backend.
const ACTIONS: Record<string, string> = {
  "organization.activate": "Activation d'organisation",
  "knowledge.source.create": "Création de source",
  "knowledge.sourceVersion.create": "Nouvelle version de source",
  "weather.observation.publish": "Publication météo",
  "alert.create": "Création d'alerte",
  "alert.publish": "Publication d'alerte",
  "linguistic.feedback.submit": "Correction soumise",
  "linguistic.feedback.status": "Décision de validation",
  "linguistic.glossary.promote": "Promotion au glossaire",
  "linguistic.corpus.promote": "Promotion au corpus",
  "linguistic.corpus.import": "Import de corpus",
  "aiops.flag.set": "Modification de drapeau",
};

function AuditPage() {
  if (!useCan(CAP.auditRead)) {
    return (
      <>
        <PageHeader title="Audit" />
        <PermissionDenied what="le journal des opérations sensibles" />
      </>
    );
  }
  return <AuditList />;
}

/* §56 — journal des opérations sensibles. Qui a fait quoi, quand, sur quelle
   ressource. Aucun secret n'y figure : les instantanés avant et après ne
   contiennent que des métadonnées. */
function AuditList() {
  const { organization } = useSession();
  const operateurPlateforme = useCan(CAP.platformManage);
  // Par defaut on montre l'organisation active : le journal transverse ne
  // remonte que les operations sans organisation, ce qui donnerait a tort
  // l'impression d'un journal vide. Le backend ignore de toute facon ce
  // parametre pour qui n'est pas operateur de plateforme.
  const [portee, setPortee] = useState<"organisation" | "plateforme">(
    "organisation",
  );
  const cible = portee === "organisation" ? organization.id : undefined;
  const entries = useQuery(api.aiops.auditread.listAuditLogs, {
    ...(cible ? { organizationId: cible } : {}),
    limit: PLAFOND,
  });

  const filtres = operateurPlateforme ? (
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Portée du journal">
      {(
        [
          ["organisation", organization.legalName ?? "Mon organisation"],
          ["plateforme", "Opérations hors organisation"],
        ] as const
      ).map(([valeur, libelle]) => (
        <button
          key={valeur}
          type="button"
          aria-pressed={portee === valeur}
          onClick={() => setPortee(valeur)}
          className={cn(
            "h-11 rounded-md border px-4 font-titre text-sm font-medium transition-colors",
            portee === valeur
              ? "border-vert bg-vert/10 text-vert"
              : "border-gris-clair bg-white text-ardoise hover:border-vert hover:text-vert",
          )}
        >
          {libelle}
        </button>
      ))}
    </div>
  ) : null;

  const entete = (
    <PageHeader
      title="Audit"
      description="Opérations sensibles récentes. Aucun secret n'est journalisé, uniquement des métadonnées."
    />
  );

  if (entries === undefined) {
    return (
      <>
        {entete}
        {filtres}
        <LoadingState rows={5} />
      </>
    );
  }

  if (entries.length === 0) {
    return (
      <>
        {entete}
        {filtres}
        <EmptyState
          title="Aucune opération journalisée"
          description={
            portee === "plateforme"
              ? "Aucune opération sans organisation rattachée pour le moment."
              : "Les opérations sensibles (publication de source ou d'alerte, validation linguistique, import de corpus) apparaîtront ici."
          }
        />
      </>
    );
  }

  return (
    <>
      {entete}
      {filtres}
      <p className="mb-3 text-xs text-ardoise">
        {entries.length >= PLAFOND
          ? `${PLAFOND} opérations les plus récentes au maximum.`
          : `${entries.length} opérations.`}
      </p>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <caption className="sr-only">Journal des opérations sensibles</caption>
            <thead>
              <tr className="border-b border-gris-clair bg-papier">
                <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                  Opération
                </th>
                <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                  Ressource
                </th>
                <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                  Auteur
                </th>
                <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry._id}
                  className="border-b border-gris-clair last:border-0 hover:bg-papier"
                >
                  <td className="px-4 py-3 font-medium text-encre">
                    {ACTIONS[entry.action] ?? entry.action}
                  </td>
                  <td className="px-4 py-3 text-ardoise">{entry.resourceType}</td>
                  <td className="max-w-[14rem] truncate px-4 py-3 text-ardoise">
                    {entry.actorMemberId ?? entry.actorSubject}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ardoise">
                    {new Date(entry.createdAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
