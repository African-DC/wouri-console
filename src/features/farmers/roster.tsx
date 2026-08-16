import { Link } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
} from "~/components/ui";

export type FarmerRosterItem = {
  farmerId: string;
  status: "active" | "archived";
  createdAt: number;
  preferredLanguage: string | null;
  countryCode: string | null;
  zoneIds: string[];
  cropCodes: string[];
  consent: { state: "granted" | "withdrawn" | "never"; recordedAt: number | null };
};

const LANGUES: Record<string, string> = {
  dyu: "Dioula",
  bci: "Baoulé",
  fr: "Français",
};

const INITIALES: Record<string, string> = {
  dyu: "DY",
  bci: "BA",
  fr: "FR",
};

export function libelleLangue(code: string | null): string {
  if (!code) return "Langue non renseignée";
  return LANGUES[code] ?? code;
}

export function libelleZones(zones: string[]): string {
  if (zones.length === 0) return "Zone non renseignée";
  return zones.join(", ");
}

export function libelleCultures(cultures: string[]): string {
  if (cultures.length === 0) return "Aucune culture";
  return cultures.join(" · ");
}

export function titreAgriculteur(item: FarmerRosterItem): string {
  return `${libelleLangue(item.preferredLanguage)} · ${libelleZones(item.zoneIds)}`;
}

function initiales(item: FarmerRosterItem): string {
  if (item.preferredLanguage && INITIALES[item.preferredLanguage]) {
    return INITIALES[item.preferredLanguage];
  }
  const zone = item.zoneIds[0]?.slice(0, 2);
  return (zone ?? "AG").toUpperCase();
}

function badgeConsentement(state: FarmerRosterItem["consent"]["state"]) {
  if (state === "granted") {
    return <Badge variant="positif">Peut recevoir les alertes</Badge>;
  }
  if (state === "withdrawn") {
    return <Badge variant="attention">Consentement retiré</Badge>;
  }
  return <Badge variant="attention">Hors diffusion</Badge>;
}

export function FarmerRosterTable({
  items,
  onOpen,
}: {
  items: FarmerRosterItem[];
  onOpen: (item: FarmerRosterItem) => void;
}) {
  return (
    <Table>
      <TableCaption>Agriculteurs de l'organisation</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Agriculteur</TableHead>
          <TableHead>Zone</TableHead>
          <TableHead>Consentement</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Inscrit le</TableHead>
          <TableHead className="w-14">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.farmerId}>
            <TableCell>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="flex min-h-11 items-center gap-3 text-left transition-colors hover:text-vert"
              >
                <Avatar>
                  <AvatarFallback>{initiales(item)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block font-titre text-sm font-semibold text-encre">
                    {titreAgriculteur(item)}
                  </span>
                  <span className="mt-0.5 block text-xs text-ardoise">
                    {libelleCultures(item.cropCodes)}
                  </span>
                </span>
              </button>
            </TableCell>
            <TableCell className="text-ardoise">{libelleZones(item.zoneIds)}</TableCell>
            <TableCell>{badgeConsentement(item.consent.state)}</TableCell>
            <TableCell>
              <Badge variant={item.status === "active" ? "positif" : "default"}>
                {item.status === "active" ? "Actif" : "Archivé"}
              </Badge>
            </TableCell>
            <TableCell className="tabular-nums text-ardoise">
              {new Date(item.createdAt).toLocaleDateString("fr-FR")}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => onOpen(item)}>Aperçu</DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/console/farmers/$farmerId" params={{ farmerId: item.farmerId }}>
                      Ouvrir la fiche
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function FarmerPreviewSheet({
  item,
  onClose,
}: {
  item: FarmerRosterItem | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent>
        {item ? (
          <>
            <SheetHeader>
              <SheetTitle>{titreAgriculteur(item)}</SheetTitle>
              <SheetDescription>
                Fiche operationnelle. WOURI ne stocke ni nom civil ni numero.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5 p-5">
              <div>
                <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  Langue
                </p>
                <p className="mt-1 text-sm text-encre">{libelleLangue(item.preferredLanguage)}</p>
              </div>
              <div>
                <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  Zones
                </p>
                <p className="mt-1 text-sm text-encre">{libelleZones(item.zoneIds)}</p>
              </div>
              <div>
                <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  Cultures
                </p>
                <p className="mt-1 text-sm text-encre">{libelleCultures(item.cropCodes)}</p>
              </div>
              <div>
                <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  Consentement WhatsApp
                </p>
                <div className="mt-2">{badgeConsentement(item.consent.state)}</div>
              </div>
              <Link
                to="/console/farmers/$farmerId"
                params={{ farmerId: item.farmerId }}
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-vert px-4 font-titre text-sm font-semibold text-white transition-[transform,background-color] hover:bg-vert-profond active:scale-[0.96]"
              >
                Ouvrir la fiche complète
              </Link>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
