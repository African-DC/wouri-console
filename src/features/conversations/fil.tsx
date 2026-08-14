import { usePaginatedQuery } from "convex/react";
import { api } from "@wouri/convex-api";
import { Button, Card, EmptyState, LoadingState } from "~/components/ui";
import { cn } from "~/lib/cn";

const PAGE = 30;

/* §22 — le fil de la conversation. L'inbox affichait le contexte d'une alerte
   sans jamais montrer les messages : on savait pourquoi la conversation avait
   commencé, pas ce qui s'y disait.

   Ce que l'écran ne fait pas : répondre. Écrire à un agriculteur réel depuis un
   outil d'exploitation demande une prise en charge humaine explicite, pas un
   champ de saisie posé au bas d'un panneau de lecture. */
export function FilConversation({ contextId }: { contextId: string }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.conversations.queries.listConversationMessages,
    { contextId: contextId as never },
    { initialNumItems: PAGE },
  );

  if (status === "LoadingFirstPage") return <LoadingState rows={3} />;

  if (results.length === 0) {
    return (
      <EmptyState
        title="Aucun message"
        description="Cette conversation n'a pas encore d'échange. Les messages de l'agriculteur et les réponses de WOURI apparaîtront ici."
      />
    );
  }

  // L'API renvoie du plus récent au plus ancien ; un fil se lit dans l'autre sens.
  const messages = [...results].reverse();

  return (
    <Card className="p-0">
      <h2 className="border-b border-gris-clair px-4 py-3 font-titre text-sm font-semibold uppercase tracking-wider text-ardoise">
        Fil de la conversation
      </h2>

      {status === "CanLoadMore" ? (
        <div className="flex justify-center border-b border-gris-clair p-3">
          <Button variant="ghost" onClick={() => loadMore(PAGE)}>
            Voir les messages précédents
          </Button>
        </div>
      ) : null}

      <ol className="space-y-3 p-4">
        {messages.map((message) => {
          const agriculteur = message.message?.role === "user";
          return (
            <li
              key={message._id}
              className={cn("flex", agriculteur ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-3 text-sm",
                  agriculteur
                    ? "bg-papier text-encre"
                    : "border border-vert/30 bg-vert/5 text-encre",
                )}
              >
                <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  {agriculteur ? "Agriculteur" : "WOURI"}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{texteDe(message)}</p>
                <p className="mt-2 text-[11px] text-ardoise">
                  {new Date(message._creationTime).toLocaleString("fr-FR")}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {status === "LoadingMore" ? <LoadingState rows={1} /> : null}
    </Card>
  );
}

/**
 * Le contenu d'un message peut être une chaîne ou une liste de blocs typés
 * selon le producteur. On ne rend que les blocs de texte : rendre un appel
 * d'outil brut exposerait le fonctionnement interne à un opérateur métier.
 */
function texteDe(message: { text?: string; message?: { content?: unknown } }): string {
  if (typeof message.text === "string" && message.text.trim()) return message.text;
  const contenu = message.message?.content;
  if (typeof contenu === "string") return contenu;
  if (Array.isArray(contenu)) {
    const morceaux = contenu
      .filter(
        (bloc): bloc is { type: "text"; text: string } =>
          typeof bloc === "object" &&
          bloc !== null &&
          (bloc as { type?: unknown }).type === "text" &&
          typeof (bloc as { text?: unknown }).text === "string",
      )
      .map((bloc) => bloc.text);
    if (morceaux.length > 0) return morceaux.join("\n");
  }
  return "(message sans contenu textuel)";
}
