import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RouteErrorComponent } from "./components/error-boundary";
import { NotFound } from "./components/not-found";

// Doit s'appeler getRouter : le point d'entree par defaut de TanStack Start
// appelle entries.routerEntry.getRouter().
export function getRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    // §79-80 : jamais d'ecran blanc ni de trace brute. Toute route qui echoue
    // rend un etat d'erreur explique, avec la reference technique du support.
    defaultErrorComponent: RouteErrorComponent,
    defaultNotFoundComponent: NotFound,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
