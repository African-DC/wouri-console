import { Card, EmptyState, StatusBadge } from "~/components/ui";
import { ETAPES_DIFFUSION } from "./libelles";

type Resume = {
  total: number;
  capped: boolean;
  byState: Record<string, number>;
};

/* §12 — entonnoir de diffusion. Chaque étape porte son explication : sans elle
   « créées » et « envoyées » se confondent, alors que la première signifie
   précisément que rien n'est encore parti. */
export function EntonnoirDiffusion({ resume }: { resume: Resume }) {
  if (resume.total === 0) {
    return (
      <EmptyState
        title="Aucune livraison"
        description="Les livraisons apparaîtront ici après publication : une par agriculteur joignable, avec l'avancement de son acheminement."
      />
    );
  }

  const max = Math.max(...ETAPES_DIFFUSION.map((e) => resume.byState[e.cle] ?? 0), 1);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-titre text-sm font-semibold text-encre">
          {resume.total} livraisons
        </p>
        {resume.capped ? (
          <StatusBadge tone="attention">Décompte plafonné</StatusBadge>
        ) : null}
      </div>

      <ol className="space-y-3">
        {ETAPES_DIFFUSION.map((etape) => {
          const valeur = resume.byState[etape.cle] ?? 0;
          const part = (valeur / max) * 100;
          const echec = etape.cle === "failed";
          return (
            <li key={etape.cle}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-titre text-sm font-medium text-encre">
                  {etape.label}
                </span>
                <span className="font-titre text-sm font-semibold text-encre">
                  {valeur}
                </span>
              </div>
              <div
                className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gris-clair"
                role="progressbar"
                aria-valuenow={valeur}
                aria-valuemin={0}
                aria-valuemax={resume.total}
                aria-label={`${etape.label} : ${valeur} sur ${resume.total}`}
              >
                <div
                  className={`h-full rounded-full ${echec ? "bg-[#b3261e]" : "bg-vert"}`}
                  style={{ width: `${part}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-ardoise">{etape.aide}</p>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
