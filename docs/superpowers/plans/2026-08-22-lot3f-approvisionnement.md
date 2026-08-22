# Lot 3F — Approvisionnement — Plan d'implémentation

> **Pour les exécutants agentiques :** SOUS-COMPÉTENCE REQUISE —
> superpowers:subagent-driven-development.

**But :** relier le coût d'achat à des achats réels, et savoir ce qui est commandé
mais pas encore arrivé.

**Spécification :** `docs/superpowers/specs/2026-08-22-lot3f-approvisionnement-design.md`

---

## Contraintes globales

1. **Migration strictement additive.** La base de développement EST la base de
   production. `prisma migrate dev` **se bloque dans cet environnement** : la
   séquence est `npx prisma migrate diff --from-config-datasource --to-schema
   prisma/schema.prisma --script` pour lire le SQL, écrire le dossier de migration à
   la main, puis `migrate deploy` et `generate`.
2. **Une réception est une transaction unique** : quantité reçue, mouvement de
   stock, stock du produit, coût du produit. Si une écriture échoue, aucune ne doit
   rester.
3. **Une réception ne se défait pas.** Elle a créé un mouvement de stock, et le
   mouvement est la vérité. Corriger passe par un ajustement de stock tracé.
4. **Le statut d'un bon se déduit des quantités**, il ne se saisit jamais.
5. **`null` veut dire « on ne sait pas », jamais « zéro ».**
6. **Le FCFA n'a pas de sous-unité** : les entiers `*Cents` sont des francs entiers,
   aucune division par 100.
7. **Toute route et tout écran d'administration nomment leur capacité** —
   `catalogue` ici — et les familles `suppliers` et `purchase-orders` doivent être
   ajoutées à `CAPACITE_PAR_FAMILLE` **avant** d'écrire les routes. Un test ouvre
   chaque fichier et exige autant de gardes que de fonctions exportées.
8. **Les modules de `src/lib/kk/` n'importent que des modules purs.**
9. Français partout. Aucun nom de personne ni pseudonyme.
10. **Avant chaque commit :** `npx tsc --noEmit`, `npx eslint src --ext .ts,.tsx`,
    `npm test` ; `npm run build` aux tâches touchant une page ou une route, au
    premier plan avec un `timeout` explicite de 600000 millisecondes. Rien en
    arrière-plan. Si `npx` ne résout pas un binaire, appelle
    `./node_modules/.bin/<binaire>`.

---

### Tâche 1 : La numérotation mutualisée

**Fichiers :** créer `src/lib/kk/numerotation.ts` et son test ; adapter
`src/server/kk/facture-numero.ts` pour qu'il en dérive.

**Contexte.** `facture-numero.ts` porte déjà la règle : séquence annuelle, remise à
un en janvier, refus de poursuivre le compteur d'une autre année, et repli sur 1
quand le dernier numéro est illisible. Les bons de commande ont exactement le même
besoin. Deux copies divergeraient, et un numéro qui se répète est un incident
comptable.

- [ ] **Étape 1 : écrire les tests**

Créer `src/lib/kk/numerotation.test.ts` :

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { numeroSuivant } from "./numerotation";

describe("numeroSuivant", () => {
  it("commence à 1 quand il n'y a pas de précédent", () => {
    assert.equal(numeroSuivant("BC-", null, 2026), "BC-2026-000001");
  });

  it("poursuit la séquence de la même année", () => {
    assert.equal(numeroSuivant("BC-", "BC-2026-000041", 2026), "BC-2026-000042");
  });

  it("repart à 1 au changement d'année", () => {
    // La séquence est annuelle : poursuivre le compteur de l'an dernier
    // ferait commencer 2027 à 000042, ce qu'aucun comptable n'attend.
    assert.equal(numeroSuivant("BC-", "BC-2026-000041", 2027), "BC-2027-000001");
  });

  it("repart à 1 quand le dernier numéro est illisible", () => {
    // Une ligne corrompue rendrait NaN : mieux vaut un doublon détectable
    // qu'un « BC-2026-NaN » écrit en base.
    assert.equal(numeroSuivant("BC-", "BC-2026-abcdef", 2026), "BC-2026-000001");
  });

  it("ne confond pas deux préfixes", () => {
    // Une facture et un bon de commande ne partagent pas leur compteur : leur
    // confusion dans un échange avec le fournisseur coûterait cher.
    assert.equal(numeroSuivant("BC-", "FAC-2026-000041", 2026), "BC-2026-000001");
  });

  it("garde six chiffres au-delà de mille", () => {
    assert.equal(numeroSuivant("BC-", "BC-2026-001000", 2026), "BC-2026-001001");
  });
});
```

- [ ] **Étape 2 : écrire le module**

```ts
/**
 * Séquence annuelle de numéros de documents.
 *
 * Une seule règle pour les factures et les bons de commande : même remise à un
 * en janvier, même refus de poursuivre le compteur d'une autre année, même
 * repli sur 1 quand le dernier numéro est illisible.
 *
 * Deux copies d'une règle de numérotation divergent, et un numéro qui se répète
 * est un incident comptable — pas un défaut d'affichage.
 */

/** Six chiffres : de quoi tenir un million de documents par an. */
const LARGEUR = 6;

export function numeroSuivant(
  prefixe: string,
  dernierNumero: string | null,
  annee: number,
): string {
  const debut = `${prefixe}${annee}-`;

  // Un dernier numéro d'une autre année, ou d'un autre préfixe, ne poursuit
  // pas le compteur.
  const compteur =
    dernierNumero && dernierNumero.startsWith(debut)
      ? Number.parseInt(dernierNumero.slice(debut.length), 10)
      : 0;

  const suivant = Number.isFinite(compteur) ? compteur + 1 : 1;
  return `${debut}${String(suivant).padStart(LARGEUR, "0")}`;
}
```

- [ ] **Étape 3 : faire dériver la numérotation des factures**

Dans `src/server/kk/facture-numero.ts`, remplace le corps de `numeroFactureSuivant`
par un appel à `numeroSuivant(PREFIXE_FACTURE, dernierNumero, annee)`. **Garde la
fonction et son nom** : ses appelants et ses tests existent, et ce lot n'a pas à les
toucher. Garde aussi son commentaire d'en-tête, qui explique pourquoi le préfixe des
factures diffère de celui des commandes.

- [ ] **Étape 4 : vérifier que les tests de facture passent toujours**

```bash
node --test --import tsx src/server/kk/facture-numero.test.ts
node --test --import tsx src/lib/kk/numerotation.test.ts
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test
```

Les tests de facture ne doivent pas être modifiés. S'ils tombent, c'est la
mutualisation qui est fautive, pas eux.

- [ ] **Étape 5 : commiter**

```bash
git commit src/lib/kk/numerotation.ts src/lib/kk/numerotation.test.ts src/server/kk/facture-numero.ts -m "Une seule règle de numérotation pour les factures et les bons"
```

---

### Tâche 2 : Le statut déduit et les totaux

**Fichiers :** créer `src/lib/kk/approvisionnement.ts` et son test.

**Interfaces produites :**
- `type StatutBon = "brouillon" | "envoye" | "recu_partiel" | "recu" | "annule"`
- `interface LigneBon { quantiteCommandee: number; quantiteRecue: number; coutUnitaireCents: number }`
- `statutApresReception(statutActuel: StatutBon, lignes: LigneBon[]): StatutBon`
- `totauxBon(lignes: LigneBon[]): { engageCents; recuCents; restantCents; toutRecu: boolean }`

- [ ] **Étape 1 : écrire les tests**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { statutApresReception, totauxBon, type LigneBon } from "./approvisionnement";

function ligne(commandee: number, recue: number, cout = 8000): LigneBon {
  return { quantiteCommandee: commandee, quantiteRecue: recue, coutUnitaireCents: cout };
}

describe("statutApresReception", () => {
  it("passe à « recu » quand tout est arrivé", () => {
    assert.equal(statutApresReception("envoye", [ligne(10, 10), ligne(5, 5)]), "recu");
  });

  it("passe à « recu_partiel » quand une partie est arrivée", () => {
    assert.equal(statutApresReception("envoye", [ligne(10, 10), ligne(5, 0)]), "recu_partiel");
  });

  it("laisse le statut inchangé quand rien n'est arrivé", () => {
    assert.equal(statutApresReception("envoye", [ligne(10, 0)]), "envoye");
  });

  it("considère « reçu » un bon sur-livré", () => {
    // Un fournisseur qui livre treize au lieu de douze, cela arrive. Le bon est
    // soldé : laisser « partiel » ferait attendre une livraison qui ne viendra
    // jamais.
    assert.equal(statutApresReception("envoye", [ligne(12, 13)]), "recu");
  });

  it("ne ressuscite pas un bon annulé", () => {
    // Ce qui avait été reçu reste reçu, mais un bon annulé le reste : le
    // rouvrir par une réception effacerait la décision de l'annuler.
    assert.equal(statutApresReception("annule", [ligne(10, 10)]), "annule");
  });

  it("ne fait pas d'un brouillon un bon reçu", () => {
    // On ne reçoit pas ce qu'on n'a pas commandé. Si cela arrive, c'est le
    // brouillon qu'il faut envoyer d'abord.
    assert.equal(statutApresReception("brouillon", [ligne(10, 10)]), "brouillon");
  });

  it("rend « envoye » pour un bon sans ligne", () => {
    // Zéro ligne toutes reçues serait vrai au sens strict, et absurde.
    assert.equal(statutApresReception("envoye", []), "envoye");
  });
});

describe("totauxBon", () => {
  it("calcule l'engagé, le reçu et le restant", () => {
    const totaux = totauxBon([ligne(10, 4, 8000), ligne(5, 5, 12000)]);
    assert.equal(totaux.engageCents, 10 * 8000 + 5 * 12000);
    assert.equal(totaux.recuCents, 4 * 8000 + 5 * 12000);
    assert.equal(totaux.restantCents, 6 * 8000);
  });

  it("ne rend jamais un restant négatif sur une sur-livraison", () => {
    // Treize reçus pour douze commandés ne veut pas dire qu'il reste −1 à
    // recevoir.
    assert.equal(totauxBon([ligne(12, 13)]).restantCents, 0);
  });

  it("rend des totaux à zéro pour un bon vide", () => {
    const totaux = totauxBon([]);
    assert.equal(totaux.engageCents, 0);
    assert.equal(totaux.toutRecu, false);
  });
});
```

- [ ] **Étape 2 : écrire le module, puis vérifier et commiter**

Le module est pur — zéro import. Règles à respecter, écrites en commentaire :
- un bon `annule` ou `brouillon` ne change jamais de statut par une réception ;
- « tout reçu » veut dire *au moins* la quantité commandée sur **chaque** ligne ;
- un bon sans ligne n'est pas « reçu » ;
- le restant est borné à zéro.

```bash
node --test --import tsx src/lib/kk/approvisionnement.test.ts
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test
git commit src/lib/kk/approvisionnement.ts src/lib/kk/approvisionnement.test.ts -m "Statut déduit et totaux d'un bon de commande"
```

---

### Tâche 3 : Le modèle et la migration

**Fichiers :** `prisma/schema.prisma`, un dossier de migration.

- [ ] **Étape 1 : les trois modèles**

```prisma
/// Fournisseur du catalogue.
model Supplier {
  id        String          @id @default(cuid())
  name      String          @unique
  email     String          @default("")
  phone     String          @default("")
  address   String          @default("")
  notes     String          @default("")
  active    Boolean         @default(true)
  orders    PurchaseOrder[]
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
}

/// Bon de commande fournisseur, numéroté « BC-AAAA-NNNNNN ».
model PurchaseOrder {
  id         String   @id @default(cuid())
  reference  String   @unique
  supplierId String
  /// brouillon | envoye | recu_partiel | recu | annule — déduit des quantités,
  /// jamais saisi à la main.
  status     String   @default("brouillon")
  note       String   @default("")
  sentAt     DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  supplier Supplier            @relation(fields: [supplierId], references: [id], onDelete: Restrict)
  items    PurchaseOrderItem[]

  @@index([supplierId])
  @@index([status])
}

/// Ligne d'un bon de commande. Le libellé est recopié : supprimer un produit du
/// catalogue ne doit pas rendre illisible un bon déjà passé.
model PurchaseOrderItem {
  id                String  @id @default(cuid())
  purchaseOrderId   String
  productId         String?
  brand             String
  name              String
  quantityOrdered   Int
  quantityReceived  Int     @default(0)
  unitCostCents     Int

  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  product       Product?      @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([purchaseOrderId])
  @@index([productId])
}
```

`Product` gagne `purchaseItems PurchaseOrderItem[]`.

**Deux choix à ne pas confondre :** le fournisseur est `Restrict` — on ne supprime
pas un fournisseur qui a des bons, parce qu'un bon sans fournisseur n'est plus un
document. Le produit est `SetNull` — le catalogue vit, le bon reste lisible grâce à
son libellé recopié. Les lignes sont `Cascade` : elles n'existent que par leur bon.

- [ ] **Étape 2 : lire le SQL, écrire la migration, l'appliquer**

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Attendu : trois `CREATE TABLE`, leurs index et leurs clés étrangères. **Rien
d'autre.** Un `DROP`, un `NOT NULL` sur une colonne existante ou une table recréée :
arrête et signale sans rien appliquer.

Écris `prisma/migrations/20260822160000_approvisionnement/migration.sql` avec ce SQL
exact, puis `npx prisma migrate deploy` et `npx prisma generate`. Relance le `diff` :
il doit rendre une migration vide.

- [ ] **Étape 3 : vérifier et commiter**

```bash
npx tsc --noEmit && npm test && npm run build
git add prisma/schema.prisma prisma/migrations
git commit -m "Fournisseurs, bons de commande et leurs lignes"
```

---

### Tâche 4 : Le serveur — fournisseurs, bons, et la réception

**Fichiers :** créer `src/server/kk/fournisseurs.ts` et `src/server/kk/bons.ts`.

- [ ] **Étape 1 : les fournisseurs**

Lecture, création, modification, désactivation. La suppression n'est possible que
sans bon rattaché — sinon un message qui dit combien de bons l'empêchent. Un refus
qui ne dit pas contre quoi on bute est un refus qu'on ne comprend pas.

- [ ] **Étape 2 : les bons**

Création (numéro par `numeroSuivant("BC-", …)`), ajout et retrait de lignes tant que
le bon est en `brouillon`, envoi (pose `sentAt` et passe à `envoye`), annulation.

**Les lignes ne se modifient plus dès que le bon est envoyé.** Un bon transmis est un
engagement : le réécrire après coup ferait diverger ce qu'on a commandé et ce que le
fournisseur a lu.

- [ ] **Étape 3 : LA RÉCEPTION — le cœur du lot**

```ts
export async function recevoirLignes(
  bonId: string,
  receptions: { ligneId: string; quantite: number }[],
  options: { majCoutProduit: boolean; note?: string; par?: string },
): Promise<ResultatReception>
```

**Tout se passe dans UNE transaction Prisma.** Pour chaque ligne reçue :

1. incrémenter `quantityReceived` ;
2. créer un `StockMovement` de motif `"wareneingang"` — le motif existe déjà, ne
   crée pas de septième vocabulaire — avec une note portant la référence du bon ;
3. incrémenter `Product.stock` ;
4. si `majCoutProduit`, poser `Product.costCents = coutUnitaireCents` de la ligne.

Puis recalculer le statut du bon avec `statutApresReception`.

**Cinq règles à écrire en commentaire, parce qu'elles ne se devinent pas :**

- une quantité reçue **nulle ou négative** est refusée : une réception négative
  réécrirait l'histoire, et la correction passe par un ajustement de stock tracé ;
- une ligne **sans produit rattaché** (`productId` nul, produit supprimé) est reçue
  au sens du bon, mais ne touche ni stock ni coût — et le résultat le signale, sans
  quoi l'administrateur croirait son stock à jour ;
- **la sur-livraison est acceptée** : le fournisseur livre ce qu'il livre, et le
  refuser ne ferait pas rentrer la marchandise ;
- recevoir sur un bon **`brouillon` ou `annule`** est refusé, avec un message qui
  dit lequel des deux ;
- si la transaction échoue, **aucune** des quatre écritures ne doit rester.

Le résultat rend, ligne par ligne, ce qui a été fait : quantité reçue, stock touché
ou non, coût mis à jour ou non.

- [ ] **Étape 4 : vérifier et commiter**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test
git commit src/server/kk/fournisseurs.ts src/server/kk/bons.ts -m "Fournisseurs, bons de commande et réception en transaction"
```

---

### Tâche 5 : Les routes et les écrans

**Fichiers :**
- `src/lib/kk/routesAdmin.ts` — `suppliers: "catalogue"` et `"purchase-orders": "catalogue"`, **d'abord**
- `src/app/api/admin/suppliers/` et `src/app/api/admin/purchase-orders/`
- `src/app/admin/(protected)/suppliers/` et `.../purchase-orders/`
- `src/components/admin/AdminSidebar.tsx` — deux entrées dans la section Catalogue
- `src/app/admin/(protected)/stock/page.tsx` — colonne « en commande »

- [ ] **Étape 1 : la carte des capacités d'abord.** Le test d'arborescence échouera
      sinon, et c'est son rôle.

- [ ] **Étape 2 : les routes.** Chaque fonction exportée appelle
      `requireCapaciteApi("catalogue")`. Le test en exige autant que de fonctions.

- [ ] **Étape 3 : les écrans.** Suis le patron d'une famille existante — regarde
      `coupons` ou `brands` — plutôt que d'inventer une mise en page.

      La fiche d'un bon montre les lignes, ce qui reste à recevoir, et le formulaire
      de réception. **La case « mettre à jour le coût d'achat des produits » est
      cochée par défaut, et son libellé dit ce qu'elle fait** : le coût du produit
      devient le coût payé sur cette réception. La décocher sert aux achats
      exceptionnels, qui ne doivent pas s'imposer comme référence.

      Après réception, l'écran affiche le compte rendu ligne par ligne — dont les
      lignes qui n'ont pas touché le stock faute de produit rattaché.

- [ ] **Étape 4 : la colonne « en commande » sur l'écran du stock.** Elle somme les
      quantités restant à recevoir des bons `envoye` et `recu_partiel`. Elle répond
      à la seule question qu'on se pose devant une rupture : est-ce que ça arrive ?

- [ ] **Étape 5 : vérifier et essayer pour de vrai**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test && npm run build
npm run dev
```

Déroule un cycle complet et rapporte chaque étape :
1. créer un fournisseur ;
2. créer un bon, y mettre deux lignes, l'envoyer ;
3. recevoir une seule ligne partiellement — vérifier que le statut passe à
   `recu_partiel`, que le stock du produit a augmenté de la bonne quantité, et que
   son coût d'achat a changé ;
4. recevoir le reste — vérifier le passage à `recu` ;
5. vérifier la colonne « en commande » avant et après ;
6. essayer de recevoir sur un bon annulé — le refus doit être lisible.

**Supprime les données d'essai que tu as créées**, et dis-le dans ton rapport.

---

## Vérification finale du lot

- [ ] `npm test` au vert, `npm run build` en succès.
- [ ] Le `migrate diff` rend une migration vide.
- [ ] Aucune route ni écran sans capacité — le test d'arborescence le garantit.
- [ ] Les tests de facturation existants passent toujours : la numérotation a été
      mutualisée sans changer leur comportement.
