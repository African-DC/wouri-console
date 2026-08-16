import {
  Avatar,
  AvatarFallback,
  Badge,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  QuotaBar,
} from "~/components/ui";
import { ORGANIZATION_KINDS } from "~/lib/authz/capabilities";

export type OrganizationRosterItem = {
  organizationId: string;
  kind: string | null;
  legalName: string | null;
  status: "provisioning" | "active" | "suspended";
  agriculteurs: number;
  agriculteursPlafonnes: boolean;
  maxFarmers: number | null;
  whatsappEnabled: boolean;
};

export function roleOrganisation(kind: string | null): string {
  if (!kind) return "Organisation";
  return ORGANIZATION_KINDS[kind] ?? kind;
}

export function titreOrganisation(item: OrganizationRosterItem): string {
  if (item.legalName && !ressembleId(item.legalName)) return item.legalName;
  return roleOrganisation(item.kind);
}

function ressembleId(valeur: string): boolean {
  return /^[a-z0-9]{20,}$/i.test(valeur) || valeur.startsWith("k57") || valeur.includes(":");
}

function initiales(item: OrganizationRosterItem): string {
  const titre = titreOrganisation(item);
  const parts = titre
    .replace(/[^A-Za-z0-9 À-ſ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return titre.slice(0, 2).toUpperCase();
}

function badgeStatut(status: OrganizationRosterItem["status"]) {
  if (status === "active") return <Badge variant="positif">Active</Badge>;
  if (status === "suspended") return <Badge variant="critique">Suspendue</Badge>;
  return <Badge variant="attention">En provisionnement</Badge>;
}

export function occupation(item: OrganizationRosterItem): string {
  const compte = item.agriculteurs + (item.agriculteursPlafonnes ? "+" : "");
  if (item.maxFarmers) return compte + " / " + item.maxFarmers;
  if (item.agriculteurs === 0) return "Aucun agriculteur inscrit";
  return compte + " inscrits";
}

export function OrganizationRosterTable({
  items,
  onOpen,
}: {
  items: OrganizationRosterItem[];
  onOpen: (item: OrganizationRosterItem) => void;
}) {
  return (
    <Table>
      <TableCaption>Partenaires et clients de la plateforme</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Organisation</TableHead>
          <TableHead>Rôle</TableHead>
          <TableHead>Agriculteurs</TableHead>
          <TableHead>WhatsApp</TableHead>
          <TableHead>Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.organizationId}>
            <TableCell>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="flex min-h-11 items-center gap-3 text-left transition-colors hover:text-vert active:scale-[0.96]"
              >
                <Avatar>
                  <AvatarFallback>{initiales(item)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block font-titre text-sm font-semibold text-encre">
                    {titreOrganisation(item)}
                  </span>
                  <span className="mt-0.5 block text-xs text-ardoise">
                    {occupation(item)}
                  </span>
                </span>
              </button>
            </TableCell>
            <TableCell className="text-ardoise">{roleOrganisation(item.kind)}</TableCell>
            <TableCell className="tabular-nums text-encre">
              {item.agriculteurs}
              {item.agriculteursPlafonnes ? "+" : ""}
              {item.maxFarmers ? (
                <span className="text-ardoise"> / {item.maxFarmers}</span>
              ) : null}
            </TableCell>
            <TableCell>
              <Badge variant={item.whatsappEnabled ? "positif" : "default"}>
                {item.whatsappEnabled ? "Ouvert" : "Fermé"}
              </Badge>
            </TableCell>
            <TableCell>{badgeStatut(item.status)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function OrganizationPreviewSheet({
  item,
  onClose,
}: {
  item: OrganizationRosterItem | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent>
        {item ? (
          <>
            <SheetHeader>
              <SheetTitle>{titreOrganisation(item)}</SheetTitle>
              <SheetDescription>
                {roleOrganisation(item.kind)}. WOURI isole les agriculteurs et les sources de chaque partenaire.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5 p-5">
              <div>
                <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  Statut
                </p>
                <div className="mt-2">{badgeStatut(item.status)}</div>
              </div>
              <div>
                <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  WhatsApp
                </p>
                <p className="mt-1 text-sm text-encre">
                  {item.whatsappEnabled
                    ? "Les alertes WhatsApp peuvent partir pour cette organisation."
                    : "WhatsApp n'est pas ouvert sur ce plan."}
                </p>
              </div>
              <div>
                <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  Agriculteurs
                </p>
                {item.maxFarmers ? (
                  <div className="mt-2">
                    <QuotaBar
                      used={item.agriculteurs}
                      limit={item.maxFarmers}
                      label="Places occupées"
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-sm tabular-nums text-encre">{occupation(item)}</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
