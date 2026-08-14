import { useId, type ReactNode } from "react";
import { cn } from "~/lib/cn";

/* Champs de formulaire du design system. L'étiquette est toujours liée au
   contrôle par un identifiant généré : un `placeholder` seul n'est pas une
   étiquette, il disparaît à la saisie et n'est pas lu par un lecteur d'écran. */

const CONTROLE =
  "mt-1 w-full rounded-md border border-gris-clair bg-white px-3 py-2 text-sm text-encre outline-none transition-colors focus:border-vert disabled:bg-papier disabled:text-ardoise";

function Enveloppe({
  id,
  etiquette,
  aide,
  requis,
  children,
}: {
  id: string;
  etiquette: string;
  aide?: string;
  requis?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="font-titre text-sm font-medium text-encre">
        {etiquette}
        {requis ? <span className="text-ardoise"> (requis)</span> : null}
      </label>
      {children}
      {aide ? (
        <p id={`${id}-aide`} className="mt-1 text-xs text-ardoise">
          {aide}
        </p>
      ) : null}
    </div>
  );
}

export function ChampTexte({
  etiquette,
  valeur,
  onChange,
  aide,
  requis,
  desactive,
  monospace,
  placeholder,
}: {
  etiquette: string;
  valeur: string;
  onChange: (valeur: string) => void;
  aide?: string;
  requis?: boolean;
  desactive?: boolean;
  monospace?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Enveloppe id={id} etiquette={etiquette} aide={aide} requis={requis}>
      <input
        id={id}
        type="text"
        value={valeur}
        required={requis}
        disabled={desactive}
        placeholder={placeholder}
        aria-describedby={aide ? `${id}-aide` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(CONTROLE, monospace && "font-mono text-xs")}
      />
    </Enveloppe>
  );
}

export function ChampZone({
  etiquette,
  valeur,
  onChange,
  aide,
  requis,
  lignes = 3,
  desactive,
}: {
  etiquette: string;
  valeur: string;
  onChange: (valeur: string) => void;
  aide?: string;
  requis?: boolean;
  lignes?: number;
  desactive?: boolean;
}) {
  const id = useId();
  return (
    <Enveloppe id={id} etiquette={etiquette} aide={aide} requis={requis}>
      <textarea
        id={id}
        rows={lignes}
        value={valeur}
        required={requis}
        disabled={desactive}
        aria-describedby={aide ? `${id}-aide` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(CONTROLE, "resize-y")}
      />
    </Enveloppe>
  );
}

export function ChampSelection<T extends string>({
  etiquette,
  valeur,
  options,
  onChange,
  aide,
  desactive,
}: {
  etiquette: string;
  valeur: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (valeur: T) => void;
  aide?: string;
  desactive?: boolean;
}) {
  const id = useId();
  return (
    <Enveloppe id={id} etiquette={etiquette} aide={aide}>
      <select
        id={id}
        value={valeur}
        disabled={desactive}
        aria-describedby={aide ? `${id}-aide` : undefined}
        onChange={(event) => onChange(event.target.value as T)}
        className={cn(CONTROLE, "h-10")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Enveloppe>
  );
}

/**
 * Clé normalisée d'une entrée de corpus ou de glossaire : minuscules, sans
 * accent, séparateurs unifiés. Elle sert d'identité stable, donc deux
 * promotions du même terme versionnent la même entrée au lieu d'en créer deux.
 */
// Plage des diacritiques combinants, construite par code plutôt qu'écrite en
// littéral : un littéral dépendrait de l'encodage du fichier.
const DIACRITIQUES = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`,
  "g",
);

export function normaliserCle(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(DIACRITIQUES, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
