import { createFileRoute } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan } from "~/lib/authz/session";
import {
  Button,
  Card,
  EmptyState,
  Input,
  LoadingState,
  PageHeader,
  PermissionDenied,
  StatCard,
} from "~/components/ui";
import {
  FarmerPreviewSheet,
  FarmerRosterTable,
  libelleCultures,
  libelleLangue,
  libelleZones,
  type FarmerRosterItem,
} from "~/features/farmers/roster";

export const Route = createFileRoute("/console/farmers/")({ component: FarmersPage });

const PAGE_SIZE = 25;

function FarmersPage() {
  if (!useCan(CAP.farmersRead)) {
    return (
      <>
        <PageHeader title="Agriculteurs" />
        <PermissionDenied what="la liste des agriculteurs" />
      </>
    );
  }
  return <FarmersList />;
}

function correspond(item: FarmerRosterItem, filtre: string): boolean {
  if (!filtre) return true;
  const haystack = [
    libelleLangue(item.preferredLanguage),
    item.preferredLanguage ?? "",
    libelleZones(item.zoneIds),
    libelleCultures(item.cropCodes),
    item.status,
    item.consent.state,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(filtre);
}

function FarmersList() {
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState<"tous" | "active" | "archived">("tous");
  const [apercu, setApercu] = useState<FarmerRosterItem | null>(null);
  const { results, status, loadMore } = usePaginatedQuery(
    api.farmers.queries.listFarmers,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  const items = results as FarmerRosterItem[];
  const filtre = recherche.trim().toLowerCase();

  const visibles = useMemo(
    () =>
      items.filter((item) => {
        if (statut !== "tous" && item.status !== statut) return false;
        return correspond(item, filtre);
      }),
    [items, filtre, statut],
  );

  const joignables = items.filter((item) => item.consent.state === "granted").length;
  const horsDiffusion = items.length - joignables;

  if (status === "LoadingFirstPage") {
    return (
      <>
        <PageHeader title="Agriculteurs" />
        <LoadingState rows={5} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Agriculteurs"
        description="Personnes inscrites au service pour votre organisation, avec leur langue, leur zone et leur consentement."
      />

      {items.length > 0 ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Inscrits chargés"
            value={items.length}
            hint={status === "CanLoadMore" ? "Page en cours, pas le total" : "Tous les inscrits chargés"}
          />
          <StatCard label="Joignables" value={joignables} tone="positif" hint="Consentement WhatsApp accordé" />
          <StatCard
            label="Hors diffusion"
            value={horsDiffusion}
            tone={horsDiffusion > 0 ? "attention" : "neutre"}
            hint="Sans accord, ou accord retiré"
          />
        </div>
      ) : null}

      <Card className="mb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="recherche-agriculteurs" className="font-titre text-sm font-medium text-encre">
              Rechercher
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ardoise" />
              <Input
                id="recherche-agriculteurs"
                type="search"
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Langue, zone, culture ou statut"
                className="pl-9 md:max-w-md"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["tous", "Tous"],
                ["active", "Actifs"],
                ["archived", "Archivés"],
              ] as const
            ).map(([valeur, libelle]) => (
              <Button
                key={valeur}
                variant={statut === valeur ? "primary" : "secondary"}
                onClick={() => setStatut(valeur)}
              >
                {libelle}
              </Button>
            ))}
          </div>
        </div>
        {filtre ? (
          <p className="mt-2 text-xs text-ardoise">
            Recherche appliquée aux {items.length} agriculteurs déjà chargés.
          </p>
        ) : null}
      </Card>

      {visibles.length === 0 ? (
        <EmptyState
          title={filtre || statut !== "tous" ? "Aucun resultat" : "Aucun agriculteur enregistré"}
          description={
            filtre || statut !== "tous"
              ? "Aucun agriculteur charge ne correspond à cette recherche."
              : "Les agriculteurs rattachés à votre organisation apparaîtront ici, avec leur langue et leur zone."
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <FarmerRosterTable items={visibles} onOpen={setApercu} />
        </Card>
      )}

      {status === "CanLoadMore" ? (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => loadMore(PAGE_SIZE)}>
            Charger plus
          </Button>
        </div>
      ) : null}
      {status === "LoadingMore" ? <LoadingState rows={2} /> : null}

      <FarmerPreviewSheet item={apercu} onClose={() => setApercu(null)} />
    </>
  );
}
