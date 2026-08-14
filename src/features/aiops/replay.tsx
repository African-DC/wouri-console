import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Camera } from "lucide-react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan, useSession } from "~/lib/authz/session";
import { Button, StatusBadge } from "~/components/ui";
import { ConfirmDialog, useConfirmation } from "~/components/confirm-dialog";

/* §75 / OBS-03 / G12 — replay. Ce que fait réellement la plateforme aujourd'hui,
   c'est figer l'entrée et le contexte d'une exécution pour pouvoir la rejouer
   plus tard avec une autre configuration.

   L'exécution comparée elle-même dépend du moteur de conversation, qui n'est pas
   branché. L'écran le dit au lieu d'afficher un bouton « rejouer » qui ne
   rejouerait rien : un contrôle qui ment sur ce qu'il fait est pire qu'un
   contrôle absent. */
export function PanneauReplay({ traceId }: { traceId: string }) {
  const peutRejouer = useCan(CAP.aiopsReplay);
  const { environment } = useSession();
  const snapshots = useQuery(
    api.aiops.replay.listReplaySnapshots,
    peutRejouer ? { traceId: traceId as never, limit: 10 } : "skip",
  );
  const capturer = useMutation(api.aiops.replay.captureSnapshotFromTrace);
  const confirmation = useConfirmation<true>();
  const [erreur, setErreur] = useState<string | null>(null);

  if (!peutRejouer) return null;

  return (
    <section className="mt-5 border-t border-gris-clair pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-titre text-xs font-semibold uppercase tracking-wider text-ardoise">
            Replay
          </h3>
          <p className="mt-1 text-sm text-ardoise">
            Fige l'entrée et le contexte de cette exécution pour pouvoir la
            rejouer sur {environment === "production" ? "un autre environnement" : "staging"} avec
            une autre configuration.
          </p>
        </div>
        <Button variant="secondary" onClick={() => confirmation.demander(true)}>
          <Camera className="h-4 w-4" aria-hidden="true" />
          Figer cette exécution
        </Button>
      </div>

      {erreur ? (
        <p role="alert" className="mt-3 text-sm text-[#b3261e]">
          {erreur}
        </p>
      ) : null}

      {snapshots === undefined ? null : snapshots.length === 0 ? (
        <p className="mt-3 text-sm text-ardoise">
          Aucun instantané pour cette exécution.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {snapshots.map((snapshot) => (
            <li
              key={snapshot._id}
              className="flex flex-wrap items-center gap-3 rounded-md bg-papier p-3 text-sm"
            >
              <StatusBadge tone="info">Instantané</StatusBadge>
              <span className="font-mono text-xs text-encre">
                {snapshot.promptKey ?? "prompt inconnu"}
                {snapshot.promptVersion ? ` v${snapshot.promptVersion}` : ""}
              </span>
              <span className="ml-auto text-xs text-ardoise">
                {new Date(snapshot.capturedAt).toLocaleString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-ardoise">
        Le rejeu comparatif, qui exécuterait à nouveau l'instantané et
        confronterait les deux résultats, dépend du moteur de conversation et
        n'est pas encore branché.
      </p>

      <ConfirmDialog
        ouvert={confirmation.ouvert}
        titre="Figer cette exécution"
        details={{
          effet:
            "L'entrée et le contexte de l'exécution sont copiés dans un instantané, avec les versions de prompt, de politique et de modèle en vigueur.",
          concerne: "Personne : aucun message n'est envoyé, aucune donnée métier modifiée.",
          portee: "Une exécution.",
          reversible:
            "Sans objet : l'instantané est une copie en lecture. Il contient toutefois l'entrée d'un agriculteur et suit les mêmes règles d'accès que la trace.",
        }}
        libelleConfirmation="Figer"
        enCours={confirmation.enCours}
        erreur={confirmation.erreur}
        onAnnuler={confirmation.annuler}
        onConfirmer={() => {
          setErreur(null);
          void confirmation.executer(async () => {
            await capturer({ traceId: traceId as never });
          }, "L'instantané n'a pas pu être créé.");
        }}
      />
    </section>
  );
}
