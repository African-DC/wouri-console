import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CAP } from "~/lib/authz/capabilities";
import { useCan, useSession } from "~/lib/authz/session";
import { Card, PageHeader, PermissionDenied } from "~/components/ui";
import {
  OutilForm,
  OutilPicker,
  OutilResultat,
  type Outil,
} from "~/features/tools/inspector";

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

function Inspecteur() {
  const { environment } = useSession();
  const [actif, setActif] = useState<Outil>("meteo");
  const [resultat, setResultat] = useState<Parameters<typeof OutilResultat>[0]["resultat"] | null>(null);

  return (
    <>
      <PageHeader
        title="Outils"
        description={
          "Interroger un outil métier seul, sur " +
          libelleEnvironnement(environment) +
          ", pour savoir s'il répond, s'il s'abstient, et sur quelle source."
        }
      />

      <Card className="mb-4">
        <OutilPicker
          actif={actif}
          onChange={(outil) => {
            setActif(outil);
            setResultat(null);
          }}
        />
      </Card>

      <div className="mb-4">
        <OutilForm
          key={actif}
          actif={actif}
          onResultat={setResultat}
        />
      </div>

      {resultat ? <OutilResultat resultat={resultat} /> : null}
    </>
  );
}

function libelleEnvironnement(environment: string): string {
  if (environment === "production") return "la production";
  if (environment === "staging") return "le staging";
  return environment;
}
