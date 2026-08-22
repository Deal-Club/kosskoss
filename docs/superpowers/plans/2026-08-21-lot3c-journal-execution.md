# SDD ledger — plan: docs/superpowers/plans/2026-08-21-lot3c-ventes-marges.md

Spec : docs/superpowers/specs/2026-08-21-lot3c-ventes-marges-design.md
Branche : feat/lot3c-ventes — base main @ f03e945 (+ correctif de décompte)

## Balayage préalable

### Paires de tâches partageant un fichier ou une interface

| Paires | Ce que l'une produit | Ce que l'autre consomme | Constat |
|---|---|---|---|
| 1 → 5 | `OrderItem.unitCostCents Int?` | `select: { unitCostCents: true }` dans `lireVentes` | concordant |
| 1 → 6 | la même colonne, via `LigneVente.unitCostCents` | colonnes Coût / Marge du CSV | concordant |
| 2 → 5 | `periodeDepuisUrl`, `formatJourIso`, `Periode`, `Raccourci` | les quatre, page + barre de période | concordant |
| 2 → 6 | `periodeDepuisUrl`, `formatJourIso` | lecture des paramètres, nom du fichier | concordant |
| 3 → 5 | `LigneVente`, `PointJour`, `totaliserVentes`, `classerParProduit`, `ventesParJour` | les cinq | concordant |
| 3 → 6 | `LigneVente` (via `lireVentes`) | corps du CSV | concordant |
| 4 → 6 | `buildCsv(entetes, lignes)` | `buildCsv([...COLONNES], corps)` | concordant — deux arguments des deux côtés |
| 4 → route produits | `csvCell` / `buildCsv` extraits | `products/export` recâblé | seule la tâche 4 touche ce fichier |
| 5 → 6 | `lireVentes(periode): Promise<LigneVente[]>` | même signature | concordant |
| 3B → 6 | `margeUnitaire`, `tauxMarge` (déjà en place) | calcul par ligne du CSV | concordant — aucune troisième formule de marge |

### Cohérence interne de chaque tâche

| Tâche | Tests annoncés / tests écrits | Exports / imports | Constat |
|---|---|---|---|
| 1 | pas de test unitaire (migration + tunnel) ; vérifié par `tsc`, suite, construction | — | cohérent |
| 2 | 17 / 17 | les 4 symboles testés sont exportés | cohérent |
| 3 | 23 / 23 | les 3 fonctions et le type testés sont exportés | cohérent |
| 4 | 11 / 11 | `csvCell`, `buildCsv` exportés | cohérent |
| 5 | vérification manuelle en 4 points | `formatFcfa`, `requireAdminSession`, `Raccourci` existent | cohérent |
| 6 | vérification manuelle du fichier en 5 points | `requireAdminApi` rend `{ unauthorized }` — même forme que `products/export` | cohérent |

Balayage clos sans conflit à trancher.

## Journal

- Tâche 1 : dispatchée (base a82b306). Premier retour prématuré — l'agent attendait une commande Prisma en arrière-plan, non terminée. Vérifié : schéma modifié, aucune migration créée, aucun commit. Agent relancé avec la marche à suivre (entrée standard fermée, tout au premier plan).
  Ruling: ne jamais lancer `prisma migrate dev` en arrière-plan — il peut poser une question et attendre indéfiniment. Coût si erroné : une commande relancée pour rien.
- Tâche 1 : deuxième arrêt sans progrès (l'agent attendait un moniteur). Vérifié moi-même en lecture seule que `migrate diff --from-config-datasource --to-schema` rend exactement `ALTER TABLE "OrderItem" ADD COLUMN "unitCostCents" INTEGER;` — aucune dérive, aucune instruction destructrice.
  Ruling: abandonner `prisma migrate dev --create-only`, qui se bloque dans cet environnement, et écrire le dossier de migration à la main avec ce SQL vérifié, puis `migrate deploy`. Le résultat est identique à ce que `--create-only` aurait produit. Coût si erroné : un horodatage de migration choisi à la main plutôt que par Prisma.
- Tâche 1 : complète (commits a82b306..f0af131). Migration `20260821210801_cout_unitaire_ligne_commande` appliquée ; `migrate diff` résiduel vide, base et schéma en phase. Revue dispatchée.
  Note : `migrate deploy` a aussi rattrapé `20260821191622_cout_achat_produit` (lot 3B), committée mais pas enregistrée comme déployée. Vérifié après coup : aucune dérive.
- Tâche 2 : complète (commit ef650bc), 17 tests de période, suite à 501. Revue dispatchée.
- Tâche 1 : revue ❌ — constat CRITIQUE confirmé par moi-même. Le plan ne désignait que `src/server/orders.ts::createOrder`, chemin MORT (`CheckoutFlow` n'est rendu par aucune page). Le tunnel vivant est `/[locale]/commande` → `CheckoutForm` → `/api/kk/checkout` → `createKossOrder` (`src/server/kk/checkout.ts`), qui n'écrit pas le coût.
  Ruling: défaut de mon plan, pas de l'implémenteur. Étendre la tâche 1 au vrai tunnel plutôt que remplacer le correctif existant — les deux routes existent, les deux doivent figer le coût. Coût si erroné : quelques lignes sur une route qui ne sert plus.
  Constat Important reporté à l'implémenteur : aucun test n'assure l'écriture du coût. Consigne donnée de ne PAS fabriquer un faux test si le dépôt n'offre pas de moyen de tester sans base.
- Tâche 1 : ronde de correction 1/5 dispatchée.
- Tâche 2 : revue ✅ conformité, qualité approuvée. Le relecteur a vérifié par exécution le passage à l'heure d'été, les changements de mois et d'année, et le rejet du 31 février.
  Constat Important : aucun test ne soumet une date syntaxiquement valide mais calendairement inexistante (« 2026-02-31 »), alors que le code la traite correctement et que le brief la désignait comme point de vigilance. Entre en ronde de correction.
  Constat Mineur (différé) : le rapport annonce des longueurs de fichiers fausses (116/127 au lieu de 102/123). Documentaire, sans effet sur le code.
  Ruling: attendre la fin de la correction de la tâche 1 avant de lancer celle de la tâche 2 — deux implémenteurs qui commitent en même temps se disputeraient l'index git. Coût si erroné : quelques minutes de série au lieu de parallèle.
  Ruling révisé: les deux rondes de correction peuvent tourner en parallèle, à condition que chaque agent commite en limitant explicitement son commit à ses propres chemins (`git commit <chemin> -m`), jamais `git add -A`. Le risque n'était pas le verrou d'index mais un agent balayant le travail non commité de l'autre. Coût si erroné : un commit à défaire.
- Tâche 2 : ronde de correction 1/5 dispatchée (test de date calendairement inexistante).
- Tâche 1 : ronde 1/5 — correctif appliqué au vrai tunnel (commit 5742150). L'implémenteur confirme, après recherche, que seuls DEUX chemins créent des OrderItem dans tout le dépôt : `orders.ts::createOrder` (mort) et `kk/checkout.ts::createKossOrder` (vivant). Aucun seed, aucune reprise de commande.
- Tâche 2 : ronde 1/5 — re-revue NON ADRESSÉ. Argument juste : sans la validation calendaire, les trois dates invalides testées débordent en inversant l'ordre des bornes, donc retombent sur le défaut PAR HASARD. Les tests passeraient encore. Le cas discriminant est une borne basse valide avec une borne haute inexistante (« du 2026-01-31 au 2026-02-31 »), qui serait acceptée comme période fausse.
- Tâche 3 : complète côté implémentation (commit 1595aed, 23 tests, suite à 526). Message de commit rectifié : un pied de page s'était collé à la ligne de titre.
- Tâche 1 : COMPLÈTE (commits a82b306..5742150, ronde 1/5, re-revue : les deux constats adressés/confirmés).
  Parked: `ProductVariant` n'a pas de `costCents`. Une ligne à variante recopie donc le coût du produit parent, alors que deux contenances ont des coûts d'achat réellement différents. Ce n'est pas une régression de ce lot — il n'existe aucune autre source de coût dans le modèle. Ruling: hors périmètre, à traiter au lot des fournisseurs (3F) où le coût d'achat devient une donnée d'approvisionnement. Coût si erroné : des marges par variante approximatives sur les produits déclinés.
  Parked: aucun test n'assure l'écriture du coût à la commande. Confirmé par le relecteur : le dépôt n'a aucune infrastructure de test avec base (ni mock Prisma, ni base en mémoire, ni conteneur), seulement `node --test`. Ruling: ne pas fabriquer un test qui vérifierait un mock maison plutôt que le comportement réel. Coût si erroné : une régression future sur cette recopie ne serait pas attrapée automatiquement.
- Tâche 2 : ronde 2/5 (commit a044dcb). Le test discriminant échoue bien (19/1) quand la validation calendaire est désactivée, et passe (20) quand elle est rétablie — vérifié par mutation.
- Tâche 3 : revue ✅ conformité, qualité approuvée. Constat IMPORTANT prouvé par mutation : remplacer la division par le nombre de commandes par une division par le nombre de lignes laisse les 23 tests au vert. Le commentaire du test annonce une garantie que l'assertion ne vérifie pas. Ronde de correction.
- Tâche 4 : implémentée (commit 8eb01fd, 11 tests CSV, suite à 538). L'implémenteur rapporte un fichier produit identique bit à bit avant et après recâblage. Revue dispatchée.
  Ruling: retarder le dispatch de la tâche 5 tant que des agents pratiquent des mutations temporaires (tâche 3 sur `ventes.ts`, revue de la tâche 4 sur `periode.ts` et `csv.ts`). Un implémenteur qui lancerait `npm test` pendant une mutation verrait des échecs qui ne lui appartiennent pas et chercherait une faute inexistante. Coût si erroné : quelques minutes d'attente.
- Tâche 2 : COMPLÈTE (commits f0af131..a044dcb, ronde 2/5, re-revue ADRESSÉ par mutation — seul le nouveau test tombe quand la validation calendaire est désactivée, ce qui confirme au passage que les anciens ne discriminaient rien).
- Tâche 4 : COMPLÈTE (commit 8eb01fd, revue ✅, aucun constat Critique ni Important). Identité bit à bit de l'export produits vérifiée indépendamment par le relecteur, pas reprise du rapport. Regex d'échappement vérifiée par mutation : 2 tests sur 11 tombent quand le point-virgule sort de la classe.
- Tâche 3 : ronde 1/5 (commit 0aea095, 26 tests, les trois ajouts validés par mutation). Re-revue à faire.
- Tâche 5 : implémentée mais non commitée — l'agent s'est arrêté en attente d'une construction lancée en arrière-plan.
- Tâche 3 : COMPLÈTE (commits 2c358cf..0aea095, ronde 1/5, re-revue : les trois constats ADRESSÉS, chacun vérifié par mutation ; dépôt propre après rétablissement).
- Tâche 5 : implémentée et commitée (2a44e26). L'agent a vu la mutation temporaire d'un relecteur dans `src/lib/kk/ventes.ts`, ne l'a NI commitée NI corrigée, et l'a signalée — la consigne donnée à ce sujet a fonctionné. Vérifié après coup par moi-même : dépôt propre, 541 tests au vert (484 + 20 période + 26 ventes + 11 CSV). Revue dispatchée.
- Tâche 6 : COMPLÈTE (commit 431ba0c, revue ✅, aucun constat Critique ni Important). Vérifié colonne par colonne : montants en entiers nus, quatre colonnes vides et non nulles sur une ligne sans coût, 13 en-têtes pour 13 valeurs, marge calculée sur des totaux de ligne des deux côtés, contrôle d'accès avant toute lecture en base.
  Mineur (différé) : ni la route ni la page ne revalident `du <= au`, mais `periodeDepuisUrl` porte déjà ce garde-fou. Défense en profondeur déjà assurée ailleurs.
- Tâche 5 : revue ✅ avec deux constats Importants.
  Constat 1 — le module et ma spécification annonçaient un CA « hors TVA ». Le relecteur en concluait que le CA était TTC et que la marge s'en trouvait gonflée. VÉRIFIÉ MOI-MÊME : la TVA a été retirée du système (`cart.ts:23`, VAT_RATE_PERCENT = 0, `taxCents` toujours nul, aucune ligne de TVA nulle part). Il n'y a donc NI TVA comprise, NI TVA à retrancher.
  Ruling: le constat est fondé mais sa conclusion ne l'est pas. Ce n'est pas un défaut de calcul, c'est une mention fausse : la formule « hors TVA » laisse croire à une décomposition qui n'existe pas. Corriger le libellé aux trois endroits (module, spécification, écran) plutôt que le calcul, et écrire au passage la vigilance qui, elle, est réelle : coût d'achat et prix de vente doivent être exprimés sur la même base, ce qui relève du comptable. Coût si erroné : une mention à réécrire.
  Constat 2 — `panierMoyenCents` vaut 0 sans aucune commande, et l'écran affiche « 0 FCFA ». Contredit la règle la plus répétée du lot. Passe à `null`, affiché « — ».
  Frontière client/serveur vérifiée en remontant la chaîne d'imports : `VentesPeriodeForm` n'importe qu'un type depuis un module à zéro import. Aucune fuite.
- Tâche 5 : ronde de correction 1/5 dispatchée.
- Tâche 5 : COMPLÈTE (commits 0aea095..4950203, ronde 1/5, re-revue : les quatre constats ADRESSÉS, le panier moyen vérifié par mutation — 2 tests sur 26 tombent quand `null` redevient 0). La nouvelle formulation sur la TVA a été contrôlée contre le code, pas seulement pour sa cohérence interne.
- Les six tâches sont closes. Revue de branche complète dispatchée.

## Revue de branche complète — verdict « Pas encore »

- CRITIQUE confirmé par moi-même : la remise du code promo n'est déduite ni du CA, ni de la marge, ni du CSV. `checkout.ts:113` écrit le total de ligne AVANT remise ; la remise n'est retranchée qu'au total de la commande (`:150`). Les deux consommateurs somment les totaux de ligne. Sur un panier de 50 000 avec 10 % de remise et 30 000 de coût, l'écran annonce 50 000 de CA et 20 000 de marge (40 %) là où la réalité est 45 000 et 15 000 (33,3 %) — marge surévaluée d'un tiers, et l'erreur croît avec le taux de remise. Le CSV et la facture PDF de la même commande se contredisent.
  Ruling: RÉPARTIR la remise sur les lignes au prorata plutôt que se contenter de renommer la carte. C'est ce que le comptable recalculerait de toute façon, et cela rend le CA comparable au total encaissé. La dernière ligne de chaque commande absorbe le reste de l'arrondi, pour que la somme des parts vaille exactement la remise — un franc d'écart avec la facture se cherche pendant une heure. Coût si erroné : une répartition à revoir si le comptable préfère une autre convention.
  Le relecteur a trouvé d'où venait le trou : ma spécification prévoyait « le total encaissé reste affiché à côté, comme un second chiffre nommé », phrase supprimée en cours de route. Ce second chiffre aurait rendu l'écart visible à l'écran.
- IMPORTANT : `lireVentes` ne filtre pas `Order.status`, alors que `lireEnCours` le fait dix lignes plus bas. Une commande payée puis annulée — marchandise remise en stock, jamais partie — reste dans le chiffre d'affaires.
  Ruling: exclure les annulées, GARDER les remboursées. Un remboursement a bien encaissé puis rendu ; les avoirs sont hors périmètre de ce lot et doivent le rester, mais le choix doit être écrit en commentaire pour ne pas se lire comme un oubli. Coût si erroné : les remboursements gonflent le CA jusqu'au lot des avoirs.
- IMPORTANT : le lien « Voir les commandes » ne filtre ni par période ni sur les annulées. Ruling: corriger le libellé du lien plutôt que la page des commandes, hors périmètre.
- IMPORTANT : `lireEnCours` somme du net, `lireVentes` sommait du brut. Résolu par la correction du critique.
- Mineurs : doublon dans `.gitignore`, `ventesParJour` calculé puis jeté au-delà de 92 jours, `orderBy` annoncé mais tri en mémoire.
- Chaîne du coût vérifiée relais par relais par le relecteur : intacte de la fiche produit jusqu'à la colonne « Marge » du CSV. Sécurité vérifiée : contrôle d'accès avant toute lecture en base, aucune donnée personnelle dans l'export.
- Vague de correction unique dispatchée.
- Vague de correction : re-revue « Prêt à fusionner ». Répartition de la remise vérifiée par script sur 21 cas construits et 200 000 tirages : somme des parts exacte, aucune part supérieure au total de sa ligne, aucune part négative. Marge, taux, panier moyen et CSV recalculés sur le net et vérifiés par un exemple chiffré complet. 15 en-têtes pour 15 valeurs. Six mutations passées : trois tuées côté règles porteuses.
  La réserve de l'implémenteur est CONFIRMÉE RÉELLE mais mal expliquée : ce n'est pas la hauteur de la remise qui casse l'exactitude, c'est la petitesse de la dernière ligne. Condition exacte : `dernière × (1 − remise/sous_total) >= n − 1`. Aucun échec sur 1 800 000 tirages aux montants réalistes de cette boutique.
  Ruling: NE PAS corriger l'algorithme — le cas n'est pas atteignable avec des lignes d'au moins quelques francs, et le corriger ajouterait du risque pour rien. Corriger en revanche le commentaire qui justifie l'exactitude par un argument faux, et écrire où est la limite. Coût si erroné : quelques francs d'écart le jour où une ligne descendrait sous ~7 F.
  Ruling: fermer avant fusion les trois mutations SURVIVANTES du module pur (plafond de part, assiette nette du taux, série journalière nette) plutôt que de les différer. Trois assertions dans un module déjà testé. Les trois autres survivantes portent sur `src/server/kk/ventes.ts`, que le dépôt ne teste pas — assumé.
- Suites finales dispatchées.
