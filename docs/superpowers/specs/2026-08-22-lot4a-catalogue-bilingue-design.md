# Lot 4A — La boutique anglaise affiche enfin l'anglais

**Critère servi :** 10 (bilinguisme intégral). C'est le préalable des facettes et
de la page de diagnostic, qui viendront ensuite.

---

## 1. Le problème, mesuré

Le back-office sait saisir quarante champs de traduction — le lot 3G vient de le
rendre praticable. **La boutique ne les lit presque nulle part.**

`toProductView` (`src/server/kk/product-view.ts:62`), qui alimente neuf appelants,
**ne reçoit aucune langue**. `getCatalog` et `getProductDetail` non plus.

| Localisé aujourd'hui | Non localisé |
|---|---|
| `/recherche` | l'accueil |
| `/marques` et `/marques/[slug]` (la marque, pas ses produits) | `/[group]` et `/[group]/[category]` |
| `/routines` (sauf le nom des produits) | **la fiche produit**, y compris son titre et sa description de page |
| tout le Journal | les **questions et réponses du diagnostic** |
| le pied de page, les gestes, les tags | le **méga-menu** (univers, catégories, routines) |
| | panier, favoris, vus récemment |
| | les lignes des e-mails de commande et de campagne |

Un acheteur anglophone voit donc une interface en anglais posée sur un catalogue en
français. C'est la moitié du bilinguisme que le cahier des charges exige.

## 2. Deux défauts structurels, plus graves que l'oubli d'un appel

### 2.1 La commande fige le français

`src/server/kk/checkout.ts` recopie `name` et `variantLabel` sur la ligne de
commande **avant** de résoudre la langue de l'acheteur, seize lignes plus bas.

Conséquence : même une fois la fiche produit localisée, un acheteur anglophone
recevra une confirmation, des e-mails, un espace client et une facture **en
français**. Le figement est la bonne doctrine — une commande est un document
historique — mais il fige aujourd'hui la mauvaise langue.

**Décision : la ligne de commande fige le libellé dans la langue de l'acheteur.**
C'est celle dans laquelle il a acheté, donc celle qui fait foi entre lui et la
boutique.

### 2.2 Trois contenus n'ont aucune colonne anglaise

`Announcement.message`, `DiagAnswer.chip` et `Campaign.name` n'ont pas de champ
`*En`. Tant qu'ils existent, l'écran des traductions ne pourra jamais annoncer
100 % en vérité.

**Décision : on ajoute les colonnes manquantes** — migration additive, valeur par
défaut vide, repli sur le français comme partout ailleurs. `Campaign.name` est un
libellé interne au back-office : il reste **hors** de l'écran des traductions, et la
spécification le dit.

## 3. Ce que ce lot établit

### 3.1 La langue traverse la lecture du catalogue

`toProductView(row, index, locale)` et les fonctions qui l'appellent reçoivent la
langue. La règle de repli est celle qui existe déjà (`pickText`, `pickList` de
`src/server/localizedContent.ts`) : **une traduction vide vaut le français**, et
personne ne voit jamais une case vide.

**Un seul point d'entrée pour la traduction, pas neuf.** Aujourd'hui `/recherche`
appelle `loadCatalogTranslations` puis `localizeProduct` à la main : c'est
précisément ce que les huit autres appelants ont oublié de faire. La traduction
descend donc dans la lecture, là où on ne peut plus l'oublier.

### 3.2 Ce qui doit être localisé, et l'ordre

1. **La fiche produit** — c'est la page qui vend, et son titre et sa description de
   page comptent autant que son corps : ils partent dans les moteurs de recherche.
2. **Le méga-menu** — univers, catégories, routines. Il est sur toutes les pages ;
   un menu français annule l'effet de toute autre traduction.
3. **Les listes** — accueil, univers, catégorie, promo, produits associés, favoris.
4. **Le diagnostic** — questions, réponses, et leur pastille.
5. **Le bandeau d'annonce.**
6. **La commande** — libellé figé dans la langue de l'acheteur, et les lignes des
   e-mails.

### 3.3 Ce qui reste français, et pourquoi

- **La marque** — « Nivea » ne se traduit pas. `localizeProduct` le fait déjà.
- **Le libellé interne des campagnes** — il ne sort jamais du back-office.
- **Le flux Google Merchant** — sa langue est un réglage de flux, pas une traduction
  de page. Hors périmètre, et à traiter avec le lot de mesure d'audience.

## 4. Architecture

```
src/server/kk/product-view.ts   `toProductView` reçoit la langue
src/server/kk/catalog.ts        la lecture localise, une fois pour toutes
src/server/kk/navigation.ts     le méga-menu localise
src/server/kk/diagnostic.ts     questions, réponses, pastilles
src/server/kk/checkout.ts       fige le libellé dans la langue de l'acheteur
src/server/kk/announcement.ts   le bandeau
prisma/schema.prisma            trois colonnes `*En` ajoutées
src/lib/kk/traductions.ts       le registre gagne les deux champs publics
```

## 5. Tests

`pickText` et `pickList` sont déjà testés. Ce lot ajoute :

- **la localisation d'une vue produit** — nom traduit, nom absent, description
  partielle, puces de longueur différente, marque jamais traduite ;
- **le registre des traductions** — le test registre/schéma existant doit passer
  après l'ajout des trois colonnes, ce qui prouve qu'elles y ont été déclarées.

Les pages sont vérifiées à la main, écran par écran, en français puis en anglais.

## 6. Le risque, nommé

**Un repli mal branché affiche une case vide.** Une traduction absente doit rendre
le français, jamais une chaîne vide — un nom de produit vide sur une vignette est
pire qu'un nom français. C'est pourquoi tout passe par `pickText`, jamais par un
accès direct au champ `*En`.
