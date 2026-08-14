import { createFileRoute } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
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
  StatusBadge,
} from "~/components/ui";

export const Route = createFileRoute("/console/farmers")({ component: FarmersPage });

const PAGE_SIZE = 25;

/**
 * Les identifiants d'agriculteur sont prefixes par l'organisation. Comme toute
 * la page est deja scopee a une organisation, ce prefixe est du bruit : on
 * n'affiche que le suffixe lisible.
 */
function shortIdentity(hash: string): string {
  const index = hash.lastIndexOf("-");
  return index > 0 && index < hash.length - 1 ? hash.slice(index + 1) : hash;
}

function FarmersPage() {
  // La capability conditionne l'affichage ; le backend refuse de toute facon la
  // requete sans farmers.read.
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

function FarmersList() {
  const [recherche, setRecherche] = useState("");
  // Pagination obligatoire : on ne charge jamais toute la table cote client.
  const { results, status, loadMore } = usePaginatedQuery(
    api.farmers.queries.listFarmers,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  if (status === "LoadingFirstPage") {
    return (
      <>
        <PageHeader title="Agriculteurs" />
        <LoadingState rows={5} />
      </>
    );
  }

  // Filtre local sur la page chargee : la recherche serveur viendra avec un
  // index de recherche dedie, on ne fait pas semblant de filtrer tout le jeu.
  const filtres = recherche.trim().toLowerCase();
  const visibles = filtres
    ? results.filter((f) => f.externalIdentityHash.toLowerCase().includes(filtres))
    : results;

  return (
    <>
      <PageHeader
        title="Agriculteurs"
        description="Personnes inscrites au service pour votre organisation, avec leur langue, leur zone et leur consentement."
      />

      <Card className="mb-4">
        <label htmlFor="recherche" className="font-titre text-sm font-medium text-encre">
          Rechercher
        </label>
        <input
          id="recherche"
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Identifiant de l'agriculteur"
          className="mt-1 h-11 w-full rounded-md border border-gris-clair px-3 text-sm outline-none focus:border-vert md:max-w-sm"
        />
        {filtres ? (
          <p className="mt-2 text-xs text-ardoise">
            Recherche appliquée aux {results.length} agriculteurs déjà chargés.
          </p>
        ) : null}
      </Card>

      {visibles.length === 0 ? (
        <EmptyState
          title={filtres ? "Aucun résultat" : "Aucun agriculteur enregistré"}
          description={
            filtres
              ? "Aucun agriculteur chargé ne correspond à cette recherche."
              : "Les agriculteurs rattachés à votre organisation apparaîtront ici."
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <caption className="sr-only">
                Liste des agriculteurs de l'organisation
              </caption>
              <thead>
                <tr className="border-b border-gris-clair bg-papier">
                  <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                    Identifiant
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                    Statut
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                    Inscrit le
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((farmer) => (
                  <tr
                    key={farmer._id}
                    className="border-b border-gris-clair last:border-0 hover:bg-papier"
                  >
                    <td className="px-4 py-3 font-medium text-encre">
                      {/* L'identifiant est prefixe par l'organisation : on
                          n'affiche que la partie utile, tout l'ecran etant deja
                          scope a l'organisation courante. */}
                      {shortIdentity(farmer.externalIdentityHash)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={farmer.status === "active" ? "positif" : "neutre"}>
                        {farmer.status === "active" ? "Actif" : "Archivé"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-ardoise">
                      {new Date(farmer.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </>
  );
}
