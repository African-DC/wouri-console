import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
  SourcePreviewSheet,
  SourceRosterTable,
  roleSource,
  type SourceRosterItem,
} from "~/features/knowledge/sources-roster";

export const Route = createFileRoute("/console/sources")({ component: SourcesPage });

function SourcesPage() {
  if (!useCan(CAP.knowledgeRead)) {
    return (
      <>
        <PageHeader title="Sources" />
        <PermissionDenied what="les sources de connaissance" />
      </>
    );
  }
  return <SourcesList />;
}

function correspond(item: SourceRosterItem, filtre: string): boolean {
  if (!filtre) return true;
  const haystack = [
    item.authority,
    roleSource(item.authority),
    item.license,
    item.latestVersion ?? "",
    item.visibility,
    item.status,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(filtre);
}

function SourcesList() {
  const sources = useQuery(api.knowledge.queries.listKnowledgeSources, {});
  const [recherche, setRecherche] = useState("");
  const [portee, setPortee] = useState<"toutes" | "global" | "organization">("toutes");
  const [apercu, setApercu] = useState<SourceRosterItem | null>(null);

  const items = (sources ?? []) as SourceRosterItem[];
  const filtre = recherche.trim().toLowerCase();
  const visibles = useMemo(
    () =>
      items.filter((item) => {
        if (portee !== "toutes" && item.visibility !== portee) return false;
        return correspond(item, filtre);
      }),
    [items, filtre, portee],
  );

  if (sources === undefined) {
    return (
      <>
        <PageHeader title="Sources" />
        <LoadingState rows={4} />
      </>
    );
  }

  const actives = items.filter((item) => item.status === "active").length;
  const globales = items.filter((item) => item.visibility === "global").length;

  return (
    <>
      <PageHeader
        title="Sources"
        description="Autorités que WOURI peut citer. Une alerte sans source est une réponse inventée."
      />

      {items.length > 0 ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Sources actives" value={actives} />
          <StatCard label="Globales" value={globales} hint="Partagées entre organisations" />
          <StatCard
            label="Organisation"
            value={items.length - globales}
            hint="Visibles seulement ici"
          />
        </div>
      ) : null}

      <Card className="mb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="recherche-sources" className="font-titre text-sm font-medium text-encre">
              Rechercher
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ardoise" />
              <Input
                id="recherche-sources"
                type="search"
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Autorité, rôle, licence ou version"
                className="pl-9 md:max-w-md"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["toutes", "Toutes"],
                ["global", "Globales"],
                ["organization", "Organisation"],
              ] as const
            ).map(([valeur, libelle]) => (
              <Button
                key={valeur}
                variant={portee === valeur ? "primary" : "secondary"}
                onClick={() => setPortee(valeur)}
              >
                {libelle}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {visibles.length === 0 ? (
        <EmptyState
          title={filtre || portee !== "toutes" ? "Aucun résultat" : "Aucune source accessible"}
          description={
            filtre || portee !== "toutes"
              ? "Aucune source chargée ne correspond à cette recherche."
              : "Les autorités auxquelles votre organisation a accès apparaîtront ici, avec leur version et leur rôle."
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <SourceRosterTable items={visibles} onOpen={setApercu} />
        </Card>
      )}

      <SourcePreviewSheet item={apercu} onClose={() => setApercu(null)} />
    </>
  );
}
