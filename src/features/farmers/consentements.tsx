import { useMutation } from "convex/react";
import { api } from "@wouri/convex-api";
import { Button, Card, EmptyState, StatusBadge } from "~/components/ui";
import { ConfirmDialog, useConfirmation } from "~/components/confirm-dialog";

/* §18 — centre de consentement. C'est la pièce dont dépend la légalité de toute
   diffusion : l'audience d'une alerte exclut les agriculteurs sans opt-in en
   cours de validité. L'écran doit donc montrer l'état courant, son origine, sa
   date, et l'historique complet, qui ne s'écrase jamais.

   Les deux actions sont sensibles dans les deux sens. Retirer coupe la seule
   voie de contact ; enregistrer engage l'organisation à prouver que la personne
   a réellement consenti. Chacune passe par une confirmation. */

type Consentement = {
  _id: string;
  purpose: string;
  state: "granted" | "withdrawn";
  policyVersion: string;
  captureSource: string;
  recordedAt: number;
};

type Action = { genre: "accorder" | "retirer"; purpose: string };

// Le seul objet de consentement en vigueur, aligné sur la résolution d'audience
// du backend. Voir ALERT_CONSENT_PURPOSE côté Convex.
const OBJET_ALERTES = "whatsapp_alerts";

const LIBELLES_OBJET: Record<string, string> = {
  whatsapp_alerts: "Recevoir les alertes sur WhatsApp",
};

export function CentreConsentement({
  farmerId,
  consentements,
  modifiable,
}: {
  farmerId: string;
  consentements: Consentement[];
  modifiable: boolean;
}) {
  const enregistrer = useMutation(api.farmers.mutations.recordConsent);
  const retirer = useMutation(api.farmers.mutations.withdrawConsent);
  const confirmation = useConfirmation<Action>();

  // L'état courant d'un objet est sa ligne la plus récente : rien n'est modifié
  // en place, un retrait est une ligne de plus.
  const parObjet = new Map<string, Consentement>();
  for (const ligne of [...consentements].sort((a, b) => b.recordedAt - a.recordedAt)) {
    if (!parObjet.has(ligne.purpose)) parObjet.set(ligne.purpose, ligne);
  }
  const courant = parObjet.get(OBJET_ALERTES);
  const accorde = courant?.state === "granted";

  async function executer() {
    await confirmation.executer(async (action) => {
      if (action.genre === "retirer") {
        await retirer({
          farmerId: farmerId as never,
          purpose: action.purpose,
          captureSource: "console",
        });
      } else {
        // La version du texte de consentement n'est PAS envoyée : le serveur
        // stampe la version en vigueur. Fournir une version depuis le client
        // reviendrait à attester un accord sous une version choisie.
        await enregistrer({
          farmerId: farmerId as never,
          purpose: action.purpose,
          state: "granted",
          captureSource: "console",
        });
      }
    }, "L'opération a échoué. Le consentement reste inchangé.");
  }

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-titre text-base font-semibold text-encre">
              {LIBELLES_OBJET[OBJET_ALERTES]}
            </h2>
            <p className="mt-1 text-sm text-ardoise">
              {accorde
                ? "Cet agriculteur reçoit les alertes de votre organisation."
                : "Cet agriculteur est exclu de toute diffusion tant qu'il n'a pas donné son accord."}
            </p>
          </div>
          <StatusBadge tone={accorde ? "positif" : "attention"}>
            {accorde ? "Accordé" : courant ? "Retiré" : "Jamais donné"}
          </StatusBadge>
        </div>

        {courant ? (
          <dl className="mt-4 grid gap-3 border-t border-gris-clair pt-4 sm:grid-cols-3">
            <Detail terme="Depuis le" valeur={new Date(courant.recordedAt).toLocaleString("fr-FR")} />
            <Detail terme="Origine" valeur={courant.captureSource} />
            <Detail terme="Version du texte" valeur={courant.policyVersion} />
          </dl>
        ) : null}

        {modifiable ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {accorde ? (
              <Button
                variant="danger"
                onClick={() => confirmation.demander({ genre: "retirer", purpose: OBJET_ALERTES })}
              >
                Retirer le consentement
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => confirmation.demander({ genre: "accorder", purpose: OBJET_ALERTES })}
              >
                Enregistrer un consentement
              </Button>
            )}
          </div>
        ) : null}
      </Card>

      <section className="mt-4" aria-labelledby="historique-consentements">
        <h3
          id="historique-consentements"
          className="mb-2 font-titre text-xs font-semibold uppercase tracking-wider text-ardoise"
        >
          Historique
        </h3>
        {consentements.length === 0 ? (
          <EmptyState
            title="Aucun consentement enregistré"
            description="L'historique conserve chaque décision, y compris les retraits. Rien n'y est effacé."
          />
        ) : (
          <Card className="p-0">
            <ol className="divide-y divide-gris-clair">
              {[...consentements]
                .sort((a, b) => b.recordedAt - a.recordedAt)
                .map((ligne) => (
                  <li key={ligne._id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <StatusBadge tone={ligne.state === "granted" ? "positif" : "attention"}>
                      {ligne.state === "granted" ? "Accordé" : "Retiré"}
                    </StatusBadge>
                    <span className="text-encre">
                      {LIBELLES_OBJET[ligne.purpose] ?? ligne.purpose}
                    </span>
                    <span className="ml-auto text-xs text-ardoise">
                      {ligne.captureSource} · {new Date(ligne.recordedAt).toLocaleString("fr-FR")}
                    </span>
                  </li>
                ))}
            </ol>
          </Card>
        )}
      </section>

      <ConfirmDialog
        ouvert={confirmation.ouvert}
        danger={confirmation.cible?.genre === "retirer"}
        titre={
          confirmation.cible?.genre === "retirer"
            ? "Retirer le consentement"
            : "Enregistrer un consentement"
        }
        details={
          confirmation.cible?.genre === "retirer"
            ? {
                effet:
                  "L'agriculteur est immédiatement exclu de toute nouvelle diffusion. Les alertes déjà parties ne sont pas rappelées.",
                concerne: "Cet agriculteur uniquement.",
                portee: LIBELLES_OBJET[OBJET_ALERTES],
                reversible:
                  "Oui. Un nouveau consentement peut être enregistré ensuite ; le retrait reste dans l'historique.",
              }
            : {
                effet:
                  "L'agriculteur redevient joignable par les alertes de votre organisation.",
                concerne: "Cet agriculteur uniquement.",
                portee: LIBELLES_OBJET[OBJET_ALERTES],
                reversible:
                  "Oui. Le consentement peut être retiré à tout moment. Votre organisation doit pouvoir prouver que cet accord a réellement été donné.",
              }
        }
        libelleConfirmation={
          confirmation.cible?.genre === "retirer" ? "Retirer" : "Enregistrer"
        }
        enCours={confirmation.enCours}
        erreur={confirmation.erreur}
        onAnnuler={confirmation.annuler}
        onConfirmer={() => void executer()}
      />
    </>
  );
}

function Detail({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <div>
      <dt className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
        {terme}
      </dt>
      <dd className="mt-0.5 text-sm text-encre">{valeur}</dd>
    </div>
  );
}
