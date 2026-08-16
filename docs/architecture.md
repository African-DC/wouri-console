# Architecture de la WOURI Console

## Ce que c'est

Une seule application de pilotage pour toutes les organisations de WOURI : ADC,
SODEXAM, CNRA, coopératives, ONG, validateurs linguistiques. Il n'existe pas un
tableau de bord par partenaire : c'est le **même code**, dont le contenu dépend
des capacités renvoyées par le backend.

## Les trois plans

| Plan | Responsable | Contenu |
| --- | --- | --- |
| Données | Convex (`wouri-convex`) | État métier, permissions, temps réel, provenance, audit |
| Calcul | FastAPI et workers | Reconnaissance vocale, synthèse, traduction, modèles, audio |
| Présentation | Cette console, le site public | Aucune donnée propre : consomm? les deux |

La console ne détient aucune donnée et n'implémente aucune règle métier. Elle
lit le backend et affiche.

## Stack

TanStack Start avec Nitro, React 19, Vite, Convex, Better Auth, Tailwind v4.

Trois points d'attention, chacun corrigeant un piège rencontré :

- **`nitro()` est obligatoire** dans `vite.config.ts`. Sans lui, le serveur de
  développement renvoie 404 sur toutes les routes et le build ne produit pas de
  sortie serveur.
- **Le routeur exporte `getRouter`**, pas `createRouter` : c'est ce que le point
  d'entrée de TanStack Start appelle.
- **React est dédupliqué et pré-empaqueté** (`resolve.dedupe`, `optimizeDeps`)
  pour éviter deux copies de React à l'hydratation, symptôme classique sous pnpm.

## Organisation du code

```
src/
  components/     shell et design system (états, tableaux, badges, quotas)
  lib/
    authz/        capabilities, session, useCan, <Can>
    navigation.ts menu généré depuis les capabilities
    convex.ts     client Convex et client Better Auth
  routes/
    index.tsx     connexion (publique, sans provider)
    console.tsx   providers montés ici uniquement, garde de session
    console/      un fichier par écran
  styles/app.css  jetons de la charte WOURI
```

Le backend est consomm? via l'alias `@wouri/convex-api`. En local comme sur Vercel, celui-ci pointe vers `src/generated/convex-api.js`, un snapshot autonome. Vercel n'a pas le d?p?t voisin wouri-convex.

## Authentification

Better Auth vit dans Convex. La console expose un proxy `/api/auth/*` qui
transmet vers le déploiement.

Trois pièges y sont traités explicitement, tous rencontrés en conditions réelles :

- l'URL cible se lit via `import.meta.env`, absente de `process.env` sous Nitro ;
- le corps est bufferisé, car un corps en flux exige `duplex` et échoue sinon ;
- **l'en-tête `content-encoding` est retiré de la réponse.** Le corps ayant déjà
  été décodé, le retransmettre provoquait `ERR_CONTENT_DECODING_FAILED`, le jeton
  n'arrivait jamais et la console renvoyait indéfiniment vers la connexion.

Les providers Convex et Better Auth sont montés sur `/console/*` uniquement. La
page de connexion reste légère et son hydratation ne dépend d'aucune session.

## La session métier

`session/me` renvoie en une requête l'organisation active, les capabilities, les
périmètres, les droits du plan et l'environnement. `SessionGate` attend cette
réponse avant de rendre quoi que ce soit : aucune donnée d'une organisation
précédente ne peut rester affichée pendant un changement de contexte.

Voir `permissions.md` pour le détail du modèle d'autorisation.

## Design

Charte WOURI : vert `#1C7338` dominant, encre pour le texte, papier pour le fond.
Le bleu et l'orange sont réservés aux statuts et à l'environnement, jamais
décoratifs. Poppins pour les titres et la navigation, Mulish pour le corps.

Deux règles de la charte appliquées dans le code :

- les logos sont utilisés tels quels, jamais recomposés ;
- **aucun texte n'est posé sur l'orange soleil**, le contraste étant insuffisant.
  L'orange sert de signal (pastille, bordure), le texte reste sur l'encre.

Tailwind v4 ayant retiré `cursor: pointer` des boutons, une règle de base le
rétablit : sans elle, tous les boutons perdent leur affordance.

## États d'interface

Chaque écran dispose de : chargement en squelettes, vide expliqué, refus de
permission expliqué, et erreur avec référence technique. Ces états viennent du
design system, ils ne sont pas réinventés écran par écran.

Deux garde-fous complètent ces états :

- **Frontières d'erreur.** Le routeur rend un état d'erreur explicité au lieu
  d'un écran blanc, et chaque section du tableau de bord est isolée : une requête
  qui échoue affiche son erreur sans emporter les autres. L'identifiant de
  requête Convex est extrait du message et présenté comme référence support ; la
  pile d'exécution n'est jamais montrée.
- **Aucun compteur trompeur.** Les listes sont plafonnées côté backend. Un
  décompte issu d'une page pleine est donc affiché sous la forme `50+` avec la
  mention du plafond, jamais comme un total. La jauge de quota des agriculteurs
  n'est tracée que lorsque la pagination est terminée et que le décompte est
  donc exact ; sinon l'écran dit que le total demande un agrégat backend, absent
  à ce jour.

## Accès

La création de compte depuis la page de connexion est fermée par défaut :
la Console est un espace institutionnel, un compte y est rattaché à une
organisation par l'équipe. Le backend en est l'autorité
(`AUTH_SELF_SIGNUP_ENABLED`, voir le runbook de `wouri-convex`) ; la console se
contente de masquer l'affordance quand `VITE_AUTH_SELF_SIGNUP_ENABLED` n'est pas
à `true`, pour ne pas proposer un bouton qui échouerait.

## Ce qui n'est pas fait

- Le changement d'organisation pour un membre de plusieurs organisations.
- La création d'alerte en plusieurs étapes : la liste et les indicateurs existent,
  le formulaire de création reste à construire.
- Le rejeu comparatif dans AI Ops : les instantanés sont lisibles, l'exécution
  comparée dépend du moteur de conversation.
- Les campagnes, distinctes des alertes, qui demandent un modèle backend dédié.
