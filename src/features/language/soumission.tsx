import { useState } from "react";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { api } from "@wouri/convex-api";
import { Button, Card } from "~/components/ui";
import { ChampSelection, ChampTexte, ChampZone } from "~/components/form";
import { messageErreur } from "~/components/confirm-dialog";

/* §29-32 — entrée de la boucle de validation. Sans ce formulaire, la file ne se
   remplit que par le pipeline : un locuteur-validateur qui repère une mauvaise
   traduction n'a aucun moyen de la signaler, et la boucle correction → corpus
   n'a pas de commencement. */

type Langue = "dyu" | "bci" | "fr";
type Direction = "local_to_fr" | "fr_to_local";

const LANGUES = [
  { value: "dyu" as const, label: "Dioula" },
  { value: "bci" as const, label: "Baoulé" },
  { value: "fr" as const, label: "Français" },
];

const DIRECTIONS = [
  { value: "local_to_fr" as const, label: "Langue locale vers français" },
  { value: "fr_to_local" as const, label: "Français vers langue locale" },
];

// Taxonomie du backend (OBS-04), libellée en français pour les validateurs.
const TYPES = [
  { value: "TRANSLATION_ERROR", label: "Traduction incorrecte" },
  { value: "ASR_ERROR", label: "Transcription vocale incorrecte" },
  { value: "LANGUAGE_NATURALNESS", label: "Formulation peu naturelle" },
  { value: "AGRICULTURAL_TERMINOLOGY", label: "Vocabulaire agricole inexact" },
  { value: "TTS_PRONUNCIATION", label: "Prononciation" },
  { value: "AMBIGUITY", label: "Ambiguïté" },
  { value: "OTHER", label: "Autre" },
];

export function FormulaireSoumission() {
  const soumettre = useMutation(api.language.feedback.submitFeedback);
  const [ouvert, setOuvert] = useState(false);
  const [langue, setLangue] = useState<Langue>("dyu");
  const [direction, setDirection] = useState<Direction>("local_to_fr");
  const [typeErreur, setTypeErreur] = useState(TYPES[0].value);
  const [origine, setOrigine] = useState("");
  const [brut, setBrut] = useState("");
  const [corrige, setCorrige] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  const complet = Boolean(origine.trim() && brut.trim() && corrige.trim());

  async function envoyer() {
    setErreur(null);
    setEnCours(true);
    try {
      await soumettre({
        language: langue,
        translationDirection: direction,
        errorType: typeErreur,
        // La phrase d'origine est enregistrée comme transcription : c'est elle
        // qui servira de source à l'entrée de corpus si la correction est
        // promue, la sortie de WOURI ne pouvant pas jouer ce rôle.
        rawTranscript: origine.trim(),
        rawTranslation: brut.trim(),
        validatedTranslation: corrige.trim(),
        ...(commentaire.trim() ? { comment: commentaire.trim() } : {}),
      });
      setOrigine("");
      setBrut("");
      setCorrige("");
      setCommentaire("");
      setSucces(true);
      setOuvert(false);
    } catch (cause) {
      setErreur(
        messageErreur(cause) ??
          "La correction n'a pas pu être enregistrée. Réessayez dans un instant.",
      );
    } finally {
      setEnCours(false);
    }
  }

  if (!ouvert) {
    return (
      <div className="mb-4">
        <Button variant="secondary" onClick={() => setOuvert(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Signaler une correction
        </Button>
        {succes ? (
          <p role="status" className="mt-2 text-sm text-vert">
            Correction enregistrée. Elle attend une relecture dans la file « À relire ».
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Card className="mb-4">
      <h2 className="font-titre text-base font-semibold text-encre">
        Signaler une correction
      </h2>
      <p className="mt-1 text-sm text-ardoise">
        Décrivez ce que WOURI a produit et ce qu'il aurait dû produire. La
        correction part en relecture, elle n'est pas intégrée immédiatement.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <ChampSelection
          etiquette="Langue"
          valeur={langue}
          options={LANGUES}
          onChange={setLangue}
        />
        <ChampSelection
          etiquette="Sens de traduction"
          valeur={direction}
          options={DIRECTIONS}
          onChange={setDirection}
        />
        <ChampSelection
          etiquette="Nature de l'erreur"
          valeur={typeErreur}
          options={TYPES}
          onChange={setTypeErreur}
        />
      </div>

      <div className="mt-4">
        <ChampZone
          etiquette="Phrase d'origine"
          valeur={origine}
          onChange={setOrigine}
          lignes={2}
          requis
          aide="Ce que l'agriculteur a dit ou écrit. C'est cette phrase qui deviendra la clé de l'entrée de corpus."
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChampZone
          etiquette="Ce que WOURI a produit"
          valeur={brut}
          onChange={setBrut}
          lignes={3}
          requis
        />
        <ChampZone
          etiquette="Ce qu'il aurait dû produire"
          valeur={corrige}
          onChange={setCorrige}
          lignes={3}
          requis
        />
      </div>

      <div className="mt-4">
        <ChampTexte
          etiquette="Commentaire"
          valeur={commentaire}
          onChange={setCommentaire}
          aide="Facultatif. Utile pour expliquer une nuance régionale ou un usage agricole."
        />
      </div>

      {erreur ? (
        <p
          role="alert"
          className="mt-4 rounded-md bg-[#b3261e]/10 px-3 py-2 text-sm text-[#b3261e]"
        >
          {erreur}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={() => void envoyer()} loading={enCours} disabled={!complet || enCours}>
          Envoyer en relecture
        </Button>
        <Button variant="ghost" onClick={() => setOuvert(false)} disabled={enCours}>
          Annuler
        </Button>
      </div>
    </Card>
  );
}
