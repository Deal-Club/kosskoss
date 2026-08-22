# Lot 3F — Approvisionnement : fournisseurs, bons de commande, réception

**Critère visé :** 13 (back-office complet — volet approvisionnement).

---

## 1. Ce qui manque

Le back-office sait ajuster un stock à la main (`/admin/stock`), avec un motif et
une note. Il ne sait rien de ce qui précède : **de qui** vient la marchandise,
**combien** elle a coûté, et **ce qui est commandé mais pas encore arrivé**.

Conséquences concrètes :

- le coût d'achat de chaque produit se saisit à la main et vieillit en silence,
  faussant peu à peu la marge du lot 3C ;
- rien ne dit ce qui est en route, donc rien n'empêche de recommander ce qui
  arrive demain ;
- une réception se saisit produit par produit, sans trace du bon de commande.

## 2. Ce que ce lot établit

### 2.1 Trois entités

**`Supplier`** — nom unique, contact (courriel, téléphone, adresse), notes, actif.

**`PurchaseOrder`** — un bon de commande, numéroté `BC-AAAA-NNNNNN` sur une
séquence annuelle, comme les factures.

| Statut | Ce qu'il veut dire |
|---|---|
| `brouillon` | en cours de rédaction, modifiable, n'engage rien |
| `envoye` | transmis au fournisseur, les lignes ne bougent plus |
| `recu_partiel` | une partie est arrivée |
| `recu` | tout est arrivé |
| `annule` | abandonné ; ce qui avait été reçu reste reçu |

**`PurchaseOrderItem`** — une ligne : le produit, son libellé **recopié**, la
quantité commandée, la quantité déjà reçue, le coût unitaire.

Le libellé est recopié pour la même raison que sur `OrderItem` : un bon de commande
est un document, et supprimer un produit du catalogue ne doit pas rendre illisible
un bon passé.

### 2.2 La réception est le cœur du lot

Recevoir une ligne fait trois choses, dans une seule transaction :

1. augmente la quantité reçue de la ligne ;
2. crée un **mouvement de stock** de motif « réception marchandise », qui existe
   déjà (`StockMovement`), et incrémente le stock du produit ;
3. **met à jour le coût d'achat du produit** avec le coût unitaire reçu.

Le troisième point est celui qui compte. **Décision : le coût du produit devient
le dernier coût d'achat payé.**

C'est le choix le plus simple qui soit défendable. Un coût saisi une fois et jamais
revu se dégrade à chaque hausse de tarif, et fausse la marge sans que rien ne le
signale — c'est-à-dire exactement le défaut que le lot 3C existe pour éviter. La
moyenne pondérée serait plus juste comptablement ; elle exige de suivre le stock
valorisé, ce qui est un autre métier. **À poser au comptable.**

L'écran le dit en toutes lettres au moment de recevoir, et la mise à jour se
décoche : un achat exceptionnel — dépannage, petite quantité au prix fort — ne doit
pas s'imposer comme le coût de référence.

**Le statut du bon se déduit des quantités**, il ne se saisit pas : tout reçu ⇒
`recu`, rien reçu ⇒ inchangé, entre les deux ⇒ `recu_partiel`. Un statut saisi à la
main finit toujours par mentir sur ce que disent les lignes.

**Une réception ne se défait pas.** Elle a créé un mouvement de stock, et le
mouvement est la vérité. Corriger se fait par un ajustement de stock, tracé — pas
par une réception négative qui réécrirait l'histoire.

### 2.3 Le coût d'achat, enfin relié

Le lot 3B a posé `Product.costCents`, saisi à la main. Le lot 3C en tire les marges.
Ce lot en fait une conséquence des achats réels plutôt qu'une déclaration.

**La variante reste sans coût propre** — la limite relevée au lot 3C. `ProductVariant`
n'a pas de `costCents`, et une réception ne porte que sur un produit. Ajouter le
coût par variante demanderait de commander à la variante, ce qui double la surface
du lot. **Hors périmètre, et dit comme tel** : les marges des produits déclinés
restent approximatives.

### 2.4 Ce que l'écran montre

- **`/admin/suppliers`** — les fournisseurs.
- **`/admin/purchase-orders`** — les bons, filtrables par statut et par fournisseur,
  avec le total engagé.
- **La fiche d'un bon** — les lignes, ce qui reste à recevoir, et le formulaire de
  réception.
- **Sur `/admin/stock`** — une colonne « en commande », qui répond à la seule
  question qu'on se pose devant une rupture : est-ce que ça arrive ?

## 3. Hors périmètre

- **Le retour fournisseur** — rare, et traitable par un ajustement de stock tracé.
- **La valorisation du stock au coût moyen pondéré** — c'est un choix comptable, pas
  un choix logiciel.
- **Le coût d'achat par variante** — voir plus haut.
- **L'envoi du bon par courriel au fournisseur** — le PDF suffit à cette étape.

## 4. Architecture

```
src/lib/kk/numerotation.ts     pur — séquence annuelle mutualisée (facture ET bon)
src/lib/kk/approvisionnement.ts pur — statut déduit des quantités, totaux
src/server/kk/fournisseurs.ts  lecture et écriture des fournisseurs
src/server/kk/bons.ts          bons de commande, et la réception en transaction
src/app/admin/(protected)/suppliers/       écrans fournisseurs
src/app/admin/(protected)/purchase-orders/ écrans bons de commande
src/app/api/admin/suppliers/               routes, capacité `catalogue`
src/app/api/admin/purchase-orders/         routes, capacité `catalogue`
prisma/schema.prisma           trois modèles, migration additive
```

**`numerotation.ts` mutualise ce que `facture-numero.ts` fait déjà** pour les
factures : même séquence annuelle, même remise à un en janvier, même refus de
poursuivre le compteur d'une autre année. Deux copies d'une règle de numérotation
divergent, et un numéro qui se répète est un incident comptable.

## 5. Tests

Purs et testés sans base :

- **la numérotation** — premier numéro de l'année, suite, changement d'année,
  dernier numéro illisible, et le fait que factures et bons ne partagent pas leur
  compteur ;
- **le statut déduit** — rien reçu, partiel, tout reçu, reçu au-delà du commandé
  (cela arrive : un fournisseur livre treize au lieu de douze), bon vide ;
- **les totaux** — engagé, reçu, restant.

La réception est vérifiée à la main : elle touche trois tables en transaction et le
dépôt n'a pas d'infrastructure de test avec base.

## 6. Le risque, nommé

**Une réception écrit dans le stock et dans le coût.** Une erreur y coûte deux fois :
un stock faux fait vendre ce qu'on n'a pas, et un coût faux fausse toutes les marges
à venir. D'où la transaction unique, la décochabilité de la mise à jour du coût, et
l'interdiction de défaire une réception autrement que par un ajustement tracé.
