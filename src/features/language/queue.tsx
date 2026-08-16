import { useState } from "react";
import { useMutation } from "convex/react";
import { CheckCircle2, Volume2, XCircle } from "lucide-react";
import { api } from "@wouri/convex-api";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui";
import { cn } from "~/lib/cn";
import { PanneauPromotion } from "~/features/language/promotion";

export type StatutValidation = "draft" | "needs_review" | "validated" | "rejected";

export type CasValidation = {
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

export const LIBELLES_STATUT: Record<
  StatutValidation,
  { label: string; tone: "default" | "attention" | "positif" | "critique" }
> = {
  needs_review: { label: "À relire", tone: "attention" },
  validated: { label: "Validée", tone: "positif" },
  rejected: { label: "Rejetée", tone: "critique" },
  draft: { label: "Brouillon", tone: "default" },
};

export const LANGUES: Record<string, string> = {
  dyu: "Dioula",
  bci: "Baoulé",
  fr: "Français",
};

export const TYPES_ERREUR: Record<string, string> = {
  ASR_ERROR: "Reconnaissance vocale",
  TRANSLATION_ERROR: "Traduction",
  LANGUAGE_NATURALNESS: "Formulation peu naturelle",
  AGRICULTURAL_TERMINOLOGY: "Vocabulaire agricole",
  TTS_PRONUNCIATION: "Prononciation",
  AMBIGUITY: "Ambiguïté",
  OTHER: "Autre",
};

export function phraseCas(cas: CasValidation): string {
  return (
    cas.rawTranscript ??
    cas.validatedTranscript ??
    cas.rawTranslation ??
    cas.validatedTranslation ??
    "Cas sans phrase"
  );
}

export function libelleProbleme(cas: CasValidation): string {
  if (!cas.errorType) return "Problème non précisé";
  return TYPES_ERREUR[cas.errorType] ?? cas.errorType;
}

function initialesLangue(code: string): string {
  if (code === "dyu") return "DY";
  if (code === "bci") return "BA";
  if (code === "fr") return "FR";
  return code.slice(0, 2).toUpperCase();
}

export function ValidationQueueTable({
  items,
  onOpen,
}: {
  items: CasValidation[];
  onOpen: (item: CasValidation) => void;
}) {
  return (
    <Table>
      <TableCaption>File de relecture linguistique</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Phrase à relire</TableHead>
          <TableHead>Problème</TableHead>
          <TableHead>Langue</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Reçue le</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const statut = LIBELLES_STATUT[item.status as StatutValidation];
          return (
            <TableRow key={item._id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className="flex min-h-11 items-center gap-3 text-left transition-colors hover:text-vert active:scale-[0.96]"
                >
                  <Avatar>
                    <AvatarFallback>{initialesLangue(item.language)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block max-w-md truncate font-titre text-sm font-semibold text-pretty text-encre">
                      {phraseCas(item)}
                    </span>
                    <span className="mt-0.5 block text-xs text-ardoise">
                      {item.comment ? item.comment : "Ouvrir pour comparer et décider"}
                    </span>
                  </span>
                </button>
              </TableCell>
              <TableCell>
                {item.errorType ? (
                  <Badge variant="attention">{libelleProbleme(item)}</Badge>
                ) : (
                  <span className="text-ardoise">Non précisé</span>
                )}
              </TableCell>
              <TableCell className="text-ardoise">
                {LANGUES[item.language] ?? item.language}
              </TableCell>
              <TableCell>
                <Badge variant={statut?.tone ?? "default"}>{statut?.label ?? item.status}</Badge>
              </TableCell>
              <TableCell className="tabular-nums text-ardoise">
                {new Date(item.createdAt).toLocaleDateString("fr-FR")}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function ValidationReviewSheet({
  cas,
  onClose,
  onDecide,
}: {
  cas: CasValidation | null;
  onClose: () => void;
  onDecide: (decision: "validated" | "rejected") => void;
}) {
  return (
    <Sheet open={cas !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="max-w-xl overflow-y-auto">
        {cas ? (
          <>
            <SheetHeader>
              <SheetTitle>{phraseCas(cas)}</SheetTitle>
              <SheetDescription>
                {(LANGUES[cas.language] ?? cas.language) + " · " + libelleProbleme(cas)}
              </SheetDescription>
            </SheetHeader>
            <div className="p-5">
              <FicheValidation cas={cas} onDecide={onDecide} />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function FicheValidation({
  cas,
  onDecide,
}: {
  cas: CasValidation;
  onDecide: (decision: "validated" | "rejected") => void;
}) {
  const setStatus = useMutation(api.language.feedback.setFeedbackStatus);
  const [enCours, setEnCours] = useState<null | "validated" | "rejected">(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function decider(status: "validated" | "rejected") {
    setErreur(null);
    setEnCours(status);
    try {
      await setStatus({ feedbackId: cas._id as never, status });
      onDecide(status);
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
    <div>
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
          <p className="mt-2 rounded-md bg-papier p-3 text-sm text-pretty text-encre">
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
        <p className="mb-5 rounded-md border-l-2 border-gris-clair bg-papier p-3 text-sm text-pretty text-ardoise">
          {cas.comment}
        </p>
      ) : null}

      {erreur ? (
        <p role="alert" className="mb-4 rounded-md bg-[#b3261e]/10 px-3 py-2 text-sm text-[#b3261e]">
          {erreur}
        </p>
      ) : null}

      {dejaDecide ? (
        <p className="rounded-md bg-papier p-3 text-sm text-pretty text-ardoise">
          Ce cas a déjà été {cas.status === "validated" ? "validé" : "rejeté"}. Son historique
          est conservé : une nouvelle correction créerait une version supplémentaire, elle
          n'écraserait pas celle-ci.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
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
          key={cas._id + ":" + cas.version}
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
      <div className="mt-2 grid gap-3">
        <div className="rounded-lg bg-papier p-3">
          <p className="font-titre text-[11px] font-semibold text-ardoise">{libelleAvant}</p>
          <p className="mt-1 text-sm text-pretty text-encre">{avant ?? "Non renseigné"}</p>
        </div>
        <div className="rounded-lg border border-vert/30 bg-vert/5 p-3">
          <p className="font-titre text-[11px] font-semibold text-vert">{libelleApres}</p>
          <p className="mt-1 text-sm text-pretty text-encre">{apres ?? "Non renseigné"}</p>
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
        <div className="mt-1 flex gap-1" aria-label={libelle + " : " + valeur + " sur 5"}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              aria-hidden="true"
              className={cn("h-2 w-6 rounded-full", n <= valeur ? "bg-vert" : "bg-gris-clair")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
