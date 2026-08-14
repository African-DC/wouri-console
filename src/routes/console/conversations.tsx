import { createFileRoute } from "@tanstack/react-router";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { Bell } from "lucide-react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan } from "~/lib/authz/session";
import { cn } from "~/lib/cn";
import { FilConversation } from "~/features/conversations/fil";
import {
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PermissionDenied,
  StatusBadge,
} from "~/components/ui";

export const Route = createFileRoute("/console/conversations")({
  component: ConversationsPage,
});

const LANGUAGE_LABELS: Record<string, string> = {
  dyu: "Dioula",
  bci: "Baoulé",
  fr: "Français",
};

function ConversationsPage() {
  if (!useCan(CAP.alertsRead)) {
    return (
      <>
        <PageHeader title="Conversations" />
        <PermissionDenied what="les conversations de cette organisation" />
      </>
    );
  }
  return <ConversationsInbox />;
}

/* Boîte de réception à trois panneaux : la liste, le fil, et surtout le
   contexte — c'est lui qui montre qu'une réponse retrouve l'alerte d'origine
   sans que l'agriculteur ait à la répéter. */
function ConversationsInbox() {
  const [selected, setSelected] = useState<string | null>(null);
  const { results, status } = usePaginatedQuery(
    api.conversations.queries.listConversations,
    {},
    { initialNumItems: 30 },
  );

  if (status === "LoadingFirstPage") {
    return (
      <>
        <PageHeader title="Conversations" />
        <LoadingState rows={4} />
      </>
    );
  }

  if (results.length === 0) {
    return (
      <>
        <PageHeader title="Conversations" />
        <EmptyState
          title="Aucune conversation"
          description="Les échanges des agriculteurs avec WOURI apparaîtront ici, avec l'alerte qui les a déclenchés le cas échéant."
        />
      </>
    );
  }

  const active = selected ?? results[0]?.id ?? null;

  return (
    <>
      <PageHeader
        title="Conversations"
        description="Échanges des agriculteurs, avec le contexte qui les a ouverts."
      />
      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <Card className="max-h-[34rem] overflow-y-auto p-0">
          <ul>
            {results.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => setSelected(conversation.id)}
                  aria-current={conversation.id === active ? "true" : undefined}
                  className={cn(
                    "w-full border-b border-gris-clair px-4 py-3 text-left last:border-0 hover:bg-papier",
                    conversation.id === active && "bg-vert/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-titre text-sm font-semibold text-encre">
                      {LANGUAGE_LABELS[conversation.preferredLanguage] ??
                        conversation.preferredLanguage}
                    </span>
                    <StatusBadge tone={conversation.status === "open" ? "positif" : "neutre"}>
                      {conversation.status === "open" ? "Ouverte" : "Close"}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ardoise">
                    {conversation.originAlertId ? (
                      <>
                        <Bell className="h-3 w-3" aria-hidden="true" />
                        Ouverte par une alerte
                      </>
                    ) : (
                      <>Canal {conversation.channel}</>
                    )}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {active ? (
          <div className="space-y-4">
            <FilConversation key={active} contextId={active} />
            <ConversationContext contextId={active} />
          </div>
        ) : null}
      </div>
    </>
  );
}

/** Panneau de contexte : l'alerte d'origine, sa source, sa zone et sa date. */
function ConversationContext({ contextId }: { contextId: string }) {
  const context = useQuery(api.conversations.queries.getConversationContext, {
    contextId: contextId as never,
  });

  if (context === undefined) return <LoadingState rows={3} />;

  if (context === null) {
    return (
      <EmptyState
        title="Conversation sans alerte d'origine"
        description="Cette conversation n'a pas été déclenchée par une alerte : elle a démarré à l'initiative de l'agriculteur."
      />
    );
  }

  return (
    <Card>
      <h2 className="font-titre text-sm font-semibold uppercase tracking-wider text-ardoise">
        Contexte de la conversation
      </h2>

      <div className="mt-4 rounded-md border border-gris-clair bg-papier p-4">
        <p className="flex items-center gap-2 font-titre text-xs font-semibold uppercase tracking-wider text-vert">
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          Ouverte par une alerte
        </p>
        <p className="mt-2 text-encre">{context.alert.message}</p>
        <p className="mt-2 text-xs text-ardoise">
          Publiée le{" "}
          {new Date(context.alert.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="font-titre text-xs font-semibold uppercase tracking-wider text-ardoise">
            Zones ciblées
          </dt>
          <dd className="mt-1 text-sm text-encre">
            {context.zones.length > 0 ? context.zones.join(", ") : "—"}
          </dd>
        </div>
        <div>
          <dt className="font-titre text-xs font-semibold uppercase tracking-wider text-ardoise">
            Source de l'information
          </dt>
          <dd className="mt-1 text-sm text-encre">
            {context.provenance?.source?.authority ?? "Non sourcée"}
            {context.provenance?.version?.version ? (
              <span className="text-ardoise">
                {" · version "}
                {context.provenance.version.version}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      <p className="mt-4 border-t border-gris-clair pt-4 text-xs text-ardoise">
        L'agriculteur peut répondre sans répéter l'alerte : le contexte est
        reconstruit automatiquement à partir de son identifiant d'origine.
      </p>
    </Card>
  );
}
