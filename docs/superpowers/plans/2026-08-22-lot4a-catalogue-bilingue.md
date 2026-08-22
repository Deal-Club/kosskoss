# Lot 4A — La boutique anglaise affiche l'anglais — Plan

> **SOUS-COMPÉTENCE REQUISE :** superpowers:subagent-driven-development.

**Spécification :** `docs/superpowers/specs/2026-08-22-lot4a-catalogue-bilingue-design.md`

## Contraintes globales

1. **Le repli passe TOUJOURS par `pickText` / `pickList`** de `src/server/localizedContent.ts`, jamais par un accès direct à un champ `*En`. Une traduction absente doit rendre le français ; une case vide sur une vignette est pire qu'un nom français.
2. **La traduction descend dans la LECTURE, pas dans les pages.** Aujourd'hui `/recherche` traduit à la main, et c'est ce que les huit autres appelants ont oublié. Un seul point d'entrée, pas neuf.
3. **Migration additive** ; `prisma migrate dev` se bloque ici — `migrate diff` pour lire le SQL, écrire le dossier à la main, `migrate deploy`, `generate`.
4. **La ligne de commande fige le libellé dans la langue de l'ACHETEUR.** Le figement est la bonne doctrine ; il fige aujourd'hui la mauvaise langue.
5. Toute route et tout écran nomment leur capacité ; le test exige autant de gardes que de fonctions exportées.
6. Français partout dans le code et les commentaires. Aucun nom de personne.
7. **Avant chaque commit :** `tsc --noEmit`, `eslint`, `npm test` ; `npm run build` aux tâches touchant page ou route, **au premier plan**, `timeout` 600000. Rien en arrière-plan. `./node_modules/.bin/<binaire>` si `npx` ne résout pas.
8. **Tout essai en base : créer, éprouver, supprimer, PUIS RELIRE pour confirmer.** Jamais d'écriture dans la table des comptes administrateurs.

---

### Tâche 1 : Les trois colonnes manquantes

**Fichiers :** `prisma/schema.prisma`, une migration, `src/lib/kk/traductions.ts`.

`Announcement.messageEn`, `DiagAnswer.chipEn`, `Campaign.nameEn` — `String @default("")`.

- [ ] Ajouter les trois champs au schéma, avec un commentaire disant que le vide vaut repli sur le français.
- [ ] `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` — attendu : trois `ALTER TABLE ... ADD COLUMN`. **Rien d'autre. Un `DROP` ou un `NOT NULL` : arrêter et signaler.**
- [ ] Écrire `prisma/migrations/20260822200000_traductions_manquantes/migration.sql`, puis `migrate deploy`, `generate`, et relancer le `diff` — il doit être vide.
- [ ] Déclarer `Announcement.message` et `DiagAnswer.chip` au registre de `src/lib/kk/traductions.ts`. **`Campaign.name` reste EXCLU** — c'est un libellé interne au back-office qui ne sort jamais ; ajoute-le à la liste d'exclusions nommées avec sa justification, comme `Article.blocks`.
- [ ] Le test registre/schéma doit passer. S'il tombe, c'est qu'une déclaration manque — corrige la déclaration, jamais le test.
- [ ] Vérifier et commiter.

---

### Tâche 2 : La langue traverse la lecture du catalogue

**Fichiers :** `src/server/kk/product-view.ts`, `src/server/kk/catalog.ts`, et les appelants.

- [ ] Faire recevoir la langue à `toProductView`, et localiser le nom et la description courte par `pickText`. La **marque n'est jamais traduite**.
- [ ] Faire localiser la lecture — `getCatalog`, `getProductDetail`, et les autres fonctions de `catalog.ts` qui rendent des vues produit.
- [ ] Adapter les neuf appelants pour qu'ils transmettent la langue de la page. **Recense-les d'abord** (`grep -rn "toProductView" src`), liste-les dans ton rapport, et n'en laisse aucun de côté : un appelant oublié est un écran resté français.
- [ ] `/recherche` traduit aujourd'hui à la main : **retire cette traduction manuelle** une fois la lecture localisée, sinon la traduction s'applique deux fois. Vérifie qu'elle affiche toujours l'anglais après.
- [ ] Écrire les tests de localisation d'une vue produit : nom traduit, traduction absente (repli), description partielle, marque intacte.
- [ ] Vérifier et commiter.

---

### Tâche 3 : Le méga-menu, le diagnostic, le bandeau

**Fichiers :** `src/server/kk/navigation.ts`, `src/server/kk/diagnostic.ts`, `src/server/kk/announcement.ts`.

- [ ] **Le méga-menu** — univers, catégories, routines. Il est sur toutes les pages : un menu français annule l'effet de toute autre traduction.
- [ ] **Le diagnostic** — questions (`title`, `subtitle`), réponses (`label`, `description`, `chip`). La pastille `chip` vient d'obtenir sa colonne à la tâche 1.
- [ ] **Le bandeau d'annonce** — `message`, colonne obtenue à la tâche 1.
- [ ] Vérifier qu'aucun de ces trois chemins n'accède directement à un champ `*En` sans passer par `pickText`.
- [ ] Vérifier et commiter.

---

### Tâche 4 : La fiche produit, ses métadonnées, et la commande

**Fichiers :** `src/app/[locale]/[group]/[category]/[product]/page.tsx`, les pages de liste, `src/server/kk/checkout.ts`.

- [ ] La fiche produit affiche le nom, la description courte, la description et les puces traduits — **y compris son `<title>` et sa description de page**, qui partent dans les moteurs de recherche.
- [ ] Les pages d'univers, de catégorie, d'accueil et de promo transmettent la langue.
- [ ] **La commande fige la langue de l'acheteur.** Dans `checkout.ts`, la langue est résolue APRÈS la construction des lignes : déplace la résolution avant, et recopie le libellé traduit dans `name` et `variantLabel`. Écris en commentaire pourquoi une commande fige la langue d'achat — c'est celle qui fait foi entre l'acheteur et la boutique.
- [ ] Vérifier que les e-mails de commande, la page de confirmation, l'espace client et la facture affichent bien ce libellé figé, sans re-traduire.
- [ ] Vérifier et commiter.

---

### Tâche 5 : Le contrôle écran par écran

- [ ] `npm run dev`, puis parcourir **en français puis en anglais** : accueil, un univers, une catégorie, une fiche produit, le méga-menu, le diagnostic, la recherche, une page de marque, les favoris, le panier.
- [ ] Pour chaque écran, rapporter : le contenu s'affiche-t-il dans la bonne langue, et **aucune case n'est-elle vide** là où une traduction manque ?
- [ ] Passer une commande en anglais et vérifier le libellé figé sur la confirmation.
- [ ] **Supprimer les données d'essai, puis relire la base pour le confirmer.**
- [ ] Rapporter le tout.

## Vérification finale

- [ ] `npm test` au vert, `npm run build` en succès, `migrate diff` vide.
- [ ] Aucun accès direct à un champ `*En` hors de `localizedContent.ts` et du module des traductions : `grep -rn "En\b" src/server/kk` pour t'en assurer, et justifier chaque exception trouvée.
