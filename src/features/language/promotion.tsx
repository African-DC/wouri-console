import { useState } from "react";
import { useMutation } from "convex/react";
import { BookMarked, Library, Megaphone } from "lucide-react";
import { api } from "@wouri/convex-api";
import { Button, StatusBadge } from "~/components/ui";
import { ChampSelection, ChampTexte, ChampZone, normaliserCle } from "~/components/form";
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
  | { genre: "glossaire"; cle: string; definition: string }
  | { genre: "reponse"; cle: string; intent: string; texte: string };

type Resultat = { genre: "corpus" | "glossaire" | "reponse"; version: number };

/* Intentions du corpus IVR servi en production. Le moteur indexe ses réponses
   par intention : une correction déposée sous une intention inconnue ne serait
   jamais servie. */
const INTENTIONS = [
  "CONSEIL_PRODUCTION",
  "DIAGNOSTIC_PROBLEME",
  "QUESTION_ENGRAIS",
  "QUESTION_IRRIGATION",
  "QUESTION_SEMIS",
  "QUESTION_RECOLTE",
  "QUESTION_MALADIE",
  "QUESTION_PRIX",
  "QUESTION_METEO",
  "SALUTATION",
].map((valeur) => ({ value: valeur, label: valeur.replace(/_/g, " ").toLowerCase() }));

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
  const promouvoirReponse = useMutation(api.language.fastPath.promoteToApprovedPhrase);
  const confirmation = useConfirmation<Cible>();
  const [resultat, setResultat] = useState<Resultat | null>(null);

  const [entree, setEntree] = useState(phraseSource ?? "");
  const [sortie, setSortie] = useState(traductionValidee ?? "");
  const [cleCorpus, setCleCorpus] = useState(normaliserCle(phraseSource ?? ""));

  const [terme, setTerme] = useState("");
  const [definition, setDefinition] = useState("");

  const [cleReponse, setCleReponse] = useState("");
  const [intention, setIntention] = useState(INTENTIONS[0].value);
  const [texteReponse, setTexteReponse] = useState(traductionValidee ?? "");

  const corpusComplet = Boolean(entree.trim() && sortie.trim() && cleCorpus.trim());
  const glossaireComplet = Boolean(terme.trim() && definition.trim());
  const reponseComplete = Boolean(cleReponse.trim() && texteReponse.trim());

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
      } else if (cible.genre === "glossaire") {
        const retour = await promouvoirGlossaire({
          feedbackId: feedbackId as never,
          normalizedKey: cible.cle,
          definition: cible.definition,
        });
        setResultat({ genre: "glossaire", version: retour.version });
      } else {
        const retour = await promouvoirReponse({
          feedbackId: feedbackId as never,
          normalizedKey: cible.cle,
          intent: cible.intent,
          text: cible.texte,
        });
        setResultat({ genre: "reponse", version: retour.version });
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
            {resultat.genre === "corpus" ? "Corpus" : resultat.genre === "reponse" ? "Réponse servie" : "Glossaire"} version{" "}
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

      {/* ADR-0025 / G09 — la seule des trois cibles qui atteint réellement
          l'agriculteur. Les deux précédentes nourrissent la mémoire de
          traduction et le glossaire ; celle-ci corrige la réponse que le moteur
          sert sur le chemin rapide. Sans elle, la boucle de validation se
          fermait à l'écran sans rien changer en production. */}
      <section className="mt-6 rounded-md border-l-4 border-l-vert bg-vert/5 p-4">
        <p className="flex items-center gap-2 font-titre text-xs font-semibold uppercase tracking-wider text-vert">
          <Megaphone className="h-4 w-4" aria-hidden="true" />
          Réponse servie aux agriculteurs
        </p>
        <p className="mt-1 text-sm text-ardoise">
          Corrige la réponse que WOURI donne réellement pour cette intention. Le
          moteur la reprendra à sa prochaine synchronisation.
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <ChampTexte
            etiquette="Clé de l'entrée"
            valeur={cleReponse}
            onChange={setCleReponse}
            monospace
            requis
            aide="Identifiant de l'entrée de corpus, par exemple cacao_engrais_001."
          />
          <ChampSelection
            etiquette="Intention"
            valeur={intention}
            options={INTENTIONS}
            onChange={setIntention}
            aide="Le moteur indexe ses réponses par intention."
          />
          <div className="flex items-end">
            <Button
              disabled={!reponseComplete}
              onClick={() =>
                confirmation.demander({
                  genre: "reponse",
                  cle: cleReponse.trim(),
                  intent: intention,
                  texte: texteReponse.trim(),
                })
              }
            >
              Corriger la réponse
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <ChampZone
            etiquette={`Réponse corrigée en ${nomLangue(langue)}`}
            valeur={texteReponse}
            onChange={setTexteReponse}
            lignes={3}
            requis
          />
        </div>
      </section>

      <ConfirmDialog
        ouvert={confirmation.ouvert}
        danger={confirmation.cible?.genre === "reponse"}
        titre={
          confirmation.cible?.genre === "glossaire"
            ? "Intégrer ce terme au glossaire"
            : confirmation.cible?.genre === "reponse"
              ? "Corriger la réponse servie aux agriculteurs"
              : "Intégrer cette phrase au corpus"
        }
        details={{
          effet:
            confirmation.cible?.genre === "glossaire"
              ? "Une nouvelle version du terme est ajoutée au glossaire de votre organisation."
              : confirmation.cible?.genre === "reponse"
                ? "Une nouvelle version de la réponse est approuvée. Le moteur la reprendra à sa prochaine synchronisation : c'est ce que les agriculteurs recevront."
                : "Une nouvelle version de la paire de phrases est ajoutée au corpus. Elle pourra être servie directement, sans passer par le pipeline complet.",
          concerne:
            confirmation.cible?.genre === "reponse"
              ? `Tous les agriculteurs qui posent cette question en ${nomLangue(langue)}.`
              : `Les agriculteurs qui écrivent en ${nomLangue(langue)}.`,
          portee:
            confirmation.cible?.genre === "glossaire"
              ? `Un terme : ${confirmation.cible.cle || "(clé vide)"}`
              : confirmation.cible?.genre === "reponse"
                ? `${confirmation.cible.cle} · ${confirmation.cible.intent}`
                : `Une entrée : ${confirmation.cible?.cle ?? ""}`,
          reversible:
            "Oui. Rien n'est écrasé : une correction ultérieure crée une version suivante, et les versions précédentes restent consultables.",
        }}
        libelleConfirmation={
          confirmation.cible?.genre === "reponse" ? "Corriger" : "Intégrer"
        }
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
