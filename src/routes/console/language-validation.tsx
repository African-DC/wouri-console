import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan } from "~/lib/authz/session";
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PermissionDenied,
  StatCard,
} from "~/components/ui";
import { FormulaireSoumission } from "~/features/language/soumission";
import {
  ValidationQueueTable,
  ValidationReviewSheet,
  type CasValidation,
  type StatutValidation,
} from "~/features/language/queue";

export const Route = createFileRoute("/console/language-validation")({
  component: LanguageValidationPage,
});

const FILTRES: Array<{ value: StatutValidation; label: string }> = [
  { value: "needs_review", label: "À relire" },
  { value: "validated", label: "Validées" },
  { value: "rejected", label: "Rejetées" },
  { value: "draft", label: "Brouillons" },
];

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

function ValidationQueue() {
  const [statut, setStatut] = useState<StatutValidation>("needs_review");
  const [apercuId, setApercuId] = useState<string | null>(null);
  const cas = useQuery(api.language.feedback.listFeedback, { limit: 100 });

  const items = (cas ?? []) as CasValidation[];
  const visibles = useMemo(
    () => items.filter((item) => item.status === statut),
    [items, statut],
  );
  const apercu = items.find((item) => item._id === apercuId) ?? null;

  const aRelire = items.filter((item) => item.status === "needs_review").length;
  const validees = items.filter((item) => item.status === "validated").length;
  const rejetees = items.filter((item) => item.status === "rejected").length;

  if (cas === undefined) {
    return (
      <>
        <PageHeader title="Validation linguistique" />
        <LoadingState rows={4} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Validation linguistique"
        description="Relisez une phrase, le problème, puis comparez ce que WOURI a produit et ce que le validateur retient."
      />

      {items.length > 0 ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="À relire"
            value={aRelire}
            tone={aRelire > 0 ? "attention" : "neutre"}
            hint="Parmi les cas chargés"
          />
          <StatCard label="Validées" value={validees} tone="positif" hint="Prêtes à intégrer au corpus" />
          <StatCard
            label="Rejetées"
            value={rejetees}
            tone={rejetees > 0 ? "critique" : "neutre"}
            hint="Conservées dans l'historique"
          />
        </div>
      ) : null}

      <FormulaireSoumission />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
          {FILTRES.map((option) => (
            <Button
              key={option.value}
              variant={statut === option.value ? "primary" : "secondary"}
              aria-pressed={statut === option.value}
              onClick={() => setStatut(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Card>

      {visibles.length === 0 ? (
        <EmptyState
          title="Aucun cas dans cette file"
          description={
            statut === "needs_review"
              ? "Les corrections proposées par les locuteurs-validateurs apparaîtront ici, prêtes à être relues."
              : "Aucun cas ne porte ce statut parmi ceux déjà chargés."
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <ValidationQueueTable
            items={visibles}
            onOpen={(item) => setApercuId(item._id)}
          />
        </Card>
      )}

      <ValidationReviewSheet
        cas={apercu}
        onClose={() => setApercuId(null)}
        onDecide={(decision) => {
          setStatut(decision);
          setApercuId(apercuId);
        }}
      />
    </>
  );
}
