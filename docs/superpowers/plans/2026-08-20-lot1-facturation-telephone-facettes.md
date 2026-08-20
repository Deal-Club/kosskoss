# Lot 1 — Facturation, téléphone, facettes : plan d'implémentation

> **Pour les agents :** SOUS-COMPÉTENCE REQUISE — utiliser `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans` pour dérouler ce plan tâche par tâche.
> Les étapes utilisent la syntaxe à cases (`- [ ]`) pour le suivi.

**Goal :** rendre les critères d'acceptation 01, 02, 03 et 04 de l'annexe 3 satisfaits.

**Architecture :** la facture devient une entité à part entière, émise au seul moment où un
paiement est encaissé — dans `updatePaymentStatus`, passage obligé commun au webhook et au
back-office. Le téléphone est normalisé par un module partagé appelé côté client et côté
serveur. Les facettes de catalogue s'appuient sur un vocabulaire de tags déclaré en base,
partagé avec le diagnostic.

**Tech Stack :** Next.js 16 (App Router), React 19, TypeScript strict, Prisma 7.9.1 sur
PostgreSQL (Neon), pdf-lib, nodemailer, `node --test` avec `tsx`.

**Spec :** [`docs/superpowers/specs/2026-08-20-lot1-facturation-telephone-facettes-design.md`](../specs/2026-08-20-lot1-facturation-telephone-facettes-design.md)

---

## Global Constraints

- **Le FCFA n'a pas de sous-unité.** Les entiers des champs `*Cents` SONT des francs
  entiers. Ne jamais diviser par 100, ne jamais afficher de décimales. Formatage par
  `formatFcfa` (`src/lib/kk/format.ts`).
- **Une seule base de données.** Le développement et la production partagent l'instance
  Neon. Toute migration s'applique donc à la production. Avant chaque `prisma migrate dev` :
  vérifier que la migration est **additive** (nouvelle table ou colonne nullable / à
  défaut), jamais un `DROP` ni un `NOT NULL` sans défaut.
- **Nommage des migrations :** `AAAAMMJJHHMMSS_sujet_en_snake_case`, en français.
- **Tests :** fichiers `*.test.ts` à côté du module testé, sous `src/`. Style
  `node:test` + `node:assert/strict`, `describe` / `it`, en français. Aucun accès base
  dans les tests : la logique testable doit être extraite en fonctions pures.
- **Lancer un test :** `node --test --import tsx <chemin>`
- **Lancer la suite :** `npm test`. Le point de départ est **370 tests au vert** ; chaque
  tâche annonce le total attendu après elle. Aucune tâche ne doit faire baisser ce nombre.
- **Vérification systématique avant commit :** `npx tsc --noEmit` puis `npx eslint`.
- **Commentaires en français**, expliquant le *pourquoi*, à la densité du code existant.
- **TypeScript strict, aucun `any`.**

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/server/kk/facture-numero.ts` | Calcul pur du numéro suivant. Aucun accès base. |
| `src/server/kk/facture-numero.test.ts` | Tests du calcul. |
| `src/server/kk/facture.ts` | Émission : allocation, écriture, PDF, e-mail. |
| `src/server/invoice.ts` | *(modifié)* Générateur PDF — passage en FCFA. |
| `src/server/orders.ts` | *(modifié)* Accroche de l'émission dans `updatePaymentStatus`. |
| `src/server/kk/emails.ts` | *(modifié)* E-mail « paiement reçu » avec pièce jointe. |
| `src/lib/kk/telephone.ts` | Normalisation et validation du numéro camerounais. |
| `src/lib/kk/telephone.test.ts` | Tests de la normalisation. |
| `src/lib/kk/tags.ts` | `parseTags` mutualisé (aujourd'hui dupliqué deux fois). |
| `src/server/kk/vocabulaire-tags.ts` | Lecture du vocabulaire `ProductTag`. |
| `src/components/CategoryFilters.tsx` | *(modifié)* Deux groupes de facettes. |
| `src/components/CategoryProductBrowser.tsx` | *(modifié)* État et filtrage des facettes. |
| `src/app/admin/(protected)/products/tags/page.tsx` | Écran du vocabulaire. |

---

## Ordre des tâches

Les tâches 1 à 5 forment la facturation et doivent s'enchaîner dans l'ordre. La tâche 6
(téléphone) est indépendante. Les tâches 7 à 10 (facettes) s'enchaînent entre elles.

---

### Task 1 : Calcul du numéro de facture

**Files:**
- Create: `src/server/kk/facture-numero.ts`
- Test: `src/server/kk/facture-numero.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `numeroFactureSuivant(dernierNumero: string | null, annee: number): string`,
  `PREFIXE_FACTURE: "FAC-"`.

**Pourquoi une fonction pure séparée :** les tests du projet n'ont pas d'accès base. En
isolant le calcul, la règle de séquence — la seule partie où une erreur se voit chez le
comptable — devient testable sans infrastructure.

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// src/server/kk/facture-numero.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { numeroFactureSuivant, PREFIXE_FACTURE } from "./facture-numero";

describe("numeroFactureSuivant", () => {
  it("part à 000001 quand aucune facture n'existe pour l'année", () => {
    assert.equal(numeroFactureSuivant(null, 2026), "FAC-2026-000001");
  });

  it("incrémente le dernier numéro de l'année", () => {
    assert.equal(numeroFactureSuivant("FAC-2026-000009", 2026), "FAC-2026-000010");
  });

  it("passe correctement la centaine et garde six chiffres", () => {
    assert.equal(numeroFactureSuivant("FAC-2026-000099", 2026), "FAC-2026-000100");
  });

  it("repart à 000001 au changement d'année", () => {
    // Le dernier numéro connu appartient à l'année précédente : la séquence
    // est annuelle, elle ne poursuit pas le compteur de 2026 en 2027.
    assert.equal(numeroFactureSuivant("FAC-2026-000042", 2027), "FAC-2027-000001");
  });

  it("repart à 000001 si le dernier numéro est illisible", () => {
    // Une ligne corrompue ne doit pas produire « FAC-2026-NaN ».
    assert.equal(numeroFactureSuivant("FAC-2026-abcdef", 2026), "FAC-2026-000001");
  });

  it("expose un préfixe distinct de celui des commandes", () => {
    // Les commandes sont en « KK- » : confondre les deux numéros dans un
    // échange avec le service client coûte cher.
    assert.equal(PREFIXE_FACTURE, "FAC-");
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `node --test --import tsx src/server/kk/facture-numero.test.ts`
Expected: FAIL — `Cannot find module './facture-numero'`

- [ ] **Step 3 : Écrire l'implémentation minimale**

```ts
// src/server/kk/facture-numero.ts

/**
 * Numérotation des factures.
 *
 * Séquence annuelle et continue : « FAC-2026-000001 ». Le calcul est isolé ici,
 * sans accès base, parce que c'est la seule partie dont une erreur se verrait
 * chez le comptable — et la seule que les tests du projet savent couvrir.
 *
 * Le préfixe diffère volontairement de celui des commandes (« KK- ») : un
 * numéro de facture et un numéro de commande ne doivent jamais se confondre
 * dans un échange avec le service client.
 */

export const PREFIXE_FACTURE = "FAC-";

/** Six chiffres : de quoi tenir un million de factures par an. */
const LARGEUR = 6;

export function numeroFactureSuivant(dernierNumero: string | null, annee: number): string {
  const prefixe = `${PREFIXE_FACTURE}${annee}-`;

  // Un dernier numéro d'une autre année ne poursuit pas le compteur : la
  // séquence est annuelle.
  const compteur =
    dernierNumero && dernierNumero.startsWith(prefixe)
      ? Number.parseInt(dernierNumero.slice(prefixe.length), 10)
      : 0;

  // Une ligne corrompue rendrait NaN : on repart à 1 plutôt que d'écrire
  // « FAC-2026-NaN » en base.
  const suivant = Number.isFinite(compteur) ? compteur + 1 : 1;

  return `${prefixe}${String(suivant).padStart(LARGEUR, "0")}`;
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `node --test --import tsx src/server/kk/facture-numero.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5 : Vérifier types et lint**

Run: `npx tsc --noEmit && npx eslint`
Expected: aucune sortie, code 0

- [ ] **Step 6 : Commit**

```bash
git add src/server/kk/facture-numero.ts src/server/kk/facture-numero.test.ts
git commit -m "Numérotation des factures, calculée à part et testée

Séquence annuelle FAC-AAAA-NNNNNN. Le calcul est isolé du stockage parce que
les tests du projet n'ont pas d'accès base, et que la règle de séquence est
la seule dont une erreur se verrait chez le comptable.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2 : Modèle `Invoice` et migration

**Files:**
- Modify: `prisma/schema.prisma` (modèle `Order`, ajout de la relation ; nouveau modèle `Invoice`)
- Create: `prisma/migrations/<horodatage>_facture/migration.sql` (généré par Prisma)

**Interfaces:**
- Consumes: rien.
- Produces: `prisma.invoice` avec les champs `id`, `number`, `orderId`, `issuedAt`,
  `totalCents`, `currency`, `createdAt`.

- [ ] **Step 1 : Ajouter le modèle au schéma**

À la suite du modèle `Order` dans `prisma/schema.prisma` :

```prisma
// Facture émise à l'encaissement, jamais avant.
//
// Elle porte sa PROPRE séquence, distincte du numéro de commande : la facture
// n'existant qu'après paiement, réutiliser le numéro de commande laisserait un
// trou dans la numérotation à chaque panier abandonné — ce qu'un comptable
// refuse. Voir docs/superpowers/specs/2026-08-20-lot1-…-design.md.
//
// Le montant est RECOPIÉ et non lu sur la commande : une correction ultérieure
// de la commande ne doit pas modifier ce qui a été facturé.
model Invoice {
  id         String   @id @default(cuid())
  number     String   @unique
  // Une facture par commande, jamais deux. C'est la ceinture qui accompagne la
  // sortie anticipée de updatePaymentStatus.
  orderId    String   @unique
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  issuedAt   DateTime @default(now())
  // FCFA entiers, comme partout : le nom « Cents » est hérité, il ment.
  totalCents Int
  currency   String   @default("XAF")
  createdAt  DateTime @default(now())

  @@index([issuedAt])
}
```

- [ ] **Step 2 : Déclarer la relation côté `Order`**

Dans le modèle `Order`, à côté de `transactions PaymentTransaction[]` :

```prisma
  invoice           Invoice?
```

- [ ] **Step 3 : Vérifier que le schéma est valide**

Run: `npx prisma validate`
Expected: `The schema at prisma\schema.prisma is valid 🚀`

- [ ] **Step 4 : Créer et appliquer la migration**

⚠️ **La base Neon est partagée avec la production.** Cette migration est purement
additive — une nouvelle table et une relation optionnelle — donc sans risque pour les
données existantes. Vérifier le SQL généré avant de poursuivre.

```bash
npx prisma migrate dev --name facture
```

Expected: une nouvelle table `Invoice`, aucun `DROP`, aucun `ALTER … NOT NULL` sur une
colonne existante.

- [ ] **Step 5 : Régénérer le client et vérifier**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: `Generated Prisma Client`, puis aucune erreur de types

- [ ] **Step 6 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Modèle Invoice : la facture devient une entité

Séquence propre, une facture par commande garantie par la contrainte unique
sur orderId. Le montant est recopié pour qu'une correction ultérieure de la
commande ne change pas ce qui a été facturé.

Migration additive : une table, une relation optionnelle.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3 : Passage du générateur PDF en FCFA

**Files:**
- Modify: `src/server/invoice.ts` (fonction `euros` ligne 87, ses 6 appels, signature de
  `buildInvoicePdf` ligne 330)

**Interfaces:**
- Consumes: `formatFcfa` depuis `@/lib/kk/format`.
- Produces: `buildInvoicePdf(order: OrderRecord, numeroFacture: string): Promise<Buffer>`,
  `invoiceFilename(numeroFacture: string): string`.

**Pourquoi cette tâche vient avant le branchement :** en l'état, une commande de 31 000 F
s'imprimerait « 310,00 € ». Brancher d'abord et corriger ensuite ferait partir de vraies
factures fausses.

**Pourquoi cette tâche n'a pas de test automatique.** Le formatage est délégué à
`formatFcfa`, déjà couvert par ses propres tests ; ce qui reste à garantir ici, c'est
qu'aucun appel à l'ancien formateur ne subsiste — ce que fait le `grep` de l'étape 3, qui
échoue tant qu'il en reste un. Le rendu du PDF lui-même est contrôlé à la main lors de la
vérification de fin de lot : lire les octets d'un PDF pour y chercher un symbole monétaire
donnerait un test fragile qui passerait pour de mauvaises raisons.

- [ ] **Step 1 : Repérer les appels à corriger**

```bash
grep -n "euros(" src/server/invoice.ts
```

Expected: 1 déclaration ligne 87, puis 5 appels. Noter les numéros de ligne.

- [ ] **Step 2 : Remplacer le formateur**

Remplacer la fonction `euros` (ligne 87) par :

```ts
/**
 * « 129900 » -> « 129 900 FCFA ».
 *
 * Le franc CFA n'a PAS de sous-unité : l'entier stocké est un montant de francs
 * entiers, jamais des centimes. L'ancienne version divisait par 100 et
 * imprimait « € » — héritage de l'activité précédente. Une commande de 31 000 F
 * en sortait à « 310,00 € ».
 */
function montant(francs: number): string {
  return formatFcfa(francs);
}
```

Ajouter l'import en tête de fichier :

```ts
import { formatFcfa } from "@/lib/kk/format";
```

- [ ] **Step 3 : Mettre à jour les appels**

Remplacer chaque `euros(` par `montant(` aux lignes repérées à l'étape 1.

```bash
grep -n "euros(" src/server/invoice.ts
```

Expected: aucune sortie.

- [ ] **Step 4 : Retirer le virement bancaire et prendre le numéro de facture**

Le virement n'est pas un moyen de paiement de cette boutique. Remplacer la signature
(ligne 330) :

```ts
export async function buildInvoicePdf(
  order: OrderRecord,
  numeroFacture: string,
): Promise<Buffer> {
```

Supprimer le paramètre `bank` et tout bloc qui l'utilise, ainsi que l'import de
`BankTransferSettings` s'il devient inutilisé. Remplacer l'appel `doc.setTitle(...)` par :

```ts
  doc.setTitle(`Facture ${numeroFacture}`);
```

Dans le corps du document, le numéro imprimé comme « numéro de facture » devient
`numeroFacture` ; le numéro de commande reste mentionné séparément, pour le
rapprochement.

- [ ] **Step 5 : Adapter le nom de fichier**

Remplacer `invoiceFilename` (ligne 618) :

```ts
/** Nom du fichier joint, lisible dans la boîte de réception du client. */
export function invoiceFilename(numeroFacture: string): string {
  return `${numeroFacture}.pdf`;
}
```

- [ ] **Step 6 : Corriger l'appelant existant**

`src/server/orderNotifications.ts` appelle encore l'ancienne signature. Le mettre en
cohérence : cette route héritée n'émet pas de facture numérotée, elle doit donc cesser de
joindre un PDF. Retirer l'appel à `buildInvoicePdf` et à `invoiceFilename` ainsi que la
pièce jointe, en laissant un commentaire :

```ts
// L'ancienne route /api/checkout n'émet plus de facture : depuis le lot 1,
// la facture est numérotée et émise à l'encaissement par server/kk/facture.ts.
```

- [ ] **Step 7 : Vérifier types, lint et suite complète**

Run: `npx tsc --noEmit && npx eslint && npm test`
Expected: aucune erreur, **376 tests au vert** (370 + 6 de la tâche 1)

- [ ] **Step 8 : Commit**

```bash
git add src/server/invoice.ts src/server/orderNotifications.ts
git commit -m "La facture cesse d'imprimer des euros

euros() divisait par 100 et ajoutait le symbole €, hérité de l'activité
précédente : une commande de 31 000 F sortait à « 310,00 € ». Six appels
repris vers formatFcfa.

Le générateur prend désormais le numéro de facture en paramètre, le numéro de
commande restant mentionné à part pour le rapprochement. Le virement bancaire
disparaît, il n'est pas un moyen de paiement ici.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4 : Émission de la facture à l'encaissement

**Files:**
- Create: `src/server/kk/facture.ts`
- Create: `src/server/kk/facture.test.ts`
- Modify: `src/server/orders.ts` (`updatePaymentStatus`, ligne 761)

**Interfaces:**
- Consumes: `numeroFactureSuivant`, `PREFIXE_FACTURE` (tâche 1) ; `prisma.invoice`
  (tâche 2) ; `buildInvoicePdf(order, numeroFacture)` (tâche 3) ;
  `type OrderRecord` depuis `@/server/orders`.
- Produces: `doitEmettreFacture(ancien: string, nouveau: string): boolean`,
  `emettreFacture(order: OrderRecord): Promise<string | null>`.

**Deux points d'architecture à ne pas rater.**

`facture.ts` importe `OrderRecord` en **`import type`** uniquement. `orders.ts` importe
`facture.ts` : sans le `type`, le cycle serait réel à l'exécution. Le `import type` est
effacé à la compilation, donc il n'y a pas de cycle.

L'émission **ne doit jamais faire échouer** `updatePaymentStatus`. Le paiement est déjà
encaissé chez le prestataire ; lever une erreur ferait répondre 500 au webhook, qui
relancerait — pour retomber sur la sortie anticipée. On journalise dans l'historique de
commande, là où le commerçant le verra.

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// src/server/kk/facture.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { doitEmettreFacture } from "./facture";

describe("doitEmettreFacture", () => {
  it("émet quand le paiement bascule vers payée", () => {
    assert.equal(doitEmettreFacture("en_attente", "payee"), true);
  });

  it("n'émet pas quand la commande était déjà payée", () => {
    // Un webhook rejoué ou un administrateur qui reclique ne doit pas produire
    // une seconde facture.
    assert.equal(doitEmettreFacture("payee", "payee"), false);
  });

  it("n'émet pas sur un échec de paiement", () => {
    assert.equal(doitEmettreFacture("en_attente", "echouee"), false);
  });

  it("n'émet pas sur un remboursement", () => {
    // Un remboursement appelle un avoir, prévu au lot 3 — pas une facture.
    assert.equal(doitEmettreFacture("payee", "remboursee"), false);
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `node --test --import tsx src/server/kk/facture.test.ts`
Expected: FAIL — `Cannot find module './facture'`

- [ ] **Step 3 : Écrire le module d'émission**

```ts
// src/server/kk/facture.ts
import { prisma } from "@/server/prisma";
import { numeroFactureSuivant, PREFIXE_FACTURE } from "./facture-numero";
// `import type` et non `import` : orders.ts importe ce module, l'inverse
// créerait un cycle à l'exécution. Un import de type est effacé à la
// compilation, donc il n'y en a pas.
import type { OrderRecord } from "@/server/orders";

/**
 * Émission de la facture.
 *
 * Une facture n'existe QU'APRÈS encaissement. Tant qu'un paiement n'est pas
 * reçu, il n'y a pas de document comptable à produire — c'est ce qui distingue
 * une facture d'un accusé de réception de commande.
 */

/** Nombre de reprises sur collision de numéro, comme pour les commandes. */
const TENTATIVES = 5;

/**
 * Faut-il émettre une facture pour cette bascule de statut ?
 *
 * Seule la transition VERS « payée », depuis un autre statut, la déclenche. Un
 * remboursement appellera un avoir, prévu au lot 3, pas une nouvelle facture.
 */
export function doitEmettreFacture(ancien: string, nouveau: string): boolean {
  return nouveau === "payee" && ancien !== "payee";
}

/**
 * Alloue un numéro et écrit la facture. Rend le numéro, ou `null` si une
 * facture existait déjà pour cette commande.
 *
 * L'unicité réelle vient de la contrainte en base, pas de la lecture : deux
 * encaissements simultanés liraient le même « dernier numéro ». On réessaie
 * sur collision, exactement comme le fait la création de commande.
 */
export async function emettreFacture(order: OrderRecord): Promise<string | null> {
  const annee = new Date().getFullYear();

  for (let tentative = 0; tentative < TENTATIVES; tentative += 1) {
    const derniere = await prisma.invoice.findFirst({
      where: { number: { startsWith: `${PREFIXE_FACTURE}${annee}-` } },
      orderBy: { number: "desc" },
      select: { number: true },
    });

    try {
      const creee = await prisma.invoice.create({
        data: {
          number: numeroFactureSuivant(derniere?.number ?? null, annee),
          orderId: order.id,
          // Recopié, jamais lu depuis la commande par la suite : ce qui a été
          // facturé ne suit pas une correction ultérieure.
          totalCents: order.totalCents,
          currency: order.currency || "XAF",
        },
        select: { number: true },
      });
      return creee.number;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2002") throw error;

      // Collision sur `orderId` : la facture existe déjà, rien à faire. C'est
      // le cas d'un webhook rejoué qui aurait franchi la sortie anticipée.
      const existante = await prisma.invoice.findUnique({
        where: { orderId: order.id },
        select: { number: true },
      });
      if (existante) return null;

      // Sinon la collision porte sur le numéro : on en reprend un.
      if (tentative === TENTATIVES - 1) throw error;
    }
  }

  return null;
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `node --test --import tsx src/server/kk/facture.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 5 : Accrocher l'émission dans `updatePaymentStatus`**

Dans `src/server/orders.ts`, ajouter l'import en tête :

```ts
import { doitEmettreFacture, emettreFacture } from "@/server/kk/facture";
```

Puis, dans `updatePaymentStatus`, **après** le `prisma.order.update` et **avant** le
`return getOrder(id)` :

```ts
  // ── Émission de la facture ────────────────────────────────────────────────
  //
  // ICI et nulle part ailleurs. C'est le passage obligé de toute bascule de
  // paiement : le webhook GeniusPay (kk/paiement.ts), le back-office
  // (api/admin/orders/[id]) et l'ancien webhook y aboutissent tous. Le paiement
  // à la livraison ne déclenche AUCUN webhook — sans ce point commun, il
  // faudrait un second chemin d'émission, donc un second endroit où oublier un
  // cas.
  //
  // L'idempotence est acquise sans effort : la fonction est déjà sortie plus
  // haut si le statut ne change pas.
  if (doitEmettreFacture(current.paymentStatus, paymentStatus)) {
    const record = await getOrder(id);
    if (record) {
      try {
        await emettreFacture(record);
      } catch (error) {
        // Ne JAMAIS faire échouer la bascule : le paiement est encaissé chez le
        // prestataire. Lever ici ferait répondre 500 au webhook, qui
        // relancerait pour retomber sur la sortie anticipée. La trace part dans
        // l'historique de commande, là où le commerçant la verra.
        const message = error instanceof Error ? error.message : String(error);
        console.error("[facture] émission échouée", { orderId: id, message });
        await recordOrderEvent(
          id,
          "paiement",
          `⚠️ Facture non émise pour cette commande payée : ${message}. À reprendre à la main.`,
        );
      }
    }
  }
```

- [ ] **Step 6 : Vérifier types, lint et suite complète**

Run: `npx tsc --noEmit && npx eslint && npm test`
Expected: aucune erreur, **380 tests au vert** (376 + 4 de cette tâche)

- [ ] **Step 7 : Commit**

```bash
git add src/server/kk/facture.ts src/server/kk/facture.test.ts src/server/orders.ts
git commit -m "La facture s'émet à l'encaissement, en un seul point

L'accroche est dans updatePaymentStatus parce que c'est le passage obligé
commun au webhook GeniusPay, au back-office et à l'ancien webhook. Le paiement
à la livraison ne déclenche aucun webhook : sans ce point commun il aurait
fallu un second chemin d'émission, donc un second endroit où oublier un cas.

L'idempotence vient de la sortie anticipée déjà présente quand le statut ne
bouge pas ; la contrainte unique sur orderId est la ceinture qui va avec.

Une émission qui échoue ne fait pas échouer la bascule — le paiement est déjà
encaissé — mais laisse un événement de commande visible au back-office.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5 : E-mail « paiement reçu » avec la facture jointe

**Files:**
- Modify: `src/server/kk/emails.ts` (ajout d'une fonction ; correction du texte existant)
- Modify: `src/server/kk/facture.ts` (envoi après émission)

**Interfaces:**
- Consumes: `sendMail`, `isMailConfigured` (`@/lib/mailer`) ; `MailAttachment`
  `{ filename: string; content: Buffer; contentType: string }` ;
  `buildInvoicePdf(order, numeroFacture)`, `invoiceFilename(numeroFacture)` (tâche 3) ;
  `emettreFacture` (tâche 4).
- Produces: `sendPaymentReceivedEmail(input: PaymentReceivedInput): Promise<void>`,
  `emettreEtEnvoyerFacture(order: OrderRecord): Promise<void>`.

- [ ] **Step 1 : Corriger le texte devenu faux de l'accusé de réception**

Dans `src/server/kk/emails.ts`, `sendOrderConfirmationEmail` promet encore :

> « Le paiement Mobile Money et la livraison sont ensuite coordonnés avec vous via WhatsApp. »

C'était vrai quand aucun paiement en ligne n'existait. Remplacer le bloc `inner`
correspondant et le `text` par :

```ts
    <div style="background:${SAND};border-radius:12px;padding:16px;margin-top:20px;font-size:14px">
      Dès réception de votre paiement, nous vous envoyons votre facture et nous
      vous contactons sur WhatsApp pour organiser la livraison.
    </div>`;
  const text = `Merci pour votre commande ${input.orderNumber}. Total : ${formatFcfa(
    input.totalFcfa,
  )}. Votre facture vous parviendra dès réception du paiement.`;
```

- [ ] **Step 2 : Ajouter l'e-mail « paiement reçu »**

À la suite de `sendOrderConfirmationEmail`, dans le même fichier :

```ts
export interface PaymentReceivedInput {
  to: string;
  firstName: string;
  orderNumber: string;
  numeroFacture: string;
  totalFcfa: number;
  facturePdf: Buffer;
  nomFichier: string;
}

/**
 * Paiement reçu, avec la facture jointe.
 *
 * Second e-mail du tunnel : l'accusé de réception part à la commande, celui-ci
 * à l'encaissement. C'est le seul qui porte un document comptable, parce que
 * c'est le seul qui suit un paiement réel.
 *
 * Best-effort, comme les autres : une panne SMTP ne doit pas faire échouer le
 * webhook. La facture est en base, donc réémettable.
 */
export async function sendPaymentReceivedEmail(input: PaymentReceivedInput): Promise<void> {
  if (!isMailConfigured()) return;
  const inner = `
    <p style="margin:0 0 16px">Bonjour ${esc(input.firstName)}, nous avons bien reçu votre paiement.</p>
    <p style="margin:0 0 16px;color:#6a7a7d">Commande <strong style="color:${DEEP}">${esc(
      input.orderNumber,
    )}</strong> · Facture <strong style="color:${DEEP}">${esc(input.numeroFacture)}</strong></p>
    <p style="margin:0 0 16px">Montant réglé : <strong>${esc(formatFcfa(input.totalFcfa))}</strong></p>
    <div style="background:${SAND};border-radius:12px;padding:16px;margin-top:20px;font-size:14px">
      Votre facture est jointe à ce message. Nous vous contactons sur WhatsApp
      pour convenir de la livraison.
    </div>`;
  const text = `Paiement reçu pour la commande ${input.orderNumber}. Facture ${
    input.numeroFacture
  }, montant ${formatFcfa(input.totalFcfa)}. La facture est jointe à ce message.`;
  try {
    await sendMail({
      to: input.to,
      subject: `Paiement reçu — facture ${input.numeroFacture}`,
      html: shell("Paiement bien reçu", inner),
      text,
      attachments: [
        { filename: input.nomFichier, content: input.facturePdf, contentType: "application/pdf" },
      ],
    });
  } catch {
    /* best-effort */
  }
}
```

- [ ] **Step 3 : Enchaîner émission puis envoi**

Dans `src/server/kk/facture.ts`, ajouter les imports :

```ts
import { buildInvoicePdf, invoiceFilename } from "@/server/invoice";
import { sendPaymentReceivedEmail } from "./emails";
```

puis, à la fin du fichier :

```ts
/**
 * Émet la facture, puis l'envoie au client.
 *
 * Les deux moitiés sont séparées volontairement : l'écriture en base doit
 * réussir ou être signalée, l'envoi peut échouer sans conséquence — la facture
 * reste réémettable depuis le back-office.
 */
export async function emettreEtEnvoyerFacture(order: OrderRecord): Promise<void> {
  const numero = await emettreFacture(order);
  // `null` : une facture existait déjà. Ne pas renvoyer d'e-mail, le client
  // l'a reçue la première fois.
  if (!numero) return;

  const pdf = await buildInvoicePdf(order, numero);
  await sendPaymentReceivedEmail({
    to: order.email,
    firstName: order.billing.firstName,
    orderNumber: order.orderNumber,
    numeroFacture: numero,
    totalFcfa: order.totalCents,
    facturePdf: pdf,
    nomFichier: invoiceFilename(numero),
  });
}
```

- [ ] **Step 4 : Basculer l'accroche sur la version complète**

Dans `src/server/orders.ts`, remplacer l'import et l'appel de la tâche 4 :

```ts
import { doitEmettreFacture, emettreEtEnvoyerFacture } from "@/server/kk/facture";
```

```ts
        await emettreEtEnvoyerFacture(record);
```

- [ ] **Step 5 : Vérifier types, lint et suite complète**

Run: `npx tsc --noEmit && npx eslint && npm test`
Expected: aucune erreur, **380 tests au vert**

- [ ] **Step 6 : Commit**

```bash
git add src/server/kk/emails.ts src/server/kk/facture.ts src/server/orders.ts
git commit -m "E-mail « paiement reçu » avec la facture jointe

Second e-mail du tunnel : l'accusé de réception part à la commande, celui-ci à
l'encaissement. C'est le seul qui porte un document comptable, parce que c'est
le seul qui suit un paiement réel.

L'accusé de réception cesse de promettre que « le paiement Mobile Money est
coordonné via WhatsApp » — vrai avant le branchement de la passerelle, faux
depuis.

Émission et envoi sont séparés : l'écriture en base doit réussir ou être
signalée, l'envoi peut échouer sans conséquence puisque la facture reste en
base.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6 : Format du téléphone camerounais

**Files:**
- Create: `src/lib/kk/telephone.ts`
- Create: `src/lib/kk/telephone.test.ts`
- Modify: `src/components/kk/checkout-form.tsx` (validation, ligne 79)
- Modify: `src/server/kk/checkout.ts` (normalisation avant écriture)

**Interfaces:**
- Consumes: rien.
- Produces: `normaliserTelephone(saisie: string): string | null` — rend
  `+237XXXXXXXXX` ou `null` si le numéro n'est pas valide ;
  `INDICATIF_CM: "+237"`.

**Le plan de numérotation camerounais :** neuf chiffres. Les mobiles commencent par `6`
(MTN, Orange, Camtel), les fixes par `2`. L'indicatif pays est `237`.

Le fixe est accepté : ce numéro sert le contact de livraison. Le téléphone qui portera
le paiement Mobile Money est saisi chez le prestataire, pas chez nous — exiger un mobile
ici refuserait des clients sans rien garantir.

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// src/lib/kk/telephone.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INDICATIF_CM, normaliserTelephone } from "./telephone";

describe("normaliserTelephone", () => {
  it("accepte un mobile nu et le met en forme internationale", () => {
    assert.equal(normaliserTelephone("677123456"), "+237677123456");
  });

  it("accepte un fixe", () => {
    // Le numéro sert le contact de livraison : rien n'oblige le client à
    // donner un mobile.
    assert.equal(normaliserTelephone("233421234"), "+237233421234");
  });

  it("accepte l'indicatif sous ses trois formes", () => {
    assert.equal(normaliserTelephone("+237677123456"), "+237677123456");
    assert.equal(normaliserTelephone("00237677123456"), "+237677123456");
    assert.equal(normaliserTelephone("237677123456"), "+237677123456");
  });

  it("ignore espaces, points, tirets et parenthèses", () => {
    assert.equal(normaliserTelephone("+237 6 77 12 34 56"), "+237677123456");
    assert.equal(normaliserTelephone("677-12-34-56"), "+237677123456");
    assert.equal(normaliserTelephone("(237) 677.12.34.56"), "+237677123456");
  });

  it("refuse un numéro trop court", () => {
    assert.equal(normaliserTelephone("67712345"), null);
  });

  it("refuse un numéro trop long", () => {
    assert.equal(normaliserTelephone("6771234567"), null);
  });

  it("refuse un préfixe qui n'existe pas au Cameroun", () => {
    // Ni mobile (6) ni fixe (2) : c'est une faute de frappe, pas un numéro.
    assert.equal(normaliserTelephone("377123456"), null);
    assert.equal(normaliserTelephone("977123456"), null);
  });

  it("refuse une saisie vide ou sans chiffre", () => {
    assert.equal(normaliserTelephone(""), null);
    assert.equal(normaliserTelephone("   "), null);
    assert.equal(normaliserTelephone("appelez-moi"), null);
  });

  it("expose l'indicatif", () => {
    assert.equal(INDICATIF_CM, "+237");
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `node --test --import tsx src/lib/kk/telephone.test.ts`
Expected: FAIL — `Cannot find module './telephone'`

- [ ] **Step 3 : Écrire le module**

```ts
// src/lib/kk/telephone.ts

/**
 * Numéro de téléphone camerounais.
 *
 * Plan de numérotation : neuf chiffres. Les mobiles commencent par 6 (MTN,
 * Orange, Camtel), les fixes par 2. L'indicatif pays est 237.
 *
 * Le fixe est accepté volontairement : ce numéro sert le contact de livraison.
 * Le téléphone qui portera le paiement Mobile Money est saisi chez le
 * prestataire, pas ici — exiger un mobile refuserait des clients sans rien
 * garantir en échange.
 *
 * La validation précédente se contentait de « au moins huit chiffres ». Le
 * choix était assumé et commenté, mais le critère d'acceptation 02 demande le
 * format camerounais.
 */

export const INDICATIF_CM = "+237";

/** Longueur nationale, indicatif exclu. */
const LONGUEUR = 9;

/** Premiers chiffres attribués : 6 pour le mobile, 2 pour le fixe. */
const PREMIERS_CHIFFRES = /^[62]/;

/**
 * Rend le numéro en `+237XXXXXXXXX`, ou `null` s'il n'est pas valide.
 *
 * L'ambiguïté apparente entre un indicatif « 237 » et un fixe commençant par 2
 * se lève par la longueur : neuf chiffres est un numéro national, douze
 * commençant par 237 est un numéro international.
 */
export function normaliserTelephone(saisie: string): string | null {
  const chiffres = saisie.replace(/\D/g, "");
  if (!chiffres) return null;

  let national = chiffres;
  if (national.startsWith("00237")) national = national.slice(5);
  else if (national.length === LONGUEUR + 3 && national.startsWith("237")) {
    national = national.slice(3);
  }

  if (national.length !== LONGUEUR) return null;
  if (!PREMIERS_CHIFFRES.test(national)) return null;

  return `${INDICATIF_CM}${national}`;
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `node --test --import tsx src/lib/kk/telephone.test.ts`
Expected: PASS — 9 tests

- [ ] **Step 5 : Brancher la validation du formulaire**

Dans `src/components/kk/checkout-form.tsx`, ajouter l'import :

```ts
import { normaliserTelephone } from "@/lib/kk/telephone";
```

Remplacer le cas `"phone"` de la fonction de validation (ligne 79) :

```ts
    case "phone":
      // Format camerounais : neuf chiffres, mobile en 6 ou fixe en 2,
      // l'indicatif étant accepté sous toutes ses formes. Le message nomme le
      // format attendu — « numéro invalide » laisserait le client deviner.
      return normaliserTelephone(v)
        ? null
        : "Neuf chiffres, commençant par 6 (mobile) ou 2 (fixe). Ex. : 6 77 12 34 56";
```

- [ ] **Step 6 : Normaliser avant écriture, côté serveur**

La validation client ne protège de rien : la route `/api/kk/checkout` accepte n'importe
quel corps JSON. Dans `src/server/kk/checkout.ts`, ajouter l'import :

```ts
import { normaliserTelephone } from "@/lib/kk/telephone";
```

Puis, dans `createKossOrder`, avant toute écriture utilisant `input.phone` :

```ts
  // Le numéro stocké est TOUJOURS en +237XXXXXXXXX, quelle que soit la saisie :
  // le service client, les rappels et l'export ne doivent pas avoir à deviner
  // le format. Refuser ici et non seulement dans le formulaire — la route
  // accepte n'importe quel corps JSON.
  const telephone = normaliserTelephone(input.phone);
  if (!telephone) throw new OrderError("invalid_phone");
```

Remplacer ensuite les usages de `input.phone.trim()` par `telephone` dans la création du
client et de la commande.

Ajouter `"invalid_phone"` au type `CheckoutErrorCode` (`src/server/orders.ts`) s'il n'y
figure pas, et son message dans le rendu d'erreur du formulaire.

- [ ] **Step 7 : Vérifier types, lint et suite complète**

Run: `npx tsc --noEmit && npx eslint && npm test`
Expected: aucune erreur, **389 tests au vert** (380 + 9)

- [ ] **Step 8 : Commit**

```bash
git add src/lib/kk/telephone.ts src/lib/kk/telephone.test.ts src/components/kk/checkout-form.tsx src/server/kk/checkout.ts src/server/orders.ts
git commit -m "Le téléphone suit le plan de numérotation camerounais

Neuf chiffres, mobile en 6 ou fixe en 2, indicatif accepté sous ses trois
formes. La validation précédente se contentait de huit chiffres.

Le fixe reste accepté : ce numéro sert le contact de livraison, celui du
paiement Mobile Money étant saisi chez le prestataire.

Normalisation appliquée aussi côté serveur, avant écriture — la route accepte
n'importe quel corps JSON, la validation du formulaire ne protège de rien. Le
numéro stocké est toujours en +237XXXXXXXXX.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7 : Vocabulaire de tags en base

**Files:**
- Modify: `prisma/schema.prisma` (nouveau modèle `ProductTag`)
- Create: `prisma/migrations/<horodatage>_vocabulaire_tags/migration.sql`
- Create: `prisma/seed-tags.ts`
- Modify: `package.json` (script `db:seed`)

**Interfaces:**
- Consumes: rien.
- Produces: `prisma.productTag` avec `key`, `labelFr`, `labelEn`, `family`, `position`,
  `active`.

**Pourquoi la clé est l'identifiant :** ces clés sont **déjà écrites** dans
`Product.tags` et dans les pondérations des réponses du diagnostic. Introduire un `cuid`
séparé imposerait une reprise de données sans rien apporter.

- [ ] **Step 1 : Relever le vocabulaire réellement utilisé**

⚠️ **Ne pas inventer les clés.** Les relever depuis la base :

```bash
npx tsx -e "
import { prisma } from './src/server/prisma';
const produits = await prisma.product.findMany({ select: { tags: true } });
const reponses = await prisma.diagAnswer.findMany({ select: { tags: true } });
const vues = new Set();
for (const p of produits) { try { for (const t of JSON.parse(p.tags || '[]')) vues.add(t); } catch {} }
for (const r of reponses) { try { for (const k of Object.keys(JSON.parse(r.tags || '{}'))) vues.add(k); } catch {} }
console.log([...vues].sort().join('\n'));
await prisma.\$disconnect();
"
```

Noter la liste. Elle alimente le seed de l'étape 4 et détermine le classement en
familles.

- [ ] **Step 2 : Ajouter le modèle au schéma**

```prisma
// Vocabulaire des tags produits, partagé par le catalogue et le diagnostic.
//
// La CLÉ est l'identifiant : ces clés sont déjà écrites dans Product.tags et
// dans les pondérations des réponses du diagnostic. Un cuid séparé imposerait
// une reprise de données sans rien apporter.
//
// Les libellés FR et EN règlent le critère 10 pour ces facettes : sans eux, le
// catalogue afficherait « peau_grasse » au visiteur.
model ProductTag {
  key      String  @id
  labelFr  String
  labelEn  String  @default("")
  // « peau » ou « preoccupation » : détermine le groupe de facettes où le tag
  // apparaît. Un tag d'une autre famille (budget_eco, premium…) reste utile au
  // diagnostic sans être proposé en facette.
  family   String
  position Int     @default(0)
  active   Boolean @default(true)

  @@index([family, position])
}
```

- [ ] **Step 3 : Créer et appliquer la migration**

Migration additive : une table, aucune donnée existante touchée.

```bash
npx prisma validate && npx prisma migrate dev --name vocabulaire_tags && npx prisma generate
```

Expected: `The schema … is valid`, une table `ProductTag`, `Generated Prisma Client`

- [ ] **Step 4 : Écrire le seed**

Créer `prisma/seed-tags.ts` sur le patron de `prisma/seed-routines.ts`. Renseigner
`VOCABULAIRE` avec **les clés relevées à l'étape 1**, en leur donnant un libellé lisible
et une famille. Exemple de structure — les entrées doivent être remplacées par le relevé
réel :

```ts
import { prisma } from "../src/server/prisma";

/**
 * Vocabulaire des tags, relevé sur les produits et les réponses du diagnostic
 * existants. Seules les familles « peau » et « preoccupation » deviennent des
 * facettes de catalogue ; les autres tags restent au service du diagnostic.
 */
const VOCABULAIRE: { key: string; labelFr: string; labelEn: string; family: string }[] = [
  // ⚠️ Remplacer par le relevé de l'étape 1.
  { key: "peau_grasse", labelFr: "Peau grasse", labelEn: "Oily skin", family: "peau" },
  { key: "hydratation", labelFr: "Hydratation", labelEn: "Hydration", family: "preoccupation" },
];

async function main() {
  for (const [index, tag] of VOCABULAIRE.entries()) {
    await prisma.productTag.upsert({
      where: { key: tag.key },
      // Le seed est rejouable : il met à jour les libellés sans écraser
      // l'ordre choisi par l'administrateur.
      update: { labelFr: tag.labelFr, labelEn: tag.labelEn, family: tag.family },
      create: { ...tag, position: index },
    });
  }
  console.log(`${VOCABULAIRE.length} tags en place.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 5 : Déclarer le seed et l'exécuter**

Dans `package.json`, ajouter à la chaîne `db:seed` et créer un script dédié :

```json
    "db:seed:tags": "tsx prisma/seed-tags.ts",
```

Run: `npm run db:seed:tags`
Expected: `N tags en place.`

- [ ] **Step 6 : Vérifier types, lint et suite**

Run: `npx tsc --noEmit && npx eslint && npm test`
Expected: aucune erreur, **389 tests au vert**

- [ ] **Step 7 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/seed-tags.ts package.json
git commit -m "Vocabulaire des tags produits en base

La clé est l'identifiant : ces clés sont déjà écrites dans Product.tags et dans
les pondérations du diagnostic, un cuid séparé imposerait une reprise de
données sans rien apporter.

Les libellés FR et EN évitent d'afficher « peau_grasse » au visiteur, et
règlent le critère 10 pour ces facettes. La famille décide quels tags
deviennent des facettes : les autres restent au service du diagnostic.

Vocabulaire relevé sur les données existantes, non inventé.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8 : `parseTags` mutualisé et tags sur la vue produit

**Files:**
- Create: `src/lib/kk/tags.ts`
- Create: `src/lib/kk/tags.test.ts`
- Modify: `src/server/kk/diagnostic.ts` (retrait du doublon, ligne 6)
- Modify: `src/server/kk/product-tags.ts` (retrait du doublon, ligne 12)
- Modify: `src/types/home.ts` (champ `tags` sur `Product`)
- Modify: `src/server/store.ts` (`toViewProduct`, ligne 522)

**Interfaces:**
- Consumes: rien.
- Produces: `parseTags(value: string | null): string[]` ;
  `Product.tags?: string[]` peuplé par `toViewProduct`.

**Pourquoi mutualiser maintenant :** `parseTags` existe **deux fois à l'identique**
(`diagnostic.ts:6`, `product-tags.ts:12`). Les facettes en feraient une troisième copie.
On le remonte dans le module que les trois appelleront.

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// src/lib/kk/tags.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTags } from "./tags";

describe("parseTags", () => {
  it("lit un tableau de clés", () => {
    assert.deepEqual(parseTags('["peau_grasse","hydratation"]'), ["peau_grasse", "hydratation"]);
  });

  it("rend un tableau vide sur une valeur absente", () => {
    assert.deepEqual(parseTags(null), []);
    assert.deepEqual(parseTags(""), []);
  });

  it("rend un tableau vide sur du JSON illisible", () => {
    // Un champ corrompu ne doit pas faire tomber une page catalogue.
    assert.deepEqual(parseTags("{pas du json"), []);
  });

  it("rend un tableau vide si la valeur n'est pas un tableau", () => {
    assert.deepEqual(parseTags('{"peau_grasse":2}'), []);
  });

  it("écarte les entrées qui ne sont pas des chaînes", () => {
    assert.deepEqual(parseTags('["peau_grasse",42,null,"hydratation"]'), [
      "peau_grasse",
      "hydratation",
    ]);
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `node --test --import tsx src/lib/kk/tags.test.ts`
Expected: FAIL — `Cannot find module './tags'`

- [ ] **Step 3 : Écrire le module**

```ts
// src/lib/kk/tags.ts

/**
 * Lecture des tags d'un produit.
 *
 * `Product.tags` stocke un tableau JSON de clés. Cette fonction existait en
 * double, à l'identique, dans server/kk/diagnostic.ts et
 * server/kk/product-tags.ts ; les facettes de catalogue en auraient fait une
 * troisième copie.
 *
 * Ne lève jamais : un champ corrompu rend un tableau vide plutôt que de faire
 * tomber une page catalogue.
 */
export function parseTags(value: string | null): string[] {
  if (!value) return [];
  try {
    const lu: unknown = JSON.parse(value);
    return Array.isArray(lu) ? lu.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `node --test --import tsx src/lib/kk/tags.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 5 : Retirer les deux doublons**

Dans `src/server/kk/diagnostic.ts` : supprimer la fonction locale `parseTags`
(lignes 6-14) et ajouter `import { parseTags } from "@/lib/kk/tags";`.

Dans `src/server/kk/product-tags.ts` : supprimer la fonction locale `parseTags`
(ligne 12 et suivantes) et ajouter le même import.

- [ ] **Step 6 : Exposer les tags sur la vue produit**

Dans `src/types/home.ts`, à la suite de `stock` / `inStock` dans l'interface `Product` :

```ts
  /** Clés de tags, pour les facettes de catalogue et le diagnostic */
  tags?: string[];
```

Dans `src/server/store.ts`, ajouter l'import `import { parseTags } from "@/lib/kk/tags";`
puis, dans l'objet `view` de `toViewProduct` (ligne 530), à la suite de `inStock` :

```ts
    tags: parseTags(row.tags),
```

- [ ] **Step 7 : Vérifier types, lint et suite complète**

Run: `npx tsc --noEmit && npx eslint && npm test`
Expected: aucune erreur, **394 tests au vert** (389 + 5)

- [ ] **Step 8 : Commit**

```bash
git add src/lib/kk/tags.ts src/lib/kk/tags.test.ts src/server/kk/diagnostic.ts src/server/kk/product-tags.ts src/types/home.ts src/server/store.ts
git commit -m "parseTags mutualisé, et les tags remontent jusqu'à la vue produit

La fonction existait en double à l'identique dans diagnostic.ts et
product-tags.ts ; les facettes en auraient fait une troisième copie.

La vue produit porte désormais ses tags : sans cela, le filtrage par type de
peau et par préoccupation n'aurait rien à filtrer côté client.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9 : Facettes type de peau et préoccupation

**Files:**
- Create: `src/server/kk/vocabulaire-tags.ts`
- Create: `src/lib/kk/facettes.ts`
- Create: `src/lib/kk/facettes.test.ts`
- Modify: `src/components/CategoryFilters.tsx`
- Modify: `src/components/CategoryProductBrowser.tsx`
- Modify: `src/app/[locale]/[group]/[category]/page.tsx`

**Interfaces:**
- Consumes: `parseTags` (tâche 8) ; `Product.tags?: string[]` (tâche 8) ;
  `prisma.productTag` (tâche 7).
- Produces: `lireVocabulaire(locale: string): Promise<OptionFacette[]>` avec
  `OptionFacette = { key: string; label: string; family: string }` ;
  `produitCorrespond(tagsProduit: string[], selection: string[]): boolean`.

**Le filtrage se fait côté client**, là où marque, prix, note et disponibilité se font
déjà (`CategoryProductBrowser.tsx:70`). Aucune requête à modifier.

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// src/lib/kk/facettes.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { produitCorrespond } from "./facettes";

describe("produitCorrespond", () => {
  it("laisse tout passer quand aucune facette n'est cochée", () => {
    assert.equal(produitCorrespond(["peau_grasse"], []), true);
    assert.equal(produitCorrespond([], []), true);
  });

  it("retient un produit portant l'une des clés cochées", () => {
    // Union et non intersection : cocher « peau grasse » ET « peau mixte » doit
    // élargir la sélection, pas la vider. C'est ainsi que se comportent déjà
    // les facettes de marque.
    assert.equal(produitCorrespond(["peau_grasse", "hydratation"], ["peau_grasse"]), true);
    assert.equal(produitCorrespond(["peau_mixte"], ["peau_grasse", "peau_mixte"]), true);
  });

  it("écarte un produit ne portant aucune clé cochée", () => {
    assert.equal(produitCorrespond(["peau_seche"], ["peau_grasse"]), false);
  });

  it("écarte un produit sans aucun tag dès qu'une facette est cochée", () => {
    assert.equal(produitCorrespond([], ["peau_grasse"]), false);
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `node --test --import tsx src/lib/kk/facettes.test.ts`
Expected: FAIL — `Cannot find module './facettes'`

- [ ] **Step 3 : Écrire la règle de correspondance**

```ts
// src/lib/kk/facettes.ts

/**
 * Correspondance d'un produit à une sélection de facettes.
 *
 * UNION et non intersection : cocher « peau grasse » puis « peau mixte » élargit
 * la sélection au lieu de la vider. C'est le comportement déjà en place pour la
 * marque, et celui qu'un visiteur attend d'une liste de cases.
 */
export function produitCorrespond(tagsProduit: string[], selection: string[]): boolean {
  if (selection.length === 0) return true;
  return selection.some((cle) => tagsProduit.includes(cle));
}

export interface OptionFacette {
  key: string;
  label: string;
  family: string;
}

/** Les deux seules familles proposées en facettes de catalogue. */
export const FAMILLE_PEAU = "peau";
export const FAMILLE_PREOCCUPATION = "preoccupation";
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `node --test --import tsx src/lib/kk/facettes.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 5 : Lire le vocabulaire côté serveur**

```ts
// src/server/kk/vocabulaire-tags.ts
import { prisma } from "@/server/prisma";
import {
  FAMILLE_PEAU,
  FAMILLE_PREOCCUPATION,
  type OptionFacette,
} from "@/lib/kk/facettes";

/**
 * Vocabulaire des facettes, dans la langue de la page.
 *
 * Seules les familles « peau » et « preoccupation » remontent : les autres tags
 * (budget_eco, premium…) servent le diagnostic et n'ont rien à faire dans une
 * barre de filtres.
 */
export async function lireVocabulaire(locale: string): Promise<OptionFacette[]> {
  const lignes = await prisma.productTag.findMany({
    where: { active: true, family: { in: [FAMILLE_PEAU, FAMILLE_PREOCCUPATION] } },
    orderBy: [{ family: "asc" }, { position: "asc" }],
    select: { key: true, labelFr: true, labelEn: true, family: true },
  });

  return lignes.map((l) => ({
    key: l.key,
    // Repli sur le français si la traduction n'a pas encore été saisie : mieux
    // vaut un libellé dans l'autre langue qu'une case sans étiquette.
    label: locale === "en" ? l.labelEn || l.labelFr : l.labelFr,
    family: l.family,
  }));
}
```

- [ ] **Step 6 : Passer le vocabulaire à la page catégorie**

Dans `src/app/[locale]/[group]/[category]/page.tsx`, appeler `lireVocabulaire(locale)` à
côté du chargement des produits et transmettre le résultat à `CategoryProductBrowser` via
une prop `facettes: OptionFacette[]`.

- [ ] **Step 7 : Ajouter l'état et le filtrage dans le navigateur de catalogue**

Dans `src/components/CategoryProductBrowser.tsx` :

```ts
import { produitCorrespond, FAMILLE_PEAU, FAMILLE_PREOCCUPATION, type OptionFacette } from "@/lib/kk/facettes";
```

Signature :

```ts
export function CategoryProductBrowser({
  products,
  facettes,
}: {
  products: Product[];
  facettes: OptionFacette[];
}) {
```

État, à côté de `selectedBrands` :

```ts
  const [selectedPeau, setSelectedPeau] = useState<string[]>([]);
  const [selectedPreoccupation, setSelectedPreoccupation] = useState<string[]>([]);
```

Bascules, sur le patron de `toggleBrand` :

```ts
  const togglePeau = (key: string) =>
    setSelectedPeau((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );

  const togglePreoccupation = (key: string) =>
    setSelectedPreoccupation((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
```

Dans le `products.filter(...)` de `filteredProducts`, ajouter deux conditions :

```ts
      if (!produitCorrespond(product.tags ?? [], selectedPeau)) return false;
      if (!produitCorrespond(product.tags ?? [], selectedPreoccupation)) return false;
```

Ajouter `selectedPeau` et `selectedPreoccupation` aux dépendances du `useMemo`, les
inclure dans `activeFilterCount`, et les remettre à `[]` dans `resetFilters`.

Séparer les options par famille et les passer dans `filtersProps` :

```ts
  const optionsPeau = facettes.filter((f) => f.family === FAMILLE_PEAU);
  const optionsPreoccupation = facettes.filter((f) => f.family === FAMILLE_PREOCCUPATION);
```

- [ ] **Step 8 : Ajouter les deux groupes de cases**

Dans `src/components/CategoryFilters.tsx`, ajouter les props correspondantes et deux
groupes bâtis **exactement** sur le groupe « marque » existant (lignes 99-116) : même
balisage, même `namePrefix`, mêmes classes. Titres tirés des traductions,
`t("filterSkinType")` et `t("filterConcern")`.

Un groupe dont la liste d'options est vide ne s'affiche pas : une catégorie sans tag ne
doit pas montrer un bloc vide.

Ajouter les deux clés de traduction dans les fichiers de messages FR et EN, à côté de
`filterBrand` et `filterPrice`.

- [ ] **Step 9 : Vérifier types, lint, suite et construction**

Run: `npx tsc --noEmit && npx eslint && npm test && npx next build`
Expected: aucune erreur, **398 tests au vert** (394 + 4), construction en succès

- [ ] **Step 10 : Commit**

```bash
git add src/lib/kk/facettes.ts src/lib/kk/facettes.test.ts src/server/kk/vocabulaire-tags.ts src/components/CategoryFilters.tsx src/components/CategoryProductBrowser.tsx "src/app/[locale]/[group]/[category]/page.tsx" messages/
git commit -m "Filtres type de peau et préoccupation au catalogue

Les deux facettes manquantes du critère 01. Elles s'appuient sur le vocabulaire
en base, donc leurs libellés sont traduits au lieu d'afficher « peau_grasse ».

Union et non intersection à l'intérieur d'un groupe : cocher deux types de peau
élargit la sélection, comme le fait déjà la marque.

Filtrage côté client, là où marque, prix, note et disponibilité se font déjà :
aucune requête modifiée.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10 : Écran d'administration du vocabulaire

**Files:**
- Create: `src/app/admin/(protected)/products/tags/page.tsx`
- Create: `src/app/api/admin/product-tags/route.ts`
- Modify: `src/server/kk/vocabulaire-tags.ts` (lecture et écriture pour l'admin)
- Modify: la navigation du back-office (entrée « Tags produits »)

**Interfaces:**
- Consumes: `prisma.productTag` (tâche 7) ; `FAMILLE_PEAU`, `FAMILLE_PREOCCUPATION`
  (tâche 9).
- Produces: `lireVocabulaireAdmin(): Promise<ProductTagAdmin[]>`,
  `enregistrerVocabulaire(items: ProductTagAdmin[]): Promise<void>`.

**Suivre le patron existant.** L'écran `/admin/diagnostic/tags` fait déjà ce travail pour
les pondérations du diagnostic : reprendre sa structure, sa protection et son style
plutôt que d'en inventer un autre.

- [ ] **Step 1 : Lire le patron de référence**

```bash
cat "src/app/admin/(protected)/diagnostic/tags/page.tsx"
ls src/app/api/admin/
```

Noter : comment la page est protégée, comment elle poste ses modifications, quel
composant de formulaire elle réutilise.

- [ ] **Step 2 : Étendre le module serveur**

Dans `src/server/kk/vocabulaire-tags.ts` :

```ts
export interface ProductTagAdmin {
  key: string;
  labelFr: string;
  labelEn: string;
  family: string;
  position: number;
  active: boolean;
}

/** Vocabulaire complet, familles et entrées désactivées comprises. */
export async function lireVocabulaireAdmin(): Promise<ProductTagAdmin[]> {
  return prisma.productTag.findMany({
    orderBy: [{ family: "asc" }, { position: "asc" }],
  });
}

/**
 * Enregistre le vocabulaire.
 *
 * La clé étant l'identifiant, un `upsert` par entrée suffit : renommer un
 * libellé ne casse aucun lien, et les tags déjà écrits sur les produits
 * continuent de résoudre.
 */
export async function enregistrerVocabulaire(items: ProductTagAdmin[]): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.productTag.upsert({
        where: { key: item.key },
        update: {
          labelFr: item.labelFr,
          labelEn: item.labelEn,
          family: item.family,
          position: item.position,
          active: item.active,
        },
        create: item,
      }),
    ),
  );
}
```

- [ ] **Step 3 : Écrire la route d'écriture**

Créer `src/app/api/admin/product-tags/route.ts` sur le patron des autres routes admin :
même vérification de session, `POST` qui valide le corps puis appelle
`enregistrerVocabulaire`, réponse `NextResponse.json({ ok: true })`.

Valider que `family` vaut `FAMILLE_PEAU`, `FAMILLE_PREOCCUPATION`, ou une autre chaîne
non vide — les tags hors facettes restent modifiables.

- [ ] **Step 4 : Écrire l'écran**

Créer `src/app/admin/(protected)/products/tags/page.tsx` : tableau des entrées, colonnes
clé (lecture seule), libellé FR, libellé EN, famille, position, actif. Bouton
d'enregistrement qui poste vers la route de l'étape 3.

La clé est en lecture seule : la modifier orphelinerait les tags déjà écrits sur les
produits.

- [ ] **Step 5 : Ajouter l'entrée de navigation**

Ajouter « Tags produits » à la navigation du back-office, à côté de l'entrée des
produits.

- [ ] **Step 6 : Vérifier types, lint, suite et construction**

Run: `npx tsc --noEmit && npx eslint && npm test && npx next build`
Expected: aucune erreur, **398 tests au vert**, construction en succès

- [ ] **Step 7 : Vérification manuelle**

Lancer `./node_modules/.bin/next dev -p 3001`, puis :

1. `/admin/products/tags` — modifier un libellé, enregistrer.
2. Recharger une page catégorie — le libellé de la facette a changé, **sans
   redéploiement**.
3. Basculer sur `/en` — la facette affiche son libellé anglais.
4. Cocher deux valeurs du même groupe — la sélection s'élargit.

- [ ] **Step 8 : Commit**

```bash
git add "src/app/admin/(protected)/products/tags" src/app/api/admin/product-tags src/server/kk/vocabulaire-tags.ts
git commit -m "Écran d'administration du vocabulaire des tags

Le client tient lui-même la liste des types de peau et des préoccupations, avec
leurs libellés dans les deux langues, sans redéploiement.

La clé reste en lecture seule : la modifier orphelinerait les tags déjà écrits
sur les produits.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Vérification de fin de lot

Une fois les dix tâches passées, contrôler les quatre critères d'acceptation :

| Critère | Contrôle |
|---|---|
| **01** | Filtrer par catégorie, marque, prix, type de peau et préoccupation, sur mobile et desktop |
| **02** | Saisir `6 77 12 34 56` puis `377123456` — le second est refusé avec un message nommant le format |
| **03** | Payer en sandbox : la commande passe en « Payée », le stock baisse, une ligne `Invoice` apparaît |
| **04** | La boîte de réception contient l'accusé de réception, puis « paiement reçu » avec le PDF joint — montants en FCFA, jamais en euros |
| **03 (hors ligne)** | Passer une commande « paiement à la livraison », la basculer en « Payée » au back-office : la facture part |
| **Idempotence** | Rejouer le même webhook : aucune seconde facture, aucun second e-mail |

