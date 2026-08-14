import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { signIn, signUp } from "~/lib/convex";
import { Button } from "~/components/ui";

// Page publique : aucun provider Convex ici, l'hydratation ne depend d'aucun
// fetch de session.
export const Route = createFileRoute("/")({ component: LoginPage });

function LoginPage() {
  const [mode, setMode] = useState<"connexion" | "creation">("connexion");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result =
        mode === "connexion"
          ? await signIn.email({ email, password, rememberMe: true })
          : await signUp.email({ email, password, name: name || email });
      if (result.error) {
        setError(
          result.error.message ??
            "Connexion impossible. Vérifiez vos identifiants.",
        );
        return;
      }
      // Rechargement volontaire : propage le jeton au client Convex.
      window.location.href = "/console";
    } catch {
      setError("Le service d'authentification est injoignable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-papier px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          {/* Logo principal de la charte, jamais recompose : le fichier fourni
              est utilise tel quel, symbole et mot-symbole ensemble. */}
          <img
            src="/brand/wouri-logo-principal.png"
            alt="WOURI"
            width={509}
            height={441}
            className="h-24 w-auto"
          />
          <p className="mt-3 font-titre text-sm font-medium tracking-[0.18em] text-ardoise">
            Console
          </p>
        </div>

        <div className="rounded-lg border border-gris-clair bg-white p-6 shadow-[0_1px_2px_rgba(16,32,26,0.04)]">
          <h1 className="font-titre text-lg font-semibold text-encre">
            {mode === "connexion" ? "Connexion" : "Créer un compte"}
          </h1>
          <p className="mt-1 text-sm text-ardoise">
            Espace réservé aux organisations partenaires et clientes de WOURI.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "creation" ? (
              <div>
                <label
                  htmlFor="name"
                  className="font-titre text-sm font-medium text-encre"
                >
                  Nom
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="mt-1 h-11 w-full rounded-md border border-gris-clair px-3 text-sm outline-none focus:border-vert"
                />
              </div>
            ) : null}

            <div>
              <label
                htmlFor="email"
                className="font-titre text-sm font-medium text-encre"
              >
                Adresse électronique
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="mt-1 h-11 w-full rounded-md border border-gris-clair px-3 text-sm outline-none focus:border-vert"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="font-titre text-sm font-medium text-encre"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "connexion" ? "current-password" : "new-password"
                }
                className="mt-1 h-11 w-full rounded-md border border-gris-clair px-3 text-sm outline-none focus:border-vert"
              />
              {mode === "creation" ? (
                <p className="mt-1 text-xs text-ardoise">12 caractères minimum.</p>
              ) : null}
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-md bg-[#b3261e]/10 px-3 py-2 text-sm text-[#b3261e]"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" loading={pending} className="w-full">
              {mode === "connexion" ? "Se connecter" : "Créer le compte"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "connexion" ? "creation" : "connexion");
              setError(null);
            }}
            className="mt-4 w-full text-center text-sm text-ardoise underline-offset-4 hover:text-vert hover:underline"
          >
            {mode === "connexion"
              ? "Pas encore de compte ? En créer un"
              : "J'ai déjà un compte"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-ardoise">
          African Digit Consulting · plateforme WOURI
        </p>
      </div>
    </main>
  );
}
