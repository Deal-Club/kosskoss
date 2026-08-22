# Lot 3E — Les marques deviennent une entité

**Critère visé :** 13 (back-office complet — volet marques).

---

## 1. L'état des lieux

Une marque n'est aujourd'hui qu'une chaîne recopiée sur chaque produit
(`Product.brand String`, indexée). La page `/marques` en tire une liste par
`distinct` (`src/server/kk/navigation.ts:120`).

Ce que cela empêche :

- **aucune page de marque** — un visiteur qui cherche « Nivea » n'a nulle part où
  aller, alors que c'est un chemin d'entrée naturel en cosmétique ;
- **aucun logo, aucune description** — donc rien à montrer et rien à référencer ;
- **aucun ordre choisi** — l'ordre alphabétique décide seul de qui est mis en avant ;
- **une faute de frappe crée une marque** — « Nivéa » et « Nivea » deviennent deux
  marques, silencieusement, et rien ne le signale ;
- **impossible de retirer une marque de la vitrine** sans toucher aux produits.

## 2. Ce que ce lot établit

### 2.1 Une table `Brand`, et le libellé qui reste

```prisma
model Brand {
  id            String  @id @default(cuid())
  slug          String  @unique
  name          String  @unique
  nameEn        String  @default("")
  description   String  @default("")
  descriptionEn String  @default("")
  logo          String  @default("")
  /** Ordre d'affichage ; à égalité, l'ordre alphabétique tranche. */
  position      Int     @default(0)
  /** Une marque inactive disparaît de la vitrine sans toucher aux produits. */
  active        Boolean @default(true)
  products      Product[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

`Product` gagne `brandId String?` et la relation, **en gardant `brand String`**.

**Ce n'est pas une redondance, c'est la doctrine du dépôt.** `OrderItem` recopie
déjà la marque, le nom et le prix ; le coupon est figé sur la commande. La chaîne
`Product.brand` reste le libellé affiché, et la relation apporte ce que la chaîne ne
peut pas porter : logo, description, ordre, état. Supprimer la chaîne obligerait à
réécrire 94 fichiers pour un gain nul.

`onDelete: SetNull` : supprimer une marque ne doit pas emporter ses produits. Le
produit garde son libellé et perd son rattachement — visible, réparable.

### 2.2 Le rattachement se fait par un écran, pas par une migration

La migration est **strictement additive** : deux colonnes et une table, aucune
donnée touchée. C'est la règle du dépôt, et la base de développement est la base de
production.

Le rattachement des produits existants se fait par un bouton du back-office,
**« Importer les marques du catalogue »** :

1. il lit les marques distinctes des produits ;
2. crée celles qui manquent, avec un identifiant d'URL dérivé du nom ;
3. rattache les produits dont `brandId` est vide ;
4. rend un compte rendu : combien créées, combien rattachées, combien déjà liées.

**Pourquoi un bouton plutôt qu'un script SQL.** Le rattachement doit tourner sur la
base de production, et un script suppose un accès shell qu'on n'a pas toujours sous
la main. Un bouton est idempotent, se relance sans risque, et dit ce qu'il a fait —
un `UPDATE` massif ne dit rien.

**Le rapprochement est insensible à la casse et aux accents**, ce qui fait apparaître
les doublons de saisie au lieu de les figer. « Nivéa » et « Nivea » se rattachent à
la même marque, et le compte rendu signale que deux orthographes ont été fondues.

### 2.3 La vitrine

- **`/marques`** liste les marques actives, avec logo et accroche, dans l'ordre
  choisi. Une marque sans produit actif ne s'affiche pas : une page vide déçoit plus
  qu'une absence.
- **`/marques/[slug]`** présente la marque et ses produits. C'est la page qui
  n'existait pas.
- Les deux existent en français et en anglais, avec repli sur le français quand la
  traduction est vide — la règle déjà établie pour les catégories.

### 2.4 Le back-office

`/admin/brands`, sous la capacité `catalogue` : liste, création, modification,
téléversement de logo, ordre, activation, et le bouton d'import. Le formulaire
produit gagne une liste déroulante des marques, tout en gardant la saisie libre :
un produit dont la marque n'existe pas encore doit pouvoir être créé.

## 3. Hors périmètre

- **La facette « marque » du catalogue** — elle relève du lot 4, avec les autres
  facettes. Cette entité en est le préalable.
- **La fusion manuelle de deux marques** — l'import fond déjà les variantes
  d'orthographe ; fusionner deux marques réellement distinctes est un cas rare qui
  se traite par une modification de produits.
- **Les traductions au-delà du nom et de la description** — le lot 3G leur donne un
  écran dédié.

## 4. Architecture

```
prisma/schema.prisma              modèle Brand, Product.brandId
prisma/migrations/…               additive : une table, deux colonnes
src/lib/kk/slug.ts                pur — identifiant d'URL, et clé de rapprochement
src/server/kk/marques.ts          lecture, écriture, import depuis le catalogue
src/app/admin/(protected)/brands/ liste et formulaire
src/app/api/admin/brands/         CRUD + import
src/app/[locale]/marques/         listing (existant, réécrit) et page de marque
src/lib/kk/routesAdmin.ts         `brands` sous `catalogue`
```

## 5. Tests

Le module d'identifiants est pur et testé : accents, majuscules, espaces,
ponctuation, chaîne vide, collisions. La **clé de rapprochement** est testée
séparément du **slug d'URL** : ce sont deux fonctions, et les confondre ferait
fusionner des marques distinctes.

L'import est vérifié à la main sur la base réelle, avec son compte rendu — le dépôt
n'a pas d'infrastructure de test avec base.

## 6. Le risque, nommé

**L'import fond des marques.** S'il rapproche trop largement, deux marques
réellement différentes fusionnent et des produits changent de marque. C'est pourquoi
le rapprochement ignore la casse et les accents, **et rien d'autre** : ni les
espaces internes, ni la ponctuation, ni les abréviations. Le compte rendu nomme
chaque fusion, pour qu'elle se voie.
