import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAction, useConvex } from "convex/react";
import { CloudSun, Search, User, Play } from "lucide-react";
import { api } from "@wouri/convex-api";
import { CAP } from "~/lib/authz/capabilities";
import { useCan, useSession } from "~/lib/authz/session";
import { cn } from "~/lib/cn";
import {
  Button,
  Card,
  PageHeader,
  PermissionDenied,
  StatusBadge,
} from "~/components/ui";
import { ChampTexte } from "~/components/form";
import { messageErreur } from "~/components/confirm-dialog";

export const Route = createFileRoute("/console/tools")({ component: ToolsPage });

function ToolsPage() {
  if (!useCan(CAP.aiopsRead)) {
    return (
      <>
        <PageHeader title="Outils" />
        <PermissionDenied what="les outils métier de la plateforme" />
      </>
    );
  }
  return <Inspecteur />;
}

type Outil = "meteo" | "connaissance" | "agriculteur";

type Resultat =
  | { genre: "ok"; donnees: unknown; provenance: unknown[] }
  | { genre: "abstention"; raison: string }
  | { genre: "erreur"; message: string };

const OUTILS: Array<{
  cle: Outil;
  nom: string;
  fonction: string;
  icone: typeof CloudSun;
  aide: string;
  champ: { etiquette: string; exemple: string; aide: string };
}> = [
  {
    cle: "meteo",
    nom: "Météo",
    fonction: "getWeather",
    icone: CloudSun,
    aide: "Lit une observation SODEXAM pour une zone. N'invente jamais un bulletin : sans observation fraîche, l'outil s'abstient.",
    champ: {
      etiquette: "Identifiant de zone",
      exemple: "abidjan-nord",
      aide: "La zone telle qu'elle est enregistrée dans les rattachements d'agriculteurs.",
    },
  },
  {
    cle: "connaissance",
    nom: "Connaissance",
    fonction: "searchKnowledge",
    icone: Search,
    aide: "Recherche dans les sources indexées et renvoie les passages utilisés, avec leur provenance.",
    champ: {
      etiquette: "Question",
      exemple: "Quand traiter le cacao contre la pourriture brune ?",
      aide: "Formulez comme un agriculteur le ferait.",
    },
  },
  {
    cle: "agriculteur",
    nom: "Profil agriculteur",
    fonction: "getFarmerProfile",
    icone: User,
    aide: "Renvoie langue, zones, cultures et consentement d'un agriculteur de votre organisation.",
    champ: {
      etiquette: "Identifiant d'agriculteur",
      exemple: "",
      aide: "Copiez-le depuis l'adresse d'une fiche agriculteur.",
    },
  },
];

/* §35 — inspecteur d'outils. Le pipeline appelle ces trois outils, et jusqu'ici
   personne ne pouvait les exécuter seuls : quand une réponse était mauvaise, on
   ne savait pas si le problème venait de l'outil ou de ce qui l'entoure.

   L'écran rend surtout visible l'abstention. Un outil qui répond
   « insufficient_evidence » n'est pas en panne : c'est le garde-fou
   anti-hallucination qui fonctionne, et c'est la preuve attendue par la porte
   G07. L'écran le dit explicitement plutôt que de l'afficher comme une erreur. */
function Inspecteur() {
  const { environment } = useSession();
  const [actif, setActif] = useState<Outil>("meteo");
  const [entree, setEntree] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);

  const meteo = useAction(api.tools.getWeather.getWeather);
  const connaissance = useAction(api.tools.searchKnowledge.searchKnowledge);
  // getFarmerProfile est une requête, pas une action : on l'appelle
  // impérativement plutôt que par abonnement, l'écran exécutant à la demande.
  const convex = useConvex();

  const outil = OUTILS.find((o) => o.cle === actif)!;

  async function executer() {
    setResultat(null);
    setEnCours(true);
    try {
      const valeur = entree.trim();
      const retour =
        actif === "meteo"
          ? await meteo({ zoneId: valeur })
          : actif === "connaissance"
            ? await connaissance({ query: valeur, limit: 5 })
            : await convex.query(api.tools.getFarmerProfile.getFarmerProfile, {
                farmerId: valeur as never,
              });

      setResultat(
        retour.status === "ok"
          ? { genre: "ok", donnees: retour.data, provenance: retour.provenance }
          : { genre: "abstention", raison: retour.reason },
      );
    } catch (cause) {
      setResultat({
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
    <>
      <PageHeader
        title="Outils"
        description={`Exécuter un outil métier seul, sur ${environment}, pour savoir s'il répond, s'il s'abstient, et sur quelle source.`}
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Choisir un outil">
        {OUTILS.map((option) => {
          const Icone = option.icone;
          return (
            <button
              key={option.cle}
              type="button"
              aria-pressed={actif === option.cle}
              onClick={() => {
                setActif(option.cle);
                setEntree("");
                setResultat(null);
              }}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-md border px-4 font-titre text-sm font-medium transition-colors",
                actif === option.cle
                  ? "border-vert bg-vert/10 text-vert"
                  : "border-gris-clair bg-white text-ardoise hover:border-vert hover:text-vert",
              )}
            >
              <Icone className="h-4 w-4" aria-hidden="true" />
              {option.nom}
            </button>
          );
        })}
      </div>

      <Card className="mb-4">
        <p className="font-mono text-xs text-ardoise">{outil.fonction}</p>
        <p className="mt-1 text-sm text-ardoise">{outil.aide}</p>

        <div className="mt-4 max-w-xl">
          <ChampTexte
            etiquette={outil.champ.etiquette}
            valeur={entree}
            onChange={setEntree}
            placeholder={outil.champ.exemple}
            aide={outil.champ.aide}
            requis
          />
        </div>

        <div className="mt-4">
          <Button onClick={() => void executer()} loading={enCours} disabled={!entree.trim() || enCours}>
            <Play className="h-4 w-4" aria-hidden="true" />
            Exécuter
          </Button>
        </div>
      </Card>

      {resultat ? <Reponse resultat={resultat} /> : null}
    </>
  );
}

function Reponse({ resultat }: { resultat: Resultat }) {
  if (resultat.genre === "abstention") {
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="attention">Abstention</StatusBadge>
          <p className="font-titre text-sm font-semibold text-encre">
            L'outil a refusé de répondre
          </p>
        </div>
        <p className="mt-2 text-sm text-encre">{resultat.raison}</p>
        <p className="mt-3 border-t border-gris-clair pt-3 text-xs text-ardoise">
          Ce n'est pas une panne. Aucune source ne couvrait la demande, et WOURI
          préfère se taire plutôt qu'inventer. C'est le comportement attendu par
          la porte G07.
        </p>
      </Card>
    );
  }

  if (resultat.genre === "erreur") {
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="critique">Échec</StatusBadge>
          <p className="font-titre text-sm font-semibold text-encre">
            L'outil n'a pas pu s'exécuter
          </p>
        </div>
        <p className="mt-2 text-sm text-encre">{resultat.message}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="positif">Réponse</StatusBadge>
          <p className="font-titre text-sm font-semibold text-encre">
            L'outil a répondu
          </p>
        </div>
        <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-papier p-3 text-xs text-encre">
          {JSON.stringify(resultat.donnees, null, 2)}
        </pre>
      </Card>

      <Card>
        <h2 className="font-titre text-xs font-semibold uppercase tracking-wider text-ardoise">
          Provenance
        </h2>
        {resultat.provenance.length === 0 ? (
          <p className="mt-2 text-sm text-ardoise">
            Aucune provenance rattachée. Une donnée servie sans source ne devrait
            pas alimenter une réponse institutionnelle.
          </p>
        ) : (
          <pre className="mt-2 max-h-60 overflow-auto rounded-md bg-papier p-3 text-xs text-encre">
            {JSON.stringify(resultat.provenance, null, 2)}
          </pre>
        )}
      </Card>
    </div>
  );
}
