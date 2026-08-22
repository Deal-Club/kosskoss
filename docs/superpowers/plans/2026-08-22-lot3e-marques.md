# Lot 3E — Les marques deviennent une entité — Plan d'implémentation

> **Pour les exécutants agentiques :** SOUS-COMPÉTENCE REQUISE —
> superpowers:subagent-driven-development.

**But :** donner aux marques une existence propre — logo, description, ordre, page
dédiée — au lieu d'une chaîne recopiée sur chaque produit.

**Architecture :** une table `Brand`, une relation nullable depuis `Product` qui
**garde** son libellé, un rattachement par bouton idempotent plutôt que par
migration de données, un écran d'administration et une page de marque en vitrine.

**Spécification :** `docs/superpowers/specs/2026-08-22-lot3e-marques-design.md`

---

## Contraintes globales

1. **Migration strictement additive** : une table, deux colonnes, aucune donnée
   touchée. La base de développement EST la base de production. Séquence imposée :
   `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
   pour lire le SQL, puis écrire le dossier de migration à la main, puis
   `npx prisma migrate deploy` et `npx prisma generate`.
   **`prisma migrate dev` se bloque dans cet environnement — ne l'utilise pas.**
2. **`Product.brand` reste.** C'est le libellé affiché, figé comme le sont ceux de
   `OrderItem`. La relation apporte ce que la chaîne ne peut pas porter.
3. **Le rapprochement des marques ignore la casse et les accents, et RIEN
   D'AUTRE.** Ni les espaces internes, ni la ponctuation. Un rapprochement trop
   large fond deux marques distinctes et change la marque de produits réels.
4. **Toute nouvelle route et tout nouvel écran d'administration nomment leur
   capacité** — `requireCapaciteApi("catalogue")` / `requireCapacitePage("catalogue")`
   — et la famille `brands` doit être ajoutée à `CAPACITE_PAR_FAMILLE`. Un test
   ouvre chaque fichier et échoue sinon.
5. **Les modules de `src/lib/kk/` n'importent que des modules purs.**
   `src/lib/slugify.ts` en est un (zéro import) : réutilise-le, ne le recopie pas.
6. Français partout, repli sur le français quand une traduction anglaise est vide.
7. Aucun nom de personne ni pseudonyme.
8. **Vérification avant chaque commit :** `npx tsc --noEmit`, `npx eslint src --ext
   .ts,.tsx`, `npm test`, et `npm run build` aux tâches qui touchent une page ou une
   route. Rien en arrière-plan : `npm run build` au premier plan avec un `timeout`
   explicite de 600000 millisecondes.

---

### Tâche 1 : La clé de rapprochement

**Fichiers :** créer `src/lib/kk/marques.ts` et `src/lib/kk/marques.test.ts`.

**Interfaces produites :** `cleMarque(nom: string): string`.

**Le point à ne pas manquer.** Deux fonctions coexistent et ne doivent pas être
confondues : `slugify` (déjà dans `src/lib/slugify.ts`) fabrique l'identifiant
d'URL, et `cleMarque` sert à reconnaître deux écritures d'une même marque. Les
confondre ferait fusionner « Nivea Soft » et « Nivea-Soft », qui sont peut-être deux
gammes.

- [ ] **Étape 1 : écrire les tests**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleMarque } from "./marques";
import { slugify } from "@/lib/slugify";

describe("cleMarque", () => {
  it("ignore la casse", () => {
    assert.equal(cleMarque("NIVEA"), cleMarque("Nivea"));
  });

  it("ignore les accents", () => {
    // La faute de frappe la plus courante du catalogue : un accent en trop.
    assert.equal(cleMarque("Nivéa"), cleMarque("Nivea"));
  });

  it("ignore les espaces de bord", () => {
    assert.equal(cleMarque("  Nivea "), cleMarque("Nivea"));
  });

  it("CONSERVE les espaces internes", () => {
    // « La Roche-Posay » et « LaRochePosay » peuvent être deux choses
    // différentes ; les fondre changerait la marque de produits réels.
    assert.notEqual(cleMarque("La Roche Posay"), cleMarque("LaRochePosay"));
  });

  it("CONSERVE la ponctuation", () => {
    assert.notEqual(cleMarque("L'Oréal"), cleMarque("LOreal"));
  });

  it("n'est PAS le slug d'URL", () => {
    // Deux fonctions, deux rôles. `slugify` écrase les espaces en tirets ;
    // `cleMarque` ne le fait pas, et c'est toute la différence.
    assert.notEqual(cleMarque("La Roche Posay"), slugify("La Roche Posay"));
  });

  it("rend une chaîne vide pour une saisie vide", () => {
    assert.equal(cleMarque("   "), "");
  });
});
```

- [ ] **Étape 2 : voir les tests échouer, puis écrire le module**

```ts
/**
 * Reconnaissance des marques écrites de plusieurs façons.
 *
 * ── DEUX FONCTIONS, DEUX RÔLES ──────────────────────────────────────────────
 *
 * `slugify` (src/lib/slugify.ts) fabrique un identifiant d'URL : il écrase tout
 * ce qui n'est pas alphanumérique en tirets. `cleMarque` sert à autre chose —
 * décider si deux écritures désignent la même marque.
 *
 * Les confondre ferait fondre « La Roche Posay » et « LaRochePosay », qui sont
 * peut-être deux gammes distinctes. Le rapprochement ignore donc la casse et
 * les accents, ET RIEN D'AUTRE : ce sont les deux seules variations qu'une
 * saisie au clavier produit sans intention.
 */
import { slugify } from "@/lib/slugify";

export function cleMarque(nom: string): string {
  return nom
    .trim()
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Identifiant d'URL d'une marque. Délégué : une seule règle de slug dans le dépôt. */
export function slugMarque(nom: string): string {
  return slugify(nom);
}
```

- [ ] **Étape 3 : vérifier et commiter**

```bash
node --test --import tsx src/lib/kk/marques.test.ts
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test
git commit src/lib/kk/marques.ts src/lib/kk/marques.test.ts -m "Clé de rapprochement des marques"
```

---

### Tâche 2 : Le modèle et la migration

**Fichiers :** `prisma/schema.prisma`, un dossier de migration.

- [ ] **Étape 1 : ajouter le modèle**

```prisma
/// Marque du catalogue. Le libellé reste recopié sur `Product.brand` : la
/// relation apporte ce que la chaîne ne peut pas porter — logo, description,
/// ordre, état — sans obliger à réécrire tout ce qui lit la chaîne.
model Brand {
  id            String    @id @default(cuid())
  slug          String    @unique
  name          String    @unique
  nameEn        String    @default("")
  description   String    @default("")
  descriptionEn String    @default("")
  logo          String    @default("")
  /// Ordre d'affichage ; à égalité, l'ordre alphabétique tranche.
  position      Int       @default(0)
  /// Une marque inactive quitte la vitrine sans qu'on touche à ses produits.
  active        Boolean   @default(true)
  products      Product[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([position])
}
```

Dans `Product`, à côté de `brand` :

```prisma
  brand   String
  /// Rattachement facultatif à une marque. NULL = pas encore rattaché ; le
  /// libellé `brand` reste la source d'affichage dans tous les cas.
  /// `SetNull` : supprimer une marque ne doit pas emporter ses produits.
  brandId String?
  marque  Brand?  @relation(fields: [brandId], references: [id], onDelete: SetNull)
```

Et l'index : `@@index([brandId])`.

- [ ] **Étape 2 : lire le SQL, SANS l'appliquer**

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Attendu : une création de table `Brand`, ses index uniques, l'ajout de la colonne
`brandId` à `Product`, son index et sa contrainte de clé étrangère. **Rien d'autre.**
Si le SQL contient un `DROP`, un `NOT NULL` sur une colonne existante, ou une table
recréée, **arrête et signale sans rien appliquer**.

- [ ] **Étape 3 : écrire la migration à la main et l'appliquer**

Crée `prisma/migrations/20260822120000_marques/migration.sql` avec exactement le SQL
lu à l'étape 2, puis :

```bash
npx prisma migrate deploy
npx prisma generate
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

La dernière commande doit rendre une migration vide : base et schéma en phase.

- [ ] **Étape 4 : vérifier et commiter**

```bash
npx tsc --noEmit && npm test && npm run build
git add prisma/schema.prisma prisma/migrations src/generated/prisma
git commit -m "Les marques ont une table, les produits un rattachement"
```

---

### Tâche 3 : La lecture, l'écriture et l'import

**Fichiers :** créer `src/server/kk/marques.ts`.

**Interfaces produites :**
- `listerMarques(options?: { seulementActives?: boolean }): Promise<MarqueRecord[]>`
- `marqueParSlug(slug: string): Promise<MarqueRecord | null>`
- `creerMarque(input)`, `modifierMarque(id, patch)`, `supprimerMarque(id)`
- `importerMarquesDuCatalogue(): Promise<CompteRenduImport>`

- [ ] **Étape 1 : écrire le module**

Points imposés :

1. **`importerMarquesDuCatalogue` est idempotent.** Le relancer deux fois ne doit
   rien créer la seconde fois. C'est ce qui permet de le proposer comme bouton.
2. Il rend un compte rendu **nommé**, pas un compte :

```ts
export interface CompteRenduImport {
  creees: string[];
  /** Écritures différentes rattachées à une même marque, à faire voir. */
  fusionnees: { conservee: string; variantes: string[] }[];
  produitsRattaches: number;
  produitsDejaRattaches: number;
}
```

3. **Le rapprochement passe par `cleMarque`**, jamais par une comparaison directe.
4. **Le slug est rendu unique** : si deux noms distincts donnent le même slug,
   suffixe le second (`nivea`, `nivea-2`). Un `@unique` qui explose en production
   sur un import est un incident ; un suffixe est une gêne.
5. Une marque dont le nom est vide est ignorée, pas créée.
6. Écris en commentaire pourquoi le rapprochement est volontairement étroit.

- [ ] **Étape 2 : vérifier et commiter**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test
git commit src/server/kk/marques.ts -m "Lecture, écriture et import des marques"
```

---

### Tâche 4 : Le back-office des marques

**Fichiers :**
- `src/lib/kk/routesAdmin.ts` — ajouter `brands: "catalogue"`
- `src/app/api/admin/brands/route.ts` et `[id]/route.ts` et `import/route.ts`
- `src/app/admin/(protected)/brands/page.tsx`, `new/page.tsx`, `[id]/page.tsx`
- `src/components/admin/BrandForm.tsx`
- `src/components/admin/AdminSidebar.tsx` — entrée « Marques » dans la section Catalogue

- [ ] **Étape 1 : la carte des capacités d'abord**

Ajoute `brands: "catalogue"` à `CAPACITE_PAR_FAMILLE` **avant** d'écrire les routes.
Le test d'arborescence échouera sinon, et c'est exactement son rôle.

- [ ] **Étape 2 : les routes**

Chaque fonction exportée appelle `requireCapaciteApi("catalogue")`. La route d'import
est un `POST` sans corps qui rend le compte rendu en JSON.

Validation : nom obligatoire et unique, slug dérivé du nom s'il n'est pas fourni,
logo suivant la règle des images du dépôt (chemin interne ou URL absolue — regarde
comment `productInput.ts` le fait et suis la même règle).

- [ ] **Étape 3 : les écrans**

Chaque page appelle `requireCapacitePage("catalogue")`.

La liste montre : logo, nom, nombre de produits, état, position. Le bouton d'import
y figure, avec **le compte rendu affiché après exécution** — nommant les marques
créées et les écritures fusionnées. Un import muet ne se vérifie pas.

Le formulaire porte : nom, nom anglais, description, description anglaise, logo,
position, actif.

- [ ] **Étape 4 : le formulaire produit**

Dans `src/components/admin/ProductForm.tsx`, la marque devient une liste déroulante
des marques existantes **doublée d'une saisie libre** : un produit dont la marque
n'existe pas encore doit pouvoir être créé. Choisir une marque de la liste renseigne
`brandId` ; une saisie libre laisse `brandId` vide et sera rattachée au prochain
import.

- [ ] **Étape 5 : vérifier et commiter**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test && npm run build
```

- [ ] **Étape 6 : lancer l'import pour de vrai**

Depuis `/admin/brands`, clique « Importer les marques du catalogue » et **recopie le
compte rendu dans ton rapport** : marques créées, écritures fusionnées, produits
rattachés. Relance-le une seconde fois et vérifie qu'il ne crée rien — c'est la
preuve de l'idempotence.

---

### Tâche 5 : La vitrine

**Fichiers :**
- `src/app/[locale]/marques/page.tsx` — réécrit sur l'entité
- `src/app/[locale]/marques/[slug]/page.tsx` — créé
- `src/server/kk/navigation.ts` — `getShopBrands` lit désormais la table

- [ ] **Étape 1 : le listing**

Il lit les marques **actives ayant au moins un produit actif**. Une marque sans
produit ne s'affiche pas : une page vide déçoit plus qu'une absence. Logo, nom,
accroche, dans l'ordre `position` puis alphabétique.

- [ ] **Étape 2 : la page de marque**

`/marques/[slug]` : nom, logo, description, et la grille de ses produits actifs.
`generateMetadata` avec le nom et la description, et `alternatesFor` pour les deux
langues — regarde comment `marques/page.tsx` le fait aujourd'hui et suis le même
patron. Un slug inconnu rend `notFound()`.

L'anglais se replie sur le français quand `nameEn` ou `descriptionEn` est vide.

- [ ] **Étape 3 : `getShopBrands`**

Il rend aujourd'hui des chaînes distinctes des produits. Fais-le lire la table, en
gardant **le même type de retour** si ses appelants s'en contentent — sinon adapte
les appelants et dis lesquels dans ton rapport.

**Cas de repli à traiter explicitement :** si la table est vide — import jamais
lancé — la vitrine ne doit pas perdre sa page marques. Retombe alors sur les chaînes
distinctes des produits, et écris en commentaire pourquoi ce repli existe.

- [ ] **Étape 4 : vérifier**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test && npm run build
npm run dev
```

Contrôle à la main : `/marques` liste les marques ; `/marques/<un-slug>` montre la
marque et ses produits ; `/en/marques` fonctionne ; un slug inconnu rend une 404 ;
une marque désactivée disparaît du listing sans que ses produits disparaissent du
catalogue.

Écris le résultat de chacun de ces cinq points dans ton rapport.

---

## Vérification finale du lot

- [ ] `npm test` au vert, `npm run build` en succès.
- [ ] `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
      rend une migration vide.
- [ ] Aucune route ni écran `brands` sans capacité déclarée — le test d'arborescence
      le garantit.
- [ ] L'import a été lancé deux fois, et la seconde n'a rien créé.
