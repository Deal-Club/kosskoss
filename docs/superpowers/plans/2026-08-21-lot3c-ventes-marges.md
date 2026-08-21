# Lot 3C — Tableau de bord des ventes et export comptable — Plan d'implémentation

> **Pour les exécutants agentiques :** SOUS-COMPÉTENCE REQUISE — utiliser
> superpowers:subagent-driven-development (recommandé) ou
> superpowers:executing-plans pour dérouler ce plan tâche par tâche. Les étapes
> utilisent la syntaxe à cases (`- [ ]`).

**But :** donner au back-office un écran des ventes et un export CSV des ventes
avec coûts et marges, pour fermer les critères 14 et 15.

**Architecture :** trois modules purs (période, ventes, CSV) portent tout le
calcul et sont testés sans base ; une lecture Prisma les alimente ; un écran
serveur et une route d'export les consomment. Le coût d'achat est figé sur la
ligne de commande au moment de la vente par une colonne nullable ajoutée à
`OrderItem`.

**Pile technique :** Next.js 16 (App Router, composants serveur), TypeScript
strict, Prisma 7.9.1 (générateur `prisma-client` vers `src/generated/prisma`),
tests `node:test` lancés par `npm test`.

**Spécification :** `docs/superpowers/specs/2026-08-21-lot3c-ventes-marges-design.md`

---

## Contraintes globales

Ces règles lient **toutes** les tâches. Chaque exigence de tâche les inclut
implicitement.

1. **Le FCFA n'a pas de sous-unité.** Les entiers des champs `*Cents` **sont**
   des francs entiers. Le suffixe est hérité d'une activité précédente et ment.
   **Aucune division par 100 nulle part** — ni à l'écran, ni dans le CSV, ni
   dans les tests.
2. **Les modules de `src/lib/kk/` sont purs : zéro import.** C'est ce qui les
   rend consommables par un composant client sans tirer Prisma dans le
   navigateur. Un lot précédent a cassé la construction exactement là.
   `Date`, `Map`, `Set`, `Intl` sont des globales et ne comptent pas.
3. **La base de développement est la base de production.** Ne jamais lancer
   `prisma migrate dev` seul : il peut proposer une réinitialisation. La seule
   séquence autorisée est `--create-only` → relire le SQL → `migrate deploy` →
   `generate`.
4. **Migrations additives uniquement.** Aucune colonne supprimée, aucune colonne
   rendue obligatoire sur une table qui porte des lignes.
5. **`null` veut dire « on ne sait pas », jamais « zéro ».** Un coût inconnu
   laisse la case vide ; un zéro s'additionnerait et fausserait un total.
6. **Toute la langue visible est le français.** Messages, libellés, en-têtes de
   colonnes, noms de fichiers.
7. **Vérification avant chaque commit :** `npx tsc --noEmit`, `npx eslint src
   --ext .ts,.tsx`, `npm test`. La construction (`npm run build`) est vérifiée
   aux tâches qui touchent une page ou une route.
8. **Ne jamais faire figurer de nom de personne ni de pseudonyme dans le code,
   les commentaires, les messages de commit ou les données.**

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `prisma/schema.prisma` | ajoute `OrderItem.unitCostCents Int?` |
| `src/server/orders.ts` | recopie le coût sur la ligne à la création de commande |
| `src/lib/kk/periode.ts` | **créé** — bornes de dates depuis l'URL, raccourcis, défaut |
| `src/lib/kk/periode.test.ts` | **créé** |
| `src/lib/kk/ventes.ts` | **créé** — totaux, classement produits, série par jour |
| `src/lib/kk/ventes.test.ts` | **créé** |
| `src/lib/kk/csv.ts` | **créé** — échappement et assemblage CSV |
| `src/lib/kk/csv.test.ts` | **créé** |
| `src/app/api/admin/products/export/route.ts` | recâblé sur `csv.ts` |
| `src/server/kk/ventes.ts` | **créé** — lecture Prisma → lignes plates |
| `src/app/admin/(protected)/ventes/page.tsx` | **créé** — l'écran |
| `src/components/admin/VentesPeriodeForm.tsx` | **créé** — la barre de période (client) |
| `src/components/admin/VentesHistogramme.tsx` | **créé** — l'histogramme SVG |
| `src/components/admin/AdminSidebar.tsx` | ajoute l'entrée « Ventes » |
| `src/app/api/admin/ventes/export/route.ts` | **créé** — le CSV |

---

### Tâche 1 : Le coût d'achat est figé sur la ligne de commande

**Fichiers :**
- Modifier : `prisma/schema.prisma` — modèle `OrderItem`
- Créer : `prisma/migrations/<horodatage>_cout_unitaire_ligne_commande/migration.sql`
- Modifier : `src/server/orders.ts` — la construction des `items` à la création

**Interfaces :**
- Produit : la colonne `OrderItem.unitCostCents Int?`, que la tâche 5 lit.

**Contexte.** `OrderItem` recopie déjà la marque, le nom, le SKU, le chemin et le
prix unitaire au moment de la vente : renommer ou reprixer un produit ne doit pas
réécrire une commande passée. Le coût d'achat suit la même règle. La colonne est
nullable parce que les commandes antérieures n'ont pas de coût et n'en auront
jamais — leur en inventer un serait pire que la case vide.

- [ ] **Étape 1 : ajouter la colonne au schéma**

Dans `prisma/schema.prisma`, modèle `OrderItem`, juste après `unitPriceCents` :

```prisma
  unitPriceCents Int
  // Coût d'achat unitaire au moment de la vente, recopié depuis la fiche
  // produit. NULL veut dire « on ne savait pas » : commandes antérieures à
  // cette colonne, ou produit dont le coût n'était pas renseigné ce jour-là.
  // Figé comme le prix : une marge de mars calculée au prix d'achat de
  // septembre n'est pas une marge de mars.
  unitCostCents  Int?
  quantity       Int
```

- [ ] **Étape 2 : créer la migration SANS l'appliquer**

```bash
npx prisma migrate dev --create-only --name cout_unitaire_ligne_commande
```

- [ ] **Étape 3 : relire le SQL produit**

```bash
cat prisma/migrations/*_cout_unitaire_ligne_commande/migration.sql
```

Attendu — exactement une instruction, additive :

```sql
ALTER TABLE "OrderItem" ADD COLUMN "unitCostCents" INTEGER;
```

**Si le fichier contient autre chose — un `DROP`, un `NOT NULL`, une table
recréée — arrêter et signaler.** La base de développement est la base de
production.

- [ ] **Étape 4 : appliquer et régénérer le client**

```bash
npx prisma migrate deploy
npx prisma generate
```

- [ ] **Étape 5 : recopier le coût à la création de commande**

Dans `src/server/orders.ts`, la commande est créée avec `items: { create: billed.map(...) }`.
La carte `byId` des produits est déjà chargée à cet endroit. Ajouter la ligne
entre `unitPriceCents` et `quantity` :

```ts
                unitPriceCents: line.priceCents,
                // Figé à la vente, comme le prix. `?? null` et non `?? 0` : un
                // produit sans coût renseigné laisse la case vide, il ne devient
                // pas gratuit.
                unitCostCents: byId.get(line.productId)?.costCents ?? null,
                quantity: line.quantity,
```

- [ ] **Étape 6 : vérifier que le produit chargé porte bien `costCents`**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur. Si TypeScript signale que `costCents` n'existe pas sur
le type de `byId`, c'est que la requête qui remplit `byId` sélectionne des
colonnes explicites : ajouter `costCents` à ce `select`, et relancer.

- [ ] **Étape 7 : vérifier l'ensemble**

```bash
npx eslint src --ext .ts,.tsx && npm test && npm run build
```

Attendu : aucune erreur, tous les tests au vert, construction en succès.

- [ ] **Étape 8 : commit**

```bash
git add prisma/schema.prisma prisma/migrations src/generated/prisma src/server/orders.ts
git commit -m "Le coût d'achat est figé sur la ligne de commande"
```

---

### Tâche 2 : Le module pur des périodes

**Fichiers :**
- Créer : `src/lib/kk/periode.ts`
- Créer : `src/lib/kk/periode.test.ts`

**Interfaces :**
- Produit, consommé par les tâches 5 et 6 :
  - `type Raccourci = "7j" | "30j" | "mois" | "annee"`
  - `interface Periode { du: Date; au: Date; raccourci: Raccourci | null }`
  - `function periodeDepuisUrl(params: { du?: string; au?: string; p?: string }, maintenant: Date): Periode`
  - `function bornesRaccourci(raccourci: Raccourci, maintenant: Date): { du: Date; au: Date }`
  - `function estRaccourci(valeur: string | undefined): valeur is Raccourci`
  - `function formatJourIso(date: Date): string` — « AAAA-MM-JJ », heure locale

**Rappel :** module pur, **zéro import**.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `src/lib/kk/periode.test.ts` :

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bornesRaccourci, estRaccourci, formatJourIso, periodeDepuisUrl } from "./periode";

// Un mercredi, en milieu de journée : les bornes doivent s'étendre au jour
// entier, pas s'arrêter à l'heure de consultation.
const MAINTENANT = new Date(2026, 7, 19, 14, 30, 0);

describe("formatJourIso", () => {
  it("rend le jour local, pas le jour UTC", () => {
    // 23 h 30 heure locale bascule en UTC le lendemain ; l'écran affiche des
    // jours locaux, et un décalage d'un jour ferait mentir l'histogramme.
    assert.equal(formatJourIso(new Date(2026, 7, 19, 23, 30)), "2026-08-19");
  });

  it("complète le mois et le jour à deux chiffres", () => {
    assert.equal(formatJourIso(new Date(2026, 0, 5)), "2026-01-05");
  });
});

describe("bornesRaccourci", () => {
  it("« 7j » couvre sept jours, aujourd'hui compris", () => {
    const { du, au } = bornesRaccourci("7j", MAINTENANT);
    assert.equal(formatJourIso(du), "2026-08-13");
    assert.equal(formatJourIso(au), "2026-08-19");
  });

  it("« 30j » couvre trente jours, aujourd'hui compris", () => {
    const { du } = bornesRaccourci("30j", MAINTENANT);
    assert.equal(formatJourIso(du), "2026-07-21");
  });

  it("« mois » part du premier du mois en cours", () => {
    const { du, au } = bornesRaccourci("mois", MAINTENANT);
    assert.equal(formatJourIso(du), "2026-08-01");
    assert.equal(formatJourIso(au), "2026-08-19");
  });

  it("« annee » part du premier janvier", () => {
    const { du } = bornesRaccourci("annee", MAINTENANT);
    assert.equal(formatJourIso(du), "2026-01-01");
  });

  it("ouvre la borne basse à minuit et ferme la haute à la fin du jour", () => {
    // Sans la fin de journée, une période « du 1er au 31 » perdrait toutes les
    // ventes du 31 après minuit — c'est-à-dire toutes.
    const { du, au } = bornesRaccourci("7j", MAINTENANT);
    assert.equal(du.getHours(), 0);
    assert.equal(du.getMinutes(), 0);
    assert.equal(au.getHours(), 23);
    assert.equal(au.getMinutes(), 59);
    assert.equal(au.getSeconds(), 59);
  });
});

describe("estRaccourci", () => {
  it("reconnaît les quatre raccourcis", () => {
    for (const valeur of ["7j", "30j", "mois", "annee"]) {
      assert.equal(estRaccourci(valeur), true);
    }
  });

  it("refuse tout le reste", () => {
    assert.equal(estRaccourci("semaine"), false);
    assert.equal(estRaccourci(""), false);
    assert.equal(estRaccourci(undefined), false);
  });
});

describe("periodeDepuisUrl", () => {
  it("ouvre sur trente jours quand l'URL ne dit rien", () => {
    const periode = periodeDepuisUrl({}, MAINTENANT);
    assert.equal(formatJourIso(periode.du), "2026-07-21");
    assert.equal(formatJourIso(periode.au), "2026-08-19");
    assert.equal(periode.raccourci, "30j");
  });

  it("suit le raccourci demandé", () => {
    const periode = periodeDepuisUrl({ p: "mois" }, MAINTENANT);
    assert.equal(formatJourIso(periode.du), "2026-08-01");
    assert.equal(periode.raccourci, "mois");
  });

  it("accepte deux dates explicites", () => {
    const periode = periodeDepuisUrl({ du: "2026-03-01", au: "2026-03-31" }, MAINTENANT);
    assert.equal(formatJourIso(periode.du), "2026-03-01");
    assert.equal(formatJourIso(periode.au), "2026-03-31");
    assert.equal(periode.raccourci, null);
  });

  it("fait primer le raccourci sur les dates", () => {
    // Les boutons réécrivent l'URL ; laisser traîner d'anciennes dates ferait
    // afficher une période que plus aucun bouton ne montre comme actif.
    const periode = periodeDepuisUrl({ p: "7j", du: "2026-03-01", au: "2026-03-31" }, MAINTENANT);
    assert.equal(formatJourIso(periode.du), "2026-08-13");
    assert.equal(periode.raccourci, "7j");
  });

  it("retombe sur le défaut quand une date est illisible", () => {
    const periode = periodeDepuisUrl({ du: "hier", au: "2026-03-31" }, MAINTENANT);
    assert.equal(periode.raccourci, "30j");
  });

  it("retombe sur le défaut quand les dates sont inversées", () => {
    // Un écran vide sans explication laisserait croire à une absence de ventes.
    const periode = periodeDepuisUrl({ du: "2026-03-31", au: "2026-03-01" }, MAINTENANT);
    assert.equal(periode.raccourci, "30j");
  });

  it("accepte une période d'un seul jour", () => {
    const periode = periodeDepuisUrl({ du: "2026-03-15", au: "2026-03-15" }, MAINTENANT);
    assert.equal(formatJourIso(periode.du), "2026-03-15");
    assert.equal(formatJourIso(periode.au), "2026-03-15");
    assert.equal(periode.au.getHours(), 23);
  });

  it("ignore une seule des deux dates", () => {
    // Une borne sans l'autre n'est pas une période ; le champ à moitié rempli
    // ne doit pas produire un intervalle inventé.
    assert.equal(periodeDepuisUrl({ du: "2026-03-01" }, MAINTENANT).raccourci, "30j");
    assert.equal(periodeDepuisUrl({ au: "2026-03-31" }, MAINTENANT).raccourci, "30j");
  });
});
```

- [ ] **Étape 2 : lancer les tests pour les voir échouer**

```bash
node --test --import tsx src/lib/kk/periode.test.ts
```

Attendu : ÉCHEC — le module `./periode` n'existe pas.

- [ ] **Étape 3 : écrire le module**

Créer `src/lib/kk/periode.ts` :

```ts
/**
 * Bornes de la période consultée au tableau de bord des ventes.
 *
 * ── POURQUOI CE MODULE EST PUR ──────────────────────────────────────────────
 *
 * L'écran, la barre de période (composant client) et la route d'export lisent
 * tous les trois la même période depuis l'URL. En gardant le module sans
 * dépendance, les trois partagent la règle au lieu de la recopier — et surtout
 * rien de serveur n'entre dans le paquet du navigateur.
 *
 * ── TOUT SE JOUE EN HEURE LOCALE ────────────────────────────────────────────
 *
 * Les jours affichés sont ceux du commerçant, pas ceux d'UTC. Une vente de
 * 23 h 30 doit compter pour ce jour-là, et non pour le lendemain.
 */

export type Raccourci = "7j" | "30j" | "mois" | "annee";

export interface Periode {
  du: Date;
  /** Fin de journée incluse : sans quoi le dernier jour perdrait ses ventes. */
  au: Date;
  /** `null` quand la période vient de deux dates saisies à la main. */
  raccourci: Raccourci | null;
}

const RACCOURCIS: readonly string[] = ["7j", "30j", "mois", "annee"];

export function estRaccourci(valeur: string | undefined): valeur is Raccourci {
  return valeur !== undefined && RACCOURCIS.includes(valeur);
}

/** « AAAA-MM-JJ » en heure locale — `toISOString` donnerait le jour UTC. */
export function formatJourIso(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

function debutDeJour(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function finDeJour(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Lit « AAAA-MM-JJ ». Rend `null` sur tout le reste, y compris le 31 février. */
function lireJour(valeur: string | undefined): Date | null {
  if (!valeur || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return null;
  const [annee, mois, jour] = valeur.split("-").map((part) => Number.parseInt(part, 10));
  const date = new Date(annee, mois - 1, jour);
  // `new Date(2026, 1, 31)` glisse au 3 mars sans prévenir : on vérifie que la
  // date rendue est bien celle demandée.
  if (date.getFullYear() !== annee || date.getMonth() !== mois - 1 || date.getDate() !== jour) {
    return null;
  }
  return date;
}

export function bornesRaccourci(raccourci: Raccourci, maintenant: Date): { du: Date; au: Date } {
  const au = finDeJour(maintenant);

  if (raccourci === "mois") {
    return { du: new Date(maintenant.getFullYear(), maintenant.getMonth(), 1), au };
  }
  if (raccourci === "annee") {
    return { du: new Date(maintenant.getFullYear(), 0, 1), au };
  }

  // « 7j » veut dire sept jours en tout, aujourd'hui compris : on remonte de
  // six jours, pas de sept.
  const jours = raccourci === "7j" ? 7 : 30;
  const debut = debutDeJour(maintenant);
  debut.setDate(debut.getDate() - (jours - 1));
  return { du: debut, au };
}

/** Le raccourci par défaut : la fenêtre où l'on décide encore quelque chose. */
const DEFAUT: Raccourci = "30j";

export function periodeDepuisUrl(
  params: { du?: string; au?: string; p?: string },
  maintenant: Date,
): Periode {
  // Le raccourci prime : les boutons réécrivent l'URL, et d'anciennes dates
  // laissées derrière afficheraient une période dont aucun bouton n'est actif.
  if (estRaccourci(params.p)) {
    return { ...bornesRaccourci(params.p, maintenant), raccourci: params.p };
  }

  const du = lireJour(params.du);
  const au = lireJour(params.au);
  // Une saisie illisible, une borne seule ou deux dates inversées retombent sur
  // le défaut : un écran vide sans explication se lit comme une absence de
  // ventes, ce qui est un mensonge différent.
  if (du && au && du.getTime() <= au.getTime()) {
    return { du: debutDeJour(du), au: finDeJour(au), raccourci: null };
  }

  return { ...bornesRaccourci(DEFAUT, maintenant), raccourci: DEFAUT };
}
```

- [ ] **Étape 4 : lancer les tests pour les voir passer**

```bash
node --test --import tsx src/lib/kk/periode.test.ts
```

Attendu : SUCCÈS, 16 tests.

- [ ] **Étape 5 : vérifier la pureté du module**

```bash
grep -c "^import" src/lib/kk/periode.ts
```

Attendu : `0`. Un seul import ferait de ce module un passager clandestin dans le
paquet du navigateur.

- [ ] **Étape 6 : vérifier l'ensemble et commiter**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test
git add src/lib/kk/periode.ts src/lib/kk/periode.test.ts
git commit -m "Bornes de période du tableau de bord des ventes"
```

---

### Tâche 3 : Le module pur des ventes

**Fichiers :**
- Créer : `src/lib/kk/ventes.ts`
- Créer : `src/lib/kk/ventes.test.ts`

**Interfaces :**
- Consomme : rien.
- Produit, consommé par les tâches 5 et 6 : les types `LigneVente`,
  `TotauxVentes`, `VenteProduit`, `PointJour` et les fonctions
  `totaliserVentes(lignes)`, `classerParProduit(lignes, limite)`,
  `ventesParJour(lignes, du, au)` — signatures exactes à l'étape 3.

**Rappel :** module pur, **zéro import**. Aucune division par 100.

**Le point délicat.** La marge ne porte que sur les lignes qui ont un coût, et
son taux se rapporte au chiffre d'affaires **de ces mêmes lignes**. Rapporter une
marge partielle au CA total donnerait un taux mécaniquement sous-évalué, d'autant
plus faux que le catalogue est peu renseigné. C'est le principal risque du lot.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `src/lib/kk/ventes.test.ts` :

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classerParProduit, totaliserVentes, ventesParJour, type LigneVente } from "./ventes";

function ligne(partiel: Partial<LigneVente> = {}): LigneVente {
  return {
    orderId: "cmd1",
    orderNumber: "KK-2026-000001",
    date: new Date(2026, 7, 19, 10, 0),
    brand: "Nivea",
    name: "Crème hydratante",
    variantLabel: "",
    sku: "",
    quantity: 1,
    unitPriceCents: 12000,
    lineTotalCents: 12000,
    unitCostCents: 8000,
    ...partiel,
  };
}

describe("totaliserVentes", () => {
  it("additionne le chiffre d'affaires des lignes", () => {
    const totaux = totaliserVentes([
      ligne({ lineTotalCents: 12000 }),
      ligne({ orderId: "cmd2", lineTotalCents: 7500 }),
    ]);
    assert.equal(totaux.chiffreAffairesCents, 19500);
  });

  it("compte les commandes distinctes, pas les lignes", () => {
    // Deux articles d'un même panier font une commande, et un panier moyen qui
    // les compterait deux fois serait divisé par deux.
    const totaux = totaliserVentes([ligne(), ligne({ name: "Sérum" })]);
    assert.equal(totaux.nombreCommandes, 1);
    assert.equal(totaux.lignesTotal, 2);
  });

  it("calcule le panier moyen sur les commandes", () => {
    const totaux = totaliserVentes([
      ligne({ lineTotalCents: 10000 }),
      ligne({ orderId: "cmd2", lineTotalCents: 20000 }),
    ]);
    assert.equal(totaux.panierMoyenCents, 15000);
  });

  it("rend un panier moyen de zéro sans commande", () => {
    // Diviser par zéro rendrait NaN, qui s'afficherait tel quel.
    assert.equal(totaliserVentes([]).panierMoyenCents, 0);
  });

  it("additionne les quantités, pas les lignes", () => {
    const totaux = totaliserVentes([ligne({ quantity: 3 }), ligne({ quantity: 2 })]);
    assert.equal(totaux.quantite, 5);
  });

  it("calcule la marge et multiplie le coût par la quantité", () => {
    // 36 000 - 3 × 8 000 = 12 000.
    const totaux = totaliserVentes([
      ligne({ quantity: 3, lineTotalCents: 36000, unitCostCents: 8000 }),
    ]);
    assert.equal(totaux.margeCents, 12000);
    assert.equal(totaux.tauxMarge, 33.3);
  });

  it("rapporte le taux au CA des seules lignes qui ont un coût", () => {
    // 12 000 avec coût, 40 000 sans. La marge de 4 000 vaut 33,3 % des 12 000
    // renseignés — pas 7,7 % des 52 000, chiffre qui ne veut rien dire.
    const totaux = totaliserVentes([
      ligne(),
      ligne({ orderId: "cmd2", lineTotalCents: 40000, unitCostCents: null }),
    ]);
    assert.equal(totaux.margeCents, 4000);
    assert.equal(totaux.tauxMarge, 33.3);
    assert.equal(totaux.chiffreAffairesCents, 52000);
  });

  it("dit sur combien de lignes la marge est calculée", () => {
    // Une marge muette sur son incomplétude ment.
    const totaux = totaliserVentes([
      ligne(),
      ligne({ unitCostCents: null }),
      ligne({ unitCostCents: null }),
    ]);
    assert.equal(totaux.lignesAvecCout, 1);
    assert.equal(totaux.lignesTotal, 3);
  });

  it("rend une marge nulle — pas zéro — quand aucune ligne n'a de coût", () => {
    // Zéro se lirait « vendu à prix coûtant » ; il faut lire « on ne sait pas ».
    const totaux = totaliserVentes([ligne({ unitCostCents: null })]);
    assert.equal(totaux.margeCents, null);
    assert.equal(totaux.tauxMarge, null);
  });

  it("accepte un coût réellement nul", () => {
    // Un échantillon reçu gratuitement a un coût de zéro : c'est un
    // renseignement, et la marge vaut alors tout le prix.
    const totaux = totaliserVentes([ligne({ unitCostCents: 0 })]);
    assert.equal(totaux.margeCents, 12000);
    assert.equal(totaux.tauxMarge, 100);
  });

  it("rend une marge négative telle quelle", () => {
    // Vendre à perte doit se voir ; le masquer empêcherait de le repérer.
    const totaux = totaliserVentes([ligne({ lineTotalCents: 6000, unitCostCents: 8000 })]);
    assert.equal(totaux.margeCents, -2000);
  });

  it("rend des totaux à zéro sur une période sans vente", () => {
    const totaux = totaliserVentes([]);
    assert.equal(totaux.chiffreAffairesCents, 0);
    assert.equal(totaux.nombreCommandes, 0);
    assert.equal(totaux.margeCents, null);
    assert.equal(totaux.lignesTotal, 0);
  });
});

describe("classerParProduit", () => {
  it("regroupe les ventes d'un même produit", () => {
    const classement = classerParProduit(
      [ligne({ quantity: 2, lineTotalCents: 24000 }), ligne({ orderId: "cmd2" })],
      10,
    );
    assert.equal(classement.length, 1);
    assert.equal(classement[0].quantite, 3);
    assert.equal(classement[0].chiffreAffairesCents, 36000);
  });

  it("sépare les variantes d'un même produit", () => {
    // « 50 ml » et « 100 ml » n'ont ni le même prix ni le même coût : les
    // fondre masquerait laquelle des deux se vend.
    const classement = classerParProduit(
      [ligne({ variantLabel: "50 ml" }), ligne({ variantLabel: "100 ml" })],
      10,
    );
    assert.equal(classement.length, 2);
  });

  it("classe par chiffre d'affaires décroissant et respecte la limite", () => {
    const lignes = Array.from({ length: 20 }, (_, index) =>
      ligne({ name: `Produit ${index}`, lineTotalCents: 1000 * (index + 1) }),
    );
    const classement = classerParProduit(lignes, 10);
    assert.equal(classement.length, 10);
    assert.equal(classement[0].name, "Produit 19");
  });

  it("compte les lignes sans coût de chaque produit", () => {
    const classement = classerParProduit([ligne(), ligne({ unitCostCents: null })], 10);
    assert.equal(classement[0].lignesSansCout, 1);
    assert.equal(classement[0].margeCents, 4000);
  });

  it("rend une marge nulle pour un produit dont aucune ligne n'a de coût", () => {
    const classement = classerParProduit([ligne({ unitCostCents: null })], 10);
    assert.equal(classement[0].margeCents, null);
  });

  it("ne fond pas ensemble les produits disparus du catalogue", () => {
    // Le regroupement se fait sur les libellés recopiés, jamais sur un
    // identifiant produit qui vaut `null` pour tout ce qui a été supprimé.
    const classement = classerParProduit(
      [ligne({ name: "Disparu A" }), ligne({ name: "Disparu B" })],
      10,
    );
    assert.equal(classement.length, 2);
  });
});

describe("ventesParJour", () => {
  it("rend un point par jour, jours creux compris", () => {
    // Un histogramme qui saute les jours sans vente ment sur le rythme.
    const points = ventesParJour(
      [ligne({ date: new Date(2026, 7, 19, 10, 0) })],
      new Date(2026, 7, 17),
      new Date(2026, 7, 19, 23, 59, 59),
    );
    assert.deepEqual(
      points.map((point) => point.jour),
      ["2026-08-17", "2026-08-18", "2026-08-19"],
    );
    assert.equal(points[0].chiffreAffairesCents, 0);
    assert.equal(points[2].chiffreAffairesCents, 12000);
  });

  it("compte les commandes distinctes de chaque jour", () => {
    const points = ventesParJour(
      [
        ligne({ date: new Date(2026, 7, 19, 9, 0) }),
        ligne({ date: new Date(2026, 7, 19, 11, 0), name: "Sérum" }),
      ],
      new Date(2026, 7, 19),
      new Date(2026, 7, 19, 23, 59, 59),
    );
    assert.equal(points[0].nombreCommandes, 1);
  });

  it("range la vente au jour local, pas au jour UTC", () => {
    // 23 h 30 bascule en UTC le lendemain ; le commerçant compte ses jours.
    const points = ventesParJour(
      [ligne({ date: new Date(2026, 7, 19, 23, 30) })],
      new Date(2026, 7, 19),
      new Date(2026, 7, 20, 23, 59, 59),
    );
    assert.equal(points[0].chiffreAffairesCents, 12000);
    assert.equal(points[1].chiffreAffairesCents, 0);
  });

  it("rend une série vide quand les bornes sont inversées", () => {
    assert.deepEqual(ventesParJour([], new Date(2026, 7, 19), new Date(2026, 7, 17)), []);
  });

  it("rend un point unique sur une période d'un jour", () => {
    const points = ventesParJour([], new Date(2026, 7, 19), new Date(2026, 7, 19, 23, 59, 59));
    assert.equal(points.length, 1);
  });
});
```

- [ ] **Étape 2 : lancer les tests pour les voir échouer**

```bash
node --test --import tsx src/lib/kk/ventes.test.ts
```

Attendu : ÉCHEC — le module `./ventes` n'existe pas.

- [ ] **Étape 3 : écrire le module**

Créer `src/lib/kk/ventes.ts` :

```ts
/**
 * Agrégation des ventes pour le tableau de bord et l'export comptable.
 *
 * ── POURQUOI CE MODULE EST PUR ──────────────────────────────────────────────
 *
 * L'écran et l'export CSV consomment les mêmes totaux. En gardant le module
 * sans dépendance, la règle de calcul est testable sans base — et c'est la
 * seule partie du lot où une erreur se verrait chez le comptable.
 *
 * ── LE FCFA N'A PAS DE SOUS-UNITÉ ───────────────────────────────────────────
 *
 * Les entiers reçus ici SONT des francs entiers. Le suffixe « Cents » des
 * champs de la base est hérité d'une activité précédente et ment. Aucune
 * division par 100 nulle part.
 *
 * ── CE QUE `null` VEUT DIRE ─────────────────────────────────────────────────
 *
 * Un coût à `null` n'est pas un coût de zéro : c'est un coût qu'on ignore. Une
 * ligne sans coût entre dans le chiffre d'affaires et reste hors de la marge.
 * D'où `lignesAvecCout` / `lignesTotal`, que l'écran est tenu d'afficher : une
 * marge muette sur son incomplétude ment.
 */

export interface LigneVente {
  orderId: string;
  orderNumber: string;
  /** Date de référence de la vente : encaissement quand il est connu. */
  date: Date;
  brand: string;
  name: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  /** `null` = coût inconnu au moment de la vente. Jamais confondu avec 0. */
  unitCostCents: number | null;
}

export interface TotauxVentes {
  /** Somme des lignes : hors port et hors TVA. */
  chiffreAffairesCents: number;
  quantite: number;
  nombreCommandes: number;
  panierMoyenCents: number;
  /** `null` quand aucune ligne de la période n'a de coût. */
  margeCents: number | null;
  /** Points de pourcentage, une décimale, rapportés au CA des seules lignes
   *  qui ont un coût. */
  tauxMarge: number | null;
  lignesAvecCout: number;
  lignesTotal: number;
}

export interface VenteProduit {
  cle: string;
  brand: string;
  name: string;
  variantLabel: string;
  quantite: number;
  chiffreAffairesCents: number;
  margeCents: number | null;
  lignesSansCout: number;
}

export interface PointJour {
  /** « AAAA-MM-JJ », en heure locale. */
  jour: string;
  chiffreAffairesCents: number;
  nombreCommandes: number;
}

/** Marge d'une ligne, ou `null` si son coût est inconnu. */
function margeLigne(ligne: LigneVente): number | null {
  if (ligne.unitCostCents === null) return null;
  return ligne.lineTotalCents - ligne.unitCostCents * ligne.quantity;
}

/**
 * Clé de regroupement : les libellés RECOPIÉS sur la ligne, jamais
 * l'identifiant produit. Une ligne dont le produit a été supprimé du catalogue
 * porte `productId` à `null` — grouper là-dessus fondrait tous les produits
 * disparus en un seul. La clé passe par JSON.stringify plutôt que par une
 * concaténation : un séparateur, quel qu’il soit, peut figurer dans un nom de
 * produit et ferait alors se confondre deux articles distincts.
 */
function cleProduit(ligne: LigneVente): string {
  return JSON.stringify([ligne.brand, ligne.name, ligne.variantLabel]);
}

/** « AAAA-MM-JJ » en heure locale — `toISOString` donnerait le jour UTC. */
function jourLocal(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

export function totaliserVentes(lignes: LigneVente[]): TotauxVentes {
  const commandes = new Set<string>();
  let chiffreAffairesCents = 0;
  let quantite = 0;
  let lignesAvecCout = 0;
  let margeCents = 0;
  // Assiette de la marge : le CA des SEULES lignes qui ont un coût. Rapporter
  // une marge partielle au CA total donnerait un taux sous-évalué, d'autant
  // plus faux que le catalogue est peu renseigné.
  let caAvecCout = 0;

  for (const ligne of lignes) {
    commandes.add(ligne.orderId);
    chiffreAffairesCents += ligne.lineTotalCents;
    quantite += ligne.quantity;

    const marge = margeLigne(ligne);
    if (marge !== null) {
      lignesAvecCout += 1;
      margeCents += marge;
      caAvecCout += ligne.lineTotalCents;
    }
  }

  const nombreCommandes = commandes.size;

  return {
    chiffreAffairesCents,
    quantite,
    nombreCommandes,
    panierMoyenCents:
      nombreCommandes === 0 ? 0 : Math.round(chiffreAffairesCents / nombreCommandes),
    margeCents: lignesAvecCout === 0 ? null : margeCents,
    tauxMarge:
      lignesAvecCout === 0 || caAvecCout === 0
        ? null
        : Math.round((margeCents / caAvecCout) * 1000) / 10,
    lignesAvecCout,
    lignesTotal: lignes.length,
  };
}

export function classerParProduit(lignes: LigneVente[], limite: number): VenteProduit[] {
  const parCle = new Map<string, VenteProduit & { avecCout: number }>();

  for (const ligne of lignes) {
    const cle = cleProduit(ligne);
    let entree = parCle.get(cle);
    if (!entree) {
      entree = {
        cle,
        brand: ligne.brand,
        name: ligne.name,
        variantLabel: ligne.variantLabel,
        quantite: 0,
        chiffreAffairesCents: 0,
        margeCents: 0,
        lignesSansCout: 0,
        avecCout: 0,
      };
      parCle.set(cle, entree);
    }

    entree.quantite += ligne.quantity;
    entree.chiffreAffairesCents += ligne.lineTotalCents;

    const marge = margeLigne(ligne);
    if (marge === null) {
      entree.lignesSansCout += 1;
    } else {
      entree.avecCout += 1;
      entree.margeCents = (entree.margeCents ?? 0) + marge;
    }
  }

  return [...parCle.values()]
    .sort((a, b) => b.chiffreAffairesCents - a.chiffreAffairesCents)
    .slice(0, limite)
    .map(({ avecCout, ...produit }) => ({
      ...produit,
      // Aucune ligne renseignée : la marge est inconnue, pas nulle.
      margeCents: avecCout === 0 ? null : produit.margeCents,
    }));
}

export function ventesParJour(lignes: LigneVente[], du: Date, au: Date): PointJour[] {
  const parJour = new Map<string, { ca: number; commandes: Set<string> }>();

  for (const ligne of lignes) {
    const jour = jourLocal(ligne.date);
    let entree = parJour.get(jour);
    if (!entree) {
      entree = { ca: 0, commandes: new Set() };
      parJour.set(jour, entree);
    }
    entree.ca += ligne.lineTotalCents;
    entree.commandes.add(ligne.orderId);
  }

  // On parcourt la période jour par jour plutôt que les seules ventes : un
  // histogramme qui saute les jours creux ment sur le rythme.
  const points: PointJour[] = [];
  const curseur = new Date(du.getFullYear(), du.getMonth(), du.getDate());
  const fin = new Date(au.getFullYear(), au.getMonth(), au.getDate());

  while (curseur.getTime() <= fin.getTime()) {
    const jour = jourLocal(curseur);
    const entree = parJour.get(jour);
    points.push({
      jour,
      chiffreAffairesCents: entree?.ca ?? 0,
      nombreCommandes: entree?.commandes.size ?? 0,
    });
    curseur.setDate(curseur.getDate() + 1);
  }

  return points;
}
```

- [ ] **Étape 4 : lancer les tests pour les voir passer**

```bash
node --test --import tsx src/lib/kk/ventes.test.ts
```

Attendu : SUCCÈS, 22 tests.

- [ ] **Étape 5 : vérifier la pureté du module**

```bash
grep -c "^import" src/lib/kk/ventes.ts
```

Attendu : `0`.

- [ ] **Étape 6 : vérifier l'ensemble et commiter**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test
git add src/lib/kk/ventes.ts src/lib/kk/ventes.test.ts
git commit -m "Agrégation des ventes : totaux, classement, série par jour"
```

---

### Tâche 4 : Le module pur du CSV

**Fichiers :**
- Créer : `src/lib/kk/csv.ts`
- Créer : `src/lib/kk/csv.test.ts`
- Modifier : `src/app/api/admin/products/export/route.ts` — supprimer `csvCell`
  et `buildCsv` locales, importer le module

**Interfaces :**
- Produit, consommé par la tâche 6 :
  - `function csvCell(value: string): string`
  - `function buildCsv(entetes: string[], lignes: string[][]): string`

**Contexte.** L'export produits porte déjà ces deux fonctions, recopiées dans son
fichier de route. La tâche les extrait pour que l'export des ventes n'en fasse pas
une troisième copie — deux copies d'une règle divergent tôt ou tard.

`src/app/feed/google-csv/route.ts` et `src/app/api/account/export/route.ts` ne
sont **pas** recâblés : leurs conventions sont celles de Google et du RGPD, pas
celles d'Excel francophone, et les aligner casserait les deux.

**Rappel :** module pur, **zéro import**.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `src/lib/kk/csv.test.ts` :

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCsv, csvCell } from "./csv";

describe("csvCell", () => {
  it("laisse une valeur ordinaire telle quelle", () => {
    assert.equal(csvCell("Crème hydratante"), "Crème hydratante");
  });

  it("entoure de guillemets une valeur contenant le séparateur", () => {
    // Sans cela, « Nivea; Soft » deviendrait deux colonnes.
    assert.equal(csvCell("Nivea; Soft"), '"Nivea; Soft"');
  });

  it("double les guillemets internes", () => {
    assert.equal(csvCell('Crème "riche"'), '"Crème ""riche"""');
  });

  it("remplace les retours à la ligne par une espace", () => {
    // Un retour à la ligne non protégé couperait la ligne du tableur en deux.
    assert.equal(csvCell("Première ligne\nSeconde"), "Première ligne Seconde");
    assert.equal(csvCell("Première ligne\r\nSeconde"), "Première ligne Seconde");
  });

  it("supprime les espaces de bord", () => {
    assert.equal(csvCell("  Nivea  "), "Nivea");
  });

  it("rend une chaîne vide pour une valeur vide", () => {
    // Une case vide dit « on ne sait pas » ; y écrire 0 fausserait un total.
    assert.equal(csvCell(""), "");
  });
});

describe("buildCsv", () => {
  it("écrit l'en-tête puis les lignes, séparés par des points-virgules", () => {
    const csv = buildCsv(["Marque", "Produit"], [["Nivea", "Crème"]]);
    assert.ok(csv.includes("Marque;Produit"));
    assert.ok(csv.includes("Nivea;Crème"));
  });

  it("commence par un BOM", () => {
    // Sans lui, Excel affiche « CrÃ¨me » à l'ouverture.
    assert.equal(buildCsv(["A"], []).charCodeAt(0), 0xfeff);
  });

  it("sépare les lignes par CRLF et termine le fichier par un CRLF", () => {
    const csv = buildCsv(["A"], [["1"], ["2"]]);
    assert.ok(csv.endsWith("\r\n"));
    assert.equal(csv.split("\r\n").filter(Boolean).length, 3);
  });

  it("échappe les cellules des lignes comme celles de l'en-tête", () => {
    const csv = buildCsv(["Note; interne"], [['Il a dit "oui"']]);
    assert.ok(csv.includes('"Note; interne"'));
    assert.ok(csv.includes('"Il a dit ""oui"""'));
  });

  it("écrit un fichier d'en-tête seul quand il n'y a aucune ligne", () => {
    // Une période sans vente doit produire un fichier lisible, pas un fichier
    // vide qu'on prendrait pour un export raté.
    const csv = buildCsv(["Marque", "Produit"], []);
    assert.equal(csv, "﻿Marque;Produit\r\n");
  });
});
```

- [ ] **Étape 2 : lancer les tests pour les voir échouer**

```bash
node --test --import tsx src/lib/kk/csv.test.ts
```

Attendu : ÉCHEC — le module `./csv` n'existe pas.

- [ ] **Étape 3 : écrire le module**

Créer `src/lib/kk/csv.ts` :

```ts
/**
 * Assemblage d'un fichier CSV destiné à Excel francophone.
 *
 * ── POURQUOI CE MODULE EXISTE ───────────────────────────────────────────────
 *
 * Ces deux fonctions vivaient recopiées dans la route d'export des produits.
 * L'export des ventes en aurait fait une deuxième copie, et deux copies d'une
 * règle d'échappement divergent tôt ou tard — au détriment d'un fichier que
 * personne ne relit avant de l'ouvrir chez le comptable.
 *
 * ── LES DEUX CONVENTIONS, ET LEURS RAISONS ──────────────────────────────────
 *
 *  • SÉPARATEUR POINT-VIRGULE — c'est celui qu'Excel attend dans un
 *    environnement francophone. La virgule y couperait « 12 000,50 » en deux
 *    colonnes.
 *  • BOM EN TÊTE — sans lui, Excel lit le fichier dans son encodage local et
 *    affiche « CrÃ¨me » au lieu de « Crème ».
 *
 * Ces conventions valent pour les exports du back-office. Le flux Google
 * Merchant et l'export de données personnelles ont les leurs, et ne passent
 * délibérément pas par ici.
 */

const SEPARATEUR = ";";

/**
 * Prépare une valeur pour une cellule.
 *
 * Les retours à la ligne sont remplacés plutôt qu'échappés : une cellule
 * multiligne est licite en CSV, mais elle rend le fichier illisible dès qu'on
 * le rouvre dans un autre outil que celui qui l'a écrit.
 */
export function csvCell(value: string): string {
  const propre = value.replace(/\r?\n/g, " ").trim();
  return /[";]/.test(propre) ? `"${propre.replace(/"/g, '""')}"` : propre;
}

/** Assemble l'en-tête et les lignes en un fichier complet, BOM compris. */
export function buildCsv(entetes: string[], lignes: string[][]): string {
  const toutes = [
    entetes.map(csvCell).join(SEPARATEUR),
    ...lignes.map((ligne) => ligne.map(csvCell).join(SEPARATEUR)),
  ];
  return `﻿${toutes.join("\r\n")}\r\n`;
}
```

- [ ] **Étape 4 : lancer les tests pour les voir passer**

```bash
node --test --import tsx src/lib/kk/csv.test.ts
```

Attendu : SUCCÈS, 11 tests.

Si le test « entoure de guillemets une valeur contenant le séparateur » échoue,
vérifier la classe de caractères de l'expression régulière : elle doit contenir le
guillemet et le point-virgule, et rien d'autre.

- [ ] **Étape 5 : recâbler l'export des produits**

Dans `src/app/api/admin/products/export/route.ts` :

1. supprimer les fonctions locales `csvCell` et `buildCsv` ainsi que leur
   commentaire d'introduction ;
2. ajouter l'import `import { buildCsv } from "@/lib/kk/csv";` ;
3. remplacer l'appel `buildCsv(rows)` par la forme à deux arguments :

```ts
    return new Response(
      buildCsv(
        CSV_COLUMNS.map((column) => column.label),
        rows.map((row) => CSV_COLUMNS.map((column) => row[column.key])),
      ),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      },
    );
```

Ne rien changer d'autre dans ce fichier : la partie PDF, les filtres et les
en-têtes HTTP restent tels quels.

- [ ] **Étape 6 : vérifier que l'export produits sort le même fichier qu'avant**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test && npm run build
```

Attendu : aucune erreur, tous les tests au vert, construction en succès. La
séparation par point-virgule, le BOM et les fins de ligne CRLF sont inchangés —
c'est ce que les tests de l'étape 1 verrouillent.

- [ ] **Étape 7 : commit**

```bash
git add src/lib/kk/csv.ts src/lib/kk/csv.test.ts src/app/api/admin/products/export/route.ts
git commit -m "Le CSV du back-office a enfin un seul assembleur"
```

---

### Tâche 5 : La lecture des ventes et l'écran `/admin/ventes`

**Fichiers :**
- Créer : `src/server/kk/ventes.ts`
- Créer : `src/app/admin/(protected)/ventes/page.tsx`
- Créer : `src/components/admin/VentesPeriodeForm.tsx`
- Créer : `src/components/admin/VentesHistogramme.tsx`
- Modifier : `src/components/admin/AdminSidebar.tsx` — entrée « Ventes »

**Interfaces :**
- Consomme : `periodeDepuisUrl`, `formatJourIso`, `type Periode` (`@/lib/kk/periode`) ;
  `totaliserVentes`, `classerParProduit`, `ventesParJour`, `type LigneVente`,
  `type PointJour` (`@/lib/kk/ventes`) ; la colonne `OrderItem.unitCostCents`.
- Produit, consommé par la tâche 6 :
  - `async function lireVentes(periode: Periode): Promise<LigneVente[]>`
  - `async function lireEnCours(periode: Periode): Promise<{ nombre: number; totalCents: number }>`

**Contexte.** Deux chiffres, jamais additionnés : l'**encaissé** (commandes dont
`paymentStatus` vaut `"payee"`) et l'**en cours** (commandes ni payées ni
annulées). Le paiement à la livraison n'a pas de webhook : ce second montant
existe, mais il n'est pas acquis.

La date de référence est `paidAt` quand il est posé, `createdAt` sinon — les
commandes antérieures au suivi de l'encaissement n'ont pas de `paidAt`, et les
écarter creuserait un trou silencieux dans l'historique.

- [ ] **Étape 1 : écrire la lecture serveur**

Créer `src/server/kk/ventes.ts` :

```ts
import { prisma } from "@/server/prisma";
import type { LigneVente } from "@/lib/kk/ventes";
import type { Periode } from "@/lib/kk/periode";

/**
 * Lecture des ventes de la période, à plat.
 *
 * ── LA DATE DE RÉFÉRENCE ────────────────────────────────────────────────────
 *
 * `paidAt` quand il est posé, `createdAt` sinon. `paidAt` n'existe que depuis
 * le suivi de l'encaissement ; les commandes plus anciennes n'en ont pas, et
 * les rejeter de l'historique serait un trou que rien ne signalerait.
 *
 * ── PAS D'AGRÉGATION SQL ────────────────────────────────────────────────────
 *
 * Les totaux sont calculés en TypeScript par `@/lib/kk/ventes`, qui est testé
 * sans base. Le volume d'une jeune boutique tient en mémoire ; le jour où il
 * n'y tiendra plus, c'est ici qu'il faudra passer à une agrégation, et les
 * tests du module pur diront alors ce que la requête doit rendre.
 */

/** Fenêtre de dates portée sur la commande liée, dans les deux cas de figure. */
function fenetre(periode: Periode) {
  return [
    { paidAt: { gte: periode.du, lte: periode.au } },
    { paidAt: null, createdAt: { gte: periode.du, lte: periode.au } },
  ];
}

export async function lireVentes(periode: Periode): Promise<LigneVente[]> {
  const lignes = await prisma.orderItem.findMany({
    where: { order: { paymentStatus: "payee", OR: fenetre(periode) } },
    select: {
      quantity: true,
      unitPriceCents: true,
      lineTotalCents: true,
      unitCostCents: true,
      brand: true,
      name: true,
      variantLabel: true,
      sku: true,
      order: { select: { id: true, orderNumber: true, paidAt: true, createdAt: true } },
    },
  });

  return lignes
    .map((ligne) => ({
      orderId: ligne.order.id,
      orderNumber: ligne.order.orderNumber,
      date: ligne.order.paidAt ?? ligne.order.createdAt,
      brand: ligne.brand,
      name: ligne.name,
      variantLabel: ligne.variantLabel,
      sku: ligne.sku,
      quantity: ligne.quantity,
      unitPriceCents: ligne.unitPriceCents,
      lineTotalCents: ligne.lineTotalCents,
      unitCostCents: ligne.unitCostCents,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Commandes engagées mais pas encore encaissées.
 *
 * Ce montant se présente à part et ne s'additionne jamais à l'encaissé : le
 * confondre avec du chiffre d'affaires ferait compter deux fois la même vente
 * le jour où elle est payée.
 */
export async function lireEnCours(
  periode: Periode,
): Promise<{ nombre: number; totalCents: number }> {
  const commandes = await prisma.order.findMany({
    where: {
      // « en attente » strictement : un paiement échoué n'est pas de l'argent qui
      // arrive, et le compter ferait espérer une somme que personne ne doit.
      paymentStatus: "en_attente",
      status: { notIn: ["annulee", "remboursee"] },
      OR: fenetre(periode),
    },
    select: { totalCents: true },
  });

  return {
    nombre: commandes.length,
    totalCents: commandes.reduce((total, commande) => total + commande.totalCents, 0),
  };
}
```

- [ ] **Étape 2 : vérifier que la requête compile contre le client généré**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur. Si `unitCostCents` est inconnu du client Prisma,
relancer `npx prisma generate` — la tâche 1 l'a ajouté au schéma.

- [ ] **Étape 3 : écrire la barre de période**

Créer `src/components/admin/VentesPeriodeForm.tsx` :

```tsx
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
// `periode` est un module pur — vérifié : aucun import. Rien de serveur
// n'entre donc dans le paquet du navigateur par cette porte.
import type { Raccourci } from "@/lib/kk/periode";

const RACCOURCIS: { valeur: Raccourci; label: string }[] = [
  { valeur: "7j", label: "7 jours" },
  { valeur: "30j", label: "30 jours" },
  { valeur: "mois", label: "Ce mois" },
  { valeur: "annee", label: "Cette année" },
];

export function VentesPeriodeForm({
  raccourciActif,
  duInitial,
  auInitial,
}: {
  raccourciActif: Raccourci | null;
  duInitial: string;
  auInitial: string;
}) {
  const router = useRouter();
  const [du, setDu] = useState(duInitial);
  const [au, setAu] = useState(auInitial);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Les dates remplacent le raccourci : envoyer les deux afficherait une
    // période dont aucun bouton n'est actif.
    router.push(`/admin/ventes?du=${du}&au=${au}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-2">
        {RACCOURCIS.map((raccourci) => (
          <Link
            key={raccourci.valeur}
            href={`/admin/ventes?p=${raccourci.valeur}`}
            className={`rounded-sm border px-3 py-1.5 text-sm ${
              raccourciActif === raccourci.valeur
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            {raccourci.label}
          </Link>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          Du
          <input
            type="date"
            value={du}
            onChange={(event) => setDu(event.target.value)}
            className="ml-2 rounded-sm border border-border px-2 py-1 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Au
          <input
            type="date"
            value={au}
            onChange={(event) => setAu(event.target.value)}
            className="ml-2 rounded-sm border border-border px-2 py-1 text-sm outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          className="rounded-sm border border-border px-3 py-1.5 text-sm hover:border-primary"
        >
          Afficher
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Étape 4 : écrire l'histogramme**

Créer `src/components/admin/VentesHistogramme.tsx` :

```tsx
import type { PointJour } from "@/lib/kk/ventes";
import { formatFcfa } from "@/lib/kk/format";

/**
 * Histogramme des ventes par jour, en SVG écrit à la main.
 *
 * Le projet n'a pas de bibliothèque de graphiques et n'en gagne pas une pour ce
 * lot : les graphiques existants du back-office sont eux aussi du SVG direct.
 *
 * Chaque barre porte un `title` : la couleur et la hauteur ne sont jamais la
 * seule information, ce qui vaut aussi pour la lecture au lecteur d'écran.
 */
export function VentesHistogramme({ points }: { points: PointJour[] }) {
  const maximum = Math.max(...points.map((point) => point.chiffreAffairesCents), 1);
  const largeurBarre = 100 / points.length;

  return (
    <div className="rounded-sm border border-border p-4">
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={`Ventes par jour sur ${points.length} jours`}
      >
        {points.map((point, index) => {
          const hauteur = (point.chiffreAffairesCents / maximum) * 38;
          return (
            <rect
              key={point.jour}
              x={index * largeurBarre + largeurBarre * 0.15}
              y={40 - hauteur}
              width={largeurBarre * 0.7}
              height={hauteur}
              className="fill-primary"
            >
              <title>{`${point.jour} — ${formatFcfa(point.chiffreAffairesCents)} (${point.nombreCommandes} commande${point.nombreCommandes > 1 ? "s" : ""})`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{points[0]?.jour}</span>
        <span>{points[points.length - 1]?.jour}</span>
      </div>
    </div>
  );
}
```

- [ ] **Étape 5 : écrire l'écran**

Créer `src/app/admin/(protected)/ventes/page.tsx` :

```tsx
import Link from "next/link";
import { requireAdminSession } from "@/lib/dal";
import { formatFcfa } from "@/lib/kk/format";
import { formatJourIso, periodeDepuisUrl } from "@/lib/kk/periode";
import { classerParProduit, totaliserVentes, ventesParJour } from "@/lib/kk/ventes";
import { lireEnCours, lireVentes } from "@/server/kk/ventes";
import { VentesPeriodeForm } from "@/components/admin/VentesPeriodeForm";
import { VentesHistogramme } from "@/components/admin/VentesHistogramme";

/** Au-delà, une barre par jour devient illisible ; les chiffres, eux, restent. */
const JOURS_MAX_HISTOGRAMME = 92;

const TOP_PRODUITS = 10;

function Carte({
  titre,
  valeur,
  mention,
}: {
  titre: string;
  valeur: string;
  mention?: string;
}) {
  return (
    <div className="rounded-sm border border-border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titre}</p>
      <p className="mt-1 text-2xl font-black text-foreground">{valeur}</p>
      {mention ? <p className="mt-1 text-xs text-muted-foreground">{mention}</p> : null}
    </div>
  );
}

export default async function AdminVentesPage({
  searchParams,
}: {
  searchParams: Promise<{ du?: string; au?: string; p?: string }>;
}) {
  await requireAdminSession();

  const params = await searchParams;
  const periode = periodeDepuisUrl(params, new Date());
  const [lignes, enCours] = await Promise.all([lireVentes(periode), lireEnCours(periode)]);

  const totaux = totaliserVentes(lignes);
  const produits = classerParProduit(lignes, TOP_PRODUITS);
  const points = ventesParJour(lignes, periode.du, periode.au);

  const lignesSansCout = totaux.lignesTotal - totaux.lignesAvecCout;
  // La marge se dit toujours avec son assiette : muette sur son incomplétude,
  // elle mentirait.
  const mentionMarge =
    totaux.lignesTotal === 0
      ? undefined
      : lignesSansCout === 0
        ? `calculée sur les ${totaux.lignesTotal} lignes de la période`
        : `calculée sur ${totaux.lignesAvecCout} lignes sur ${totaux.lignesTotal} — le coût d’achat manque sur les autres`;

  const exportHref = `/api/admin/ventes/export?du=${formatJourIso(periode.du)}&au=${formatJourIso(periode.au)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">Ventes</h1>
        <Link
          href={exportHref}
          className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Exporter en CSV
        </Link>
      </div>

      <VentesPeriodeForm
        raccourciActif={periode.raccourci}
        duInitial={formatJourIso(periode.du)}
        auInitial={formatJourIso(periode.au)}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Carte
          titre="Encaissé"
          valeur={formatFcfa(totaux.chiffreAffairesCents)}
          mention="produits seuls, hors livraison"
        />
        <Carte
          titre="Marge"
          valeur={
            totaux.margeCents === null
              ? "—"
              : `${formatFcfa(totaux.margeCents)}${totaux.tauxMarge === null ? "" : ` (${totaux.tauxMarge.toString().replace(".", ",")} %)`}`
          }
          mention={
            totaux.margeCents === null
              ? "aucun coût d’achat renseigné sur la période"
              : mentionMarge
          }
        />
        <Carte
          titre="Commandes"
          valeur={totaux.nombreCommandes.toString()}
          mention={`${totaux.quantite} article${totaux.quantite > 1 ? "s" : ""} vendu${totaux.quantite > 1 ? "s" : ""}`}
        />
        <Carte titre="Panier moyen" valeur={formatFcfa(totaux.panierMoyenCents)} />
      </div>

      {enCours.nombre > 0 ? (
        <div className="rounded-sm border border-dashed border-border p-4">
          <p className="text-sm">
            <span className="font-semibold">{enCours.nombre}</span> commande
            {enCours.nombre > 1 ? "s" : ""} en attente de paiement, soit{" "}
            <span className="font-semibold">{formatFcfa(enCours.totalCents)}</span>.
          </p>
          {/* Volontairement séparé de l'encaissé : cet argent n'est pas entré. */}
          <p className="mt-1 text-xs text-muted-foreground">
            Ce montant n’est pas compris dans l’encaissé ci-dessus.{" "}
            <Link href="/admin/orders?paymentStatus=en_attente" className="underline">
              Voir les commandes
            </Link>
          </p>
        </div>
      ) : null}

      {points.length <= JOURS_MAX_HISTOGRAMME ? (
        <VentesHistogramme points={points} />
      ) : (
        <p className="rounded-sm border border-border p-4 text-sm text-muted-foreground">
          La période dépasse {JOURS_MAX_HISTOGRAMME} jours : le détail quotidien n’est pas
          affiché. Les totaux et le classement ci-dessous portent bien sur toute la période.
        </p>
      )}

      <div className="rounded-sm border border-border">
        <h2 className="border-b border-border px-4 py-3 font-semibold">
          Produits les plus vendus
        </h2>
        {produits.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Aucune vente encaissée sur cette période.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2 font-medium">Produit</th>
                <th className="px-4 py-2 font-medium">Quantité</th>
                <th className="px-4 py-2 font-medium">Chiffre d’affaires</th>
                <th className="px-4 py-2 font-medium">Marge</th>
              </tr>
            </thead>
            <tbody>
              {produits.map((produit) => (
                <tr key={produit.cle} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <span className="text-muted-foreground">{produit.brand}</span>{" "}
                    {produit.name}
                    {produit.variantLabel ? (
                      <span className="text-muted-foreground"> — {produit.variantLabel}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">{produit.quantite}</td>
                  <td className="px-4 py-2">{formatFcfa(produit.chiffreAffairesCents)}</td>
                  <td className="px-4 py-2">
                    {produit.margeCents === null ? (
                      <span className="text-muted-foreground" title="Coût d’achat non renseigné">
                        —
                      </span>
                    ) : (
                      <>
                        {formatFcfa(produit.margeCents)}
                        {produit.lignesSansCout > 0 ? (
                          <span
                            className="ml-1 text-xs text-muted-foreground"
                            title={`${produit.lignesSansCout} ligne(s) sans coût d’achat`}
                          >
                            (partielle)
                          </span>
                        ) : null}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Étape 6 : ajouter l'entrée au menu**

Dans `src/components/admin/AdminSidebar.tsx`, section `Boutique`, **avant**
l'entrée « Commandes » : importer `TrendingUp` depuis `lucide-react` (l'ajouter à
la liste d'imports d'icônes existante) et insérer :

```tsx
        { label: "Ventes", href: "/admin/ventes", icon: TrendingUp },
```

- [ ] **Étape 7 : vérifier**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test && npm run build
```

Attendu : aucune erreur, tous les tests au vert, construction en succès, et la
route `/admin/ventes` présente dans la liste des routes dynamiques.

- [ ] **Étape 8 : vérifier à la main**

```bash
npm run dev
```

Ouvrir `http://localhost:3000/admin/ventes` et contrôler :
1. l'écran s'ouvre sur les 30 derniers jours, bouton « 30 jours » actif ;
2. chaque raccourci change la période et l'histogramme ;
3. deux dates saisies désactivent les quatre raccourcis ;
4. la carte « Marge » porte sa mention de complétude, ou « — » si aucun coût.

- [ ] **Étape 9 : commit**

```bash
git add src/server/kk/ventes.ts "src/app/admin/(protected)/ventes/page.tsx" src/components/admin/VentesPeriodeForm.tsx src/components/admin/VentesHistogramme.tsx src/components/admin/AdminSidebar.tsx
git commit -m "Écran des ventes : encaissé, marge, produits, rythme"
```

---

### Tâche 6 : L'export CSV des ventes

**Fichiers :**
- Créer : `src/app/api/admin/ventes/export/route.ts`

**Interfaces :**
- Consomme : `buildCsv` (`@/lib/kk/csv`) ; `periodeDepuisUrl`, `formatJourIso`
  (`@/lib/kk/periode`) ; `lireVentes` (`@/server/kk/ventes`) ; `requireAdminApi`
  (`@/lib/adminApi`).
- Produit : rien que d'autres tâches consomment.

**Contexte.** C'est le livrable du critère 15 : le fichier qu'ouvre le comptable.
Deux règles y comptent plus que tout le reste.

**Les montants sortent en entiers nus.** Pas de séparateur de milliers, pas de
symbole, pas de « FCFA ». Un tableur doit pouvoir les additionner, et
« 12 000 FCFA » n'est pas un nombre. La devise est dite une fois, dans l'en-tête
de colonne.

**Une case vide n'est jamais un zéro.** Quand le coût est inconnu, les colonnes
de coût et de marge restent vides. Un zéro s'additionnerait au total du comptable
et le fausserait sans bruit.

- [ ] **Étape 1 : écrire la route**

Créer `src/app/api/admin/ventes/export/route.ts` :

```ts
import { requireAdminApi } from "@/lib/adminApi";
import { buildCsv } from "@/lib/kk/csv";
import { formatJourIso, periodeDepuisUrl } from "@/lib/kk/periode";
import { lireVentes } from "@/server/kk/ventes";
import { margeUnitaire, tauxMarge } from "@/lib/kk/marge";

/**
 * Export comptable des ventes encaissées : une ligne par ligne de commande.
 *
 * ── LES MONTANTS SORTENT EN ENTIERS NUS ─────────────────────────────────────
 *
 * Ni séparateur de milliers, ni symbole : un tableur doit pouvoir additionner
 * la colonne, et « 12 000 FCFA » n'est pas un nombre. La devise est dite une
 * fois, dans l'en-tête. Rappel : le FCFA n'a pas de sous-unité — les entiers
 * de la base SONT des francs, on ne divise jamais par 100.
 *
 * ── UNE CASE VIDE N'EST PAS UN ZÉRO ─────────────────────────────────────────
 *
 * Coût inconnu ⇒ colonnes de coût et de marge vides. Y écrire 0 ferait entrer
 * une ligne non renseignée dans le total du comptable, et le fausserait sans
 * que rien ne le signale.
 */

export const dynamic = "force-dynamic";

const COLONNES = [
  "Date",
  "N° commande",
  "Marque",
  "Produit",
  "Variante",
  "SKU",
  "Quantité",
  "Prix unitaire (FCFA)",
  "Total ligne (FCFA)",
  "Coût unitaire (FCFA)",
  "Coût total (FCFA)",
  "Marge (FCFA)",
  "Taux de marge (%)",
] as const;

/** Nombre décimal à la française : le tableur francophone attend la virgule. */
function nombreFr(valeur: number): string {
  return valeur.toString().replace(".", ",");
}

export async function GET(request: Request): Promise<Response> {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  // Exactement la même lecture que l'écran : le fichier exporté doit
  // correspondre au tableau que l'administrateur avait sous les yeux.
  const periode = periodeDepuisUrl(
    {
      du: url.searchParams.get("du") ?? undefined,
      au: url.searchParams.get("au") ?? undefined,
      p: url.searchParams.get("p") ?? undefined,
    },
    new Date(),
  );

  const lignes = await lireVentes(periode);

  const corps = lignes.map((ligne) => {
    const coutTotal =
      ligne.unitCostCents === null ? null : ligne.unitCostCents * ligne.quantity;
    const marge =
      coutTotal === null ? null : margeUnitaire(ligne.lineTotalCents, coutTotal);
    const taux =
      coutTotal === null ? null : tauxMarge(ligne.lineTotalCents, coutTotal);

    return [
      formatJourIso(ligne.date),
      ligne.orderNumber,
      ligne.brand,
      ligne.name,
      ligne.variantLabel,
      ligne.sku,
      ligne.quantity.toString(),
      ligne.unitPriceCents.toString(),
      ligne.lineTotalCents.toString(),
      // Vide, jamais zéro : la ligne n'a pas de coût connu.
      ligne.unitCostCents === null ? "" : ligne.unitCostCents.toString(),
      coutTotal === null ? "" : coutTotal.toString(),
      marge === null ? "" : marge.toString(),
      taux === null ? "" : nombreFr(taux),
    ];
  });

  // Les bornes figurent dans le nom : un export sans sa période ne se relit pas
  // six mois plus tard.
  const nom = `ventes-${formatJourIso(periode.du)}_${formatJourIso(periode.au)}.csv`;

  return new Response(buildCsv([...COLONNES], corps), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Cache-Control": "no-store",
    },
  });
}
```

- [ ] **Étape 2 : vérifier que la marge de la ligne réutilise le module du lot 3B**

```bash
grep -n "margeUnitaire\|tauxMarge" src/app/api/admin/ventes/export/route.ts
```

Attendu : les deux fonctions viennent de `@/lib/kk/marge` et ne sont pas
réécrites sur place. Une troisième formule de marge dans le dépôt divergerait des
deux autres.

- [ ] **Étape 3 : vérifier**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test && npm run build
```

Attendu : aucune erreur, tous les tests au vert, construction en succès.

- [ ] **Étape 4 : vérifier le fichier produit, à la main**

```bash
npm run dev
```

Depuis `/admin/ventes`, cliquer « Exporter en CSV », puis ouvrir le fichier dans
un éditeur de texte et contrôler :

1. la première ligne porte les treize en-têtes, séparés par des points-virgules ;
2. les accents s'affichent correctement (« Coût », « N° commande ») ;
3. les montants sont des entiers nus : `12000`, jamais `12 000 FCFA` ni `120,00` ;
4. une ligne dont le produit n'a pas de coût d'achat laisse les quatre dernières
   colonnes vides — **pas** des zéros ;
5. le nom du fichier porte les deux bornes de la période.

Ouvrir ensuite le fichier dans un tableur et vérifier que la colonne
« Total ligne » s'additionne — c'est le seul test qui compte pour le comptable.

- [ ] **Étape 5 : commit**

```bash
git add src/app/api/admin/ventes/export/route.ts
git commit -m "Export CSV des ventes avec coûts et marges"
```

---

## Vérification finale du lot

- [ ] **La chaîne complète, une fois**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test && npm run build
```

- [ ] **Le compte des tests**

Le lot ajoute 16 tests de période, 22 tests de ventes et 11 tests de CSV, soit
**49 tests** de plus que la base du lot 3B.

- [ ] **Les trois modules purs sont restés purs**

```bash
grep -c "^import" src/lib/kk/periode.ts src/lib/kk/ventes.ts src/lib/kk/csv.ts
```

Attendu : `0` pour les trois. C'est ce qui permet à la barre de période, qui est
un composant client, d'importer le type `Raccourci` sans tirer Prisma dans le
navigateur — un lot précédent a cassé la construction exactement là.

- [ ] **Ce que le lot ne fait pas, et qu'il ne faut pas croire fait**

- Les commandes antérieures à ce lot n'ont pas de coût d'achat : leur marge
  restera vide pour toujours, et l'écran le dit ligne par ligne.
- Les avoirs et remboursements ne sont pas déduits du chiffre d'affaires ; ils
  relèvent du lot de facturation.
- Aucune agrégation par marque ni par catégorie : les marques deviennent une
  entité au lot 3E, et agréger dessus avant serait à refaire.
