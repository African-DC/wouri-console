import { ConvexReactClient } from "convex/react";
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

// L'URL vient de import.meta.env : les variables VITE_* sont inlinees au build
// et donc disponibles cote serveur comme client. process.env ne les contient pas
// au runtime Nitro.
const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

if (!convexUrl) {
  throw new Error(
    "VITE_CONVEX_URL est manquante. Copier .env.example vers .env.local et renseigner l'URL du deploiement Convex.",
  );
}

export const convex = new ConvexReactClient(convexUrl);

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3001",
  plugins: [convexClient()],
});

export const { signIn, signUp, signOut, useSession: useAuthSession } = authClient;
