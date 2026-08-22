# Lot 4C — Les facettes du catalogue — Plan

> **SOUS-COMPÉTENCE REQUISE :** superpowers:subagent-driven-development.

**Critère visé : 01** — filtres catégorie, marque, **type de peau**, **préoccupation**
et **prix**, plus le tri. C'est le dernier critère contractuel encore ouvert du
catalogue.

## L'état des lieux, à vérifier avant d'écrire

Le rayon (`src/components/kk/catalog.tsx`, `src/server/kk/catalog.ts`) filtre
aujourd'hui par catégorie, par marque (multiple, en union) et par **un seul
« besoin »**, qui mélange types de peau et préoccupations dans une même liste à
choix unique. Il n'y a **aucun filtre de prix**.

`src/lib/kk/facettes.ts` porte déjà `produitCorrespond` (union), `OptionFacette` et
les deux familles `peau` / `preoccupation`. `src/server/kk/vocabulaire-tags.ts` lit
le vocabulaire administrable, déjà localisé.

**Commence par vérifier cet état** : lis ces quatre fichiers et dis dans ton rapport
ce qui existe réellement, avant de coder. Ma description peut être périmée.

## Contraintes globales

1. **Deux familles distinctes, pas une liste mélangée.** « Peau grasse » est un type
   de peau, « taches » une préoccupation : les confondre empêche de croiser les deux,
   qui est précisément ce qu'un visiteur veut faire.
2. **Union DANS une famille, intersection ENTRE familles.** Cocher deux types de peau
   élargit ; cocher un type de peau et une préoccupation restreint. C'est ce qu'un
   visiteur attend d'une liste de cases, et `produitCorrespond` fait déjà l'union.
3. **L'état vit dans l'URL.** Un rayon filtré doit pouvoir être partagé et remis en
   favori. C'est déjà le patron du fichier ; ne le change pas.
4. **Un filtre qui ne rend rien ne doit pas donner une page vide muette** : dis
   combien de produits correspondent, et propose de retirer le dernier filtre posé.
5. **Le filtre de prix borne, il ne trie pas.** Le tri par prix existe déjà et reste
   séparé.
6. **Toute chaîne d'interface passe par next-intl**, dans les deux fichiers de
   messages. Le test de parité les compare.
7. **Les modules de `src/lib/kk/` n'importent que des modules purs.**
8. Français partout dans le code. Aucun nom de personne.
9. **Avant chaque commit :** `tsc --noEmit`, `eslint`, `npm test`, `npm run build`
   **au premier plan**, `timeout` 600000. Rien en arrière-plan.
   `./node_modules/.bin/<binaire>` si `npx` ne résout pas.

---

### Tâche 1 : Les facettes, côté pur

**Fichiers :** `src/lib/kk/facettes.ts`, `src/lib/kk/facettes.test.ts`,
`src/lib/kk/catalog-params.ts` et son test.

- [ ] `produitCorrespondFacettes(tagsProduit, selection)` où `selection` porte les
      familles séparément. **Union dans une famille, intersection entre familles.**
      Écris la règle en commentaire : elle n'est pas devinable, et une inversion
      donnerait un catalogue qui se vide au deuxième clic.
- [ ] `parseFacettes` lit `?peau=grasse,mixte&preoccupation=taches` — valeurs
      inconnues **ignorées**, jamais d'erreur : un lien périmé doit afficher le rayon,
      pas un 500. C'est déjà la doctrine de `parseBesoin`.
- [ ] `parsePrix` lit `?prixMin=&prixMax=` — bornes en francs entiers. **Le FCFA n'a
      pas de sous-unité.** Bornes inversées : les échanger plutôt que rendre une liste
      vide. Valeurs absurdes : ignorées.
- [ ] **Compatibilité :** `?besoin=` existe dans des liens déjà partagés et dans le
      diagnostic. Fais-le survivre — un `besoin` reçu se traduit dans la bonne famille.
      Teste-le explicitement ; un lien de diagnostic cassé serait une régression
      visible.
- [ ] Tests : union dans une famille, intersection entre familles, sélection vide,
      valeur inconnue, bornes de prix inversées, borne seule, ancien paramètre.
      **Éprouve-les par mutation.**
- [ ] Vérifier et commiter.

---

### Tâche 2 : Le filtrage serveur

**Fichiers :** `src/server/kk/catalog.ts`.

- [ ] `getCatalog` accepte les deux familles et les bornes de prix.
- [ ] **Le prix se filtre en base**, pas en mémoire : c'est un `where` sur
      `priceCents`, et filtrer après pagination donnerait des pages de tailles
      inégales.
- [ ] Les facettes portent sur les étiquettes du diagnostic déjà utilisées par
      `besoin` : regarde comment c'est fait et étends, ne réécris pas.
- [ ] **Rends les décomptes par option** — combien de produits pour chaque type de
      peau, chaque préoccupation, chaque marque, dans la sélection courante. Un filtre
      qui annonce zéro avant d'être coché évite un aller-retour inutile.
- [ ] Rends aussi le prix minimum et maximum du rayon, pour borner le curseur.
- [ ] Vérifier et commiter.

---

### Tâche 3 : L'écran

**Fichiers :** `src/components/kk/catalog.tsx`, plus un composant de facettes si le
fichier devient trop gros — dis-le si c'est le cas.

- [ ] Quatre blocs : marque, type de peau, préoccupation, prix. Plus le tri, déjà là.
- [ ] Chaque option porte son décompte. Une option à zéro se désactive plutôt que de
      disparaître : une case qui s'évapore fait douter de ce qu'on a coché.
- [ ] Un résumé des filtres actifs, chacun retirable **individuellement**, et un
      « tout effacer ».
- [ ] **Sur mobile**, les filtres tiennent dans un panneau qu'on ouvre : un rayon
      commençant par deux écrans de cases ne se parcourt pas au téléphone. Regarde ce
      que fait déjà le fichier avant d'inventer.
- [ ] Zéro résultat : dire combien de filtres sont actifs et proposer de retirer le
      dernier.
- [ ] Toutes les chaînes par next-intl, dans les deux fichiers de messages.
- [ ] Vérifier et commiter.

---

### Tâche 4 : Le contrôle

- [ ] `npm run dev`, et parcourir en français **puis en anglais** :
      1. cocher deux types de peau élargit la sélection ;
      2. cocher un type de peau ET une préoccupation la restreint ;
      3. les bornes de prix filtrent, et le tri par prix reste indépendant ;
      4. l'URL décrit l'état, et la recharger le restitue ;
      5. un ancien lien `?besoin=…` fonctionne encore ;
      6. une sélection sans résultat explique ce qui se passe ;
      7. les décomptes correspondent à ce qu'on obtient en cochant.
- [ ] Rapporter chaque point. **Le cinquième est le plus important** : c'est celui
      qui casserait des liens déjà en circulation, y compris ceux du diagnostic.
- [ ] Supprimer les données d'essai, **puis relire la base pour le confirmer**.
- [ ] Vérifier et commiter.

## Vérification finale

- [ ] `npm test` au vert, `npm run build` en succès, parité des messages garantie.
- [ ] Les anciens liens `?besoin=` fonctionnent.
- [ ] Le critère 01 est couvert : catégorie, marque, type de peau, préoccupation,
      prix, tri.
