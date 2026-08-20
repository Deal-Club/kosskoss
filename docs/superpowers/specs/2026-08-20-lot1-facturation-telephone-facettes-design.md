# Lot 1 — Facturation, téléphone camerounais, facettes catalogue

*Conception validée le 20 août 2026. Couvre les critères d'acceptation 01, 02, 03 et 04
de l'annexe 3.*

## Pourquoi ce lot d'abord

Les sections A à D de l'annexe 3 conditionnent le deuxième versement (art. 4.2). La
section A est la plus proche d'être close : sur ses six critères, deux sont déjà
conformes et les quatre autres tiennent en trois chantiers.

## Ce que l'audit a réellement trouvé

Trois constats ont été corrigés en cours de conception, tous dans le même sens — le
manque était surestimé :

- La case **« Je veux suivre ma commande »** et sa bulle d'aide **existent** et
  fonctionnent (`checkout-form.tsx:447-467`). Le drapeau `followOrder` circule jusqu'au
  serveur, qui crée le compte et envoie les identifiants.
- L'**e-mail d'accès est bien conditionné à cette case** (`kk/checkout.ts:148`, `:248`).
  La seconde moitié du critère 04 est donc satisfaite.
- Les **facettes type de peau et préoccupation sont bien absentes**. Les facettes réelles
  sont marque, prix, note minimale et disponibilité (`CategoryProductBrowser.tsx:124-136`).

Reste donc : la facture, le format du téléphone, les deux facettes.

---

## 1. Facturation

### Décisions

**Deux e-mails distincts.** L'accusé de réception part à la commande, sans facture. La
facture part à l'encaissement, dans un e-mail « paiement reçu ». Aucune facture n'est
jamais émise pour une commande impayée — ce qui serait le cas si on la joignait à
l'accusé de réception, puisque le client peut abandonner sur la page de paiement.

**Une entité `Invoice` avec sa propre séquence.** Si la facture n'est émise qu'au
paiement, réutiliser le numéro de commande produirait une séquence trouée : chaque panier
abandonné consommerait un numéro. Une séquence propre reste continue, et donne aux avoirs
prévus au CDC (§ D23) quelque chose sur quoi s'accrocher.

### Point d'accroche : `updatePaymentStatus`

L'émission s'accroche dans `updatePaymentStatus` (`server/orders.ts:761`), et nulle part
ailleurs. C'est le passage obligé de toute bascule de paiement, quel qu'en soit
l'initiateur :

| Appelant | Cas couvert |
|---|---|
| `kk/paiement.ts:195` | webhook GeniusPay — paiement en ligne |
| `api/admin/orders/[id]/route.ts:70` | back-office — **paiement à la livraison** |
| `api/payments/webhook/[provider]/route.ts:104` | ancien webhook, conservé |

Le paiement à la livraison ne déclenche jamais de webhook : sans ce point d'accroche
unique, il aurait fallu un second chemin d'émission, donc un second endroit où oublier
un cas.

**L'idempotence est acquise sans effort.** La fonction sort déjà tôt lorsque le statut ne
change pas :

```ts
if (current.paymentStatus === paymentStatus) return getOrder(id);
```

Un webhook rejoué, ou un administrateur qui reclique, n'atteint donc jamais le code
d'émission. La contrainte `@unique` sur `orderId` est la ceinture qui va avec cette
bretelle.

### Modèle

```prisma
model Invoice {
  id         String   @id @default(cuid())
  number     String   @unique          // FAC-2026-000001
  orderId    String   @unique          // une facture par commande, jamais deux
  order      Order    @relation(fields: [orderId], references: [id])
  issuedAt   DateTime @default(now())
  totalCents Int                       // FCFA entiers, comme partout ailleurs
  currency   String   @default("XAF")
  createdAt  DateTime @default(now())

  @@index([issuedAt])
}
```

`totalCents` est recopié plutôt que lu sur la commande : le montant facturé ne doit pas
suivre une correction ultérieure de la commande.

**Ce que le modèle ne stocke pas, et pourquoi.** Pas de copie complète de la commande. La
commande archive déjà les libellés produits, le prix unitaire et le moyen de paiement tels
que le client les a validés (voir le commentaire du modèle `Order`). Le PDF est donc
reconstructible. La limite assumée : si un administrateur corrige l'adresse de livraison
après coup, un PDF réémis différera de celui qui a été envoyé. Si le comptable l'exige, on
ajoutera un instantané JSON — c'est une migration additive, sans reprise de données.

### Numérotation

`FAC-AAAA-NNNNNN`, séquentiel par année civile, sur le modèle exact de `nextOrderNumber`
(`server/orders.ts:335`) : lecture du dernier numéro de l'année, incrément, et **reprise de
l'appelant en cas de collision**, l'unicité réelle étant garantie par la contrainte en
base. Deux paiements simultanés ne peuvent donc pas partager un numéro.

Le préfixe des commandes est `KK-AAAA-NNNNNN` ; `FAC-` s'en distingue à l'œil, ce qui
évite de confondre un numéro de facture et un numéro de commande dans un échange avec le
service client.

### Correction préalable du générateur PDF

`server/invoice.ts` est du legacy mlcbois et **ne peut pas être branché en l'état** :

- `euros()` (`:87`) divise par 100 et imprime « € ». Une commande de 31 000 F
  s'imprimerait « 310,00 € ». Six appels à reprendre, vers `formatFcfa`
  (`@/lib/kk/format`), déjà utilisé par les e-mails.
- Le paramètre `bank?: BankTransferSettings` (`:331`) sert le virement bancaire, qui n'est
  pas un moyen de paiement de cette boutique. À retirer.
- Le numéro imprimé devient celui de la facture, plus celui de la commande. La commande
  reste mentionnée séparément, pour le rapprochement.

### E-mail « paiement reçu »

Nouvelle fonction dans `server/kk/emails.ts`, sur le patron des deux existantes.
`sendMail` accepte déjà les pièces jointes (`lib/mailer.ts:37`), au format
`{ filename, content: Buffer, contentType }`.

Envoi **best-effort**, comme les e-mails existants : une panne SMTP ne doit pas faire
échouer un webhook, ce qui provoquerait une relance chez le prestataire et une facture
émise deux fois. La facture est en base, donc réémettable depuis le back-office.

L'accusé de réception actuel garde son texte — sauf la phrase « Le paiement Mobile Money
et la livraison sont ensuite coordonnés avec vous via WhatsApp », devenue fausse depuis
que le paiement en ligne fonctionne.

---

## 2. Téléphone camerounais

La validation actuelle exige « au moins huit chiffres » (`checkout-form.tsx:79-82`). Le
choix était assumé et commenté ; le critère 02 demande le format camerounais.

**Normalisation** dans un module partagé et testable — `src/lib/kk/telephone.ts` — appelé
à deux endroits : le formulaire (`checkout-form.tsx`, pour le retour immédiat au visiteur)
et `createKossOrder` (`server/kk/checkout.ts`, avant écriture). La validation client seule
ne protège de rien : la route `/api/kk/checkout` accepte n'importe quel corps JSON.

C'est `createKossOrder` qui écrit la forme normalisée sur la commande, pour que le numéro
stocké soit toujours en `+237XXXXXXXXX`, quelle que soit la saisie.

1. Retrait des espaces, points, tirets, parenthèses.
2. Indicatif accepté sous toutes ses formes : `+237`, `00237`, `237`, ou absent.
3. Exigence : **neuf chiffres**, commençant par `6` (mobile) ou `2` (fixe).
4. Stockage en `+237XXXXXXXXX`.

Le fixe est accepté : le numéro sert le contact de livraison, et rien n'oblige le client à
donner le téléphone qui portera le paiement — celui-ci est saisi chez le prestataire, pas
chez nous.

Message d'erreur nommant le format attendu, pas un « numéro invalide » qui laisse le
client deviner.

---

## 3. Facettes type de peau et préoccupation

Les tags produits sont aujourd'hui du texte libre (`Product.tags`, JSON de clés), sans
vocabulaire déclaré : rien ne dit quelles clés existent, ni comment les afficher.

### Modèle

```prisma
model ProductTag {
  key      String  @id                 // peau_grasse, hydratation…
  labelFr  String
  labelEn  String  @default("")
  family   String                      // "peau" | "preoccupation"
  position Int     @default(0)
  active   Boolean @default(true)
}
```

La clé est l'identifiant : c'est elle qui est déjà écrite dans `Product.tags` et dans les
réponses du diagnostic. Prendre un `cuid` séparé obligerait à une reprise de données sans
rien apporter.

Les libellés FR et EN règlent d'emblée le critère 10 pour ces facettes, au lieu d'afficher
« peau_grasse » à l'écran.

### Conséquences

- Un écran d'admin pour tenir le vocabulaire — même patron que les autres écrans de
  taxonomie du back-office.
- Deux groupes de cases dans `CategoryFilters.tsx`, à côté de marque et prix.
- Le filtrage se fait **côté client**, là où marque, prix, note et disponibilité se font
  déjà (`CategoryProductBrowser.tsx`). Aucune requête à modifier.
- Le diagnostic et le catalogue partagent enfin le même vocabulaire.

---

## Tests

Le projet compte 370 tests au vert ; ils doivent le rester.

| Objet | Ce qui est vérifié |
|---|---|
| Allocation de numéro | séquence par année ; collision simultanée → reprise, jamais de doublon |
| Émission | une bascule vers `payee` produit une facture et une seule |
| Idempotence | seconde bascule vers `payee` → aucune facture supplémentaire |
| Paiement à la livraison | bascule depuis le back-office → facture émise |
| Montants | le PDF imprime des FCFA, jamais d'euros ni de division par 100 |
| Téléphone | indicatifs acceptés, 9 chiffres exigés, préfixes 6 et 2, normalisation E.164 |
| Facettes | filtrage par famille, combinaison avec les facettes existantes |

---

## Hors périmètre

- **Avoirs** — prévus au CDC (§ D23), traités au lot 3. Le modèle `Invoice` leur laisse la
  place.
- **Réémission depuis le back-office** — la facture est en base et reconstructible ;
  l'écran viendra avec le lot 3.
- **Instantané de commande sur la facture** — voir la limite assumée plus haut.

## Point ouvert, à trancher hors de ce lot

`server/invoice.ts` invoque l'**article 242 nonies A du code général des impôts français**
pour justifier sa numérotation. La référence est sans objet au Cameroun. Les mentions
obligatoires, la durée de conservation et les règles de séquence relèvent du droit
camerounais, que cette conception ne prétend pas connaître.

La séquence continue retenue est le dénominateur commun de toutes les réglementations
connues. **À faire valider par le comptable avant la mise en ligne**, en même temps que le
taux de TVA et le choix XOF/XAF déjà en attente.
