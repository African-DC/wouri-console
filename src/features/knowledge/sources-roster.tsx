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
} from "~/components/ui";

export type SourceRosterItem = {
  sourceId: string;
  authority: string;
  license: string;
  visibility: "global" | "organization";
  status: "active" | "archived";
  latestVersion: string | null;
  acquiredAt: number | null;
  documentCount: number;
};

export function roleSource(authority: string): string {
  const nom = authority.toLowerCase();
  if (nom.includes("sodexam")) return "Bulletin météo";
  if (nom.includes("cnra")) return "Agronomie";
  if (nom.includes("corpus") || nom.includes("ivr") || nom.includes("wouri")) {
    return "Corpus linguistique";
  }
  return "Source institutionnelle";
}

function initiales(authority: string): string {
  const parts = authority
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return authority.slice(0, 2).toUpperCase();
}

export function SourceRosterTable({
  items,
  onOpen,
}: {
  items: SourceRosterItem[];
  onOpen: (item: SourceRosterItem) => void;
}) {
  return (
    <Table>
      <TableCaption>Sources citables par WOURI</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Autorité</TableHead>
          <TableHead>Rôle</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Documents</TableHead>
          <TableHead>Portée</TableHead>
          <TableHead>Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.sourceId}>
            <TableCell>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="flex min-h-11 items-center gap-3 text-left transition-colors hover:text-vert"
              >
                <Avatar>
                  <AvatarFallback>{initiales(item.authority)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block font-titre text-sm font-semibold text-encre">
                    {item.authority}
                  </span>
                  <span className="mt-0.5 block text-xs text-ardoise">
                    {item.license}
                  </span>
                </span>
              </button>
            </TableCell>
            <TableCell className="text-ardoise">{roleSource(item.authority)}</TableCell>
            <TableCell className="tabular-nums text-ardoise">
              {item.latestVersion ?? "Aucune version"}
            </TableCell>
            <TableCell className="tabular-nums text-encre">{item.documentCount}</TableCell>
            <TableCell>
              <Badge variant={item.visibility === "global" ? "info" : "default"}>
                {item.visibility === "global" ? "Globale" : "Organisation"}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={item.status === "active" ? "positif" : "default"}>
                {item.status === "active" ? "Active" : "Archivée"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function SourcePreviewSheet({
  item,
  onClose,
}: {
  item: SourceRosterItem | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent>
        {item ? (
          <>
            <SheetHeader>
              <SheetTitle>{item.authority}</SheetTitle>
              <SheetDescription>
                Autorité citable. WOURI ne répond pas sans pouvoir rattacher une version.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5 p-5">
              <div>
                <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  Rôle
                </p>
                <p className="mt-1 text-sm text-encre">{roleSource(item.authority)}</p>
              </div>
              <div>
                <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  Version en vigueur
                </p>
                <p className="mt-1 text-sm tabular-nums text-encre">
                  {item.latestVersion ?? "Aucune version enregistrée"}
                </p>
              </div>
              <div>
                <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  Documents
                </p>
                <p className="mt-1 text-sm tabular-nums text-encre">{item.documentCount}</p>
              </div>
              <div>
                <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                  Licence
                </p>
                <p className="mt-1 text-sm text-encre">{item.license}</p>
              </div>
              {item.acquiredAt ? (
                <div>
                  <p className="font-titre text-[11px] font-semibold uppercase tracking-wider text-ardoise">
                    Acquise le
                  </p>
                  <p className="mt-1 text-sm tabular-nums text-encre">
                    {new Date(item.acquiredAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
