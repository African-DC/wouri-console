# Permissions de la WOURI Console

## Le principe

**L'affichage n'est pas l'autorisation.** La console masque ce que l'utilisateur
n'a pas le droit de faire, mais c'est le backend qui refuse. Masquer un bouton
évite de proposer un échec ; cela ne protège rien.

Trois niveaux, dans cet ordre :

1. **Backend Convex** : chaque fonction sensible appelle `authorize` ou
   `authorizeMutation`, qui déduit l'organisation **de la session** et vérifie la
   capability. Un identifiant deviné ne donne accès à rien.
2. **API** : les fonctions internes ne sont pas appelables depuis un navigateur.
3. **Console** : `useCan` filtre le menu et les actions, à partir des
   capabilities renvoyées par le backend.

Il n'existe **aucun test de rôle codé en dur** dans la console. Le fichier
`src/lib/authz/capabilities.ts` ne contient que des noms de capacités, jamais une
règle. La règle vit côté serveur.

## D'où viennent les capabilities

La requête `session/me` renvoie, pour la session en cours :

- l'organisation active, son type et son statut ;
- les **capabilities effectives** du membre, calculées depuis sa politique de rôle ;
- les périmètres accordés (zone, culture, groupe) ;
- les droits du plan (entitlements) ;
- l'environnement, qui alimente le bandeau STAGING.

La console ne recalcule rien. Si le backend change une politique de rôle, le menu
change sans modification du frontend.

## Ce que chaque rôle voit

Vérifié à l'écran le 14 août sur staging.

| Rôle | Permissions | Entrées de menu |
| --- | --- | --- |
| Administration plateforme (ADC) | 22 | Les quatre sections, dont Organisations, AI Ops, Feature flags, Audit |
| Coopérative ou ONG (administration) | 11 | Vue d'ensemble, Agriculteurs, Alertes, Conversations, Sources, Corpus |
| Validateur linguistique | 3 | Vue d'ensemble, Sources, Corpus, Validation linguistique |
| SODEXAM | 7 | Vue d'ensemble, Alertes, Conversations, Sources, Corpus |
| CNRA | 9 | Idem SODEXAM, plus l'ingestion de connaissances |

Points saillants, exigés par la matrice de la feuille de route :

- Une coopérative **ne voit ni AI Ops ni Organisations**.
- Le validateur linguistique **ne voit ni les agriculteurs ni les alertes** : son
  rôle est transversal à la plateforme et se limite à la qualité de langue.
- Une coopérative **ne voit pas les agriculteurs d'une autre coopérative**, même
  en connaissant son identifiant.

## Les périmètres

Un rôle peut être restreint à certaines zones, cultures ou groupes. Ces
périmètres sont renvoyés par `session/me` et disponibles via `useScopes`. Le
backend les applique de son côté : une politique en mode restreint refuse toute
permission qui ne déclare pas de périmètre correspondant.

## Comment ajouter une capacité

1. L'ajouter au catalogue backend `convex/authz/capabilities.ts` et au preset de
   rôle concerné. C'est la source unique : le provisioning, le seed, la matrice
   documentée et les tests en découlent.
2. La déclarer dans `src/lib/authz/capabilities.ts` pour pouvoir la nommer.
3. Conditionner l'affichage avec `useCan` ou `<Can>`.
4. **Vérifier que la fonction backend la contrôle réellement.** Sans cette
   étape, la capacité n'est qu'un affichage.

## Ce qui reste à faire

- Le changement d'organisation pour un utilisateur membre de plusieurs
  organisations : la session ne porte aujourd'hui qu'une organisation active, et
  la dérivation côté serveur refuse le cas ambigu plutôt que de deviner.
- L'attribution de périmètres depuis l'interface : lisible aujourd'hui, non
  modifiable.
