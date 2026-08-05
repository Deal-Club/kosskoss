# 06 — Tableau de décisions : incohérences de maquette

> **Portée limitée** : l'analyse Figma complète est bloquée par la limite du plan Starter (voir `05`). Ce tableau ne peut pas encore lister les incohérences réelles de la maquette. Il est **pré-rempli** avec (a) la seule observation Figma disponible et (b) les points de vigilance e-commerce **systématiques** à vérifier écran par écran dès que Figma sera lisible. Aucune incohérence n'est corrigée silencieusement.

## Colonnes
Problème · Nœud Figma · Conséquence · Correction proposée · Priorité · Décision · Modif code · Modif recommandée dans Figma

## A. Observé

| # | Problème | Nœud | Conséquence | Correction proposée | Prio | Décision |
|---|---|---|---|---|---|---|
| A1 | Header transactionnel « nav supprimée » = un seul lien centré | `14:4743` | Cohérent UX (réduction de fuite en tunnel) mais **pas d'incohérence** ; il faut vérifier que le lien centré reste **cliquable au clavier** et mène à un endroit sûr (accueil), et qu'un fil d'accès au support existe | Layout `(checkout)` séparé avec ce header ; garder un lien retour accessible + n° d'aide | P2 | À implémenter en layout dédié |

## B. À vérifier systématiquement (checklist, non encore instruite faute d'accès Figma)

Pour chaque écran de la maquette, contrôler et consigner ici :

| Thème | À vérifier |
|---|---|
| Espacements | grille/spacings cohérents (multiples réguliers), pas de valeurs orphelines |
| Couleurs | pas de quasi-doublons sans raison ; contraste **AA** (4.5:1 texte, 3:1 gros texte/UI) |
| Typographie | échelle de titres uniforme, tailles ≥ 12 px (idéalement 14–16 corps) |
| Boutons | même variante = même comportement ; états hover/focus/active/disabled présents |
| Composants | pas de doublons ; cartes produit de taille homogène |
| États | **loading / vide / erreur / désactivé** présents pour listes, panier, recherche, paiement |
| Cibles tactiles | zones cliquables ≥ 24×24 px (WCAG 2.2), idéalement 44×44 |
| Formulaires | libellés visibles reliés aux champs ; messages d'erreur ; champs obligatoires marqués |
| Navigation mobile | menu, filtres, tiroir panier utilisables au doigt et au clavier |
| Modales/tiroirs | focus piégé, fermeture Échap, retour du focus |
| Filtres | utilisables sur mobile (pas de survol obligatoire) |
| Tunnel | continuité fiche → panier → paiement ; pas de rupture d'état |
| Données | chaque élément affiché doit exister côté back-office (stock, variantes, prix, avis) |
| Confirmation | retour clair après ajout panier / commande |
| Stock & variantes | indication de disponibilité et sélection de variante gérées |
| Paiement | états d'erreur de paiement et produit indisponible prévus |

## C. Principe de gouvernance

La maquette **reste la référence visuelle**. Une adaptation n'est retenue que si elle est justifiée par : accessibilité (WCAG 2.2 AA), cohérence du design system, sécurité, données réelles disponibles, ou responsive. Chaque adaptation retenue sera **documentée ici** (ligne dédiée) et **répercutée en recommandation Figma**, jamais appliquée en silence.
