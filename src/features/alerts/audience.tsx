import { Card, StatCard } from "~/components/ui";

/* Aperçu d'audience, partagé par la création et la fiche d'alerte.

   Trois nombres plutôt qu'un : n'afficher que le nombre joignable masquerait un
   problème d'opt-out au lieu de le nommer.

   Et un quatrième état, le dépassement. Au-delà du plafond de vérification des
   consentements, la publication refusera : l'aperçu l'annonce en clair plutôt
   que de laisser l'opérateur découvrir le refus après avoir tout saisi. */

export type Apercu = {
  count: number | null;
  targeted: number;
  withoutConsent: number | null;
  plafond: number;
  depassement: boolean;
};

export function ApercuAudience({ apercu }: { apercu: Apercu }) {
  if (apercu.depassement) {
    return (
      <Card>
        <p className="font-titre text-base font-semibold text-encre">
          Ciblage trop large
        </p>
        <p className="mt-1 text-sm text-ardoise">
          Ce ciblage touche <strong>{apercu.targeted} agriculteurs</strong>, au-delà
          des {apercu.plafond} dont le consentement peut être vérifié en une seule
          opération. La publication serait refusée.
        </p>
        <p className="mt-2 text-sm text-encre">
          Resserrez le ciblage, par zone ou par culture, puis publiez en plusieurs
          alertes.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Agriculteurs ciblés" value={apercu.targeted} />
      <StatCard
        label="Joignables"
        value={apercu.count ?? 0}
        tone="positif"
        hint="Consentement en cours de validité"
      />
      <StatCard
        label="Sans consentement"
        value={apercu.withoutConsent ?? 0}
        tone={(apercu.withoutConsent ?? 0) > 0 ? "attention" : "neutre"}
        hint="Exclus de la diffusion, l'opt-in est obligatoire"
      />
    </div>
  );
}
