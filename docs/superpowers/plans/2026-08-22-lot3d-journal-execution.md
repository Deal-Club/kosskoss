# SDD ledger — plan: docs/superpowers/plans/2026-08-22-lot3d-roles-autorisations.md

Spec : docs/superpowers/specs/2026-08-22-lot3d-roles-autorisations-design.md
Branche : feat/lot3d-roles — base main @ dfd3941

## Balayage préalable

### Paires de tâches partageant un fichier ou une interface

| Paires | Produit | Consommé | Constat |
|---|---|---|---|
| 1 → 2 | `Capacite`, `CAPACITES` | typage de la carte, test de cohérence | concordant |
| 1 → 3 | `peut`, `estRoleConnu`, `RoleAdmin`, `Capacite` | lecture du rôle et gardes | concordant |
| 1 → 5 | `capacitesDe`, `LIBELLES_*` | menu et écran de refus | concordant |
| 2 → 4 | `CAPACITE_PAR_FAMILLE` | quelle capacité donner à chaque route | concordant |
| 2 → 5 | `CAPACITE_PAR_FAMILLE` | quelle capacité pour chaque écran et entrée de menu | concordant |
| 3 → 4 | `requireCapaciteApi(capacite)` | toutes les routes | concordant |
| 3 → 5 | `requireCapacitePage(capacite)`, `roleCourant`, `aLaCapacite` | tous les écrans, l'accueil, le menu | concordant |
| 2 → 2 | `FAMILLES_SANS_SESSION` inclut `refuse` | l'écran de refus est créé en tâche 3 | ORDRE : le test d'arborescence de la tâche 2 tourne AVANT que `refuse/` existe |

**Ruling sur la dernière ligne :** `refuse` figure dans `FAMILLES_SANS_SESSION`, et le test « ne classe pas de famille qui n'existe plus » ne porte que sur `CAPACITE_PAR_FAMILLE`, pas sur les exceptions. Aucun conflit réel. Si l'implémenteur de la tâche 2 constate un échec lié à `refuse`, il doit le signaler plutôt que d'affaiblir le test. Coût si erroné : un test à ajuster en tâche 3.

### Cohérence interne de chaque tâche

| Tâche | Tests | Exports / imports | Constat |
|---|---|---|---|
| 1 | 8 tests, matrice complète | 4 rôles × 5 capacités, tous exportés | cohérent |
| 2 | 4 tests d'arborescence, lisant le disque | dépend de l'arborescence RÉELLE, qui peut différer de la carte écrite | l'étape 3 du brief l'anticipe explicitement et interdit de modifier le test |
| 3 | pas de test unitaire (accès base) | `roleCourant` mémoïsé, `aLaCapacite` | cohérent — vérifié à la main en tâche 5 |
| 4 | vérification par `grep -L` | mécanique, sur ~48 routes | cohérent |
| 5 | vérification manuelle en 3 points | le point 3 (désactivation immédiate) justifie la relecture en base | cohérent |

### Risque principal, nommé

Fermer une porte trop fort empêche de travailler. `owner` et `admin` gardent tout sauf les accès ; le seul rôle réellement restreint est `gestionnaire`, attribué à personne aujourd'hui. La vérification finale exige de confirmer qu'un compte `owner` ou `superadmin` actif existe.

Balayage clos.

## Journal

- Tâches 1 à 5 : implémentées. Vérifié moi-même : la carte couvre les 27 familles réelles sans oubli ni orpheline ; aucune route hors login/logout ne manque `requireCapaciteApi` ; aucun fichier n'a moins de gardes que de fonctions exportées.
- Découverte de la tâche 5 : plusieurs écrans (diagnostic/*, journal/*, products/*, parametres) n'avaient AUCUNE garde propre et s'appuyaient implicitement sur la session du gabarit.
- Essai décisif mené par curl avec cookie signé : compte désactivé en base sans déconnexion, jeton rejoué tel quel — l'accès tombe immédiatement (200 → 307 vers le refus, et 403 sur l'API). C'est ce qui justifie de relire le rôle en base plutôt que de le mettre dans le jeton.
- Revue de branche : « Pas encore ». CRITIQUE confirmé par moi-même : ma spécification classait `bank-transfer` sous `commandes`, donc un gestionnaire pouvait réécrire l'IBAN de la boutique en une requête PUT, publié immédiatement par `revalidatePath`, et lu par la page de confirmation et l'e-mail de commande.
  Ruling: erreur de ma spécification. `bank-transfer` et `payments` passent à `reglages` — ce sont des réglages de paiement, frères de `payment-gateway` et `payment-methods` déjà classés ainsi. Coût si erroné : un gestionnaire ne voit plus l'écran des moyens de paiement.
- IMPORTANT : le test d'arborescence ne vérifiait que les noms de dossier de premier niveau. Une route sans garde dans une famille EXISTANTE passait au vert — or c'est le cas majoritaire, tous les ajouts récents étant des sous-chemins. Renforcé : il ouvre chaque fichier, exige la garde, et vérifie que la capacité demandée est celle de la carte.
  Vérifié par moi-même après correction : une route `products/zzz-epreuve` sans garde fait tomber le test (5 passent, 1 échoue). Dépôt nettoyé.
- IMPORTANT : `gestionnaire` n'était attribuable par aucun écran — la matrice restreignait un rôle que personne ne pouvait porter. Corrigé aux trois endroits, la liste des rôles acceptés dérivant désormais du module pur.
- IMPORTANT : trois écrans de diagnostic exigeaient `catalogue` alors que leur famille est `reglages`. Alignés ; le test renforcé rend la dérive impossible.
  Parked: `diagnostic/tags` est fonctionnellement un écran de catalogue mal rangé sous `diagnostic`. Ruling: déplacement d'écran, hors périmètre de ce lot. Coût si erroné : un futur rôle catalogue-seul ne verrait pas cet écran.
- À VÉRIFIER AVANT MISE EN LIGNE : qu'un compte `owner` ou `superadmin` actif existe sur la base de PRODUCTION. Le défaut de la colonne est `admin`, qui perd la gestion des comptes.
