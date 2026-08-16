import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
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
} from "~/components/ui";
import {
  OrganizationPreviewSheet,
  OrganizationRosterTable,
  type OrganizationRosterItem,
} from "~/features/organizations/roster";

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

function OrganizationsList() {
  const organisations = useQuery(api.organizations.queries.listOrganizations, {});
  const [filtre, setFiltre] = useState<"toutes" | "active" | "suspended" | "provisioning">("toutes");
  const [apercu, setApercu] = useState<OrganizationRosterItem | null>(null);

  const items = (organisations ?? []) as OrganizationRosterItem[];
  const visibles = useMemo(
    () => (filtre === "toutes" ? items : items.filter((item) => item.status === filtre)),
    [items, filtre],
  );

  if (organisations === undefined) {
    return (
      <>
        <PageHeader title="Organisations" />
        <LoadingState rows={5} />
      </>
    );
  }

  const actives = items.filter((item) => item.status === "active").length;
  const agriculteurs = items.reduce((total, item) => total + item.agriculteurs, 0);
  const whatsapp = items.filter((item) => item.whatsappEnabled).length;

  return (
    <>
      <PageHeader
        title="Organisations"
        description="Partenaires et clients de WOURI, avec leur rôle, leurs agriculteurs et l'ouverture de WhatsApp."
      />

      {items.length > 0 ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Actives" value={actives} tone="positif" hint="Parmi les organisations chargées" />
          <StatCard
            label="Agriculteurs inscrits"
            value={agriculteurs}
            hint="Toutes organisations confondues"
          />
          <StatCard
            label="WhatsApp ouvert"
            value={whatsapp}
            tone={whatsapp > 0 ? "positif" : "neutre"}
            hint="Peuvent diffuser des alertes"
          />
        </div>
      ) : null}

      <Card className="mb-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
          {(
            [
              ["toutes", "Toutes"],
              ["active", "Actives"],
              ["provisioning", "En provisionnement"],
              ["suspended", "Suspendues"],
            ] as const
          ).map(([valeur, libelle]) => (
            <Button
              key={valeur}
              variant={filtre === valeur ? "primary" : "secondary"}
              onClick={() => setFiltre(valeur)}
            >
              {libelle}
            </Button>
          ))}
        </div>
      </Card>

      {visibles.length === 0 ? (
        <EmptyState
          title={filtre === "toutes" ? "Aucune organisation" : "Aucun partenaire dans ce filtre"}
          description={
            filtre === "toutes"
              ? "Les partenaires et clients apparaîtront ici une fois provisionnés, avec leur rôle et leur occupation."
              : "Aucune organisation chargée ne porte ce statut."
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <OrganizationRosterTable items={visibles} onOpen={setApercu} />
        </Card>
      )}

      <OrganizationPreviewSheet item={apercu} onClose={() => setApercu(null)} />
    </>
  );
}
