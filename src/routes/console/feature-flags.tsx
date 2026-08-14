import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan, useSession } from "~/lib/authz/session";
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PermissionDenied,
  StatusBadge,
} from "~/components/ui";
import { ChampTexte } from "~/components/form";
import { ConfirmDialog, useConfirmation } from "~/components/confirm-dialog";

export const Route = createFileRoute("/console/feature-flags")({
  component: FeatureFlagsPage,
});

type Flag = {
  _id: string;
  key: string;
  enabled: boolean;
  organizationId?: string;
  description?: string;
  updatedAt: number;
};

type Bascule = { key: string; vers: boolean; organizationId?: string };

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

/* §39 / G12 — couper une fonctionnalité sans redéploiement. C'est le geste
   qu'on veut pouvoir faire vite quand quelque chose se passe mal, donc l'écran
   doit être direct, et la confirmation doit nommer l'environnement : une bascule
   faite sur le mauvais déploiement est la façon classique de transformer un
   incident en deux incidents. */
function FeatureFlagsList() {
  const { environment } = useSession();
  const cible = environment === "production" ? "production" : "staging";
  const flags = useQuery(api.aiops.flags.listFlags, { environment: cible });
  const poser = useMutation(api.aiops.flags.setFlag);
  const confirmation = useConfirmation<Bascule>();
  const [creation, setCreation] = useState(false);
  const [nouvelleCle, setNouvelleCle] = useState("");
  const [description, setDescription] = useState("");

  const entete = (
    <PageHeader
      title="Feature flags"
      description={`Fonctionnalités activables sans redéploiement, sur l'environnement ${cible}.`}
      actions={
        !creation ? (
          <Button variant="secondary" onClick={() => setCreation(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nouveau drapeau
          </Button>
        ) : null
      }
    />
  );

  async function executer() {
    await confirmation.executer(async (bascule) => {
      await poser({
        environment: cible,
        key: bascule.key,
        enabled: bascule.vers,
        ...(bascule.organizationId ? { organizationId: bascule.organizationId } : {}),
      });
    }, "La bascule a échoué. Le drapeau reste dans son état précédent.");
  }

  const formulaire = creation ? (
    <Card className="mb-4">
      <h2 className="font-titre text-base font-semibold text-encre">
        Nouveau drapeau
      </h2>
      <p className="mt-1 text-sm text-ardoise">
        Créé à l'état désactivé sur {cible}. Une fonctionnalité pilotée par
        drapeau doit être coupée par défaut, pas activée par défaut.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ChampTexte
          etiquette="Clé"
          valeur={nouvelleCle}
          onChange={setNouvelleCle}
          monospace
          requis
          aide="Convention : domaine.fonction, par exemple language.baoule.enabled"
        />
        <ChampTexte
          etiquette="Description"
          valeur={description}
          onChange={setDescription}
          aide="Ce que la bascule change, en une phrase."
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          disabled={!nouvelleCle.trim()}
          onClick={() =>
            void poser({
              environment: cible,
              key: nouvelleCle.trim(),
              enabled: false,
              ...(description.trim() ? { description: description.trim() } : {}),
            }).then(() => {
              setNouvelleCle("");
              setDescription("");
              setCreation(false);
            })
          }
        >
          Créer, désactivé
        </Button>
        <Button variant="ghost" onClick={() => setCreation(false)}>
          Annuler
        </Button>
      </div>
    </Card>
  ) : null;

  if (flags === undefined) {
    return (
      <>
        {entete}
        {formulaire}
        <LoadingState rows={4} />
      </>
    );
  }

  return (
    <>
      {entete}
      {formulaire}

      {flags.length === 0 ? (
        <EmptyState
          title="Aucun drapeau défini"
          description={`Aucune fonctionnalité n'est pilotée par drapeau sur l'environnement ${cible}. Créez-en un pour pouvoir couper une fonction expérimentale sans redéployer.`}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-gris-clair">
            {flags.map((flag: Flag) => (
              <li key={flag._id} className="flex flex-wrap items-center gap-4 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm text-encre">{flag.key}</p>
                  <p className="mt-0.5 text-xs text-ardoise">
                    {flag.description ?? "Sans description"}
                    {" · "}
                    {flag.organizationId ? "Une organisation" : "Tout l'environnement"}
                    {" · modifié le "}
                    {new Date(flag.updatedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <StatusBadge tone={flag.enabled ? "positif" : "neutre"}>
                  {flag.enabled ? "Activé" : "Désactivé"}
                </StatusBadge>
                <Button
                  variant={flag.enabled ? "secondary" : "primary"}
                  onClick={() =>
                    confirmation.demander({
                      key: flag.key,
                      vers: !flag.enabled,
                      ...(flag.organizationId
                        ? { organizationId: flag.organizationId }
                        : {}),
                    })
                  }
                >
                  {flag.enabled ? "Désactiver" : "Activer"}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        ouvert={confirmation.ouvert}
        danger={cible === "production"}
        titre={
          confirmation.cible?.vers
            ? "Activer cette fonctionnalité"
            : "Désactiver cette fonctionnalité"
        }
        details={{
          effet: confirmation.cible?.vers
            ? "La fonctionnalité devient active immédiatement, sans redéploiement."
            : "La fonctionnalité est coupée immédiatement, sans redéploiement.",
          concerne: confirmation.cible?.organizationId
            ? "Une seule organisation."
            : `Toutes les organisations de l'environnement ${cible}.`,
          portee: `${confirmation.cible?.key ?? ""} sur ${cible}`,
          reversible:
            "Oui. La bascule inverse est immédiate, et les deux sens sont journalisés dans l'audit.",
        }}
        libelleConfirmation={confirmation.cible?.vers ? "Activer" : "Désactiver"}
        enCours={confirmation.enCours}
        erreur={confirmation.erreur}
        onAnnuler={confirmation.annuler}
        onConfirmer={() => void executer()}
      />
    </>
  );
}
