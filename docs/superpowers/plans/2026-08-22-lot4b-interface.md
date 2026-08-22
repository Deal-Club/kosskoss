# Lot 4B — Les chaînes d'interface passent en bilingue — Plan

> **SOUS-COMPÉTENCE REQUISE :** superpowers:subagent-driven-development.

**Le constat mesuré :** environ 274 chaînes françaises écrites en dur, sur 48 fichiers.
Le lot 4A a traduit le CONTENU (produits, catégories, diagnostic) ; il reste
l'INTERFACE (boutons, titres, compteurs, libellés).

**L'ordre est dicté par l'effet, pas par la taille :** le socle d'abord — quarante
chaînes présentes sur 100 % des pages. Sans lui, même une page traduite à 100 %
garde un menu et un pied de page français, donc aucune page n'est propre.

## Contraintes globales

1. **Toute clé ajoutée l'est dans `src/messages/fr.json` ET `src/messages/en.json`.**
   Une clé présente dans un seul des deux casse le rendu. Vérifie après chaque
   ajout que les deux fichiers ont exactement les mêmes clés.
2. **Réutilise les espaces de noms existants** — `account`, `cart`, `catalog`,
   `checkout`, `common`, `diagnostic`, `footer`, `header`, `home`, `payment`,
   `product`, `recherche`, `reviews`, `wishlist`. **N'en crée un que si aucun ne
   convient**, et dis pourquoi. Certains servent l'ancienne boutique que les
   composants `kk` remplacent : regarde leur contenu avant de dupliquer une clé.
3. **Un composant client lit ses messages par `useTranslations`** ; un composant
   serveur par `getTranslations`. Ne mélange pas.
4. **Ne touche à AUCUNE logique.** Ce lot remplace des chaînes, rien d'autre. Un
   changement de comportement caché dans une vague de traduction est indétectable
   à la relecture.
5. **Les textes français existants sont la source** : recopie-les mot pour mot dans
   `fr.json`. Ne les « améliore » pas au passage — la comparaison avant/après doit
   rester possible.
6. Français partout dans le code et les commentaires. Aucun nom de personne.
7. **Avant chaque commit :** `tsc --noEmit`, `eslint`, `npm test`, et `npm run build`
   **au premier plan**, `timeout` 600000. Rien en arrière-plan.
   `./node_modules/.bin/<binaire>` si `npx` ne résout pas.

---

### Tâche 1 : Le socle — présent sur toutes les pages

**Fichiers :** `src/components/kk/header-actions.tsx` (≈12), `src/components/kk/chrome.tsx` (≈9),
`src/components/kk/cart-drawer.tsx` et `cart-suggestions.tsx` (≈8),
`src/components/PaymentIcons.tsx` (≈5), `favorites-nav.tsx`, `WhatsAppButton.tsx`,
`announcement-bar.tsx`, `cart-button.tsx` (≈6).

- [ ] Recenser les chaînes de ces fichiers, les lister dans le rapport.
- [ ] Les passer par next-intl, dans les espaces `header`, `footer`, `cart`, `common`.
- [ ] **Le bouton WhatsApp** porte un message pré-rempli : il doit partir dans la
      langue du visiteur. Vérifie-le.
- [ ] Contrôler sur `/` puis `/en` que le menu, le pied de page et le tiroir panier
      sont dans la bonne langue.
- [ ] Vérifier et commiter.

---

### Tâche 2 : L'accueil et la fiche produit

**Fichiers :** `home-sections.tsx` (≈31), `raison-detre.tsx` (≈14), `home.tsx` (≈5),
`review-form.tsx` (≈16), `add-to-cart.tsx` (≈6), `product-detail.tsx` (≈4).

Ce sont les deux écrans qui vendent : l'accueil est la porte d'entrée, la fiche
produit est la page de décision.

- [ ] Même méthode : recenser, traduire, contrôler dans les deux langues.
- [ ] **`src/lib/kk/badges.ts`** — « Meilleure vente » et « Nouveauté », affichés sur
      chaque vignette ET chaque fiche, n'ont pas de champ anglais alors que leurs
      voisins `besoins.ts` et `orderStatus.ts` en ont un. Aligne-les sur la
      convention de ces voisins plutôt que d'inventer une troisième forme.
- [ ] Vérifier et commiter.

---

### Tâche 3 : Le diagnostic, le panier, les favoris, la confirmation

**Fichiers :** `diagnostic-flow.tsx` (≈22), `newsletter.tsx` (≈6), `cart-page.tsx` (≈15),
`favorites-view.tsx` (≈11), `confirmation/[orderNumber]/page.tsx` (≈16),
`routines/[slug]/page.tsx` (≈16), `marques/[slug]` et `pagination.tsx` (≈15).

- [ ] Même méthode.
- [ ] **La page de confirmation** porte le bouton WhatsApp pré-rempli du CDC : son
      message doit être dans la langue de la commande, pas dans celle du navigateur.
      C'est la commande qui fait foi.
- [ ] Vérifier et commiter.

---

### Tâche 4 : Les métadonnées restées en dur

**Fichiers :** `confirmation`, `routines`, `[group]`, `[group]/[category]`,
`compte/connexion` — leurs `metadata`.

Ces titres partent dans l'onglet, dans les favoris du visiteur et dans les moteurs
de recherche. Une page traduite au titre français se référence en français.

- [ ] Les passer par `getTranslations`.
- [ ] Vérifier qu'aucun `<title>` ni aucune description de page ne reste en dur sous
      `src/app/[locale]` : `grep -rn "title:" src/app/\[locale\]` et justifier chaque
      cas restant.
- [ ] Vérifier et commiter.

---

### Tâche 5 : Le filet

- [ ] **Écrire un test** qui compare `fr.json` et `en.json` : mêmes clés, aux mêmes
      places, aucune valeur vide. Une clé ajoutée d'un seul côté doit faire tomber la
      suite. C'est ce qui empêchera la prochaine traduction d'être à moitié faite.
- [ ] **Éprouver ce test par mutation** : ajoute une clé dans `fr.json` seulement,
      vérifie qu'il tombe, rétablis. Rapporte le résultat.
- [ ] Compter les chaînes françaises restantes et **le dire** : le rapport doit
      donner le chiffre d'avant et celui d'après, par fichier. Ce lot ne prétend pas
      finir le bilinguisme s'il ne le finit pas.
- [ ] Contrôler `/` et `/en` sur les dix écrans principaux, et rapporter.
- [ ] Vérifier et commiter.

## Vérification finale

- [ ] `npm test` au vert, `npm run build` en succès.
- [ ] `fr.json` et `en.json` ont exactement les mêmes clés — garanti par le test.
- [ ] Le chiffre des chaînes restantes est écrit au rapport.
