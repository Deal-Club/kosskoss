# Lot 3C — Tableau de bord des ventes et export comptable

**Critères visés :** 14 (tableau de bord des ventes) et 15 (export CSV des ventes
avec coûts et marges).

**Préalable déjà en place :** le lot 3B a posé `Product.costCents` et le module pur
`src/lib/kk/marge.ts`. Sans coût d'achat, il n'y avait pas de marge à totaliser ;
c'est pour cela que 3B précédait 3C.

---

## 1. Le problème que ce lot résout

Le back-office sait tout dire du catalogue — stock, ruptures, catégories vides — et
rien des ventes. Le tableau de bord d'accueil (`/admin`) compte des produits, jamais
un franc encaissé. Pour savoir ce que la boutique a vendu, il faut aujourd'hui ouvrir
la liste des commandes et additionner de tête.

Deux livrables y répondent :

- un **écran** qui donne le chiffre de la période en cours et ce qui le compose ;
- un **export CSV** qui sort les mêmes ventes ligne à ligne, avec coût et marge,
  pour le tableur du comptable.

---

## 2. Le coût est figé sur la vente

**Décision retenue :** une colonne `unitCostCents Int?` s'ajoute à `OrderItem`,
remplie à la création de la commande depuis la fiche produit.

C'est déjà la doctrine du schéma. `OrderItem` recopie la marque, le nom, le SKU, le
chemin et le prix unitaire au moment de la vente ; le code promo est figé sur la
commande ; les libellés de paiement et de livraison aussi. La raison est chaque fois
la même : renommer ou reprixer un produit au back-office ne doit pas réécrire une
commande déjà passée. Le coût d'achat obéit à la même règle — une marge de mars
calculée au prix d'achat de septembre n'est pas une marge de mars.

La colonne est **nullable**, et le null veut dire « on ne savait pas » :

- toutes les commandes antérieures à ce lot n'ont pas de coût — elles n'en auront
  jamais, et leur en inventer un serait pire que la case vide ;
- un produit dont le coût n'était pas renseigné le jour de la vente laisse la ligne
  vide, exactement comme le lot 3B l'a établi pour la fiche produit.

**Conséquence, à afficher et non à taire :** la marge totale ne porte que sur les
lignes qui ont un coût. L'écran et l'export disent donc toujours sur combien de
lignes elle est calculée. Une marge muette sur son incomplétude ment ; c'est le
principal risque de tout ce lot.

---

## 3. Ce qui compte comme vente

Deux chiffres distincts, jamais additionnés :

| Chiffre | Définition | Pourquoi séparé |
|---|---|---|
| **Encaissé** | commandes dont `paymentStatus = "payee"` | le seul argent réellement entré |
| **En cours** | commandes ni payées ni annulées | le paiement à la livraison n'a pas encore de webhook ; ce montant existe mais n'est pas acquis |

**Date de référence :** `paidAt` quand il est posé, `createdAt` sinon. `paidAt` n'est
renseigné que depuis le passage au statut « payée » (`orders.ts:779`) ; les commandes
plus anciennes n'en ont pas, et les rejeter de l'historique serait un trou silencieux.
En clause Prisma :

```ts
OR: [
  { paidAt: { gte: du, lte: au } },
  { paidAt: null, createdAt: { gte: du, lte: au } },
]
```

**Ce qui n'entre pas dans le chiffre d'affaires produit :** la livraison. Le CA
de l'écran est la somme des `lineTotalCents`, pas des `totalCents` de commande — sans
quoi la marge se comparerait à une assiette qui contient la livraison. Cette
boutique ne décompose pas ses prix en hors taxe et taxe : le montant affiché est
celui réglé, tel quel, pas un sous-total qu'il faudrait encore taxer.

---

## 4. Architecture

Le découpage suit celui des lots précédents : le calcul est pur et testable sans
base, la base ne fait que lire, l'écran ne fait qu'afficher.

```
src/lib/kk/periode.ts      pur — bornes de dates depuis l'URL, raccourcis, défaut
src/lib/kk/ventes.ts       pur — totaux, classement produits, série par jour
src/lib/kk/csv.ts          pur — échappement et assemblage CSV (aujourd'hui recopié)
src/server/kk/ventes.ts    lecture Prisma → lignes plates
src/app/admin/(protected)/ventes/page.tsx      l'écran
src/app/api/admin/ventes/export/route.ts       le CSV
```

### 4.1 `src/lib/kk/periode.ts` — pur, zéro import

```ts
export type Raccourci = "7j" | "30j" | "mois" | "annee";
export interface Periode { du: Date; au: Date; raccourci: Raccourci | null }
export function periodeDepuisUrl(params: { du?: string; au?: string; p?: string }, maintenant: Date): Periode
export function bornesRaccourci(raccourci: Raccourci, maintenant: Date): { du: Date; au: Date }
```

Règles : défaut **30 jours glissants** ; `au` est porté à la fin de journée (23:59:59)
sans quoi une période « du 1er au 31 » perdrait le 31 ; des dates illisibles ou
inversées retombent sur le défaut plutôt que de rendre un écran vide.

### 4.2 `src/lib/kk/ventes.ts` — pur, zéro import

```ts
export interface LigneVente {
  orderId: string; orderNumber: string; date: Date;
  brand: string; name: string; variantLabel: string; sku: string;
  quantity: number; unitPriceCents: number; lineTotalCents: number;
  unitCostCents: number | null;
}

export interface TotauxVentes {
  chiffreAffairesCents: number;   // somme des lignes de produits, livraison exclue
  quantite: number;
  nombreCommandes: number;        // commandes distinctes, pas lignes
  panierMoyenCents: number | null; // null si aucune commande — pas 0
  margeCents: number | null;      // null si aucune ligne n'a de coût
  tauxMarge: number | null;
  lignesAvecCout: number;
  lignesTotal: number;
}

export interface VenteProduit {
  cle: string;                    // marque + nom + variante — le produit peut avoir disparu
  brand: string; name: string; variantLabel: string;
  quantite: number;
  chiffreAffairesCents: number;
  margeCents: number | null;
  lignesSansCout: number;
}

export interface PointJour {
  jour: string;                   // « AAAA-MM-JJ »
  chiffreAffairesCents: number;
  nombreCommandes: number;
}

export function totaliserVentes(lignes: LigneVente[]): TotauxVentes
export function classerParProduit(lignes: LigneVente[], limite: number): VenteProduit[]
export function ventesParJour(lignes: LigneVente[], du: Date, au: Date): PointJour[]
```

Le classement se fait sur la **clé recopiée** — marque, nom, variante — et non sur
`productId` : une ligne dont le produit a été supprimé du catalogue porte `productId`
à `null`, et grouper là-dessus fondrait tous les produits disparus en un seul.

Point délicat : `margeCents` ne totalise que les lignes qui ont un coût, et
`tauxMarge` rapporte cette marge **au CA de ces mêmes lignes** — pas au CA total.
Rapporter une marge partielle à une assiette complète produirait un taux
mécaniquement sous-évalué, et d'autant plus faux que le catalogue est peu renseigné.

`ventesParJour` rend un point par jour de la période, y compris les jours sans vente :
un histogramme qui saute les jours creux ment sur le rythme.

### 4.3 `src/lib/kk/csv.ts` — pur, zéro import

`csvCell` et `buildCsv` existent aujourd'hui recopiés dans `products/export`. Le
lot les extrait, avec leurs deux conventions et leurs raisons : séparateur
point-virgule (la virgule couperait « 12 000,50 » dans Excel francophone) et BOM en
tête (sans quoi Excel affiche « CrÃ¨me »).

`products/export/route.ts` est recâblé sur le module extrait. `feed/google-csv` et
`account/export` ne le sont **pas** : leurs conventions sont celles de Google et du
RGPD, pas celles d'Excel, et les aligner casserait les deux.

### 4.4 `src/server/kk/ventes.ts`

```ts
export async function lireVentes(periode: Periode): Promise<LigneVente[]>
export async function lireEnCours(periode: Periode): Promise<{ nombre: number; totalCents: number }>
```

Une seule requête `orderItem.findMany` avec le filtre porté sur la commande liée, et
`orderBy` par date. Pas d'agrégation SQL : le volume d'une jeune boutique tient en
mémoire, et le calcul en TypeScript est celui que les tests couvrent.

### 4.5 L'écran `/admin/ventes`

Composant serveur, état dans l'URL (`?p=30j` ou `?du=…&au=…`) — même patron que le
reste du back-office. Contenu :

1. **Barre de période** — quatre raccourcis et deux champs de dates.
2. **Quatre cartes** — encaissé (hors port), marge, commandes, panier moyen. La carte
   marge porte sa propre mention : « calculée sur 42 lignes sur 57 ».
3. **Bloc « en cours »** — nombre et montant des commandes non payées, avec un lien
   vers la liste filtrée. Séparé visuellement, jamais additionné à l'encaissé.
4. **Histogramme par jour** — SVG à la main, dans le style des graphiques existants
   (`DashboardCharts.tsx`) ; le projet n'a pas de bibliothèque de graphiques et n'en
   gagne pas une pour ce lot.
5. **Top 10 produits** — CA, quantité, marge, avec la mention du coût manquant.
6. **Bouton d'export** — reprend la période affichée.

Une entrée « Ventes » s'ajoute à la section *Boutique* de `AdminSidebar`, sous
« Commandes ».

### 4.6 L'export `/api/admin/ventes/export`

Une ligne par ligne de commande, dans l'ordre chronologique. Colonnes :

Date · N° commande · Marque · Produit · Variante · SKU · Quantité ·
Prix unitaire · Total ligne · Coût unitaire · Coût total · Marge · Taux de marge

Les montants sortent en **entiers FCFA sans séparateur ni symbole** : un tableur doit
pouvoir les additionner, et « 12 000 FCFA » n'est pas un nombre. La devise est dite
une fois, dans l'en-tête de colonne. Les colonnes de coût et de marge restent
**vides** — jamais zéro — quand le coût est inconnu ; un zéro s'y additionnerait et
fausserait le total du comptable.

**Ce que le fichier ne porte pas, et pourquoi.** Ni le statut de paiement, qui vaut
« payée » sur toutes les lignes puisque l'export ne retient que l'encaissé — une
colonne constante n'apprend rien. Ni l'identité du client : c'est un export de
ventes et de marges, pas un fichier de clients, et faire sortir des adresses
e-mail vers un tableur qui circule par courriel ne se justifie pas par le besoin
comptable. La liste des commandes garde ces informations, avec ses propres règles.

Nom du fichier : `ventes-AAAA-MM-JJ_AAAA-MM-JJ.csv`, les deux bornes de la période —
un export sans sa période ne se relit pas six mois plus tard.

---

## 5. Le FCFA n'a pas de sous-unité

Rappel qui vaut pour tout le lot : les entiers des champs `*Cents` **sont** des francs
entiers. Le suffixe est hérité d'une activité précédente et ment. Aucune division par
100, nulle part — ni à l'écran, ni dans le CSV, ni dans les tests.

---

## 6. Tests

Modules purs, couverts sans base :

- **periode** — défaut 30 jours ; chaque raccourci ; fin de journée incluse ; dates
  illisibles ; dates inversées.
- **ventes** — totaux ; marge partielle et son assiette ; aucune ligne avec coût
  (marge `null`, pas `0`) ; commandes distinctes comptées une fois ; panier moyen à
  zéro commande ; jours creux présents dans la série ; classement par CA.
- **csv** — cellule contenant un point-virgule, un guillemet, un retour à la ligne ;
  BOM présent ; fins de ligne CRLF.

L'écran et la route sont vérifiés par la construction et à la main : le projet ne
teste pas ses composants serveur, et ce lot n'introduit pas cette pratique.

---

## 7. Hors périmètre

- **Avoirs et remboursements** — le CDC les rattache à la facturation ; ils viendront
  avec leur propre lot, et un remboursement mal modélisé fausserait le CA.
- **Marge par catégorie ou par marque** — les marques deviennent une entité au lot 3E ;
  agréger dessus avant serait à refaire.
- **Comparaison à la période précédente** — utile, mais elle double la surface de
  calcul et de test pour un lot dont l'objet est d'abord de donner le chiffre.
