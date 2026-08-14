import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState, type ChangeEvent } from "react";
import { Upload, FileJson } from "lucide-react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan } from "~/lib/authz/session";
import { cn } from "~/lib/cn";
import {
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PermissionDenied,
  StatCard,
  StatusBadge,
} from "~/components/ui";

export const Route = createFileRoute("/console/corpus")({ component: CorpusPage });

const LANGUES = [
  { code: "dyu", label: "Dioula" },
  { code: "fr", label: "Français" },
  { code: "bci", label: "Baoulé" },
];

type Rapport = {
  corpusVersion: string;
  entreesLues: number;
  creees: number;
  versionnees: number;
  inchangees: number;
};

function CorpusPage() {
  if (!useCan(CAP.knowledgeRead)) {
    return (
      <>
        <PageHeader title="Corpus" />
        <PermissionDenied what="le corpus linguistique" />
      </>
    );
  }
  return <CorpusView />;
}

function CorpusView() {
  const [langue, setLangue] = useState("dyu");
  const phrases = useQuery(api.language.fastPath.listApprovedPhrases, {
    language: langue,
    limit: 200,
  });
  const peutImporter = useCan(CAP.linguisticValidate);
  return (
    <>
      <PageHeader
        title="Corpus"
        description="Phrases validées servies par le chemin rapide. Chaque correction ajoute une version, elle n'écrase jamais la précédente."
      />
      {peutImporter ? <ImportCorpus /> : null}
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filtrer par langue">
        {LANGUES.map((option) => (
          <button
            key={option.code}
            type="button"
            role="tab"
            aria-selected={langue === option.code}
            onClick={() => setLangue(option.code)}
            className={cn(
              "h-11 rounded-md border px-4 font-titre text-sm font-medium transition-colors",
              langue === option.code
                ? "border-vert bg-vert/10 text-vert"
                : "border-gris-clair bg-white text-ardoise hover:border-vert hover:text-vert",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {phrases === undefined ? (
        <LoadingState rows={4} />
      ) : phrases.length === 0 ? (
        <EmptyState
          title="Aucune phrase pour cette langue"
          description="Importez le corpus ou validez des corrections pour alimenter le chemin rapide."
        />
      ) : (
        <>
          <div className="mb-4">
            <StatCard
              label="Phrases approuvées"
              value={phrases.length}
              hint="Servies sans passer par le pipeline complet"
            />
          </div>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <caption className="sr-only">Phrases approuvées du corpus</caption>
                <thead>
                  <tr className="border-b border-gris-clair bg-papier">
                    <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                      Intention
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                      Texte
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-titre text-xs font-semibold text-ardoise">
                      Version
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {phrases.map((phrase) => (
                    <tr
                      key={phrase.normalizedKey}
                      className="border-b border-gris-clair last:border-0 hover:bg-papier"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-ardoise">
                        {phrase.intent}
                      </td>
                      <td className="max-w-xl px-4 py-3 text-encre">{phrase.text}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone="info">v{phrase.version}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

/** Import du corpus historique par l'interface : lecture du JSON puis rapport. */

function ImportCorpus() {
  const importer = useMutation(api.language.importCorpus.importCorpus);
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  async function onFichier(event: ChangeEvent<HTMLInputElement>) {
    const fichier = event.target.files?.[0];
    if (!fichier) return;
    setErreur(null);
    setRapport(null);
    setEnCours(true);
    try {
      const brut = JSON.parse(await fichier.text());
      const entrees = Array.isArray(brut) ? brut : brut.entries;
      if (!Array.isArray(entrees)) {
        setErreur(
          "Fichier non reconnu : il doit contenir une liste d'entrées, directement ou sous la clé « entries ».",
        );
        return;
      }
      // On n'envoie que les champs attendus : le reste du fichier historique
      // (phrases attestées, scores) ne concerne pas la gouvernance du corpus.
      const payload = entrees.map((e: Record<string, unknown>) => ({
        id: String(e.id ?? ""),
        intent: String(e.intent ?? ""),
        cultures: Array.isArray(e.cultures) ? (e.cultures as string[]) : undefined,
        reponse_bambara:
          typeof e.reponse_bambara === "string" ? e.reponse_bambara : undefined,
        reponse_fr: typeof e.reponse_fr === "string" ? e.reponse_fr : undefined,
      }));
      const resultat = await importer({
        corpusVersion: String(brut.version ?? "import manuel"),
        entries: payload,
      });
      if (resultat.mode === "execute") setRapport(resultat);
    } catch (cause) {
      setErreur(
        cause instanceof SyntaxError
          ? "Le fichier n'est pas un JSON valide."
          : "L'import a échoué. Le corpus n'a pas été modifié.",
      );
    } finally {
      setEnCours(false);
      event.target.value = "";
    }
  }
  return (
    <Card className="mb-6">
      <h2 className="font-titre text-sm font-semibold text-encre">
        Importer le corpus
      </h2>
      <p className="mt-1 text-sm text-ardoise">
        Chargez le fichier du corpus historique. L'import est rejouable : une
        entrée inchangée n'est pas dupliquée, un texte corrigé ajoute une version.
      </p>
      <label
        htmlFor="fichier-corpus"
        className="mt-4 flex h-11 w-fit items-center gap-2 rounded-md bg-vert px-4 font-titre text-sm font-semibold text-white hover:bg-vert-profond"
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        {enCours ? "Import en cours…" : "Choisir un fichier JSON"}
      </label>
      <input
        id="fichier-corpus"
        type="file"
        accept="application/json,.json"
        onChange={onFichier}
        disabled={enCours}
        className="sr-only"
      />
      {erreur ? (
        <p role="alert" className="mt-4 rounded-md bg-[#b3261e]/10 px-3 py-2 text-sm text-[#b3261e]">
          {erreur}
        </p>
      ) : null}
      {rapport ? (
        <div className="mt-4 rounded-md border border-vert/30 bg-vert/5 p-4">
          <p className="flex items-center gap-2 font-titre text-sm font-semibold text-vert">
            <FileJson className="h-4 w-4" aria-hidden="true" />
            Corpus version {rapport.corpusVersion} importé
          </p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-4">
            <Chiffre libelle="Entrées lues" valeur={rapport.entreesLues} />
            <Chiffre libelle="Phrases créées" valeur={rapport.creees} />
            <Chiffre libelle="Nouvelles versions" valeur={rapport.versionnees} />
            <Chiffre libelle="Inchangées" valeur={rapport.inchangees} />
          </dl>
        </div>
      ) : null}
    </Card>
  );
}

function Chiffre({ libelle, valeur }: { libelle: string; valeur: number }) {
  return (
    <div>
      <dt className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
        {libelle}
      </dt>
      <dd className="mt-0.5 font-titre text-xl font-semibold text-encre">{valeur}</dd>
    </div>
  );
}
