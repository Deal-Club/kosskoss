# Google Merchant Center — conformité du catalogue

Synthèse de la spécification officielle (`support.google.com/merchants`, consultée en
juillet 2026) et de la façon dont ce projet la met en œuvre.

Sources principales :

- [Product data specification](https://support.google.com/merchants/answer/7052112)
- [About landing page requirements](https://support.google.com/merchants/answer/4752265)
- [Unique product identifiers](https://support.google.com/merchants/answer/6098295)
- [Shipping \[shipping\]](https://support.google.com/merchants/answer/6324484)
- [Price \[price\]](https://support.google.com/merchants/answer/6324371)
- [Certification \[certification\]](https://support.google.com/merchants/answer/13528839)
- [Merchant listing structured data](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)
- [Produktdatenqualität — Ablehnungen beheben](https://support.google.com/merchants/answer/13447092?hl=de)

---

## 1. Où vit la conformité dans le projet

| Fichier | Rôle |
| --- | --- |
| `src/lib/googleTaxonomy.ts` | Correspondance catégories boutique → taxonomie Google (IDs numériques), sans dépendance serveur. |
| `src/server/merchant.ts` | Source unique de vérité : normalisation d'un produit en enregistrement Google + audit de conformité. |
| `src/app/feed/google/route.ts` | Flux XML RSS 2.0 (`xmlns:g`), `application/xml`. |
| `src/app/feed/google-csv/route.ts` | Même flux en TSV, format alternatif accepté. |
| `src/components/seo/ProductJsonLd.tsx` | Balisage `Product` + `Offer`, construit à partir du **même** enregistrement que le flux. |
| `src/components/seo/OrganizationJsonLd.tsx` | Balisage `OnlineStore` + `WebSite`. |
| `src/components/seo/BreadcrumbJsonLd.tsx` | Balisage `BreadcrumbList`. |
| `src/app/admin/(protected)/merchant/page.tsx` | Tableau de bord de conformité, produit par produit. |
| `src/components/admin/MerchantFieldsFieldset.tsx` | Champs GTIN / MPN / condition / catégorie / poids / classe énergie. |
| `scripts/data/product-content.ts` | Contenu rédigé (descriptions, GTIN, MPN…) indexé par slug produit. |
| `scripts/apply-product-content.ts` | Applique ce contenu en base après validation et sauvegarde préalables. |

Le point clé : **le flux XML, le flux TSV et le JSON-LD passent tous par
`buildMerchantRecord()`**. Prix, disponibilité, état et identifiants ne peuvent donc pas
diverger entre le flux et la page — c'est la première cause de refus.

---

## 2. Attributs du flux

### Obligatoires

| Attribut | Format Google | Source dans le projet |
| --- | --- | --- |
| `id` | ≤ 50 caractères, unique | `product.slug` (unique par construction ; le SKU interne ne l'est pas, il est tronqué à 10 caractères) |
| `title` | Texte, ≤ 150 caractères | `brand + name`, identique au H1 de la page |
| `description` | Texte, ≤ 5 000 caractères | `description` → `shortDescription` → texte composé des données réelles |
| `link` | URL absolue sur le domaine vérifié | `NEXT_PUBLIC_SITE_URL` + `/{group}/{category}/{slug}` |
| `image_link` | URL absolue, ≥ 500 × 500 px à partir du 31/01/2027 | `product.image`, à défaut l'image de catégorie |
| `availability` | `in_stock` / `out_of_stock` / `preorder` / `backorder` | `stock > 0` |
| `price` | `349.00 EUR` — point décimal, code ISO 4217, **TVA incluse pour la France** | `priceCents` |

### Identifiants uniques

Google exige **soit une GTIN exacte, soit la combinaison `brand` + `mpn`**.

- `gtin` : jamais généré automatiquement. Une GTIN inventée ne fait pas seulement refuser
  le produit : elle expose à la suspension du compte. Le champ reste vide tant que le
  commerçant n'a pas relevé le code-barres.
- `mpn` : rempli par le script d'enrichissement avec la désignation de modèle contenue
  dans le nom commercial (`iQ500`, `EQ.6 plus s700`, `Caffeo Solo`…). C'est une référence
  fabricant réelle, mais approximative : la page d'administration la signale explicitement
  comme « à remplacer par la référence exacte du typenschild ».
- `identifier_exists` : émis à `no` **uniquement** si ni GTIN ni MPN n'existent. L'audit
  lève alors une erreur : pour de la marque neuve, Google refuse en général cette valeur.

### Recommandés et émis

`brand`, `condition`, `sale_price`, `google_product_category`, `product_type`, `adult`,
`is_bundle`, `product_highlight` (2 à 10 valeurs, issues des `bullets`), `shipping`
(pays / service / prix / délais), `shipping_weight`, `ships_from_country`,
`energy_efficiency_class`, `age_group`, `gender`, `custom_label_0`, `custom_label_1`.

Aucune balise vide n'est jamais écrite : une valeur absente est simplement omise.

### Volontairement absents

| Attribut | Raison |
| --- | --- |
| `item_group_id` | Le catalogue n'a pas de variantes (pas de déclinaisons couleur/taille partageant un parent). |
| `tax` | Réservé aux États-Unis. En France la TVA est incluse dans `price`. |
| `availability_date` | Ne concerne que `preorder` / `backorder`, non utilisés. |
| `certification` | Nécessite la clé EPREL, que le commerçant doit fournir (voir § 5). |
| `additional_image_link` | Aucun visuel secondaire en base aujourd'hui. |

### Prix barré (`sale_price`)

Quand `oldPriceCents > priceCents`, le flux envoie `price = ancien prix` et
`sale_price = prix affiché`. C'est exactement ce que montre le bloc d'achat de la page.

> Attention PAngV § 11 : le prix barré doit être **le prix le plus bas pratiqué sur les
> 30 derniers jours**. Un barré fictif est une pratique commerciale trompeuse en France (art. L121-2 du Code de la consommation), et Google le traite
> comme une « irreführende Information ».

---

## 3. Causes de refus fréquentes et parades

| Refus Merchant Center | Ce que fait le projet |
| --- | --- |
| **Fehlende Informationen** (attribut requis absent) | `auditMerchantProduct()` liste attribut par attribut ce qui manque ; la page `/admin/merchant` affiche les produits bloquants en rouge. |
| **Fehlende eindeutige Produktkennzeichnung** | Erreur bloquante dès que GTIN **et** MPN sont vides. Le script en a dérivé 67 sur 78. |
| **Ungültige GTIN** | Contrôle de longueur (8 / 12 / 13 / 14 chiffres) côté audit **et** dans le champ du back-office. Aucune GTIN n'est générée. |
| **Preis stimmt nicht mit der Landingpage überein** | Le flux et le JSON-LD sont produits par la même fonction que la page consomme. Prix en centimes, un seul arrondi, `formatFeedPrice()`. |
| **Verfügbarkeit stimmt nicht überein** | `availabilityFor(stock)` est la seule règle ; la page dérive « Vorrätig » du même champ `stock`. |
| **Bild ist ein generisches Bild / Platzhalter** | Avertissement dès qu'un produit n'a pas d'image propre et retombe sur l'image de catégorie (78/78 aujourd'hui). |
| **Beschreibung zu kurz / generisch** | Avertissement sous 160 caractères. Le texte de repli est composé des vraies données (marque, catégorie, équipements), jamais de remplissage. |
| **Falsche Google-Produktkategorie** | IDs numériques de la taxonomie officielle 2021-09-21, jamais de chemin texte libre. |
| **Irreführende Informationen** | Aucune donnée n'est inventée : ni GTIN, ni poids, ni classe énergie, ni frais de port sous le seuil de gratuité. Les descriptions ne contiennent aucune mention promotionnelle. |
| **Fehlende Versandkosten** | Bloc `shipping` à 0,00 € au-dessus de 50 € (ce que la boutique annonce) ; en dessous, rien n'est envoyé et l'audit rappelle qu'il faut des règles de livraison au niveau du compte. |
| **Doppelte Angebots-ID** | `auditCatalog()` détecte les `id` en double sur tout le catalogue. |

---

## 4. Exigences côté page produit

Google compare la page à ce que dit le flux. Doivent être visibles, sans pop-up ni
interstitiel :

1. **Le prix**, dans la devise du flux, TVA comprise → bloc d'achat.
2. **La mention TVA et frais de port** (PAngV § 1) → « inkl. MwSt., zzgl. … » sous le prix.
3. **La disponibilité** → « Vorrätig » / état de rupture.
4. **Un bouton d'achat actif** quand le produit est commandable.
5. **Le titre, la description et l'image** correspondant au flux.

État actuel du projet et écarts à corriger :

- ✅ Prix, mention TVA, disponibilité, bouton, titre, description et image sont présents.
- ⚠️ `ProductPurchaseBox` affiche « inkl. MwSt., zzgl. Service & Versandkosten » alors que
  le flux annonce un port gratuit dès 50 € (et que tous les produits dépassent ce seuil).
  Formuler plutôt : « inkl. MwSt., versandkostenfrei ab 50 € ». Sans cela, le contrôle
  automatique de Google peut lever une incohérence flux ↔ page.
- ⚠️ Le bouton « In den Warenkorb » reste actif même à stock 0 alors que le flux annonce
  `out_of_stock`. Le désactiver, ou afficher un état « Ausverkauft » explicite.

---

## 5. Étiquette énergie européenne (EPREL)

Depuis avril 2025, `energy_efficiency_class` **n'est plus accepté que pour la Suisse, la
Norvège et le Royaume-Uni**. Pour l'Union européenne, Google attend l'attribut
`certification` :

```xml
<g:certification>
  <g:certification_authority>EC</g:certification_authority>
  <g:certification_name>EPREL</g:certification_name>
  <g:certification_code>123456</g:certification_code>
</g:certification>
```

Le code est le numéro d'enregistrement issu de l'URL `https://eprel.ec.europa.eu/screen/product/…/123456`.

Catégories concernées ici : lave-linge, lave-vaisselle, fours, climatiseurs, téléviseurs.
L'audit lève un avertissement `certification` pour chacune. Google peut renseigner
l'EPREL automatiquement à partir de la GTIN ou de la MPN — raison de plus pour saisir les
vraies GTIN.

**Le champ EPREL n'existe pas encore en base.** Il faudra soit ajouter une colonne
`eprelCode` au modèle `Product`, soit renseigner la certification directement dans
Merchant Center via un flux supplémentaire.

---

## 6. Balisage structuré

`ProductJsonLd` produit un `Product` complet :

- `name`, `description`, `image`, `sku`, `mpn`, `gtin13` (ou `gtin8` / `gtin12` / `gtin14`
  selon la longueur), `brand`, `category`, `url`.
- `offers` : `price` (prix réellement affiché), `priceCurrency`, `priceValidUntil`,
  `availability`, `itemCondition`, `seller`.
- `priceSpecification` de type `UnitPriceSpecification` avec
  `priceType: StrikethroughPrice` quand un ancien prix existe.
- `shippingDetails` : `OfferShippingDetails` avec tarif, pays et délais
  (`handlingTime` 1 jour, `transitTime` 1-3 jours).
- `hasMerchantReturnPolicy` : 14 jours, `ReturnByMail`, France.
- `aggregateRating` **uniquement s'il existe au moins un avis client validé**. Une note
  éditoriale sans avis n'est jamais publiée : Google interdit les notes agrégées sans avis
  correspondants visibles sur la page.

`returnFees` est volontairement omis : la boutique n'indique pas qui supporte les frais de
retour, et une valeur fausse serait pire qu'une absence.

---

## 7. Application du contenu rédigé

```bash
npx tsx --env-file=.env scripts/apply-product-content.ts
```

Le contenu (descriptions FR/EN, GTIN, MPN, catégorie Google, poids d'expédition, classe
d'efficacité énergétique) est rédigé à l'avance dans `scripts/data/product-content.ts`,
sous forme d'un tableau indexé par `slug` — `slug` est `@unique` dans le schéma Prisma,
contrairement au SKU, tronqué et susceptible d'entrer en collision.

Déroulé du script :

1. **Validation préalable** via `validateProductContent()` (`src/lib/productContent.ts`) :
   longueur des descriptions (400 à 800 caractères), absence de HTML, absence de
   vocabulaire promotionnel ou de résidu allemand, descriptions courtes non vides et
   distinctes des descriptions longues, checksum GTIN valide, GTIN/MPN non dupliqués entre
   entrées. À la moindre anomalie, **rien n'est écrit** : le script journalise la liste des
   anomalies et sort en erreur.
2. **Sauvegarde JSON** de l'intégralité de la table `Product` avant la première écriture,
   dans `.tmp-backup/products-<horodatage>.json` — un retour en arrière reste possible même
   après application.
3. **Application en base** : chaque entrée est reliée à son produit par le slug ; un slug
   absent de la base est journalisé et compté, sans faire échouer les autres mises à jour.
   Les 35 mises à jour sont regroupées dans une transaction Prisma unique : une connexion
   perdue en cours de route annule l'ensemble plutôt que de laisser le catalogue à moitié
   modifié.

Le script termine en erreur (`process.exitCode = 1`) si la validation relève des anomalies
ou si au moins un slug est resté introuvable en base.

---

## 8. Mise en ligne du flux dans Merchant Center

1. **Créer et vérifier le compte** sur `merchants.google.com` : raison sociale, adresse,
   numéro de TVA intracommunautaire.
2. **Revendiquer le domaine** `mlc-bois.fr` (Search Console ou balise HTML).
3. **Renseigner les informations d'entreprise** : Impressum, CGV, politique de retour,
   politique de confidentialité — toutes accessibles depuis le pied de page.
4. **Configurer les règles de livraison** pour la France, en euros. Elles s'appliquent
   aux produits dont le flux ne porte pas de bloc `shipping`.
5. **Configurer la TVA** : en France, la TVA est incluse dans le prix — ne rien ajouter
   au niveau du compte.
6. **Ajouter la source de données** : *Produktdatenquellen → Datenquelle hinzufügen →
   Datei planen*, puis l'une des deux URL :
   - `https://mlc-bois.fr/feed/google` (XML, recommandé)
   - `https://mlc-bois.fr/feed/google-csv` (TSV)
   Fréquence : quotidienne. Pays : France. Langue : français.
7. **Attendre le premier traitement** (jusqu'à 72 h), puis lire l'onglet *Diagnose*.
8. **Vérifier le balisage** avec le [Rich Results Test](https://search.google.com/test/rich-results)
   sur deux ou trois fiches produit.
9. **Ne lancer une campagne Shopping qu'ensuite**, une fois le compteur « Zu korrigieren »
   de `/admin/merchant` à zéro.

---

## 9. Ce qui reste impérativement à la charge du commerçant

Aucune de ces informations ne peut être déduite du code sans mentir à Google.

1. **Les GTIN / EAN.** À relever sur le code-barres de chaque appareil. 78 produits sur 78
   sont concernés. Sans GTIN, la diffusion reste possible via `brand` + `mpn` mais la
   portée est fortement réduite et l'EPREL ne peut pas être complété automatiquement.
2. **Les MPN exacts.** Les 67 valeurs dérivées sont des désignations commerciales, pas des
   références de plaque signalétique. À vérifier chez chaque fabricant. 11 restent vides.
3. **Les images produit.** Les 78 produits partagent l'image de leur catégorie. Google
   considère une image réutilisée comme un placeholder. Il faut une photo par référence,
   sur fond neutre, sans logo ni texte promotionnel, au minimum 500 × 500 px
   (obligatoire au 31 janvier 2027).
4. **Les poids d'expédition.** Nécessaires pour toute règle de livraison au poids.
5. **Les classes d'efficacité énergétique et les numéros EPREL** des lave-linge,
   lave-vaisselle, fours, climatiseurs et téléviseurs. Obligation légale européenne, pas
   seulement une exigence Google.
6. **Les vraies conditions de livraison.** Les constantes `MERCHANT_SHIPPING` de
   `src/server/merchant.ts` reprennent ce qu'annonce la boutique (gratuit dès 50 €,
   1 jour de préparation, 1-3 jours de transport). À confirmer, sinon Google constatera un
   écart entre le flux et la réalité du tunnel de commande.
7. **La politique de retour réelle.** `MERCHANT_RETURN_POLICY` reprend les 30 jours
   affichés dans la barre de confiance. Il faut préciser qui paie le retour et publier une
   page « Droit de rétractation » conforme au droit français.
8. **Le compte, la TVA et l'Impressum.** Numéro de TVA valide, mentions légales complètes,
   coordonnées de contact joignables : Google vérifie manuellement les comptes récents.
9. **La cohérence des prix barrés** avec la règle des 30 jours (PAngV § 11).
10. **Un tunnel de commande fonctionnel.** Aujourd'hui le bouton « In den Warenkorb » ne
    déclenche aucun processus d'achat. Merchant Center refuse les boutiques dont la
    commande ne peut pas aller jusqu'au paiement.

---

## 10. Variables d'environnement

```bash
# Domaine public : conditionne toutes les URL absolues du flux et du JSON-LD
NEXT_PUBLIC_SITE_URL="https://mlc-bois.fr"
```

En local, `.env` pointe sur `http://localhost:3000`. **Le flux mis en ligne doit toujours
sortir avec le domaine de production**, sinon Google refusera des URL hors du domaine
revendiqué.
