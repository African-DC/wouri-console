import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
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
import { CentreConsentement } from "~/features/farmers/consentements";

export const Route = createFileRoute("/console/farmers/$farmerId")({
  component: FarmerDetailPage,
});

const LANGUES: Record<string, string> = {
  dyu: "Dioula",
  bci: "Baoulé",
  fr: "Français",
};

function FarmerDetailPage() {
  const { farmerId } = Route.useParams();
  if (!useCan(CAP.farmersRead)) {
    return (
      <>
        <PageHeader title="Agriculteur" />
        <PermissionDenied what="la fiche des agriculteurs" />
      </>
    );
  }
  return <FarmerDetail farmerId={farmerId} />;
}

/* §16 — fiche agriculteur. Elle réunit ce qui décide de ce que WOURI peut lui
   envoyer : sa langue, sa zone, ses cultures, et surtout son consentement. */
function FarmerDetail({ farmerId }: { farmerId: string }) {
  const detail = useQuery(api.farmers.queries.getFarmerProfile, {
    farmerId: farmerId as never,
  });
  const peutModifierConsentement = useCan(CAP.consentsWrite);

  if (detail === undefined) {
    return (
      <>
        <PageHeader title="Agriculteur" />
        <LoadingState rows={4} />
      </>
    );
  }

  if (detail === null) {
    return (
      <>
        <PageHeader title="Agriculteur" />
        <EmptyState
          title="Agriculteur introuvable"
          description="Cette fiche n'existe pas, ou elle appartient à une autre organisation."
          action={<Retour />}
        />
      </>
    );
  }

  const { farmer, profile, zoneIds, cropCodes, consents } = detail;

  return (
    <>
      <div className="mb-4">
        <Retour />
      </div>

      <PageHeader
        title={titreFiche(profile?.preferredLanguage, zoneIds)}
        description={`Inscrit le ${new Date(farmer.createdAt).toLocaleDateString("fr-FR")}`}
        actions={
          <StatusBadge tone={farmer.status === "active" ? "positif" : "neutre"}>
            {farmer.status === "active" ? "Actif" : "Archivé"}
          </StatusBadge>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
            Langue préférée
          </p>
          <p className="mt-1 font-titre text-lg font-semibold text-encre">
            {profile?.preferredLanguage
              ? (LANGUES[profile.preferredLanguage] ?? profile.preferredLanguage)
              : "Non renseignée"}
          </p>
          <p className="mt-1 text-xs text-ardoise">
            {profile?.countryCode
              ? `Indicatif ${profile.countryCode}`
              : "Aucun indicatif enregistré"}
          </p>
        </Card>

        <Card>
          <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
            Zones
          </p>
          {zoneIds.length === 0 ? (
            <p className="mt-2 text-sm text-ardoise">
              Aucune zone. Un ciblage par zone ne l'atteindra pas.
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {zoneIds.map((zone) => (
                <li key={zone}>
                  <StatusBadge tone="info">{zone}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
            Cultures
          </p>
          {cropCodes.length === 0 ? (
            <p className="mt-2 text-sm text-ardoise">
              Aucune culture. Un ciblage par culture ne l'atteindra pas.
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {cropCodes.map((culture) => (
                <li key={culture}>
                  <StatusBadge tone="neutre">{culture}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section aria-labelledby="consentement">
        <h2
          id="consentement"
          className="mb-3 font-titre text-sm font-semibold uppercase tracking-wider text-ardoise"
        >
          Consentement
        </h2>
        <CentreConsentement
          farmerId={farmerId}
          consentements={consents}
          modifiable={peutModifierConsentement}
        />
      </section>
    </>
  );
}

function titreFiche(langue: string | undefined, zones: string[]): string {
  const labels: Record<string, string> = {
    dyu: "Dioula",
    bci: "Baoulé",
    fr: "Français",
  };
  const nomLangue = langue ? (labels[langue] ?? langue) : "Agriculteur";
  const zone = zones[0] ?? "zone non renseignée";
  return nomLangue + " · " + zone;
}

function Retour() {
  return (
    <Link
      to="/console/farmers"
      className="inline-flex items-center gap-2 text-sm font-medium text-ardoise hover:text-vert"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Tous les agriculteurs
    </Link>
  );
}
