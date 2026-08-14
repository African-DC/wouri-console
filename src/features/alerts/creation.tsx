import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { api } from "@wouri/convex-api";
import { Button, Card, StatCard } from "~/components/ui";
import { ChampSelection, ChampTexte, ChampZone } from "~/components/form";
import { messageErreur } from "~/components/confirm-dialog";
import { CIBLAGES, LIBELLES_CIBLAGE } from "./libelles";

type Ciblage = "zone" | "crop" | "group" | "farmer";
type Regle = { kind: Ciblage; targetKey: string };

/* §109 — l'aperçu précède l'écriture. Le ciblage se compose et se chiffre avant
   qu'aucune alerte n'existe : l'opérateur voit combien d'agriculteurs sont
   concernés, et combien sont exclus faute de consentement, avant de créer quoi
   que ce soit. L'aperçu utilise la même résolution d'audience que la
   publication, il ne peut donc pas annoncer un nombre que l'envoi ne tiendra
   pas. */
export function CreationAlerte({ onFerme }: { onFerme: () => void }) {
  const naviguer = useNavigate();
  const creer = useMutation(api.alerts.mutations.createAlert);
  const ajouterRegle = useMutation(api.alerts.mutations.addAlertAudienceRule);

  const [message, setMessage] = useState("");
  const [regles, setRegles] = useState<Regle[]>([]);
  const [genre, setGenre] = useState<Ciblage>("zone");
  const [valeur, setValeur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const apercu = useQuery(
    api.alerts.queries.previewAudience,
    regles.length > 0 ? { rules: regles } : "skip",
  );

  function ajouter() {
    const cle = valeur.trim();
    if (!cle) return;
    if (regles.some((r) => r.kind === genre && r.targetKey === cle)) return;
    setRegles([...regles, { kind: genre, targetKey: cle }]);
    setValeur("");
  }

  async function enregistrer() {
    setErreur(null);
    setEnCours(true);
    try {
      const alertId = await creer({ message: message.trim() });
      for (const regle of regles) {
        await ajouterRegle({ alertId, rule: regle });
      }
      await naviguer({
        to: "/console/alerts/$alertId",
        params: { alertId: alertId as unknown as string },
      });
    } catch (cause) {
      setErreur(
        messageErreur(cause) ??
          "L'alerte n'a pas pu être enregistrée. Rien n'a été diffusé.",
      );
      setEnCours(false);
    }
  }

  const complet = message.trim().length > 0 && regles.length > 0;

  return (
    <Card className="mb-6">
      <h2 className="font-titre text-base font-semibold text-encre">
        Nouvelle alerte
      </h2>
      <p className="mt-1 text-sm text-ardoise">
        L'alerte est créée en brouillon. Elle ne part qu'à la publication, depuis
        sa fiche, après une confirmation explicite.
      </p>

      <div className="mt-4">
        <ChampZone
          etiquette="Message"
          valeur={message}
          onChange={setMessage}
          lignes={3}
          requis
          aide="Court et actionnable. C'est le texte que l'agriculteur recevra."
        />
      </div>

      <div className="mt-5">
        <p className="font-titre text-xs font-semibold uppercase tracking-wider text-ardoise">
          Ciblage
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <ChampSelection
              etiquette="Critère"
              valeur={genre}
              options={CIBLAGES}
              onChange={setGenre}
            />
          </div>
          <div className="min-w-[14rem] flex-1">
            <ChampTexte
              etiquette="Valeur"
              valeur={valeur}
              onChange={setValeur}
              placeholder={genre === "zone" ? "korhogo" : genre === "crop" ? "cacao" : ""}
              monospace
            />
          </div>
          <Button variant="secondary" onClick={ajouter} disabled={!valeur.trim()}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter
          </Button>
        </div>

        {regles.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {regles.map((regle) => (
              <li
                key={`${regle.kind}:${regle.targetKey}`}
                className="inline-flex items-center gap-2 rounded-md border border-gris-clair bg-white py-1 pl-3 pr-1 text-sm"
              >
                <span className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  {LIBELLES_CIBLAGE[regle.kind]}
                </span>
                <span className="font-mono text-xs text-encre">{regle.targetKey}</span>
                <button
                  type="button"
                  onClick={() =>
                    setRegles(
                      regles.filter(
                        (r) => !(r.kind === regle.kind && r.targetKey === regle.targetKey),
                      ),
                    )
                  }
                  aria-label={`Retirer ${LIBELLES_CIBLAGE[regle.kind]} ${regle.targetKey}`}
                  className="rounded p-1 text-ardoise hover:bg-gris-clair/60 hover:text-encre"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-ardoise">
            Sans règle, l'audience est vide. Une alerte sans ciblage ne touche
            personne.
          </p>
        )}
      </div>

      {apercu !== undefined ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <StatCard label="Agriculteurs ciblés" value={apercu.targeted} />
          <StatCard
            label="Joignables"
            value={apercu.count}
            tone="positif"
            hint="Consentement en cours de validité"
          />
          <StatCard
            label="Sans consentement"
            value={apercu.withoutConsent}
            tone={apercu.withoutConsent > 0 ? "attention" : "neutre"}
            hint="Exclus de la diffusion"
          />
        </div>
      ) : null}

      {erreur ? (
        <p
          role="alert"
          className="mt-4 rounded-md bg-[#b3261e]/10 px-3 py-2 text-sm text-[#b3261e]"
        >
          {erreur}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          onClick={() => void enregistrer()}
          loading={enCours}
          disabled={!complet || enCours}
        >
          Enregistrer le brouillon
        </Button>
        <Button variant="ghost" onClick={onFerme} disabled={enCours}>
          Annuler
        </Button>
      </div>
    </Card>
  );
}
