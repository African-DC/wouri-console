import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan, useSession } from "~/lib/authz/session";
import { cn } from "~/lib/cn";
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PermissionDenied,
  StatusBadge,
} from "~/components/ui";
import { ConfirmDialog, useConfirmation } from "~/components/confirm-dialog";

export const Route = createFileRoute("/console/registries")({
  component: RegistriesPage,
});

type Registre = "prompts" | "policies" | "models";

const REGISTRES: Array<{ value: Registre; label: string; aide: string }> = [
  {
    value: "prompts",
    label: "Prompts",
    aide: "Consignes données au modèle. Activer une version change ce que WOURI répond.",
  },
  {
    value: "policies",
    label: "Politiques",
    aide: "Garde-fous : obligation de source, fraîcheur, abstention.",
  },
  {
    value: "models",
    label: "Modèles",
    aide: "Fournisseur, modèle et paramètres. Jamais de secret ici.",
  },
];

const LIBELLES_STATUT: Record<
  string,
  { label: string; tone: "neutre" | "positif" | "attention" }
> = {
  draft: { label: "Brouillon", tone: "neutre" },
  active: { label: "Active", tone: "positif" },
  retired: { label: "Retirée", tone: "attention" },
};

function RegistriesPage() {
  if (!useCan(CAP.aiopsRead)) {
    return (
      <>
        <PageHeader title="Prompts et modèles" />
        <PermissionDenied what="les registres de prompts, politiques et modèles" />
      </>
    );
  }
  return <Registres />;
}

/* §37-38 / AI-05 — registres versionnés. Une trace d'exécution référence une
   version exacte de prompt, de politique et de modèle : sans cet écran, ce
   numéro ne renvoie à rien de consultable.

   Activer est une écriture sensible : la version choisie devient celle que tous
   les agriculteurs rencontrent, immédiatement. La version précédente n'est pas
   supprimée mais retirée, ce qui rend le retour arrière possible en activant à
   nouveau l'ancienne. */
function Registres() {
  const { environment } = useSession();
  const [registre, setRegistre] = useState<Registre>("prompts");
  const versions = useQuery(api.aiops.registry.listRegistryVersions, { registry: registre });
  const peutActiver = useCan(CAP.featureFlagsManage);
  const confirmation = useConfirmation<{ key: string; version: number }>();

  const activerPrompt = useMutation(api.aiops.registry.activatePromptVersion);
  const activerPolicy = useMutation(api.aiops.registry.activatePolicyVersion);
  const activerModel = useMutation(api.aiops.registry.activateModelConfig);

  const courant = REGISTRES.find((r) => r.value === registre)!;

  async function executer() {
    await confirmation.executer(async ({ key, version }) => {
      const args = { key, version };
      if (registre === "prompts") await activerPrompt(args);
      else if (registre === "policies") await activerPolicy(args);
      else await activerModel(args);
    }, "L'activation a échoué. La version active est inchangée.");
  }

  return (
    <>
      <PageHeader
        title="Prompts et modèles"
        description="Versions des consignes, garde-fous et configurations de modèle. Une trace d'exécution renvoie toujours à une version précise."
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Choisir un registre">
        {REGISTRES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={registre === option.value}
            onClick={() => setRegistre(option.value)}
            className={cn(
              "h-11 rounded-md border px-4 font-titre text-sm font-medium transition-colors",
              registre === option.value
                ? "border-vert bg-vert/10 text-vert"
                : "border-gris-clair bg-white text-ardoise hover:border-vert hover:text-vert",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-ardoise">{courant.aide}</p>

      {/* Dire ce que le registre fait vraiment. Le pipeline ne lit aucun
          template : il compose sa réponse à partir des passages trouvés. Laisser
          croire qu'activer une version change le comportement conduirait à tirer
          ce levier en incident et à croire l'incident traité. */}
      <Card className="mb-4 border-l-4 border-l-[#8a5600]">
        <p className="text-sm text-encre">
          Ces versions sont un <strong>inventaire</strong>. Chaque exécution
          enregistre celle qui était en vigueur, ce qui rendra un incident
          rejouable. Mais la génération de réponse n'est pas encore branchée :
          activer une autre version ne modifie pas le comportement observé.
        </p>
      </Card>

      {versions === undefined ? (
        <LoadingState rows={4} />
      ) : versions.length === 0 ? (
        <EmptyState
          title={`Aucune version de ${courant.label.toLowerCase()}`}
          description="Les versions sont créées par le backend ou par un déploiement. Elles apparaîtront ici avec leur statut, et pourront être activées ou remises en service."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">Versions du registre {courant.label}</caption>
              <thead>
                <tr className="border-b border-gris-clair bg-papier">
                  <Colonne>Clé</Colonne>
                  <Colonne>Version</Colonne>
                  <Colonne>Statut</Colonne>
                  <Colonne>Créée le</Colonne>
                  {peutActiver ? <Colonne>Action</Colonne> : null}
                </tr>
              </thead>
              <tbody>
                {versions.map((ligne) => {
                  const statut = LIBELLES_STATUT[ligne.status] ?? {
                    label: ligne.status,
                    tone: "neutre" as const,
                  };
                  return (
                    <tr
                      key={ligne.id}
                      className="border-b border-gris-clair last:border-0 hover:bg-papier"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-encre">{ligne.key}</td>
                      <td className="px-4 py-3 font-titre font-semibold text-encre">
                        v{ligne.version}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={statut.tone}>{statut.label}</StatusBadge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ardoise">
                        {new Date(ligne.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      {peutActiver ? (
                        <td className="px-4 py-3">
                          {ligne.status === "active" ? (
                            <span className="text-xs text-ardoise">En service</span>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() =>
                                confirmation.demander({
                                  key: ligne.key,
                                  version: ligne.version,
                                })
                              }
                            >
                              {ligne.status === "retired" ? "Remettre en service" : "Activer"}
                            </Button>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        ouvert={confirmation.ouvert}
        danger={environment === "production"}
        titre={`Activer ${courant.label.toLowerCase()} version ${confirmation.cible?.version ?? ""}`}
        details={{
          effet:
            "Cette version devient celle utilisée par toutes les exécutions suivantes. La version active actuelle passe en retirée.",
          concerne: `Tous les agriculteurs servis sur l'environnement ${environment}.`,
          portee: `${confirmation.cible?.key ?? ""} version ${confirmation.cible?.version ?? ""}`,
          reversible:
            "Oui. Aucune version n'est supprimée : réactiver la précédente rétablit le comportement antérieur.",
        }}
        libelleConfirmation="Activer cette version"
        enCours={confirmation.enCours}
        erreur={confirmation.erreur}
        onAnnuler={confirmation.annuler}
        onConfirmer={() => void executer()}
      />
    </>
  );
}

function Colonne({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise"
    >
      {children}
    </th>
  );
}
