import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { CheckCircle2, XCircle, Volume2 } from "lucide-react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan } from "~/lib/authz/session";
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
import { PanneauPromotion } from "~/features/language/promotion";
import { FormulaireSoumission } from "~/features/language/soumission";

export const Route = createFileRoute("/console/language-validation")({
  component: LanguageValidationPage,
});

type Statut = "draft" | "needs_review" | "validated" | "rejected";

const STATUTS: Array<{ value: Statut; label: string; tone: "neutre" | "attention" | "positif" | "critique" }> = [
  { value: "needs_review", label: "À relire", tone: "attention" },
  { value: "validated", label: "Validées", tone: "positif" },
  { value: "rejected", label: "Rejetées", tone: "critique" },
  { value: "draft", label: "Brouillons", tone: "neutre" },
];

const LANGUES: Record<string, string> = {
  dyu: "Dioula",
  bci: "Baoulé",
  fr: "Français",
};

// Libelles francais de la taxonomie d'erreurs du backend.
const TYPES_ERREUR: Record<string, string> = {
  ASR_ERROR: "Reconnaissance vocale",
  TRANSLATION_ERROR: "Traduction",
  LANGUAGE_NATURALNESS: "Naturalité",
  AGRICULTURAL_TERMINOLOGY: "Vocabulaire agricole",
  TTS_PRONUNCIATION: "Prononciation",
  AMBIGUITY: "Ambiguïté",
  OTHER: "Autre",
};

function LanguageValidationPage() {
  if (!useCan(CAP.linguisticValidate)) {
    return (
      <>
        <PageHeader title="Validation linguistique" />
        <PermissionDenied what="la console de validation linguistique" />
      </>
    );
  }
  return <ValidationQueue />;
}

/* APP-07 — file de validation puis fiche de correction. Cet ecran est utilise
   par des locuteurs-validateurs qui ne sont pas developpeurs : le vocabulaire
   est en francais, les actions sont explicites, et le versionnement du corpus
   est rendu visible pour qu'aucune correction n'ait l'air d'ecraser l'historique. */
function ValidationQueue() {
  const [statut, setStatut] = useState<Statut>("needs_review");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const cas = useQuery(api.language.feedback.listFeedback, { status: statut, limit: 100 });

  return (
    <>
      <PageHeader
        title="Validation linguistique"
        description="Corrigez les transcriptions et traductions, notez la qualité, puis intégrez la correction au corpus."
      />

      <FormulaireSoumission />

      {/* Groupe de filtres, pas des onglets : voir corpus.tsx. */}
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        {STATUTS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={statut === option.value}
            onClick={() => {
              setStatut(option.value);
              setOuvert(null);
            }}
            className={cn(
              "h-11 rounded-md border px-4 font-titre text-sm font-medium transition-colors",
              statut === option.value
                ? "border-vert bg-vert/10 text-vert"
                : "border-gris-clair bg-white text-ardoise hover:border-vert hover:text-vert",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {cas === undefined ? (
        <LoadingState rows={4} />
      ) : cas.length === 0 ? (
        <EmptyState
          title="Aucun cas dans cette file"
          description={
            statut === "needs_review"
              ? "Les corrections proposées par les locuteurs-validateurs apparaîtront ici, prêtes à être relues."
              : "Aucun cas ne porte ce statut pour le moment."
          }
        />
      ) : (
        <div className="space-y-3">
          {cas.map((item) => (
            <CasCard
              key={item._id}
              cas={item}
              ouvert={ouvert === item._id}
              onToggle={() => setOuvert(ouvert === item._id ? null : item._id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

type Cas = {
  _id: string;
  language: string;
  culture?: string;
  region?: string;
  status: string;
  version: number;
  createdAt: number;
  errorType?: string;
  comment?: string;
  rawTranscript?: string;
  validatedTranscript?: string;
  rawTranslation?: string;
  validatedTranslation?: string;
  translationDirection?: string;
  generatedOutput?: string;
  audioStorageId?: string;
  naturalnessScore?: number;
  agriculturalVocabularyScore?: number;
  audioRating?: number;
};

function CasCard({
  cas,
  ouvert,
  onToggle,
}: {
  cas: Cas;
  ouvert: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={ouvert}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-titre text-sm font-semibold text-encre">
              {LANGUES[cas.language] ?? cas.language}
            </span>
            {cas.errorType ? (
              <StatusBadge tone="attention">
                {TYPES_ERREUR[cas.errorType] ?? cas.errorType}
              </StatusBadge>
            ) : null}
            <StatusBadge tone="info">version {cas.version}</StatusBadge>
          </div>
          <p className="mt-1 truncate text-sm text-ardoise">
            {cas.rawTranscript ?? cas.rawTranslation ?? "Cas sans transcription"}
          </p>
        </div>
        <span className="shrink-0 text-xs text-ardoise">
          {new Date(cas.createdAt).toLocaleDateString("fr-FR")}
        </span>
      </button>

      {ouvert ? <FicheValidation cas={cas} /> : null}
    </Card>
  );
}

/** Fiche complète : audio, transcription, traduction aller/retour, notation. */
function FicheValidation({ cas }: { cas: Cas }) {
  const setStatus = useMutation(api.language.feedback.setFeedbackStatus);
  const [enCours, setEnCours] = useState<null | "validated" | "rejected">(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function decider(status: "validated" | "rejected") {
    setErreur(null);
    setEnCours(status);
    try {
      await setStatus({ feedbackId: cas._id as never, status });
    } catch {
      setErreur(
        "La décision n'a pas pu être enregistrée. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setEnCours(null);
    }
  }

  const dejaDecide = cas.status === "validated" || cas.status === "rejected";

  return (
    <div className="border-t border-gris-clair px-5 py-5">
      {cas.audioStorageId ? (
        <section className="mb-5">
          <h3 className="font-titre text-xs font-semibold uppercase tracking-wider text-ardoise">
            Audio original
          </h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-ardoise">
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            Enregistrement joint à ce cas.
          </p>
        </section>
      ) : null}

      <Comparaison
        titre="Transcription"
        avant={cas.rawTranscript}
        apres={cas.validatedTranscript}
        libelleAvant="Proposée par WOURI"
        libelleApres="Corrigée par le validateur"
      />

      <Comparaison
        titre={
          cas.translationDirection === "fr_to_local"
            ? "Traduction du français vers la langue locale"
            : "Traduction de la langue locale vers le français"
        }
        avant={cas.rawTranslation}
        apres={cas.validatedTranslation}
        libelleAvant="Proposée par WOURI"
        libelleApres="Corrigée par le validateur"
      />

      {cas.generatedOutput ? (
        <section className="mb-5">
          <h3 className="font-titre text-xs font-semibold uppercase tracking-wider text-ardoise">
            Réponse produite par WOURI
          </h3>
          <p className="mt-2 rounded-md bg-papier p-3 text-sm text-encre">
            {cas.generatedOutput}
          </p>
        </section>
      ) : null}

      <section className="mb-5 grid gap-4 sm:grid-cols-3">
        <Note libelle="Naturalité" valeur={cas.naturalnessScore} />
        <Note libelle="Vocabulaire agricole" valeur={cas.agriculturalVocabularyScore} />
        <Note libelle="Prononciation" valeur={cas.audioRating} />
      </section>

      {cas.comment ? (
        <p className="mb-5 rounded-md border-l-2 border-gris-clair bg-papier p-3 text-sm text-ardoise">
          {cas.comment}
        </p>
      ) : null}

      {erreur ? (
        <p role="alert" className="mb-4 rounded-md bg-[#b3261e]/10 px-3 py-2 text-sm text-[#b3261e]">
          {erreur}
        </p>
      ) : null}

      {dejaDecide ? (
        <p className="rounded-md bg-papier p-3 text-sm text-ardoise">
          Ce cas a déjà été {cas.status === "validated" ? "validé" : "rejeté"}. Son
          historique est conservé : une nouvelle correction créerait une version
          supplémentaire, elle n'écraserait pas celle-ci.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {/* « Valider » et rien de plus : l'intégration au corpus est une
              étape distincte, qui apparaît une fois la validation acquise. Un
              bouton « valider et intégrer » promettait les deux et n'en faisait
              qu'une. */}
          <Button
            onClick={() => decider("validated")}
            loading={enCours === "validated"}
            disabled={enCours !== null}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Valider la correction
          </Button>
          <Button
            variant="secondary"
            onClick={() => decider("rejected")}
            loading={enCours === "rejected"}
            disabled={enCours !== null}
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Rejeter
          </Button>
        </div>
      )}

      {cas.status === "validated" ? (
        <PanneauPromotion
          feedbackId={cas._id}
          langue={cas.language}
          phraseSource={cas.validatedTranscript ?? cas.rawTranscript}
          traductionValidee={cas.validatedTranslation ?? cas.rawTranslation}
        />
      ) : null}
    </div>
  );
}

function Comparaison({
  titre,
  avant,
  apres,
  libelleAvant,
  libelleApres,
}: {
  titre: string;
  avant?: string;
  apres?: string;
  libelleAvant: string;
  libelleApres: string;
}) {
  if (!avant && !apres) return null;
  return (
    <section className="mb-5">
      <h3 className="font-titre text-xs font-semibold uppercase tracking-wider text-ardoise">
        {titre}
      </h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md bg-papier p-3">
          <p className="font-titre text-[11px] font-semibold text-ardoise">
            {libelleAvant}
          </p>
          <p className="mt-1 text-sm text-encre">{avant ?? "—"}</p>
        </div>
        <div className="rounded-md border border-vert/30 bg-vert/5 p-3">
          <p className="font-titre text-[11px] font-semibold text-vert">
            {libelleApres}
          </p>
          <p className="mt-1 text-sm text-encre">{apres ?? "—"}</p>
        </div>
      </div>
    </section>
  );
}

function Note({ libelle, valeur }: { libelle: string; valeur?: number }) {
  return (
    <div>
      <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
        {libelle}
      </p>
      {valeur === undefined ? (
        <p className="mt-1 text-sm text-ardoise">Non notée</p>
      ) : (
        <div className="mt-1 flex gap-1" aria-label={`${libelle} : ${valeur} sur 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              aria-hidden="true"
              className={cn(
                "h-2 w-6 rounded-full",
                n <= valeur ? "bg-vert" : "bg-gris-clair",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
