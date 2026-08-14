import { createContext, useContext, type ReactNode } from "react";
import type { Capability } from "./capabilities";

// Forme renvoyee par la query backend `session/me`.
export type Scope = { type: "zone" | "crop" | "group"; key: string; expiresAt?: number };

export type SessionContextValue = {
  user: { subject: string | null; name: string | null; email: string | null };
  membership: { memberId: string; rolePolicyId: string };
  organization: {
    id: string;
    kind: string | null;
    legalName: string | null;
    status: string | null;
  };
  capabilities: string[];
  scopes: Scope[];
  entitlements: Array<{ key: string; enabled: boolean; limit?: number }>;
  environment: string;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  value,
  children,
}: {
  value: SessionContextValue;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error(
      "useSession doit être utilisé à l'intérieur de la console authentifiée.",
    );
  }
  return session;
}

export function useCurrentOrganization() {
  return useSession().organization;
}

export function useCapabilities(): string[] {
  return useSession().capabilities;
}

/**
 * Le droit d'AFFICHER quelque chose. Ce n'est pas l'autorisation : chaque
 * fonction sensible du backend revalide de son cote. Masquer une action que
 * l'utilisateur n'a pas evite de lui proposer un echec.
 */
export function useCan(capability: Capability): boolean {
  return useCapabilities().includes(capability);
}

export function useEntitlement(key: string) {
  return useSession().entitlements.find((e) => e.key === key) ?? null;
}

/** Perimetres accordes d'un type donne (zone, culture, groupe). */
export function useScopes(type: Scope["type"]): Scope[] {
  return useSession().scopes.filter((scope) => scope.type === type);
}

/**
 * Rend ses enfants seulement si la capability est presente.
 * `fallback` permet d'expliquer l'absence plutot que de laisser un vide.
 */
export function Can({
  capability,
  children,
  fallback = null,
}: {
  capability: Capability;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useCan(capability) ? <>{children}</> : <>{fallback}</>;
}
