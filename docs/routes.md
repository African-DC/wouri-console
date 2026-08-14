# Routes de la WOURI Console

Toutes les routes de pilotage vivent sous `/console`. La page racine est la
connexion, publique et sans provider.

| Route | Écran | Capacité requise |
| --- | --- | --- |
| `/` | Connexion | aucune (publique) |
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

Toute entrée de menu mène à un écran réel : la navigation ne déclare aucune route
sans page. Une adresse inconnue rend un 404 explicite qui ramène à la vue
d'ensemble.

## Ce que les écrans ne font pas encore

- `/console/feature-flags` est en lecture : basculer un drapeau est une action
  sensible qui demandera une confirmation explicite avant d'être proposée.
- `/console/audit` liste les 100 opérations les plus récentes. Un opérateur de
  plateforme peut basculer entre son organisation et les opérations sans
  organisation rattachée ; l'export complet n'est pas fourni.
- `/console/alerts` n'a pas de formulaire de création en plusieurs étapes.
