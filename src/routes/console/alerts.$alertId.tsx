import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Send } from "lucide-react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan } from "~/lib/authz/session";
import {
  Card,
  LoadingState,
  PageHeader,
  PermissionDenied,
  StatCard,
  StatusBadge,
  Button,
  EmptyState,
} from "~/components/ui";
import { ConfirmDialog, useConfirmation } from "~/components/confirm-dialog";
import { LIBELLES_STATUT, LIBELLES_CIBLAGE } from "~/features/alerts/libelles";
import { EntonnoirDiffusion } from "~/features/alerts/entonnoir";

export const Route = createFileRoute("/console/alerts/$alertId")({
  component: AlertDetailPage,
});

function AlertDetailPage() {
  const { alertId } = Route.useParams();
  if (!useCan(CAP.alertsRead)) {
    return (
      <>
        <PageHeader title="Alerte" />
        <PermissionDenied what="les alertes de cette organisation" />
      </>
    );
  }
  return <AlertDetail alertId={alertId} />;
}

/* §19-20 — la fiche montre chaque étape du cycle de vie : rédaction, ciblage,
   audience réelle, diffusion, réponses. Publier est irréversible : le message
   part vers des téléphones et ne peut pas être rappelé. La confirmation dit donc
   combien d'agriculteurs sont concernés, calculé par la même résolution
   d'audience que la publication elle-même. */
function AlertDetail({ alertId }: { alertId: string }) {
  const detail = useQuery(api.alerts.queries.getAlert, {
    alertId: alertId as never,
  });
  const publier = useMutation(api.alerts.mutations.publishAlert);
  const peutPublier = useCan(CAP.alertsPublish);
  const confirmation = useConfirmation<true>();

  const regles = detail?.rules ?? [];
  const apercu = useQuery(
    api.alerts.queries.previewAudience,
    peutPublier && regles.length > 0
      ? { rules: regles.map((r) => ({ kind: r.kind, targetKey: r.targetKey })) }
      : "skip",
  );

  if (detail === undefined) {
    return (
      <>
        <PageHeader title="Alerte" />
        <LoadingState rows={4} />
      </>
    );
  }

  if (detail === null) {
    return (
      <>
        <PageHeader title="Alerte" />
        <EmptyState
          title="Alerte introuvable"
          description="Cette alerte n'existe pas, ou elle appartient à une autre organisation."
          action={<Lien />}
        />
      </>
    );
  }

  const { alert, deliverySummary } = detail;
  const statut = LIBELLES_STATUT[alert.status] ?? { label: alert.status, tone: "neutre" as const };
  const publiable = alert.status === "draft" || alert.status === "scheduled";

  return (
    <>
      <div className="mb-4">
        <Lien />
      </div>

      <PageHeader
        title="Alerte"
        description={new Date(alert.createdAt).toLocaleString("fr-FR")}
        actions={<StatusBadge tone={statut.tone}>{statut.label}</StatusBadge>}
      />

      <Card className="mb-6">
        <h2 className="font-titre text-xs font-semibold uppercase tracking-wider text-ardoise">
          Message diffusé
        </h2>
        <p className="mt-2 text-base text-encre">{alert.message}</p>
        <p className="mt-3 text-xs text-ardoise">
          {alert.sourceVersionId
            ? "Rattachée à une version de source : la provenance est traçable."
            : "Aucune source rattachée. Une alerte institutionnelle devrait en porter une."}
        </p>
      </Card>

      <section className="mb-6" aria-labelledby="ciblage">
        <h2
          id="ciblage"
          className="mb-3 font-titre text-sm font-semibold uppercase tracking-wider text-ardoise"
        >
          Ciblage
        </h2>
        {regles.length === 0 ? (
          <EmptyState
            title="Aucune règle de ciblage"
            description="Sans règle, l'audience est vide et la publication ne toucherait personne."
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {regles.map((regle) => (
              <span
                key={regle._id}
                className="inline-flex items-center gap-2 rounded-md border border-gris-clair bg-white px-3 py-2 text-sm"
              >
                <span className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  {LIBELLES_CIBLAGE[regle.kind] ?? regle.kind}
                </span>
                <span className="font-mono text-xs text-encre">{regle.targetKey}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {peutPublier && regles.length > 0 ? (
        <section className="mb-6" aria-labelledby="audience">
          <h2
            id="audience"
            className="mb-3 font-titre text-sm font-semibold uppercase tracking-wider text-ardoise"
          >
            Audience
          </h2>
          {apercu === undefined ? (
            <LoadingState rows={1} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Agriculteurs ciblés" value={apercu.targeted} />
              <StatCard
                label="Joignables"
                value={apercu.count}
                tone="positif"
                hint="Consentement en cours de validité"
              />
              <StatCard
                label="Sans consentement"
                value={apercu.withoutConsent}
                tone={apercu.withoutConsent > 0 ? "attention" : "neutre"}
                hint="Exclus de la diffusion, l'opt-in est obligatoire"
              />
            </div>
          )}
        </section>
      ) : null}

      <section className="mb-6" aria-labelledby="diffusion">
        <h2
          id="diffusion"
          className="mb-3 font-titre text-sm font-semibold uppercase tracking-wider text-ardoise"
        >
          Diffusion
        </h2>
        <EntonnoirDiffusion resume={deliverySummary} />
      </section>

      {peutPublier ? (
        publiable ? (
          <Card>
            <h2 className="font-titre text-base font-semibold text-encre">
              Publier cette alerte
            </h2>
            <p className="mt-1 text-sm text-ardoise">
              La publication crée une livraison par agriculteur joignable. Une
              fois partie, une alerte ne se rappelle pas.
            </p>
            <div className="mt-4">
              <Button
                onClick={() => confirmation.demander(true)}
                disabled={regles.length === 0 || apercu?.count === 0}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Publier
              </Button>
            </div>
            {regles.length === 0 ? (
              <p className="mt-2 text-xs text-ardoise">
                Ajoutez au moins une règle de ciblage avant de publier.
              </p>
            ) : apercu?.count === 0 ? (
              <p className="mt-2 text-xs text-ardoise">
                Aucun agriculteur joignable : le ciblage ne trouve personne, ou
                aucune des personnes trouvées n'a donné son consentement.
              </p>
            ) : null}
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-ardoise">
              Cette alerte est {statut.label.toLowerCase()}. Seule une alerte en
              brouillon ou programmée peut être publiée.
            </p>
          </Card>
        )
      ) : null}

      <ConfirmDialog
        ouvert={confirmation.ouvert}
        titre="Publier cette alerte"
        danger
        details={{
          effet:
            "Le message part vers les agriculteurs joignables. Une livraison est créée pour chacun.",
          concerne: `${apercu?.count ?? 0} agriculteurs joignables sur ${apercu?.targeted ?? 0} ciblés.`,
          portee: alert.message.slice(0, 120),
          reversible:
            "Non. Une alerte publiée ne peut pas être rappelée. Vérifiez le message et le ciblage avant de confirmer.",
        }}
        libelleConfirmation="Publier maintenant"
        enCours={confirmation.enCours}
        erreur={confirmation.erreur}
        onAnnuler={confirmation.annuler}
        onConfirmer={() =>
          void confirmation.executer(
            async () => {
              await publier({ alertId: alertId as never });
            },
            "La publication a échoué. L'alerte reste en brouillon, aucune livraison n'a été créée.",
          )
        }
      />
    </>
  );
}

function Lien() {
  return (
    <Link
      to="/console/alerts"
      className="inline-flex items-center gap-2 text-sm font-medium text-ardoise hover:text-vert"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Toutes les alertes
    </Link>
  );
}
