import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: { port: 3001 },
  plugins: [
    viteTsConfigPaths(),
    tailwindcss(),
    // ORDRE IMPORTANT : tanstackStart puis nitro puis viteReact.
    // nitro() fournit le runtime serveur ; sans lui, le dev SSR renvoie 404 sur
    // toutes les routes et le build sort dans dist/ au lieu de .output/server/.
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
  // Convex et Better Auth doivent etre bundles cote SSR.
  ssr: {
    noExternal: ["convex", "@convex-dev/better-auth", "@convex-dev/react-query"],
  },
  resolve: {
    // Une seule copie de React : evite deux copies a l hydratation sous pnpm.
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    alias: {
      "@wouri/convex-api": path.resolve(rootDir, "src/generated/convex-api.js"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "@tanstack/react-router",
      "convex/react",
    ],
  },
});
