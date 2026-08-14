import {
  LayoutDashboard,
  Users,
  Bell,
  MessagesSquare,
  Database,
  Languages,
  Activity,
  Building2,
  ScrollText,
  ToggleRight,
  type LucideIcon,
} from "lucide-react";
import { CAP, type Capability } from "./authz/capabilities";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Capability minimale pour voir l'entree. Absente = visible par tout membre. */
  capability?: Capability;
  /** Regroupement affiche dans la barre laterale. */
  section: "pilotage" | "diffusion" | "connaissance" | "plateforme";
};

// APP-04 — le menu n'est pas une liste figee : il se compose a partir des
// capabilities renvoyees par le backend. Un utilisateur ne voit jamais une
// section a laquelle il n'a aucun acces, et il n'existe aucun test de role code
// en dur : seule la capability compte.
export const NAV_ITEMS: NavItem[] = [
  {
    to: "/console",
    label: "Vue d'ensemble",
    icon: LayoutDashboard,
    section: "pilotage",
  },
  {
    to: "/console/farmers",
    label: "Agriculteurs",
    icon: Users,
    capability: CAP.farmersRead,
    section: "pilotage",
  },
  {
    to: "/console/alerts",
    label: "Alertes",
    icon: Bell,
    capability: CAP.alertsRead,
    section: "diffusion",
  },
  {
    to: "/console/conversations",
    label: "Conversations",
    icon: MessagesSquare,
    capability: CAP.alertsRead,
    section: "diffusion",
  },
  {
    to: "/console/sources",
    label: "Sources & données",
    icon: Database,
    capability: CAP.knowledgeRead,
    section: "connaissance",
  },
  {
    to: "/console/language-validation",
    label: "Validation linguistique",
    icon: Languages,
    capability: CAP.linguisticValidate,
    section: "connaissance",
  },
  {
    to: "/console/organizations",
    label: "Organisations",
    icon: Building2,
    capability: CAP.platformManage,
    section: "plateforme",
  },
  {
    to: "/console/ai-ops",
    label: "AI Ops",
    icon: Activity,
    capability: CAP.aiopsRead,
    section: "plateforme",
  },
  {
    to: "/console/feature-flags",
    label: "Feature flags",
    icon: ToggleRight,
    capability: CAP.featureFlagsManage,
    section: "plateforme",
  },
  {
    to: "/console/audit",
    label: "Audit",
    icon: ScrollText,
    capability: CAP.auditRead,
    section: "plateforme",
  },
];

export const SECTION_LABELS: Record<NavItem["section"], string> = {
  pilotage: "Pilotage",
  diffusion: "Diffusion",
  connaissance: "Connaissance",
  plateforme: "Plateforme",
};

/** Entrees visibles pour un jeu de capabilities donne, groupees par section. */
export function visibleNavigation(capabilities: string[]) {
  const visible = NAV_ITEMS.filter(
    (item) => !item.capability || capabilities.includes(item.capability),
  );
  const sections: NavItem["section"][] = [
    "pilotage",
    "diffusion",
    "connaissance",
    "plateforme",
  ];
  return sections
    .map((section) => ({
      section,
      label: SECTION_LABELS[section],
      items: visible.filter((item) => item.section === section),
    }))
    .filter((group) => group.items.length > 0);
}
