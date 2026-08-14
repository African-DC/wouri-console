import { createFileRoute } from "@tanstack/react-router";

// Proxy des routes Better Auth vers le deploiement Convex.
//
// Deux pieges evites ici :
// 1. L'URL se lit via import.meta.env : les variables VITE_* sont inlinees au
//    build et donc disponibles au runtime serveur. process.env ne les contient
//    pas sous Nitro, ce qui produirait une URL vide et une 500.
// 2. Le corps est bufferise avec arrayBuffer() : undici exige duplex:"half"
//    pour un body en flux et jette sinon une erreur non geree.
const siteUrl = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;

async function forward(request: Request): Promise<Response> {
  if (!siteUrl) {
    return new Response(
      JSON.stringify({
        error:
          "VITE_CONVEX_SITE_URL est manquante : le proxy d'authentification ne sait pas quoi contacter.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, siteUrl);

  const headers = new Headers(request.headers);
  // L'hote d'origine ne doit pas fuiter vers Convex.
  headers.delete("host");

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const response = await fetch(target, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  // fetch a deja decode le corps : retransmettre content-encoding ferait
  // echouer le navigateur avec ERR_CONTENT_DECODING_FAILED (il tenterait de
  // decompresser du contenu deja decompresse). content-length devient faux pour
  // la meme raison.
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => forward(request),
      POST: ({ request }) => forward(request),
      OPTIONS: ({ request }) => forward(request),
    },
  },
});
