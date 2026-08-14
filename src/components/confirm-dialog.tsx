import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui";

/* §108 — toute action dangereuse répond à quatre questions avant de s'exécuter :
   que va-t-il se passer, qui est concerné, combien de ressources, est-ce
   réversible. Le dialogue les impose : elles sont des champs obligatoires, pas
   une phrase libre qu'on oublie d'écrire.

   Construit sur <dialog> natif : le piège de focus, la touche Échap et le fond
   inerte sont fournis par le navigateur. Une réimplémentation manuelle les
   raterait, comme la plupart des modales maison. */

export type ConfirmationDetails = {
  /** Ce qui va se passer, à l'indicatif présent. */
  effet: string;
  /** Qui est concerné, en clair. */
  concerne: string;
  /** Combien de ressources : un nombre et son unité. */
  portee: string;
  /** Réversibilité : décrire comment revenir en arrière, ou dire que non. */
  reversible: string;
};

export function ConfirmDialog({
  ouvert,
  titre,
  details,
  libelleConfirmation,
  danger = false,
  enCours = false,
  erreur,
  children,
  onConfirmer,
  onAnnuler,
}: {
  ouvert: boolean;
  titre: string;
  details: ConfirmationDetails;
  libelleConfirmation: string;
  danger?: boolean;
  enCours?: boolean;
  erreur?: string | null;
  children?: ReactNode;
  onConfirmer: () => void;
  onAnnuler: () => void;
}) {
  const reference = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogue = reference.current;
    if (!dialogue) return;
    if (ouvert && !dialogue.open) dialogue.showModal();
    if (!ouvert && dialogue.open) dialogue.close();
  }, [ouvert]);

  return (
    <dialog
      ref={reference}
      aria-labelledby="confirm-titre"
      onCancel={(event) => {
        // Échap ne doit pas fermer pendant l'exécution : l'action est partie.
        if (enCours) event.preventDefault();
        else onAnnuler();
      }}
      onClick={(event) => {
        if (event.target === reference.current && !enCours) onAnnuler();
      }}
      className="w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-gris-clair bg-white p-0 text-encre shadow-xl backdrop:bg-encre/40"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          {danger ? (
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-[#b3261e]"
              aria-hidden="true"
            />
          ) : null}
          <h2 id="confirm-titre" className="font-titre text-lg font-semibold">
            {titre}
          </h2>
        </div>

        <dl className="mt-4 space-y-3 rounded-md bg-papier p-4 text-sm">
          <Ligne terme="Ce qui va se passer" valeur={details.effet} />
          <Ligne terme="Qui est concerné" valeur={details.concerne} />
          <Ligne terme="Portée" valeur={details.portee} />
          <Ligne terme="Réversibilité" valeur={details.reversible} />
        </dl>

        {children ? <div className="mt-4">{children}</div> : null}

        {erreur ? (
          <p
            role="alert"
            className="mt-4 rounded-md bg-[#b3261e]/10 px-3 py-2 text-sm text-[#b3261e]"
          >
            {erreur}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onAnnuler} disabled={enCours}>
            Annuler
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirmer}
            loading={enCours}
            disabled={enCours}
          >
            {libelleConfirmation}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

function Ligne({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3">
      <dt className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
        {terme}
      </dt>
      <dd className="text-encre">{valeur}</dd>
    </div>
  );
}

/**
 * Petit état de confirmation réutilisable : ouvert, en cours, erreur.
 * Évite de réécrire les mêmes trois `useState` sur chaque écran.
 */
export function useConfirmation<T>() {
  const [cible, setCible] = useState<T | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  return {
    cible,
    ouvert: cible !== null,
    enCours,
    erreur,
    demander: (valeur: T) => {
      setErreur(null);
      setCible(valeur);
    },
    annuler: () => {
      if (enCours) return;
      setErreur(null);
      setCible(null);
    },
    /** Exécute l'action et ne referme le dialogue qu'en cas de succès. */
    executer: async (action: (valeur: T) => Promise<void>, messageEchec: string) => {
      if (cible === null) return false;
      setErreur(null);
      setEnCours(true);
      try {
        await action(cible);
        setCible(null);
        return true;
      } catch (cause) {
        setErreur(messageErreur(cause) ?? messageEchec);
        return false;
      } finally {
        setEnCours(false);
      }
    },
  };
}

/**
 * Extrait le message applicatif d'une erreur Convex. Le backend jette des
 * `ConvexError` porteuses d'un type de la taxonomie : ce message-là est destiné
 * à l'utilisateur, contrairement à la trace technique.
 */
export function messageErreur(cause: unknown): string | null {
  if (typeof cause === "object" && cause !== null && "data" in cause) {
    const data = (cause as { data?: unknown }).data;
    if (typeof data === "object" && data !== null && "message" in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return null;
}
