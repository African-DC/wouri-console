import { useState } from "react";
import { useMutation } from "convex/react";
import { BookMarked, Library } from "lucide-react";
import { api } from "@wouri/convex-api";
import { Button, StatusBadge } from "~/components/ui";
import { ChampTexte, ChampZone, normaliserCle } from "~/components/form";
import { ConfirmDialog, useConfirmation } from "~/components/confirm-dialog";

/* G09 — dernière marche de la boucle de validation : une correction validée
   rejoint le corpus ou le glossaire.

   Deux règles portées par cet écran :
   - la promotion n'écrase jamais : elle ajoute une version. Le bandeau de
     résultat le montre explicitement, sinon un validateur croit détruire
     l'historique et hésite à corriger ;
   - la promotion est une écriture sensible : la phrase promue est servie
     directement aux agriculteurs, sans repasser par le pipeline. Elle passe
     donc par une confirmation qui dit ce qui va se passer. */

type Cible =
  | { genre: "corpus"; cle: string; entree: string; sortie: string }
  | { genre: "glossaire"; cle: string; definition: string };

type Resultat = { genre: "corpus" | "glossaire"; version: number };

export function PanneauPromotion({
  feedbackId,
  langue,
  phraseSource,
  traductionValidee,
}: {
  feedbackId: string;
  langue: string;
  /** Phrase d'origine : transcription corrigée si elle existe, sinon brute. */
  phraseSource?: string;
  traductionValidee?: string;
}) {
  const promouvoirCorpus = useMutation(api.language.promote.promoteToCorpus);
  const promouvoirGlossaire = useMutation(api.language.promote.promoteToGlossary);
  const confirmation = useConfirmation<Cible>();
  const [resultat, setResultat] = useState<Resultat | null>(null);

  const [entree, setEntree] = useState(phraseSource ?? "");
  const [sortie, setSortie] = useState(traductionValidee ?? "");
  const [cleCorpus, setCleCorpus] = useState(normaliserCle(phraseSource ?? ""));

  const [terme, setTerme] = useState("");
  const [definition, setDefinition] = useState("");

  const corpusComplet = Boolean(entree.trim() && sortie.trim() && cleCorpus.trim());
  const glossaireComplet = Boolean(terme.trim() && definition.trim());

  async function executer() {
    await confirmation.executer(async (cible) => {
      if (cible.genre === "corpus") {
        const retour = await promouvoirCorpus({
          feedbackId: feedbackId as never,
          normalizedKey: cible.cle,
          inputText: cible.entree,
          outputText: cible.sortie,
        });
        setResultat({ genre: "corpus", version: retour.version });
      } else {
        const retour = await promouvoirGlossaire({
          feedbackId: feedbackId as never,
          normalizedKey: cible.cle,
          definition: cible.definition,
        });
        setResultat({ genre: "glossaire", version: retour.version });
      }
    }, "La promotion n'a pas abouti. La correction reste validée, rien n'a été modifié.");
  }

  return (
    <section className="mt-5 border-t border-gris-clair pt-5">
      <h3 className="font-titre text-sm font-semibold text-encre">
        Intégrer cette correction
      </h3>
      <p className="mt-1 text-sm text-ardoise">
        Une correction validée ne sert à rien tant qu'elle n'a pas rejoint le
        corpus. Chaque intégration crée une version supplémentaire, la
        précédente est conservée.
      </p>

      {resultat ? (
        <p className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-vert/30 bg-vert/5 p-3 text-sm text-encre">
          <StatusBadge tone="positif">
            {resultat.genre === "corpus" ? "Corpus" : "Glossaire"} version{" "}
            {resultat.version}
          </StatusBadge>
          {resultat.version > 1
            ? `La version ${resultat.version - 1} reste consultable : elle n'a pas été remplacée.`
            : "Première version de cette entrée."}
        </p>
      ) : null}

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="flex items-center gap-2 font-titre text-xs font-semibold uppercase tracking-wider text-ardoise">
            <Library className="h-4 w-4" aria-hidden="true" />
            Corpus, paire de phrases
          </p>
          <ChampZone
            etiquette="Phrase source"
            valeur={entree}
            onChange={(valeur) => {
              setEntree(valeur);
              setCleCorpus(normaliserCle(valeur));
            }}
            lignes={2}
            requis
          />
          <ChampZone
            etiquette="Traduction retenue"
            valeur={sortie}
            onChange={setSortie}
            lignes={2}
            requis
          />
          <ChampTexte
            etiquette="Clé d'identité"
            valeur={cleCorpus}
            onChange={setCleCorpus}
            monospace
            aide="Déduite de la phrase source. Deux promotions de la même clé versionnent la même entrée au lieu d'en créer deux."
          />
          <Button
            variant="secondary"
            disabled={!corpusComplet}
            onClick={() =>
              confirmation.demander({
                genre: "corpus",
                cle: cleCorpus.trim(),
                entree: entree.trim(),
                sortie: sortie.trim(),
              })
            }
          >
            Intégrer au corpus
          </Button>
        </div>

        <div className="space-y-3">
          <p className="flex items-center gap-2 font-titre text-xs font-semibold uppercase tracking-wider text-ardoise">
            <BookMarked className="h-4 w-4" aria-hidden="true" />
            Glossaire, terme métier
          </p>
          <ChampTexte
            etiquette="Terme"
            valeur={terme}
            onChange={setTerme}
            requis
            aide="Le mot ou l'expression à fixer, par exemple un nom de maladie ou de traitement."
          />
          <ChampZone
            etiquette="Définition retenue"
            valeur={definition}
            onChange={setDefinition}
            lignes={3}
            requis
          />
          <Button
            variant="secondary"
            disabled={!glossaireComplet}
            onClick={() =>
              confirmation.demander({
                genre: "glossaire",
                cle: normaliserCle(terme),
                definition: definition.trim(),
              })
            }
          >
            Intégrer au glossaire
          </Button>
        </div>
      </div>

      <ConfirmDialog
        ouvert={confirmation.ouvert}
        titre={
          confirmation.cible?.genre === "glossaire"
            ? "Intégrer ce terme au glossaire"
            : "Intégrer cette phrase au corpus"
        }
        details={{
          effet:
            confirmation.cible?.genre === "glossaire"
              ? "Une nouvelle version du terme est ajoutée au glossaire de votre organisation."
              : "Une nouvelle version de la paire de phrases est ajoutée au corpus. Elle pourra être servie directement, sans passer par le pipeline complet.",
          concerne: `Les agriculteurs qui écrivent en ${nomLangue(langue)}.`,
          portee:
            confirmation.cible?.genre === "glossaire"
              ? `Un terme : ${confirmation.cible.cle || "(clé vide)"}`
              : `Une entrée : ${confirmation.cible?.cle ?? ""}`,
          reversible:
            "Oui. Rien n'est écrasé : une correction ultérieure crée une version suivante, et les versions précédentes restent consultables.",
        }}
        libelleConfirmation="Intégrer"
        enCours={confirmation.enCours}
        erreur={confirmation.erreur}
        onAnnuler={confirmation.annuler}
        onConfirmer={() => void executer()}
      />
    </section>
  );
}

function nomLangue(code: string): string {
  if (code === "dyu") return "dioula";
  if (code === "bci") return "baoulé";
  if (code === "fr") return "français";
  return code;
}
