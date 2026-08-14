import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, LogOut, ChevronDown, Search } from "lucide-react";
import { cn } from "~/lib/cn";
import { visibleNavigation } from "~/lib/navigation";
import { ORGANIZATION_KINDS } from "~/lib/authz/capabilities";
import { useSession } from "~/lib/authz/session";
import { signOut } from "~/lib/convex";

/* APP-04 — le shell de la WOURI Console.
   Un seul produit : la barre laterale se compose a partir des capabilities
   renvoyees par le backend, pas d'un type d'organisation code en dur. Le
   bandeau d'environnement evite qu'une action critique soit lancee sur le
   mauvais deploiement. */

function EnvironmentBadge({ environment }: { environment: string }) {
  if (environment === "production") return null;
  const label = environment === "staging" ? "STAGING" : environment.toUpperCase();
  // La charte interdit de poser du texte sur l'orange soleil : le contraste est
  // insuffisant. L'orange sert donc de signal (pastille et bordure) et le texte
  // reste sur l'encre.
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded border border-orange bg-orange/10 px-2 py-1 font-titre text-[10px] font-bold tracking-widest text-encre"
      title="Environnement non productif : les données affichées sont des données de démonstration."
    >
      <span className="h-1.5 w-1.5 rounded-full bg-orange" aria-hidden="true" />
      {label}
    </span>
  );
}

function OrganizationSwitcher() {
  const { organization } = useSession();
  const kind = organization.kind ? ORGANIZATION_KINDS[organization.kind] : null;
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-gris-clair bg-white px-3 py-1.5">
      <div className="min-w-0">
        <p className="truncate font-titre text-sm font-semibold text-encre">
          {organization.legalName ?? organization.id}
        </p>
        {kind ? <p className="truncate text-[11px] text-ardoise">{kind}</p> : null}
      </div>
      {/* Le changement d'organisation passera par la session Better Auth
          (activeOrganizationId) : un seul rattachement pour l'instant. */}
      <ChevronDown className="h-4 w-4 shrink-0 text-ardoise" aria-hidden="true" />
    </div>
  );
}

function UserMenu() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 items-center gap-2 rounded-md px-2 hover:bg-gris-clair/60"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-vert font-titre text-xs font-bold text-white">
          {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm md:block">
          {user.name ?? user.email}
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-56 rounded-md border border-gris-clair bg-white p-1 shadow-lg"
        >
          <p className="truncate px-3 py-2 text-xs text-ardoise">{user.email}</p>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              // Rechargement volontaire : propage la fin de session au client Convex.
              void signOut({
                fetchOptions: {
                  onSuccess: () => {
                    window.location.href = "/";
                  },
                },
              });
            }}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-encre hover:bg-gris-clair/60"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Se déconnecter
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { capabilities } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const groups = visibleNavigation(capabilities);

  return (
    <nav className="flex flex-col gap-6 p-4" aria-label="Navigation principale">
      {groups.map((group) => (
        <div key={group.section}>
          <p className="px-3 pb-2 font-titre text-[10px] font-bold uppercase tracking-widest text-ardoise">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                item.to === "/console"
                  ? pathname === "/console"
                  : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-md px-3 font-titre text-sm font-medium transition-colors",
                      active
                        ? "bg-vert/10 text-vert"
                        : "text-ardoise hover:bg-gris-clair/60 hover:text-encre",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const { environment } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-papier">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gris-clair bg-white px-4">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-md p-2 text-ardoise hover:bg-gris-clair/60 lg:hidden"
          aria-label="Ouvrir la navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <Link to="/console" className="flex items-center gap-2.5" aria-label="WOURI Console, accueil">
          {/* Logo horizontal de la charte, utilise tel quel. */}
          <img
            src="/brand/wouri-logo-horizontal.png"
            alt="WOURI"
            width={942}
            height={235}
            className="h-7 w-auto"
          />
          <span className="hidden border-l border-gris-clair pl-2.5 font-titre text-sm font-medium tracking-wide text-ardoise sm:block">
            Console
          </span>
        </Link>

        <div className="hidden min-w-0 lg:block">
          <OrganizationSwitcher />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <EnvironmentBadge environment={environment} />
          <button
            type="button"
            className="hidden h-10 items-center gap-2 rounded-md border border-gris-clair px-3 text-sm text-ardoise hover:border-vert hover:text-vert md:flex"
            aria-label="Rechercher"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Rechercher
          </button>
          <UserMenu />
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-64 shrink-0 border-r border-gris-clair bg-white lg:block">
          <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <SidebarContent />
          </div>
        </aside>

        {drawerOpen ? (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div
              className="absolute inset-0 bg-encre/40"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white">
              <div className="flex h-16 items-center justify-between border-b border-gris-clair px-4">
                <img src="/brand/wouri-logo-horizontal.png" alt="WOURI" className="h-6 w-auto" />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-md p-2 text-ardoise hover:bg-gris-clair/60"
                  aria-label="Fermer la navigation"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="border-b border-gris-clair p-4">
                <OrganizationSwitcher />
              </div>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
