import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Card,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui";
import {
  libelleCultures,
  libelleLangue,
  libelleZones,
} from "~/features/farmers/roster";

export type Outil = "meteo" | "connaissance" | "agriculteur";

export type Provenance = {
  authority?: string;
  version?: string;
  title?: string;
  dataOrigin?: string;
};

export type Resultat =
  | { genre: "ok"; outil: Outil; donnees: unknown; provenance: Provenance[] }
  | { genre: "abstention"; raison: string }
  | { genre: "erreur"; message: string };


export function OutilResultat({ resultat }: { resultat: Resultat }) {
  if (resultat.genre === "abstention") {
    return (
      <Alert>
        <AlertIcon />
        <div>
          <div className="mb-1">
            <Badge variant="attention">Abstention</Badge>
          </div>
          <AlertTitle>L'outil a refusé de répondre</AlertTitle>
          <AlertDescription>{resultat.raison}</AlertDescription>
          <p className="mt-3 text-xs text-ardoise">
            Ce n'est pas une panne. Aucune source ne couvrait la demande, et WOURI
            préfère se taire plutôt qu'inventer.
          </p>
        </div>
      </Alert>
    );
  }

  if (resultat.genre === "erreur") {
    return (
      <Alert>
        <AlertIcon />
        <div>
          <div className="mb-1">
            <Badge variant="critique">Échec</Badge>
          </div>
          <AlertTitle>L'outil n'a pas pu s'exécuter</AlertTitle>
          <AlertDescription>{resultat.message}</AlertDescription>
        </div>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Badge variant="positif">Réponse</Badge>
          <p className="font-titre text-sm font-semibold text-encre">L'outil a répondu</p>
        </div>
        {resultat.outil === "meteo" ? (
          <MeteoLecture donnees={resultat.donnees} />
        ) : resultat.outil === "connaissance" ? (
          <PassagesLecture donnees={resultat.donnees} />
        ) : (
          <ProfilLecture donnees={resultat.donnees} />
        )}
      </Card>
      <ProvenanceLecture items={resultat.provenance} />
    </div>
  );
}

function MeteoLecture({ donnees }: { donnees: unknown }) {
  const bulletin = asRecord(donnees);
  const variables = bulletin?.variables;
  const paires = pairesVariables(variables);
  return (
    <div className="space-y-4">
      <Champ label="Zone" valeur={texte(bulletin?.zoneId) || "Zone non précisée"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ
          label="Valide depuis"
          valeur={dateHeure(bulletin?.validFrom)}
          tabular
        />
        <Champ
          label="Valide jusqu'au"
          valeur={dateHeure(bulletin?.validUntil)}
          tabular
        />
      </div>
      <Champ label="Origine" valeur={libelleOrigine(texte(bulletin?.dataOrigin))} />
      {paires.length > 0 ? (
        <div>
          <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
            Observations
          </p>
          <dl className="mt-2 grid gap-2 sm:grid-cols-3">
            {paires.map(([cle, valeur]) => (
              <div key={cle} className="rounded-lg bg-papier p-3">
                <dt className="font-titre text-[11px] font-semibold text-ardoise">{cle}</dt>
                <dd className="mt-1 text-sm tabular-nums text-encre">{valeur}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="text-sm text-ardoise">Aucune variable lisible dans ce bulletin.</p>
      )}
    </div>
  );
}

function PassagesLecture({ donnees }: { donnees: unknown }) {
  const record = asRecord(donnees);
  const passages = Array.isArray(record?.passages) ? record.passages : [];
  if (passages.length === 0) {
    return <p className="text-sm text-ardoise">Aucun passage renvoyé.</p>;
  }
  return (
    <Table>
      <TableCaption>Passages citables</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Passage</TableHead>
          <TableHead>Pertinence</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {passages.map((item, index) => {
          const passage = asRecord(item);
          const textePassage = texte(passage?.text) || "Passage vide";
          const score = typeof passage?.score === "number" ? Math.round(passage.score * 100) : null;
          return (
            <TableRow key={index}>
              <TableCell>
                <p className="max-w-xl text-sm text-pretty text-encre">{textePassage}</p>
              </TableCell>
              <TableCell className="tabular-nums text-ardoise">
                {score === null ? "Non notée" : score + " %"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ProfilLecture({ donnees }: { donnees: unknown }) {
  const profil = asRecord(donnees);
  const zones = Array.isArray(profil?.zoneIds) ? profil.zoneIds.map(String) : [];
  const cultures = Array.isArray(profil?.cropCodes) ? profil.cropCodes.map(String) : [];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Champ label="Langue" valeur={libelleLangue(texte(profil?.preferredLanguage) || null)} />
      <Champ label="Zones" valeur={libelleZones(zones)} />
      <Champ label="Cultures" valeur={libelleCultures(cultures)} />
      <Champ
        label="Statut"
        valeur={texte(profil?.status) === "archived" ? "Archivé" : "Actif"}
      />
      <Champ
        label="Notifications"
        valeur={
          profil?.notificationOptIn === true
            ? "Peut recevoir les alertes"
            : "Hors diffusion"
        }
      />
    </div>
  );
}

function ProvenanceLecture({ items }: { items: Provenance[] }) {
  const lisibles = items.filter((item) => item.authority || item.title || item.version);
  return (
    <Card>
      <h2 className="font-titre text-xs font-semibold uppercase tracking-wider text-ardoise">
        Provenance
      </h2>
      {lisibles.length === 0 ? (
        <p className="mt-2 text-sm text-pretty text-ardoise">
          Aucune autorité rattachée. Une donnée servie sans source ne devrait pas
          alimenter une réponse institutionnelle.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {lisibles.map((item, index) => (
            <li key={index} className="rounded-lg bg-papier p-3">
              <p className="font-titre text-sm font-semibold text-encre">
                {item.authority ?? item.title ?? "Source"}
              </p>
              <p className="mt-1 text-xs text-ardoise">
                {[item.title && item.authority ? item.title : null, item.version, libelleOrigine(item.dataOrigin)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Champ({
  label,
  valeur,
  tabular,
}: {
  label: string;
  valeur: string;
  tabular?: boolean;
}) {
  return (
    <div>
      <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
        {label}
      </p>
      <p className={"mt-1 text-sm text-encre" + (tabular ? " tabular-nums" : "")}>{valeur}</p>
    </div>
  );
}

export function raisonAbstention(raison: string, outil: Outil): string {
  if (outil === "meteo") {
    return "Aucune observation récente pour cette zone. WOURI se tait plutôt que d'inventer un bulletin.";
  }
  if (outil === "connaissance") {
    return "Aucune source ne couvre cette question assez nettement. WOURI s'abstient plutôt que de répondre sans preuve.";
  }
  return raison;
}

function libelleOrigine(origine?: string): string {
  if (origine === "live") return "Observation live";
  if (origine === "staging_fixture") return "Jeu de démonstration";
  return origine ?? "";
}

function dateHeure(valeur: unknown): string {
  if (typeof valeur !== "number") return "Non renseignée";
  return new Date(valeur).toLocaleString("fr-FR");
}

function asRecord(valeur: unknown): Record<string, unknown> | null {
  if (!valeur || typeof valeur !== "object" || Array.isArray(valeur)) return null;
  return valeur as Record<string, unknown>;
}

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

function pairesVariables(valeur: unknown): Array<[string, string]> {
  const record = asRecord(valeur);
  if (!record) return [];
  return Object.entries(record).map(([cle, contenu]) => [libelleVariable(cle), String(contenu)]);
}

function libelleVariable(cle: string): string {
  if (cle === "rainMm") return "Pluie";
  if (cle === "tempC") return "Température";
  if (cle === "wind") return "Vent";
  return cle;
}

