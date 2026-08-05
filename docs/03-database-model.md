# 03 — Modèle de données (`prisma/schema.prisma`)

Contrainte volontaire du schéma : **ni enum Prisma ni liste scalaire** (portabilité SQL). Les « enums » sont des `String` documentés. Montants **en centimes, TTC**. Traductions EN via champs `*En` (vides = repli FR). 6 migrations appliquées (`0_init` → `20260803213000_code_snippets`).

## 1. Entités présentes vs. attendues (cahier des charges §3.3)

| Attendu | Présent | Modèle réel |
|---|---|---|
| Product | ✅ | `Product` |
| ProductVariant | ✅ | `ProductVariant` (par volume) |
| ProductAttribute | ⚠️ partiel | attributs = champs fixes sur `Product` (pas de table) |
| Category | ✅ | `Category` (+ `GuideSection` éditorial) |
| Collection | ⚠️ | `Group` (univers) joue ce rôle ; pas de « collection » marketing distincte |
| Brand | ⚠️ | `Product.brand` (String), pas de table `Brand` |
| Inventory | ✅ | `Product.stock` + `StockMovement` |
| Customer | ✅ | `Customer` |
| Address | ⚠️ | champs d'adresse inline sur `Customer` et `Order` (pas de table Address) |
| Cart / CartItem | ❌ | panier en **localStorage** côté client + revalidation `/api/cart` (pas persisté) |
| Order / OrderItem | ✅ | `Order`, `OrderItem` |
| Payment | ⚠️ | pas de table `Payment` ; état sur `Order` (`paymentStatus`, `stripePaymentIntentId`, `gatewaySecurityToken`) + `Integration`/`PaymentMethod` |
| Shipment | ⚠️ | pas de table ; `shippingMethodKey/Label`, `status=versandt`, `shippedAt` sur `Order` |
| Coupon | ❌ | absent (remises via `Campaign`) |
| Promotion | ✅ (indirect) | `Campaign` + `CampaignProduct` |
| Review | ✅ | `Review` (workflow pending/approved/rejected) |
| Media | ⚠️ | chemins d'images JSON sur `Product` (`image`, `images`), upload Cloudinary ; pas de table Media |
| Page | ✅ | `LegalContent` (surcharge des fichiers `content/legal`) |
| User/Role/Permission | ⚠️ | `AdminUser.role` (String) ; pas de table Role/Permission |

## 2. Détail des modèles clés

### Catalogue
- **Group** : `slug*`, `label`, `labelEn`, `position`, → `Category[]`.
- **Category** : `groupId`, `slug`, `label(+En)`, `description(+En)`, `image`, `guideIntro/Closing(+En)`, `position`, timestamps ; `@@unique([groupId, slug])`. → `GuideSection[]`, `Product[]`.
- **GuideSection** : contenu éditorial catégorie (`heading/body (+En)`, `position`).
- **Product** : `categoryId`, `brand`, `name(+En)`, `slug*`, `sku`, `shortDescription/description(+En)`, `bullets(+En)` (JSON), attributs Merchant (`gtin?`, `mpn?`, `condition`=new, `googleProductCategory`, `shippingWeightGrams?`, `energyEfficiencyClass?`), `image?`, `images` (JSON), `priceCents`, `oldPriceCents?`, `badge?`, `editorialRating?`, `stock`, `lowStockThreshold`=5, `active`. Index `categoryId`, `brand`. → reviews, stockMovements, orderItems, campaigns, variants.
- **ProductVariant** : `label(+En)`, `sku`, `priceCents`, `oldPriceCents?`, `position`, `active`. Un produit sans variante = prix unique.

### Commandes (archivage légal — libellés figés)
- **Order** : `orderNumber*` (`MLC-AAAA-NNNNNN`), `customerId?` (invité possible), `anonymizedAt?`, `accessToken` (jeton aléatoire de consultation), `locale`, coordonnées + **adresses facturation/livraison inline**, `paymentMethodKey/Label/Fee`, `shippingMethodKey/Label`, `stripePaymentIntentId?`, `gatewaySecurityToken?` (Nexi), **statuts** `status` (`eingegangen\|in_bearbeitung\|versandt\|zugestellt\|storniert`) & `paymentStatus` (`offen\|bezahlt\|erstattet\|fehlgeschlagen`), montants `subtotal/shipping/tax/totalCents`, `taxRatePercent` (défaut **19** ⚠️), `currency`, consentements horodatés (`termsAcceptedAt`, `withdrawalAcknowledgedAt`), `stockRestored`, attribution campagne. Index status, paymentStatus, createdAt, customerId, campaignId.
- **OrderItem** : libellés recopiés (`brand`, `name`, `sku`, `slug`, `image`, `path`, `variantLabel`), `unitPriceCents`, `quantity`, `lineTotalCents`. Relations `product?`/`variant?` en `SetNull`.
- **OrderEvent** : journal (`kind` status/payment/note/email).

### Stock
- **StockMovement** : `delta`, `reason` (`wareneingang\|korrektur\|verkauf\|retoure` ⚠️ allemand), `note?`, `createdBy?`.

### Clients & sécurité
- **Customer** : `email*`, `passwordHash` (scrypt), identité (`salutation` libre `herr/frau/divers` ⚠️), adresses facturation/livraison inline (défaut pays `DE` ⚠️), `locale`, `emailVerified`, `active`, `lastLoginAt`.
- **CustomerPasswordReset** : `tokenHash*` (SHA-256), `expiresAt`, `consumedAt?`.
- **AdminUser** : `email*`, `name`, `passwordHash`, `role`=admin, `active`.
- **AdminLoginChallenge** : 2FA — `adminUserId*` (un défi vivant à la fois), `codeHash` (scrypt), `attempts`, `expiresAt`, `sentAt`.
- **Setting** : `key`/`value` (config runtime, ex. `payment_gateway`).
- **Integration** : `key*`, `label`, `secretCipher?` (AES-256-GCM), `lastFour?`, `enabled`.
- **PaymentMethod** : `key*`, `label`, `icon` (lucide), `feeLabel` (défaut `kostenlos` ⚠️), `enabled`, `position`.

### Contenu & marketing
- **CodeSnippet** : `placement` (head/bodyStart/bodyEnd), `content` (HTML brut injecté — **risque XSS maîtrisé par restriction admin**), `enabled`, `position`, `updatedBy`.
- **LegalContent** : `@@id([slug, locale])`, `data` (page sérialisée JSON), surcharge les fichiers `content/legal`.
- **Campaign** : `code*`, `type`, `status`, contenus (+En), `discountKind`/`discountValue`, `startsAt/endsAt` (période de remise), `landingSlug`, cadence d'envoi randomisée (`batchMin/Max`, `delayMin/MaxSec`), verrous (`nextBatchAt`, `dispatchingAt`). → products, recipients, events, orders.
- **CampaignProduct** : `basePriceCents` (prix figé barré).
- **CampaignRecipient** : file d'attente + suivi (`token*`, `status`, `openedAt`, `firstClickedAt`, `clickCount`, `unsubscribedAt`, `attributedCents`). `@@unique([campaignId, email])`.
- **EmailSuppression** : liste de blocage globale (`email` @id).
- **CampaignEvent** : journal horodaté (`kind` envoi/ouverture/clic/commande/desinscription/echec).

## 3. Champs SEO / traduisibles / traçabilité

- **SEO** : pas de champs `metaTitle`/`metaDescription`/`canonical` dédiés. Le SEO est dérivé (name, description) + JSON-LD calculé. **Recommandation Koss Koss** : ajouter des champs SEO explicites séparés du commercial (voir `08`).
- **Traduisibles** : partout via `*En` (repli FR). Simple mais figé à 2 langues.
- **Traçabilité** : `createdAt/updatedAt`, `createdBy`/`updatedBy`, `moderatedBy`, `OrderEvent`, `CampaignEvent`, `anonymizedAt`.

## 4. Points d'attention pour Koss Koss

1. **Valeurs par défaut allemandes** codées dans le schéma : `billingCountry/shippingCountry "DE"`, `status "eingegangen"`, `paymentStatus "offen"`, `shippingMethodLabel "Standardversand"`, `taxRatePercent 19`, `feeLabel "kostenlos"`. → à basculer FR (migration additive, **non destructive**).
2. **Adresses inline** (pas de table Address) : correct pour l'archivage commande, limitant pour un carnet d'adresses multiple.
3. **Panier non persisté** en base : pas de « paniers abandonnés » ni de reprise cross-device.
4. **Brand en String** : pas de page marque ni de facettes marque robustes.
5. **Attributs produits fixes** : ajouter des variantes multi-axes (taille×couleur) demandera un vrai système d'attributs.
