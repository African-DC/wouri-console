import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { useEffect, type ReactNode } from "react";
import { api } from "@wouri/convex-api";
import { convex, authClient } from "~/lib/convex";
import { SessionProvider } from "~/lib/authz/session";
import { ConsoleShell } from "~/components/shell";
import { Card, ErrorState, LoadingState } from "~/components/ui";

// Les providers Convex et Better Auth sont montes ICI et nulle part ailleurs :
// la page publique de connexion ne doit pas dependre d'un fetch de session,
// sinon l'hydratation casse.
export const Route = createFileRoute("/console")({
  component: ConsoleLayout,
  ssr: false,
});

// Le typage generique de createAuthClient ne se reconcilie pas avec la
// signature AuthClient attendue par le provider (variance sur useSession). Le
// contrat runtime est respecte — le plugin convexClient est bien present — et le
// flux complet est verifie en navigateur.
type ProviderAuthClient = Parameters<
  typeof ConvexBetterAuthProvider
>[0]["authClient"];
const providerAuthClient = authClient as unknown as ProviderAuthClient;

function ConsoleLayout() {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={providerAuthClient}>
      <AuthLoading>
        <BootScreen />
      </AuthLoading>
      <Unauthenticated>
        <RedirectToLogin />
      </Unauthenticated>
      <Authenticated>
        <SessionGate>
          <Outlet />
        </SessionGate>
      </Authenticated>
    </ConvexBetterAuthProvider>
  );
}

function BootScreen() {
  return (
    <div className="min-h-screen bg-papier p-6">
      <LoadingState rows={3} />
    </div>
  );
}

function RedirectToLogin() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/", search: { redirect: "/console" } });
  }, [navigate]);
  return <BootScreen />;
}

/**
 * Charge la session metier (organisation, capabilities, perimetres,
 * entitlements, environnement) avant de rendre quoi que ce soit. Tant qu'elle
 * n'est pas la, aucune donnee d'organisation n'est affichee : on ne montre
 * jamais le contexte d'une organisation precedente.
 */
function SessionGate({ children }: { children: ReactNode }) {
  const session = useQuery(api.session.me.me, {});

  if (session === undefined) return <BootScreen />;

  if (session === null) {
    return (
      <div className="min-h-screen bg-papier p-6">
        <Card>
          <ErrorState message="Votre compte n'est rattaché à aucune organisation active. Un administrateur doit vous affecter un rôle." />
        </Card>
      </div>
    );
  }

  return (
    <SessionProvider value={session}>
      <ConsoleShell>{children}</ConsoleShell>
    </SessionProvider>
  );
}
