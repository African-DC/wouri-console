# Routes de la WOURI Console

Toutes les routes de pilotage vivent sous `/console`. La page racine est la
connexion, publique et sans provider.

| Route | Écran | Capacité requise |
| --- | --- | --- |
| `/` | Connexion et création de compte | aucune (publique) |
| `/console` | Vue d'ensemble, composée selon le rôle | `organization.read` |
| `/console/farmers` | Agriculteurs, table paginée | `farmers.read` |
| `/console/alerts` | Alertes et indicateurs de diffusion | `alerts.read` |
| `/console/conversations` | Boîte de réception et contexte d'alerte | `alerts.read` |
| `/console/sources` | Sources et provenance | `knowledge.read` |
| `/console/corpus` | Corpus versionné et import | `knowledge.read` |
| `/console/language-validation` | File et fiche de validation | `linguistic.validate` |
| `/console/organizations` | Vue plateforme | `platform.manage` |
| `/console/ai-ops` | Traces d'exécution | `aiops.read` |
| `/console/feature-flags` | Drapeaux par environnement | `featureflags.manage` |
| `/console/audit` | Journal des opérations sensibles | `audit.read` |
| `/api/auth/*` | Proxy vers Better Auth sur Convex | — |

Une route dont la capacité manque affiche un refus explicite, jamais une page
vide. L'entrée correspondante n'apparaît pas non plus dans le menu.

## Routes déclarées mais non encore construites

`/console/sources`, `/console/feature-flags` et `/console/audit` figurent dans la
navigation mais leur écran reste à écrire. Le backend expose déjà les requêtes
correspondantes (`listKnowledgeSources`, `listFlags`, `listAuditLogs`).
