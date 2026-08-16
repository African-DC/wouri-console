import { useState } from "react";
import { useAction, useConvex, usePaginatedQuery, useQuery } from "convex/react";
import { CloudSun, Library, Play, User } from "lucide-react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan } from "~/lib/authz/session";
import {
  Button,
  Card,
  EmptyState,
  Input,
  LoadingState,
} from "~/components/ui";
import { messageErreur } from "~/components/confirm-dialog";
import {
  libelleCultures,
  titreAgriculteur,
  type FarmerRosterItem,
} from "~/features/farmers/roster";
import {
  OutilResultat,
  raisonAbstention,
  type Outil,
  type Resultat,
} from "~/features/tools/resultat";

export { OutilResultat };
export type { Outil, Resultat };

const OUTILS: Array<{
  cle: Outil;
  nom: string;
  icone: typeof CloudSun;
  aide: string;
}> = [
  {
    cle: "meteo",
    nom: "Météo SODEXAM",
    icone: CloudSun,
    aide: "Lit le dernier bulletin SODEXAM d'une zone. Sans observation récente, l'outil s'abstient : il n'invente jamais un ciel.",
  },
  {
    cle: "connaissance",
    nom: "Conseil source",
    icone: Library,
    aide: "Cherche dans les sources indexées et montre les passages que WOURI pourrait citer, avec leur autorité.",
  },
  {
    cle: "agriculteur",
    nom: "Profil agriculteur",
    icone: User,
    aide: "Lit la langue, la zone, les cultures et le consentement d'un agriculteur de votre organisation.",
  },
];

export function OutilPicker({
  actif,
  onChange,
}: {
  actif: Outil;
  onChange: (outil: Outil) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Choisir un outil">
      {OUTILS.map((option) => {
        const Icone = option.icone;
        return (
          <Button
            key={option.cle}
            variant={actif === option.cle ? "primary" : "secondary"}
            aria-pressed={actif === option.cle}
            onClick={() => onChange(option.cle)}
          >
            <Icone className="h-4 w-4" aria-hidden="true" />
            {option.nom}
          </Button>
        );
      })}
    </div>
  );
}

export function OutilForm({
  actif,
  onResultat,
}: {
  actif: Outil;
  onResultat: (resultat: Resultat | null) => void;
}) {
  const outil = OUTILS.find((item) => item.cle === actif)!;
  const peutLireOrg = useCan(CAP.organizationRead);
  const peutLireAgriculteurs = useCan(CAP.farmersRead);
  const org = useQuery(
    api.organizations.queries.getMyOrganization,
    peutLireOrg ? {} : "skip",
  );
  const farmers = usePaginatedQuery(
    api.farmers.queries.listFarmers,
    peutLireAgriculteurs ? {} : "skip",
    { initialNumItems: 25 },
  );

  const [zone, setZone] = useState("");
  const [question, setQuestion] = useState("");
  const [agriculteurId, setAgriculteurId] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const meteo = useAction(api.tools.getWeather.getWeather);
  const connaissance = useAction(api.tools.searchKnowledge.searchKnowledge);
  const convex = useConvex();

  const zones = org?.defaultZones ?? [];
  const inscrits = (farmers.results ?? []) as FarmerRosterItem[];
  const agriculteur = inscrits.find((item) => item.farmerId === agriculteurId) ?? null;

  const pret =
    actif === "meteo"
      ? Boolean(zone.trim())
      : actif === "connaissance"
        ? Boolean(question.trim())
        : Boolean(agriculteurId);

  async function executer() {
    onResultat(null);
    setEnCours(true);
    try {
      const retour =
        actif === "meteo"
          ? await meteo({ zoneId: zone.trim() })
          : actif === "connaissance"
            ? await connaissance({ query: question.trim(), limit: 5 })
            : await convex.query(api.tools.getFarmerProfile.getFarmerProfile, {
                farmerId: agriculteurId as never,
              });

      onResultat(
        retour.status === "ok"
          ? { genre: "ok", outil: actif, donnees: retour.data, provenance: retour.provenance ?? [] }
          : { genre: "abstention", raison: raisonAbstention(retour.reason, actif) },
      );
    } catch (cause) {
      onResultat({
        genre: "erreur",
        message:
          messageErreur(cause) ??
          "L'outil n'a pas pu être exécuté. Vérifiez la valeur saisie.",
      });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Card>
      <p className="text-sm text-pretty text-ardoise">{outil.aide}</p>

      {actif === "meteo" ? (
        <div className="mt-4 max-w-xl">
          <label htmlFor="zone-outil" className="font-titre text-sm font-medium text-encre">
            Zone
          </label>
          <Input
            id="zone-outil"
            value={zone}
            onChange={(event) => setZone(event.target.value)}
            placeholder="Bouaké"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-ardoise">
            La zone telle qu'elle est rattachée aux agriculteurs, par exemple Bouaké.
          </p>
          {zones.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {zones.map((item) => (
                <Button
                  key={item}
                  variant={zone === item ? "primary" : "secondary"}
                  onClick={() => setZone(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {actif === "connaissance" ? (
        <div className="mt-4 max-w-xl">
          <label htmlFor="question-outil" className="font-titre text-sm font-medium text-encre">
            Question
          </label>
          <Input
            id="question-outil"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Comment planter le maïs à Bouaké ?"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-ardoise">
            Formulez comme un agriculteur le ferait. L'outil ne répond que s'il trouve une source.
          </p>
        </div>
      ) : null}

      {actif === "agriculteur" ? (
        <div className="mt-4">
          {!peutLireAgriculteurs ? (
            <p className="text-sm text-ardoise">
              Votre rôle ne permet pas de consulter les agriculteurs de cette organisation.
            </p>
          ) : farmers.status === "LoadingFirstPage" ? (
            <LoadingState rows={2} />
          ) : inscrits.length === 0 ? (
            <EmptyState
              title="Aucun agriculteur à interroger"
              description="Les profils de votre organisation apparaîtront ici. En production vide, il n'y a personne à lire."
            />
          ) : (
            <div>
              <p className="font-titre text-sm font-medium text-encre">Agriculteur</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {inscrits.map((item) => (
                  <Button
                    key={item.farmerId}
                    variant={agriculteurId === item.farmerId ? "primary" : "secondary"}
                    onClick={() => setAgriculteurId(item.farmerId)}
                  >
                    {titreAgriculteur(item)}
                  </Button>
                ))}
              </div>
              {agriculteur ? (
                <p className="mt-2 text-xs text-ardoise">
                  {libelleCultures(agriculteur.cropCodes)}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-5">
        <Button onClick={() => void executer()} loading={enCours} disabled={!pret || enCours}>
          <Play className="h-4 w-4" aria-hidden="true" />
          Interroger
        </Button>
      </div>
    </Card>
  );
}
