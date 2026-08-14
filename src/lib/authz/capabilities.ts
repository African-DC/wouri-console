// Miroir du catalogue backend (convex/authz/capabilities.ts).
//
// ATTENTION : ces constantes servent UNIQUEMENT a nommer les capabilities dans
// le code d'affichage. La verite est TOUJOURS la liste renvoyee par la query
// `session/me` du backend, qui la calcule depuis la politique de role du membre.
// Ne jamais deduire un droit d'un nom de role code en dur ici.
export const CAP = {
  platformManage: "platform.manage",
  organizationRead: "organization.read",
  organizationManage: "organization.manage",
  organizationMembersManage: "organization.members.manage",
  entitlementsManage: "entitlements.manage",
  farmersRead: "farmers.read",
  farmersWrite: "farmers.write",
  consentsWrite: "consents.write",
  alertsCreate: "alerts.create",
  alertsPublish: "alerts.publish",
  alertsRead: "alerts.read",
  weatherPublish: "weather.publish",
  sourcesPublish: "sources.publish",
  knowledgeIngest: "knowledge.ingest",
  knowledgePublish: "knowledge.publish",
  knowledgeRead: "knowledge.read",
  analyticsRead: "analytics.read",
  linguisticValidate: "linguistic.validate",
  aiopsRead: "aiops.read",
  aiopsReplay: "aiops.replay",
  featureFlagsManage: "featureflags.manage",
  auditRead: "audit.read",
} as const;

export type Capability = (typeof CAP)[keyof typeof CAP];

// Libelles francais des types d'organisation, pour l'affichage.
export const ORGANIZATION_KINDS: Record<string, string> = {
  adc: "Plateforme ADC",
  sodexam: "SODEXAM",
  cnra: "CNRA",
  cooperative: "Coopérative",
  ngo: "ONG",
  other: "Organisation",
};
