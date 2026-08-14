import { Link } from "@tanstack/react-router";
import { Card } from "./ui";

/** Route inconnue : on renvoie vers la console plutôt que d'afficher un vide. */
export function NotFound() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card className="flex flex-col items-center py-12 text-center">
        <p className="font-titre text-3xl font-semibold text-vert-profond">404</p>
        <p className="mt-2 font-titre font-semibold text-encre">
          Cette page n'existe pas
        </p>
        <p className="mt-1 max-w-md text-sm text-ardoise">
          Le lien est peut-être obsolète, ou la section n'est pas disponible pour
          votre organisation.
        </p>
        <Link
          to="/console"
          className="mt-4 inline-flex h-11 items-center rounded-md bg-vert px-4 font-titre text-sm font-semibold text-white hover:bg-vert-profond"
        >
          Retour à la vue d'ensemble
        </Link>
      </Card>
    </div>
  );
}
