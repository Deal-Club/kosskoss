# Lot 2 — Diagnostic administrable, profil, bilinguisme : plan d'implémentation

> **Pour les agents :** SOUS-COMPÉTENCE REQUISE — utiliser `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans` pour dérouler ce plan tâche par tâche.
> Les étapes utilisent la syntaxe à cases (`- [ ]`) pour le suivi.

**Goal :** rendre les critères d'acceptation 08, 09 et 10 de l'annexe 3 satisfaits.

**Architecture :** les gestes du diagnostic quittent le code pour la base, ce qui rend le
nombre de produits proposés administrable et leurs libellés bilingues. Un profil par client
stocke ses réponses — pas sa routine — pour qu'un retour six mois plus tard recalcule sur le
catalogue du jour. L'e-mail de routine et l'inscription à la lettre d'information restent
deux consentements distincts. Le bilinguisme applique un motif déjà présent dans le dépôt
plutôt que d'en introduire un second.

**Tech Stack :** Next.js 16 (App Router), React 19, TypeScript strict, Prisma 7.9 sur
PostgreSQL (Neon), next-intl, nodemailer, `node --test` avec `tsx`.

**Spec :** [`docs/superpowers/specs/2026-08-21-lot2-diagnostic-bilinguisme-design.md`](../specs/2026-08-21-lot2-diagnostic-bilinguisme-design.md)

---

## Global Constraints

- **Le FCFA n'a pas de sous-unité.** Les entiers des champs `*Cents` SONT des francs
  entiers. Jamais de division par 100. Formatage par `formatFcfa` (`src/lib/kk/format.ts`).
- **Une seule base de données.** Le développement et la production partagent l'instance
  Neon. **Ne jamais lancer `npx prisma migrate dev` seul** : la commande peut proposer de
  réinitialiser la base si elle détecte une dérive. Séquence imposée :
  `npx prisma migrate dev --create-only --name <sujet>`, relecture du SQL généré, puis
  `npx prisma migrate deploy`, puis `npx prisma generate`. Toute migration doit être
  **additive**.
- **Nommage des migrations :** `AAAAMMJJHHMMSS_sujet_en_snake_case`, en français.
- **Un seed ne revient jamais sur un choix éditorial.** Leçon du lot 1 : le seed des tags
  écrasait `family` à chaque exécution, annulant ce que le client avait réglé en
  administration. Sur une ligne existante, un seed ne met à jour que ce qui n'est pas un
  choix du client.
- **Tests :** fichiers `*.test.ts` à côté du module testé, sous `src/`. Style `node:test`
  + `node:assert/strict`, `describe` / `it`, en français. Aucun accès base dans les tests :
  la logique testable doit être extraite en fonctions pures.
- **Lancer un test :** `node --test --import tsx <chemin>`
- **Lancer la suite :** `npm test`. Point de départ : **404 tests au vert**. Chaque tâche
  annonce le total attendu après elle ; aucune ne doit faire baisser ce nombre.
- **Avant chaque commit :** `npx tsc --noEmit` puis `npx eslint`, tous deux sans sortie.
  Les tâches touchant un composant React ajoutent `npx next build`.
- **Commentaires en français**, expliquant le *pourquoi*, à la densité du code existant.
- **TypeScript strict, aucun `any`.**
- **Toute valeur fournie par le client insérée dans un e-mail HTML passe par `esc()`**
  (`src/server/kk/emails.ts`) — il existe pour empêcher l'injection depuis un nom d'acheteur.

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/lib/kk/langue.ts` | Choix de langue, pur. Aucun accès base. |
| `src/lib/kk/langue.test.ts` | Tests du choix de langue. |
| `src/server/kk/gestes.ts` | Lecture des gestes du diagnostic, côté boutique et côté admin. |
| `src/lib/kk/gestes-selection.ts` | Tri, filtrage et libellé des gestes, pur. |
| `src/lib/kk/gestes-selection.test.ts` | Tests de la sélection. |
| `src/server/kk/diagnostic.ts` | *(modifié)* `buildRoutine` lit les gestes en base. |
| `src/app/admin/(protected)/diagnostic/gestes/page.tsx` | Écran des gestes. |
| `src/app/api/admin/diagnostic-steps/route.ts` | Écriture des gestes. |
| `src/server/kk/profil-diagnostic.ts` | Lecture et écriture du profil client. |
| `src/lib/kk/profil-reponses.ts` | Sérialisation des identifiants de réponses, pur. |
| `src/lib/kk/profil-reponses.test.ts` | Tests de la sérialisation. |
| `src/server/kk/emails.ts` | *(modifié)* les trois e-mails deviennent bilingues, plus la routine. |
| `src/app/api/kk/diagnostic/routine-email/route.ts` | Envoi de la routine par e-mail. |
| `src/components/kk/diagnostic-flow.tsx` | *(modifié)* formulaire d'envoi en phase résultat. |
| `src/components/kk/checkout-form.tsx` | *(modifié)* passe sous `next-intl`. |

---

## Ordre des tâches

Les tâches sont numérotées dans leur ordre d'exécution, et cet ordre n'est pas
interchangeable :

- **1 → 2 → 3** : les gestes administrables. La 2 ne peut pas lire une table que la 1 n'a
  pas créée, la 3 ne peut pas l'éditer sans la lecture de la 2.
- **4 → 5** : le profil client.
- **6 avant 7** : l'e-mail de routine naît bilingue, il lui faut donc le module de langue
  que la 6 met en place. L'inverse créerait une dette à reprendre aussitôt.
- **7 → 8** : le formulaire d'envoi appelle la route que la 7 crée.
- **9** est indépendante et peut se traiter à tout moment.

---

### Task 1 : Modèle `DiagStep`, migration et seed

**Files:**
- Modify: `prisma/schema.prisma` (nouveau modèle `DiagStep`)
- Create: `prisma/migrations/<horodatage>_gestes_diagnostic/migration.sql`
- Create: `prisma/seed-gestes.ts`
- Modify: `package.json` (script `db:seed:gestes`, ajouté aussi à la chaîne `db:seed`)

**Interfaces:**
- Consumes: rien.
- Produces: `prisma.diagStep` avec `key`, `labelFr`, `labelEn`, `category`, `position`, `active`.

**Attention au nom.** `RoutineStep` est **déjà** un modèle Prisma (`schema.prisma:294`),
celui des routines éditoriales. Le modèle des gestes du diagnostic s'appelle `DiagStep`,
dans la famille de `DiagQuestion` et `DiagAnswer`.

- [ ] **Step 1 : Ajouter le modèle au schéma**

À la suite de `DiagAnswer` dans `prisma/schema.prisma` :

```prisma
// Gestes du Diagnostic Beauté : un produit est proposé par geste actif.
//
// Le nom ne peut pas être « RoutineStep » : ce modèle existe déjà, pour les
// routines éditoriales. La famille Diag* est la bonne voisine.
//
// La CLÉ est l'identifiant, comme pour ProductTag : elle sert de repère stable
// au moteur de routines et n'a aucune raison de changer.
//
// Le NOMBRE de produits proposés découle du nombre de gestes actifs. C'est
// voulu : un plafond arbitraire couperait une routine au milieu, laissant un
// client avec un nettoyant et un traitement, sans hydratant ni protection.
model DiagStep {
  key      String  @id
  labelFr  String
  labelEn  String  @default("")
  // Slug de la catégorie produit où puiser le candidat de ce geste.
  category String
  position Int     @default(0)
  active   Boolean @default(true)

  @@index([position])
}
```

- [ ] **Step 2 : Vérifier le schéma**

Run: `npx prisma validate`
Expected: `The schema at prisma\schema.prisma is valid 🚀`

- [ ] **Step 3 : Créer la migration sans l'appliquer**

⚠️ **La base Neon est partagée avec la production.** Ne jamais lancer `migrate dev` seul.

```bash
npx prisma migrate dev --create-only --name gestes_diagnostic
```

Lire le SQL généré et le recopier dans le rapport. Il doit contenir uniquement
`CREATE TABLE "DiagStep"` et son index. **S'il contient un `DROP`, un `TRUNCATE` ou un
`ALTER ... NOT NULL` sur une colonne existante, s'arrêter et signaler BLOCKED avec le SQL.**

- [ ] **Step 4 : Appliquer et régénérer**

```bash
npx prisma migrate deploy && npx prisma generate
```

Expected: migration appliquée, `Generated Prisma Client`

- [ ] **Step 5 : Écrire le seed**

Créer `prisma/seed-gestes.ts`. Les quatre gestes sont ceux de la constante
`ROUTINE_STEPS` actuellement dans `src/server/kk/diagnostic.ts:15-20`, avec leurs
traductions anglaises :

```ts
import { prisma } from "../src/server/prisma";

/**
 * Gestes du Diagnostic Beauté.
 *
 * Repris de la constante ROUTINE_STEPS qui vivait dans
 * src/server/kk/diagnostic.ts, avec les traductions anglaises qui lui
 * manquaient : un visiteur sur /en lisait « Nettoyer ».
 */
const GESTES = [
  { key: "nettoyer", labelFr: "Nettoyer", labelEn: "Cleanse", category: "nettoyants" },
  { key: "traiter", labelFr: "Traiter", labelEn: "Treat", category: "traitements" },
  { key: "hydrater", labelFr: "Hydrater", labelEn: "Moisturise", category: "hydratants" },
  { key: "proteger", labelFr: "Protéger", labelEn: "Protect", category: "solaires" },
];

async function main() {
  for (const [index, geste] of GESTES.entries()) {
    await prisma.diagStep.upsert({
      where: { key: geste.key },
      // Sur une ligne existante, on ne met à jour QUE les libellés. Ni
      // `position`, ni `active`, ni `category` : ce sont des choix que le
      // client fait depuis l'administration, et un seed rejoué ne doit jamais
      // revenir dessus. C'est la leçon du seed des tags, au lot précédent.
      update: { labelFr: geste.labelFr, labelEn: geste.labelEn },
      create: { ...geste, position: index },
    });
  }
  console.log(`${GESTES.length} gestes en place.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 6 : Déclarer et exécuter le seed**

Dans `package.json`, ajouter `"db:seed:gestes": "tsx prisma/seed-gestes.ts",` et
l'enchaîner dans `db:seed`.

Run: `npm run db:seed:gestes`
Expected: `4 gestes en place.`

- [ ] **Step 7 : Vérifier**

Run: `npx tsc --noEmit && npx eslint && npm test`
Expected: aucune erreur, **404 tests au vert**

- [ ] **Step 8 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/seed-gestes.ts package.json
git commit -m "Les gestes du diagnostic entrent en base

Le nombre de produits proposés découlera du nombre de gestes actifs, plutôt que
d'être figé à quatre par une constante de code. Les libellés gagnent au passage
leur traduction anglaise, qui manquait : un visiteur sur /en lisait « Nettoyer ».

Le modèle s'appelle DiagStep et non RoutineStep : ce dernier existe déjà pour
les routines éditoriales.

Le seed ne met à jour que les libellés sur une ligne existante — position,
activation et catégorie sont des choix du client.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2 : `buildRoutine` lit les gestes en base

**Files:**
- Create: `src/lib/kk/gestes-selection.ts`
- Create: `src/lib/kk/gestes-selection.test.ts`
- Create: `src/server/kk/gestes.ts`
- Modify: `src/server/kk/diagnostic.ts` (suppression de `ROUTINE_STEPS`, lecture en base)

**Interfaces:**
- Consumes: `prisma.diagStep` (tâche 1).
- Produces: `gestesActifs(lignes: GesteLigne[]): GesteLigne[]`,
  `libelleGeste(geste: GesteLigne, locale: string): string`,
  `type GesteLigne = { key: string; labelFr: string; labelEn: string; category: string; position: number; active: boolean }`,
  `lireGestes(): Promise<GesteLigne[]>`.

**Pourquoi une fonction pure séparée :** les tests du projet n'ont pas d'accès base. Le tri,
le filtrage et le repli de libellé sont la partie où une erreur se verrait — un geste
disparu de la routine, ou une clé brute affichée au visiteur.

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// src/lib/kk/gestes-selection.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gestesActifs, libelleGeste, type GesteLigne } from "./gestes-selection";

function geste(over: Partial<GesteLigne> = {}): GesteLigne {
  return {
    key: "nettoyer",
    labelFr: "Nettoyer",
    labelEn: "Cleanse",
    category: "nettoyants",
    position: 0,
    active: true,
    ...over,
  };
}

describe("gestesActifs", () => {
  it("trie par position croissante", () => {
    const rendu = gestesActifs([
      geste({ key: "hydrater", position: 2 }),
      geste({ key: "nettoyer", position: 0 }),
      geste({ key: "traiter", position: 1 }),
    ]);
    assert.deepEqual(rendu.map((g) => g.key), ["nettoyer", "traiter", "hydrater"]);
  });

  it("écarte les gestes désactivés", () => {
    // Désactiver « Protéger » doit donner une routine de trois gestes, pas une
    // routine de quatre dont un est vide.
    const rendu = gestesActifs([
      geste({ key: "nettoyer", position: 0 }),
      geste({ key: "proteger", position: 1, active: false }),
    ]);
    assert.deepEqual(rendu.map((g) => g.key), ["nettoyer"]);
  });

  it("rend une liste vide quand tout est désactivé", () => {
    // Cas limite réel : le client peut tout décocher. La routine doit être
    // vide, pas planter.
    assert.deepEqual(gestesActifs([geste({ active: false })]), []);
  });

  it("ne modifie pas le tableau reçu", () => {
    // Le tri en place casserait l'appelant, qui garde sa liste complète pour
    // l'écran d'administration.
    const source = [geste({ key: "b", position: 1 }), geste({ key: "a", position: 0 })];
    gestesActifs(source);
    assert.deepEqual(source.map((g) => g.key), ["b", "a"]);
  });
});

describe("libelleGeste", () => {
  it("rend le libellé français par défaut", () => {
    assert.equal(libelleGeste(geste(), "fr"), "Nettoyer");
  });

  it("rend le libellé anglais sur /en", () => {
    assert.equal(libelleGeste(geste(), "en"), "Cleanse");
  });

  it("se replie sur le français quand la traduction manque", () => {
    // Mieux vaut un libellé dans l'autre langue qu'une clé brute à l'écran.
    assert.equal(libelleGeste(geste({ labelEn: "" }), "en"), "Nettoyer");
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `node --test --import tsx src/lib/kk/gestes-selection.test.ts`
Expected: FAIL — `Cannot find module './gestes-selection'`

- [ ] **Step 3 : Écrire le module pur**

```ts
// src/lib/kk/gestes-selection.ts

/**
 * Sélection des gestes du Diagnostic Beauté.
 *
 * Isolé du stockage parce que les tests du projet n'ont pas d'accès base, et
 * que c'est ici qu'une erreur se verrait : un geste disparu de la routine, ou
 * une clé brute affichée au visiteur.
 */

export type GesteLigne = {
  key: string;
  labelFr: string;
  labelEn: string;
  category: string;
  position: number;
  active: boolean;
};

/**
 * Gestes retenus pour une routine, dans l'ordre.
 *
 * Copie avant de trier : l'appelant garde sa liste complète pour l'écran
 * d'administration, et un tri en place la lui casserait.
 */
export function gestesActifs(lignes: GesteLigne[]): GesteLigne[] {
  return [...lignes].filter((g) => g.active).sort((a, b) => a.position - b.position);
}

/**
 * Libellé dans la langue de la page.
 *
 * Repli sur le français si la traduction anglaise n'a pas été saisie : mieux
 * vaut un libellé dans l'autre langue qu'une clé technique à l'écran.
 */
export function libelleGeste(geste: GesteLigne, locale: string): string {
  return locale === "en" ? geste.labelEn || geste.labelFr : geste.labelFr;
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `node --test --import tsx src/lib/kk/gestes-selection.test.ts`
Expected: PASS — 7 tests

- [ ] **Step 5 : Écrire la lecture en base**

```ts
// src/server/kk/gestes.ts
import { prisma } from "@/server/prisma";
import type { GesteLigne } from "@/lib/kk/gestes-selection";

/** Tous les gestes, actifs ou non, pour l'écran d'administration. */
export async function lireGestes(): Promise<GesteLigne[]> {
  return prisma.diagStep.findMany({ orderBy: { position: "asc" } });
}
```

- [ ] **Step 6 : Brancher `buildRoutine`**

Dans `src/server/kk/diagnostic.ts` : supprimer la constante `ROUTINE_STEPS`
(lignes 15-20) et ses usages. Ajouter les imports :

```ts
import { gestesActifs, libelleGeste } from "@/lib/kk/gestes-selection";
import { lireGestes } from "./gestes";
```

Dans `buildRoutine`, remplacer `ROUTINE_STEPS.forEach((step, i) => {` par une lecture
préalable et une boucle sur les gestes actifs. La fonction prend désormais la langue en
second paramètre, pour que le libellé rendu suive la page :

```ts
export async function buildRoutine(
  answerIds: string[],
  locale = "fr",
): Promise<DiagnosticResult> {
```

et à l'intérieur, avant la boucle :

```ts
  // Les gestes viennent de la base : leur nombre, leur ordre et leur activation
  // sont des réglages du client, plus une constante de code.
  const gestes = gestesActifs(await lireGestes());
```

puis remplacer le corps de la boucle pour utiliser `geste.category` au lieu de
`step.category` et `libelleGeste(geste, locale)` au lieu de `step.label`.

- [ ] **Step 7 : Passer la langue depuis la route**

Dans `src/app/api/kk/diagnostic/route.ts:14`, transmettre la langue du corps de la requête
à `buildRoutine`, en n'acceptant que `"en"` ou `"fr"` — le corps vient du navigateur.

- [ ] **Step 8 : Vérifier**

Run: `npx tsc --noEmit && npx eslint && npm test`
Expected: aucune erreur, **411 tests au vert** (404 + 7)

- [ ] **Step 9 : Commit**

```bash
git add src/lib/kk/gestes-selection.ts src/lib/kk/gestes-selection.test.ts src/server/kk/gestes.ts src/server/kk/diagnostic.ts "src/app/api/kk/diagnostic/route.ts"
git commit -m "Le diagnostic lit ses gestes en base, plus une constante

Le nombre de produits proposés suit désormais le nombre de gestes actifs.
Désactiver « Protéger » donne une routine de trois gestes qui se tient, là où un
plafond arbitraire aurait coupé la routine au milieu.

Le libellé suit la langue de la page, avec repli sur le français quand la
traduction manque : mieux vaut un mot dans l'autre langue qu'une clé technique.

Le tri et le filtrage sont extraits en fonctions pures, seules testables sans
base.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3 : Écran d'administration des gestes

**Files:**
- Modify: `src/server/kk/gestes.ts` (écriture)
- Create: `src/app/api/admin/diagnostic-steps/route.ts`
- Create: `src/app/admin/(protected)/diagnostic/gestes/page.tsx`
- Create: `src/components/admin/DiagStepsAdmin.tsx`
- Modify: la navigation du back-office (entrée « Gestes du diagnostic »)

**Interfaces:**
- Consumes: `lireGestes()`, `type GesteLigne` (tâche 2) ; `prisma.diagStep` (tâche 1).
- Produces: `enregistrerGestes(items: GesteLigne[]): Promise<void>`.

**Ce plan pointe un patron au lieu de reproduire du code, et c'est délibéré.** Le lot 1 a
livré un écran qui fait exactement ce travail : `/admin/products/tags`, avec sa route
`src/app/api/admin/vocabulaire-tags/route.ts` et son composant
`src/components/admin/TagVocabularyAdmin.tsx`. Inventer un balisage produirait un écran qui
ne ressemble pas au reste du back-office.

- [ ] **Step 1 : Lire le patron de référence**

```bash
cat "src/app/admin/(protected)/products/tags/page.tsx"
cat src/components/admin/TagVocabularyAdmin.tsx
cat src/app/api/admin/vocabulaire-tags/route.ts
```

Noter : comment la page est protégée, comment le composant reçoit ses données du serveur,
comment la route vérifie la session (`requireAdminApi`), valide chaque champ **avant toute
écriture**, et répond.

Si le patron contredit ce plan, **suivre le patron** et le signaler dans le rapport.

- [ ] **Step 2 : Étendre le module serveur**

Dans `src/server/kk/gestes.ts` :

```ts
/**
 * Enregistre les gestes.
 *
 * La clé étant l'identifiant, un `upsert` par entrée suffit : renommer un
 * libellé ne casse aucun lien, et un geste déjà référencé continue de résoudre.
 * La transaction garantit qu'un réordonnancement partiel ne laisse pas deux
 * gestes à la même position.
 */
export async function enregistrerGestes(items: GesteLigne[]): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.diagStep.upsert({
        where: { key: item.key },
        update: {
          labelFr: item.labelFr,
          labelEn: item.labelEn,
          category: item.category,
          position: item.position,
          active: item.active,
        },
        create: item,
      }),
    ),
  );
}
```

- [ ] **Step 3 : Écrire la route**

Créer `src/app/api/admin/diagnostic-steps/route.ts` sur le patron exact de
`vocabulaire-tags/route.ts` : `requireAdminApi()` **en première instruction**, avant toute
lecture de corps ; `try/catch` sur `request.json()` → 400 ; vérification que le corps est un
tableau → 400 ; validation de **chaque** entrée avant le moindre `upsert`, pour qu'une
entrée malformée n'écrive rien du tout.

Règles de validation :
- `key` : chaîne non vide après `.trim()`, **stockée rognée**.
- `labelFr` : chaîne non vide après `.trim()`, stockée rognée.
- `labelEn` : chaîne, éventuellement vide, stockée rognée.
- `category` : chaîne non vide après `.trim()`, stockée rognée.
- `position` : `Number.isInteger` — la colonne est un `Int`, un `1.5` produirait un 500 nu.
- `active` : booléen.

- [ ] **Step 4 : Écrire l'écran**

Créer le composant et la page sur le patron du vocabulaire des tags. Colonnes : clé **en
lecture seule**, libellé FR, libellé EN, catégorie, position, actif.

La clé reste non éditable : elle est la clé primaire, et la changer créerait une ligne
orpheline plutôt que de renommer quoi que ce soit.

Sous le tableau, une phrase indiquant le nombre de gestes actifs et donc le nombre de
produits que le diagnostic proposera — c'est le lien que le critère 08 demande de rendre
visible au client.

- [ ] **Step 5 : Ajouter l'entrée de navigation**

Ajouter « Gestes du diagnostic » à côté des entrées `/admin/diagnostic` et
`/admin/diagnostic/tags` existantes.

- [ ] **Step 6 : Vérifier**

Run: `npx tsc --noEmit && npx eslint && npm test && npx next build`
Expected: aucune erreur, **411 tests au vert**, construction en succès

- [ ] **Step 7 : Vérification manuelle**

Lancer `./node_modules/.bin/next dev -p 3001` **au premier plan**, puis :

1. `/admin/diagnostic/gestes` — désactiver « Protéger », enregistrer.
2. Refaire le diagnostic côté boutique — la routine compte trois produits, **sans
   redéploiement**.
3. Réactiver, changer un libellé anglais, vérifier sur `/en`.

Arrêter le serveur ensuite. Si une vérification est impossible pour une raison
d'environnement — pas de compte administrateur, pas de boîte mail pour l'OTP — le dire
franchement dans le rapport plutôt que de la déclarer réussie.

- [ ] **Step 8 : Commit**

```bash
git add "src/app/admin/(protected)/diagnostic/gestes" src/app/api/admin/diagnostic-steps src/components/admin/DiagStepsAdmin.tsx src/server/kk/gestes.ts
git commit -m "Écran d'administration des gestes du diagnostic

Le client règle lui-même les gestes, leur ordre, leur activation et leurs
libellés dans les deux langues, sans redéploiement. Le nombre de produits que le
diagnostic proposera est affiché sous le tableau : c'est le lien que le critère
08 demande de rendre visible.

La clé reste en lecture seule — la modifier créerait une ligne orpheline au lieu
de renommer.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4 : Modèle `CustomerDiagProfile` et sérialisation

**Files:**
- Modify: `prisma/schema.prisma` (nouveau modèle, relation sur `Customer`)
- Create: `prisma/migrations/<horodatage>_profil_diagnostic/migration.sql`
- Create: `src/lib/kk/profil-reponses.ts`
- Create: `src/lib/kk/profil-reponses.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `prisma.customerDiagProfile` ; `lireReponses(json: string | null): string[]` ;
  `ecrireReponses(ids: string[]): string`.

**Pourquoi `Cascade` ici alors que la facture est en `Restrict`.** Un profil n'a aucune
valeur probante : il n'existe que pour servir son client. Supprimer le client doit
l'emporter. Une facture, elle, est un document comptable dont la séquence doit rester sans
rupture — d'où la différence, qui est délibérée et non une incohérence.

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// src/lib/kk/profil-reponses.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ecrireReponses, lireReponses } from "./profil-reponses";

describe("lireReponses", () => {
  it("relit ce qui a été écrit", () => {
    const ids = ["clx1", "clx2", "clx3"];
    assert.deepEqual(lireReponses(ecrireReponses(ids)), ids);
  });

  it("rend un tableau vide sur une valeur absente", () => {
    assert.deepEqual(lireReponses(null), []);
    assert.deepEqual(lireReponses(""), []);
  });

  it("rend un tableau vide sur du JSON illisible", () => {
    // Une colonne corrompue ne doit pas faire tomber la page du diagnostic.
    assert.deepEqual(lireReponses("{pas du json"), []);
  });

  it("rend un tableau vide si la valeur n'est pas un tableau", () => {
    assert.deepEqual(lireReponses('{"clx1":true}'), []);
  });

  it("écarte les entrées qui ne sont pas des chaînes", () => {
    assert.deepEqual(lireReponses('["clx1",42,null,"clx2"]'), ["clx1", "clx2"]);
  });

  it("préserve l'ordre des réponses", () => {
    // L'ordre porte du sens : c'est celui des questions du QCM.
    assert.deepEqual(lireReponses('["c","a","b"]'), ["c", "a", "b"]);
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `node --test --import tsx src/lib/kk/profil-reponses.test.ts`
Expected: FAIL — `Cannot find module './profil-reponses'`

- [ ] **Step 3 : Écrire le module**

```ts
// src/lib/kk/profil-reponses.ts

/**
 * Réponses du Diagnostic Beauté, telles que stockées sur le profil client.
 *
 * On garde les RÉPONSES et non la routine calculée : un type de peau ne périme
 * pas, un catalogue si. Le client qui revient dans six mois voit donc une
 * routine recalculée sur les produits réellement disponibles, plutôt qu'une
 * liste figée pleine de ruptures de stock.
 *
 * Ne lève jamais : une colonne corrompue rend un tableau vide plutôt que de
 * faire tomber la page du diagnostic.
 */

export function ecrireReponses(ids: string[]): string {
  return JSON.stringify(ids);
}

export function lireReponses(json: string | null): string[] {
  if (!json) return [];
  try {
    const lu: unknown = JSON.parse(json);
    return Array.isArray(lu) ? lu.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `node --test --import tsx src/lib/kk/profil-reponses.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5 : Ajouter le modèle**

```prisma
// Profil Diagnostic d'un client connecté : ses RÉPONSES, pas sa routine.
//
// Les réponses restent valables dans le temps ; une routine calculée vieillit
// avec le catalogue — ruptures, prix périmés, produits retirés. Stocker les
// réponses évite d'avoir à gérer chacun de ces cas à l'affichage.
//
// `Cascade` et non `Restrict`, contrairement à la facture : un profil n'a
// aucune valeur probante, il n'existe que pour servir son client.
model CustomerDiagProfile {
  id         String   @id @default(cuid())
  // Un profil par client : un nouveau diagnostic remplace le précédent.
  customerId String   @unique
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  // Tableau JSON d'identifiants DiagAnswer. Lu en bloc, jamais interrogé entrée
  // par entrée — comme les pondérations de DiagAnswer, déjà stockées ainsi.
  answerIds  String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

Déclarer la relation côté `Customer`, avec les autres champs de relation :

```prisma
  diagProfile        CustomerDiagProfile?
```

- [ ] **Step 6 : Migration**

⚠️ Base partagée avec la production. Séquence imposée :

```bash
npx prisma validate
npx prisma migrate dev --create-only --name profil_diagnostic
```

Lire le SQL, le recopier dans le rapport, vérifier qu'il ne contient que
`CREATE TABLE "CustomerDiagProfile"`, ses index et sa clé étrangère. **Tout `DROP`,
`TRUNCATE` ou `ALTER ... NOT NULL` sur une colonne existante → BLOCKED.**

```bash
npx prisma migrate deploy && npx prisma generate
```

- [ ] **Step 7 : Vérifier**

Run: `npx tsc --noEmit && npx eslint && npm test`
Expected: aucune erreur, **417 tests au vert** (411 + 6)

- [ ] **Step 8 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/kk/profil-reponses.ts src/lib/kk/profil-reponses.test.ts
git commit -m "Profil Diagnostic : un client connecté garde ses réponses

On stocke les réponses au QCM et non la routine calculée : un type de peau ne
périme pas, un catalogue si. Le client qui revient voit une routine recalculée
sur les produits réellement disponibles.

Cascade et non Restrict, contrairement à la facture : un profil n'a aucune
valeur probante, il n'existe que pour servir son client.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5 : Sauvegarde et relecture du profil

**Files:**
- Create: `src/server/kk/profil-diagnostic.ts`
- Modify: `src/app/api/kk/diagnostic/route.ts` (sauvegarde après calcul)
- Modify: `src/app/[locale]/diagnostic/page.tsx` (relecture et proposition de reprise)

**Interfaces:**
- Consumes: `lireReponses`, `ecrireReponses` (tâche 4) ; `prisma.customerDiagProfile`.
- Produces: `enregistrerProfil(customerId: string, answerIds: string[]): Promise<void>` ;
  `lireProfil(customerId: string): Promise<string[]>`.

**Comment reconnaître le client connecté.** Le projet a déjà une session client :
`src/server/customerSession.ts`, utilisée par `createKossOrder`. Lire ce module et suivre
sa façon de résoudre la session — ne pas en inventer une seconde.

- [ ] **Step 1 : Écrire le module**

```ts
// src/server/kk/profil-diagnostic.ts
import { prisma } from "@/server/prisma";
import { ecrireReponses, lireReponses } from "@/lib/kk/profil-reponses";

/**
 * Profil Diagnostic du client connecté.
 *
 * Best-effort des deux côtés : ni l'enregistrement ni la relecture ne doivent
 * empêcher le diagnostic de fonctionner. Un visiteur venu faire son QCM se
 * moque de savoir que sa session a expiré ; il veut sa routine.
 */

export async function enregistrerProfil(customerId: string, answerIds: string[]): Promise<void> {
  try {
    await prisma.customerDiagProfile.upsert({
      where: { customerId },
      update: { answerIds: ecrireReponses(answerIds) },
      create: { customerId, answerIds: ecrireReponses(answerIds) },
    });
  } catch (error) {
    // Journaliser sans relancer : le résultat du diagnostic est déjà calculé et
    // affiché, échouer ici le ferait disparaître pour rien.
    console.error("[profil-diagnostic] enregistrement échoué", { customerId, error });
  }
}

export async function lireProfil(customerId: string): Promise<string[]> {
  try {
    const ligne = await prisma.customerDiagProfile.findUnique({
      where: { customerId },
      select: { answerIds: true },
    });
    return lireReponses(ligne?.answerIds ?? null);
  } catch {
    return [];
  }
}
```

- [ ] **Step 2 : Sauvegarder après le calcul**

Dans `src/app/api/kk/diagnostic/route.ts`, après l'appel à `buildRoutine` : résoudre la
session client selon le patron de `src/server/customerSession.ts`, et si elle existe,
appeler `enregistrerProfil`. Un visiteur non connecté ne déclenche **aucune écriture**.

L'appel ne doit rien attendre de bloquant côté réponse : le résultat part au client, la
sauvegarde suit.

- [ ] **Step 3 : Proposer la reprise**

Dans `src/app/[locale]/diagnostic/page.tsx` : si une session client existe et que
`lireProfil` rend des réponses, passer ces réponses au composant du flux, qui propose de
revoir la routine plutôt que de reprendre le QCM à zéro. Refaire le QCM remplace le profil,
puisque l'`upsert` écrase.

- [ ] **Step 4 : Vérifier**

Run: `npx tsc --noEmit && npx eslint && npm test && npx next build`
Expected: aucune erreur, **417 tests au vert**, construction en succès

- [ ] **Step 5 : Vérification manuelle**

Serveur de développement au premier plan. Se connecter comme client, faire le QCM, se
déconnecter, se reconnecter : la reprise est proposée. Refaire le QCM avec d'autres
réponses : le profil est remplacé. En navigation privée, sans compte : aucune reprise
proposée, aucune erreur.

Dire franchement dans le rapport toute vérification impossible.

- [ ] **Step 6 : Commit**

```bash
git add src/server/kk/profil-diagnostic.ts "src/app/api/kk/diagnostic/route.ts" "src/app/[locale]/diagnostic/page.tsx"
git commit -m "Le diagnostic se souvient d'un client connecté

Ses réponses sont enregistrées à la fin du QCM et lui sont reproposées à son
retour, avec une routine recalculée sur le catalogue du jour.

Enregistrement et relecture sont best-effort : un visiteur venu faire son QCM se
moque de savoir que sa session a expiré, il veut sa routine. Un visiteur non
connecté ne déclenche aucune écriture.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6 : Les e-mails KossKoss deviennent bilingues

**Files:**
- Create: `src/lib/kk/langue.ts`
- Create: `src/lib/kk/langue.test.ts`
- Modify: `src/server/kk/emails.ts` (les trois fonctions existantes)
- Modify: `src/server/kk/checkout.ts` et `src/server/kk/facture.ts` (transmission de la langue)

**Interfaces:**
- Consumes: rien.
- Produces: `choisirLangue(locale: string | null | undefined): Langue` où
  `type Langue = "fr" | "en"`.

**Le motif existe déjà, ne pas en inventer un second.** `src/server/emails/order.ts:303-304`
fait exactement cela pour l'e-mail de commande hérité :

```ts
const fr = order.locale !== "en";
const lang: OrderEmailLocale = fr ? "fr" : "en";
```

C'est ce motif qu'on applique. On l'extrait simplement en fonction nommée, parce que quatre
e-mails vont désormais s'en servir.

**Ce que cette tâche ferme au passage.** La revue du lot 1 avait relevé que l'e-mail de
facture part en français à un acheteur venu de `/en`. C'est ici que cela se corrige.

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// src/lib/kk/langue.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choisirLangue } from "./langue";

describe("choisirLangue", () => {
  it("rend l'anglais pour « en »", () => {
    assert.equal(choisirLangue("en"), "en");
  });

  it("rend le français pour « fr »", () => {
    assert.equal(choisirLangue("fr"), "fr");
  });

  it("se replie sur le français pour une valeur inconnue", () => {
    // Le français est la langue de référence du site : c'est elle qui engage la
    // société. Un code de langue inattendu ne doit pas produire une page vide.
    assert.equal(choisirLangue("de"), "fr");
    assert.equal(choisirLangue(""), "fr");
  });

  it("se replie sur le français en l'absence de valeur", () => {
    assert.equal(choisirLangue(null), "fr");
    assert.equal(choisirLangue(undefined), "fr");
  });

  it("ne se laisse pas tromper par la casse", () => {
    // « EN » vient parfois d'un en-tête HTTP ou d'un import ; il désigne bien
    // l'anglais.
    assert.equal(choisirLangue("EN"), "en");
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `node --test --import tsx src/lib/kk/langue.test.ts`
Expected: FAIL — `Cannot find module './langue'`

- [ ] **Step 3 : Écrire le module**

```ts
// src/lib/kk/langue.ts

/**
 * Choix de la langue d'un e-mail transactionnel.
 *
 * Le motif vient de `src/server/emails/order.ts`, qui résout déjà ce problème
 * pour l'e-mail de commande hérité. On l'extrait en fonction nommée parce que
 * quatre e-mails vont s'en servir, plutôt que d'en écrire une seconde variante.
 *
 * Le français est le repli : c'est la langue de référence du site, celle qui
 * engage la société.
 */

export type Langue = "fr" | "en";

export function choisirLangue(locale: string | null | undefined): Langue {
  return locale?.toLowerCase() === "en" ? "en" : "fr";
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `node --test --import tsx src/lib/kk/langue.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5 : Traduire les trois e-mails existants**

Dans `src/server/kk/emails.ts`, ajouter `langue: Langue` aux trois types d'entrée
(`OrderEmailInput`, l'entrée de `sendAccountAccessEmail`, `PaymentReceivedInput`) et
sélectionner chaque texte par cette valeur.

Traduire **tous** les textes visibles : objet, titre, corps, encadré, variante texte brut.
Ne pas traduire les valeurs (numéro de commande, montants) — elles sont déjà neutres.

Conserver `esc()` sur chaque valeur fournie par le client, dans les deux langues.

- [ ] **Step 6 : Transmettre la langue depuis les appelants**

- `src/server/kk/checkout.ts` : passer `choisirLangue(input.locale)` aux deux e-mails
  qu'il envoie.
- `src/server/kk/facture.ts` : passer `choisirLangue(order.locale)` à
  `sendPaymentReceivedEmail`. `OrderRecord.locale` existe déjà.

- [ ] **Step 7 : Vérifier**

Run: `npx tsc --noEmit && npx eslint && npm test`
Expected: aucune erreur, **422 tests au vert** (417 + 5)

- [ ] **Step 8 : Commit**

```bash
git add src/lib/kk/langue.ts src/lib/kk/langue.test.ts src/server/kk/emails.ts src/server/kk/checkout.ts src/server/kk/facture.ts
git commit -m "Les e-mails KossKoss suivent la langue de la commande

Confirmation, accès à l'espace client et paiement reçu partaient tous en
français, y compris à un acheteur venu de /en. La revue du lot précédent l'avait
relevé sur la facture : c'est corrigé ici pour les trois.

Le motif est celui de emails/order.ts, qui résolvait déjà ce problème pour
l'e-mail de commande hérité — extrait en fonction nommée plutôt que réécrit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7 : E-mail de routine

**Files:**
- Modify: `src/server/kk/emails.ts` (nouvelle fonction)
- Create: `src/app/api/kk/diagnostic/routine-email/route.ts`

**Interfaces:**
- Consumes: `choisirLangue`, `type Langue` (tâche 6) ; `sendMail`, `isMailConfigured`
  (`@/lib/mailer`) ; `buildRoutine` (tâche 2) ; `type DiagnosticResult`.
- Produces: `sendRoutineEmail(input: RoutineEmailInput): Promise<void>`.

**Bilingue dès l'écriture.** Cet e-mail naît après la tâche 6 précisément pour ne pas
créer une quatrième dette de traduction à reprendre ensuite.

- [ ] **Step 1 : Écrire la fonction d'envoi**

Dans `src/server/kk/emails.ts`, à la suite des autres :

```ts
export interface RoutineEmailInput {
  to: string;
  langue: Langue;
  /** Gestes de la routine, déjà dans la bonne langue. */
  etapes: { label: string; brand: string; name: string; prixFcfa: number }[];
  totalFcfa: number;
}

/**
 * Routine personnalisée envoyée par e-mail.
 *
 * Transactionnel : le visiteur l'a demandée. L'inscription à la lettre
 * d'information est un consentement séparé, traité ailleurs — cette fonction
 * n'inscrit personne.
 *
 * Best-effort, comme les autres : une panne SMTP ne doit pas faire échouer
 * l'affichage du résultat, que le visiteur a déjà sous les yeux.
 */
export async function sendRoutineEmail(input: RoutineEmailInput): Promise<void> {
  if (!isMailConfigured()) return;
  const en = input.langue === "en";

  const lignes = input.etapes
    .map(
      (e) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(e.label)} — ${esc(
          e.brand,
        )} ${esc(e.name)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${esc(
          formatFcfa(e.prixFcfa),
        )}</td></tr>`,
    )
    .join("");

  const inner = `
    <p style="margin:0 0 16px">${
      en
        ? "Here is the routine we put together for you."
        : "Voici la routine que nous avons composée pour vous."
    }</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${lignes}
      <tr><td style="padding:12px 0;font-weight:bold">${en ? "Total" : "Total"}</td><td style="padding:12px 0;text-align:right;font-weight:bold">${esc(
        formatFcfa(input.totalFcfa),
      )}</td></tr>
    </table>
    <div style="background:${SAND};border-radius:12px;padding:16px;margin-top:20px;font-size:14px">
      ${
        en
          ? "These products are chosen from what is in stock today. Prices may change."
          : "Ces produits sont choisis parmi ceux disponibles aujourd'hui. Les prix peuvent évoluer."
      }
    </div>`;

  const text = input.etapes
    .map((e) => `${e.label} : ${e.brand} ${e.name} — ${formatFcfa(e.prixFcfa)}`)
    .join("\n");

  try {
    await sendMail({
      to: input.to,
      subject: en ? "Your personalised routine" : "Votre routine personnalisée",
      html: shell(en ? "Your routine" : "Votre routine", inner),
      text: `${text}\n\nTotal : ${formatFcfa(input.totalFcfa)}`,
    });
  } catch {
    /* best-effort */
  }
}
```

- [ ] **Step 2 : Écrire la route d'envoi**

Créer `src/app/api/kk/diagnostic/routine-email/route.ts`. Le corps attendu est
`{ email: string; answers: string[]; locale?: string }`.

Règles :
- `try/catch` sur `request.json()` → 400 « Requête illisible. »
- Valider l'adresse avec la même expression que la route newsletter
  (`src/app/api/kk/newsletter/route.ts`) — ne pas en inventer une seconde. Longueur
  maximale 254.
- `answers` doit être un tableau de chaînes non vide → 400 sinon.
- **Recalculer la routine côté serveur** avec `buildRoutine(answers, langue)`. Ne jamais
  faire confiance à une routine envoyée par le navigateur : elle porterait des prix et des
  produits choisis par le client.
- Appeler `sendRoutineEmail`, répondre `{ ok: true }`.
- La réponse ne doit pas révéler si l'adresse existe déjà quelque part.

- [ ] **Step 3 : Vérifier**

Run: `npx tsc --noEmit && npx eslint && npm test`
Expected: aucune erreur, **422 tests au vert**

- [ ] **Step 4 : Commit**

```bash
git add src/server/kk/emails.ts src/app/api/kk/diagnostic/routine-email
git commit -m "La routine du diagnostic peut partir par e-mail

Bilingue dès l'écriture, pour ne pas créer une quatrième dette de traduction
juste après en avoir soldé trois.

La routine est RECALCULÉE côté serveur à partir des réponses : accepter celle
envoyée par le navigateur reviendrait à laisser le client choisir les produits
et les prix de son propre e-mail.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8 : Formulaire d'envoi et inscription séparée

**Files:**
- Modify: `src/components/kk/diagnostic-flow.tsx` (phase `result`)
- Modify: `src/app/api/kk/newsletter/route.ts` (source `diagnostic`)

**Interfaces:**
- Consumes: `POST /api/kk/diagnostic/routine-email` (tâche 7) ;
  `POST /api/kk/newsletter` (existant).
- Produces: rien pour les tâches suivantes.

**Deux consentements, deux actions.** L'envoi est transactionnel — le visiteur l'a
demandé. L'inscription ne l'est pas : elle est proposée par une case **décochée par
défaut**, à côté et non à la place. Cocher la case sans demander l'envoi inscrit ; demander
l'envoi sans cocher n'inscrit pas.

- [ ] **Step 1 : Autoriser la nouvelle source**

`src/app/api/kk/newsletter/route.ts:21` déclare `const SOURCES = new Set(["accueil", "pied-de-page", "commande"])`.
Une valeur inconnue retombe silencieusement sur `"accueil"`, ce qui rendrait la statistique
fausse. Ajouter `"diagnostic"` à cet ensemble.

- [ ] **Step 2 : Ajouter le formulaire**

Dans `src/components/kk/diagnostic-flow.tsx`, phase `result` : un champ e-mail, un bouton
d'envoi, et **sous** le champ une case décochée proposant la lettre d'information.

Comportement attendu :
- Le bouton appelle `/api/kk/diagnostic/routine-email` avec l'adresse, les réponses
  (`answers`, déjà dans l'état du composant) et la langue.
- Si la case est cochée, appeler **aussi** `/api/kk/newsletter` avec
  `{ email, locale, source: "diagnostic" }`.
- Les deux appels sont indépendants : l'échec de l'un ne doit pas annuler l'autre.
- Retour visible au visiteur : envoi en cours, puis confirmation ou message d'erreur
  nommant ce qui a échoué.
- Le bouton est désactivé pendant l'envoi, pour qu'un double clic n'envoie pas deux e-mails.

Suivre le style des autres formulaires du site — voir le bloc newsletter existant dans
`src/components/kk/newsletter.tsx` pour le balisage et les classes.

- [ ] **Step 3 : Vérifier**

Run: `npx tsc --noEmit && npx eslint && npm test && npx next build`
Expected: aucune erreur, **422 tests au vert**, construction en succès

- [ ] **Step 4 : Vérification manuelle**

Serveur au premier plan. Faire le diagnostic, demander l'envoi sans cocher la case :
l'e-mail arrive, aucune inscription en base. Recommencer en cochant : les deux ont lieu.
Double-cliquer le bouton : un seul envoi.

Dire franchement dans le rapport ce qui n'a pas pu être vérifié — notamment si aucun SMTP
n'est configuré dans l'environnement.

- [ ] **Step 5 : Commit**

```bash
git add src/components/kk/diagnostic-flow.tsx "src/app/api/kk/newsletter/route.ts"
git commit -m "La routine s'envoie par e-mail depuis la page de résultat

Deux consentements distincts dans un seul formulaire : l'envoi est
transactionnel puisque le visiteur l'a demandé, l'inscription à la lettre
d'information est proposée à côté par une case décochée.

La source « diagnostic » entre dans les valeurs acceptées par la route
newsletter : sans cela elle serait comptée en « accueil » et fausserait la
statistique.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9 : Le formulaire de commande passe sous `next-intl`

**Files:**
- Modify: `src/components/kk/checkout-form.tsx`
- Modify: les fichiers de messages FR et EN

**Interfaces:**
- Consumes: rien.
- Produces: rien.

**Ce formulaire n'a aucune mécanique de traduction.** Contrairement aux e-mails, où un
motif existait, ici toutes les chaînes sont écrites en français dans le composant :
titres d'étapes, libellés de champs, messages d'erreur, textes d'aide, libellé du bouton.

- [ ] **Step 1 : Localiser les fichiers de messages**

```bash
ls messages/ 2>/dev/null || find src -name "*.json" -path "*messages*" | head
grep -rn "filterBrand" --include=*.json . | grep -v node_modules | head -2
```

Noter le chemin réel et la structure de nommage des clés existantes. **Suivre cette
structure**, ne pas créer un fichier ni un espace de noms nouveau.

- [ ] **Step 2 : Relever toutes les chaînes**

```bash
grep -nE '"[A-ZÀ-Ü][^"]{3,}"' src/components/kk/checkout-form.tsx
```

Chaque littéral rendu à l'écran devient une clé. Les valeurs (nombres, codes) restent.

- [ ] **Step 3 : Ajouter les clés dans les deux langues**

Ajouter chaque clé au fichier français **et** au fichier anglais. Une clé présente d'un
seul côté fait tomber la page dans l'autre langue — c'est le mode d'échec habituel de
`next-intl`.

Traduire réellement, ne pas recopier le français dans le fichier anglais.

- [ ] **Step 4 : Brancher le composant**

Le composant est un composant client. Utiliser `useTranslations` de `next-intl`, comme le
font les autres composants clients du projet — chercher un exemple avec
`grep -rln "useTranslations" src/components | head -3` et suivre le même appel.

Attention aux messages d'erreur de validation : ils sont produits dans une fonction hors du
composant (`checkout-form.tsx:79-88`). Cette fonction devra recevoir la fonction de
traduction en paramètre plutôt que d'aller la chercher, sinon elle appellerait un hook hors
composant.

- [ ] **Step 5 : Vérifier**

Run: `npx tsc --noEmit && npx eslint && npm test && npx next build`
Expected: aucune erreur, **422 tests au vert**, construction en succès

- [ ] **Step 6 : Vérification manuelle**

Serveur au premier plan. Ouvrir `/commande` puis `/en/commande` : chaque libellé, chaque
message d'aide et chaque erreur de validation apparaît dans la bonne langue. Saisir un
téléphone invalide dans les deux langues : le message nomme le format attendu, traduit.

- [ ] **Step 7 : Commit**

```bash
git add src/components/kk/checkout-form.tsx messages/
git commit -m "Le formulaire de commande existe dans les deux langues

Il n'avait aucune mécanique de traduction : titres, libellés, aides et messages
d'erreur étaient écrits en français dans le composant. Un acheteur venu de /en
remplissait un formulaire français.

Les messages de validation reçoivent la fonction de traduction en paramètre :
ils sont produits hors du composant et ne peuvent pas appeler un hook.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Vérification de fin de lot

| Critère | Contrôle |
|---|---|
| **08** | Désactiver un geste en admin ; la routine en propose un de moins, sans redéploiement |
| **08** | Le QCM se déroule en FR et en EN, libellés de gestes traduits |
| **09** | Client connecté : QCM, déconnexion, reconnexion — la reprise est proposée |
| **09** | Demander la routine par e-mail sans cocher : e-mail reçu, aucune inscription |
| **09** | Cocher la case : e-mail reçu **et** inscription enregistrée avec la source `diagnostic` |
| **10** | Commander depuis `/en` : formulaire, confirmation et facture tous en anglais |
| **10** | Commander depuis `/` : tout en français |
