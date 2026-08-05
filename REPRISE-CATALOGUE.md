# Reprise de l'export catalogue

Brief complet pour poursuivre le remplissage du catalogue dans une nouvelle session.
**À lire en entier avant de reprendre.**

---

## 1. Règles imposées par le client

Elles s'appliquent à **toutes** les catégories, sans exception :

- **Prix minimum 160 €** — tout produit en dessous est écarté.
- **20 à 30 produits par catégorie**, sauf smartphones : **50**.
- Sélection = les produits qui ont **le plus d'avis** (avec une note correcte, seuil retenu : ≥ 3,8/5).
- **Jamais deux produits avec la même image mise en avant.** Écarter aussi les
  déclinaisons de couleur d'un même modèle, qui donnent un catalogue répétitif.
- Contenus (titre, description courte, description longue, puces) **entièrement
  réécrits en allemand** à partir des caractéristiques relevées — aucune phrase recopiée.
- **GTIN obligatoire** : il alimente le flux Google Merchant.

---

## 2. État actuel

**90 produits en base**, visuels sur Cloudinary, GTIN 90/90 :

| Catégorie | Produits | Visuels | Source utilisée |
| --- | --- | --- | --- |
| Waschmaschinen | 20 | 101 | MediaMarkt (avant blocage) + sites constructeurs |
| Kaffeemaschinen | 20 | 20 | Otto.de |
| Smartphones | 50 | 50 | Expert.de, via son API de recherche |

Flux Merchant vérifié : `/feed/google` sort 90 items, 90 GTIN, 171 images CDN,
aucune balise vide. Build à 306 pages.

**10 catégories restantes**, dont 8 avec une source fournie par le client
(ci-dessous) plus « Geschirrspüler » et une éventuelle seconde catégorie multimédia.

### Expert.de se moissonne par son API, pas par son HTML

Point le plus utile de cette session. La liste est rendue côté client : un
`fetch` de la page ne renvoie **aucune** carte produit. Mais la page interroge
une API de recherche qui donne tout, en JSON, sans clé secrète :

```
POST https://production.brntgs.expert.de/api/search/
en-tête   : fmarktheader: e_13068215
corps     : [{"indexName":"expert_article_search",
              "params":{"filters":"(categories:e_184)","hitsPerPage":100,"page":0,"query":""}}]
```

`e_184` est la catégorie Smartphones ; elle se lit dans `categoriesByDistance`
de n'importe quel article, ou dans l'onglet réseau en changeant de rayon.
801 articles récupérés en 9 requêtes.

Où lire quoi dans un article :

| Donnée | Chemin |
| --- | --- |
| GTIN | `articleView.articleProperties.internationalArticleNumber` |
| Référence fabricant | `articleView.articleProperties.manufacturerPartNumber` |
| Prix | `storeData.e_13068215.pubData.price.gross` (en euros) |
| Stock | `storeData.e_13068215.pubData.stock` |
| Visuel | `primaryImageData.originalData` |
| Caractéristiques | `articleView.articleProperties.classification.values["@arrayMap"]`, chaque entrée porte `description` (titre allemand) et `value` |

**Les avis ne sont pas dans cette API** : ils viennent de Bazaarvoice, à
interroger séparément avec les `objectID`, 50 par requête :

```
https://apps.bazaarvoice.com/api/data/statistics.json?apiversion=5.4
  &passkey=cazY6xZ6ChBbSNhr0T2xkfBG1IVd3BClVVY0hZOwDPCB0
  &stats=Reviews&filter=ContentLocale:de_DE,en*,de_AT,de_CH,de_DE,de_US,de_GB
  &filter=ProductId:e_949447,e_942488,…
```

Une seule image par article dans l'index — la galerie n'est accessible que sur
la fiche, et aucune API de détail n'est exposée (`/api/neo/article/<id>` → 404).
Le lot smartphones s'est donc fait avec la seule image principale, comme le lot
Kaffeemaschinen.

### Scripts du lot smartphones, réutilisables tels quels

Dans `.tmp-cat/smartphones/` :

- `selectionner.mjs` — applique les règles du client (≥ 160 €, note ≥ 3,8,
  classement par avis) et surtout **le dédoublonnage par modèle** : la clé est
  `fabricant|Modell`, sans la couleur ni la capacité, sinon le Galaxy S25
  revient six fois en Icyblue, Navy, Mint… Garde-fou final sur l'unicité de
  l'image. 235 éligibles → 52 modèles → 50 retenus.
- `rediger.mjs` — compose les fiches allemandes à partir des seules
  caractéristiques, avec plusieurs tournures par paragraphe choisies selon
  l'index du produit, pour que cinquante fiches ne se lisent pas pareil.
  Trois pièges déjà corrigés dedans : le champ `Modell` répète parfois la
  marque (« Motorola Motorola moto g75 »), la note Bazaarvoice arrive non
  arrondie (`4.7693`), et une phrase qui suit un point doit être capitalisée.
- `telecharger-images.mjs` — le CDN exige un `user-agent` de navigateur et un
  `referer`, sinon il renvoie une page d'erreur ; tout fichier de moins de
  3 000 octets est donc rejeté comme suspect.

---

## 3. Sources fournies par le client, et leur état réel

| Catégorie | Lien demandé | État vérifié |
| --- | --- | --- |
| Aspirateurs | `https://www.mediamarkt.de/de/category/staubsauger-reiniger-87.html` | **Bloqué** (Akamai 403) |
| Fours / cuisinières | `https://www.mediamarkt.de/de/category/herde-1201.html` | **Bloqué** (Akamai 403) |
| Robots de cuisine | `https://www.saturn.de/de/category/k%C3%BCchenmaschinen-1239.html` | **Bloqué** (Akamai 403) |
| Climatiseurs | `https://www.expert.de/shop/unsere-produkte/haushalt-kuche/wohnklima/klimagerate` | OK |
| Smartphones | `https://www.expert.de/shop/unsere-produkte/telekom-navigation/handys-smartphones/smartphones` | OK, excellent (jusqu'à 14 041 avis) |
| Jeux vidéo | `https://www.alternate.de/Gaming` | OK mais **peu d'avis** |
| Téléviseurs | `https://www.alternate.de/Alle-Fernseher` | OK mais **peu d'avis** (30 notés sur 274) |
| Ordinateurs | `https://www.expert.de/uelzen/Themen/PC_Notebooks_Monitore` | OK |
| Montres connectées | `https://www.alternate.de/Apple/Apple-Watch?listing=1&page=1` | OK mais **très peu d'avis** |
| Drones | `https://www.conrad.de/de/c/drohnen-copter-4744907.html` | OK mais **13 produits seulement** |

**Arbitrage validé par le client : « mélange par catégorie »** — partir de sa source,
et compléter avec Otto quand elle ne permet pas d'atteindre 20-30 produits ≥ 160 €
correctement notés.

Équivalents Otto (volumes d'avis constatés) :

- Aspirateurs : `https://www.otto.de/haushalt/staubsauger/` — 5374, 3685, 1999…
- Fours : `https://www.otto.de/haushalt/backoefen/` — 890, 686, 628…
- Téléviseurs : `https://www.otto.de/technik/fernseher/` — 426, 339, 281…
- Lave-vaisselle : `https://www.otto.de/haushalt/geschirrspueler/`
- Ordinateurs : `https://www.otto.de/technik/computer/`

Réessayer MediaMarkt / Saturn après quelques heures : le blocage se lève en général
sous 24 h. Le CDN d'images `assets.mmsrg.com` reste accessible même quand le site
est bloqué.

---

## 4. Pièges déjà rencontrés — ne pas les refaire

**MediaMarkt / Saturn (Akamai).** Le challenge se résout tout seul si on charge la
page **une fois** et qu'on la laisse tranquille ~1 min ; recharger en boucle le
réinitialise et finit par bannir l'IP pour plusieurs heures. Espacer les requêtes
d'au moins 600 ms. Données produit dans `window.__PRELOADED_STATE__.apolloState`,
avec `CofrCoreFeature.reviewStatistics` (note + nombre d'avis) et `ean` (= GTIN).
Ce state est du **JS**, pas du JSON : il contient `undefined`, à remplacer par `null`
avant `JSON.parse`, et il faut l'extraire par appariement d'accolades.

**Otto.de.** Liste en scroll infini : cliquer « Mehr anzeigen » puis **re-parcourir
la page lentement de haut en bas**, sinon les tuiles chargées restent vides
(prix, note et image en chargement paresseux). Carte produit = `[data-qa="reptile-product-tile"]`.
La note n'est qu'en étoiles graphiques sur la liste — la récupérer sur la fiche via
le JSON-LD `Product` (`aggregateRating`, `gtin13`). Les visuels des fiches sont dans
des `<source srcset>`, pas dans `<img src>` ; filtrer sur les identifiants en UUID,
sinon on récupère des bannières promo.

**Expert.de.** Carte produit = `a.article-list-item`. Prix écrit **`359.-` sans
symbole €** (et `1.099.-` avec point de milliers). Prendre le montant qui précède
`inkl. MwSt.` : les autres montants sont des bonus de reprise ou des mensualités.
Ignorer les lignes « Trade-In », « Bonus » comme titres. Pagination `?page=N`.
Les nombres entre parenthèses de la colonne de gauche sont des **compteurs de
filtres par marque**, pas des avis.

**Alternate.de.** Carte produit = `[class*="productBox"]`, 24 par page, pagination
`?page=N`.

---

## 5. Outils déjà en place

- **`scripts/importer-catalogue.ts`** — import complet d'un lot : envoi des visuels
  sur Cloudinary (repli automatique sur `public/images/produkte/` si la clé est
  refusée), création ou mise à jour des produits, GTIN et catégorie Google.
  Idempotent, se cale sur le slug.
  Lancement : `npx tsx --env-file=.env.local scripts/importer-catalogue.ts <lot>`
  Ajouter le lot voulu dans la constante `LOTS` (slug de catégorie + identifiant
  de taxonomie Google + dossier de travail).

- Attend un `produits-finaux.json` dans le dossier du lot, avec par produit :
  `brand, name, slug, sku, shortDescription, description, bullets[], gtin, mpn,
  energyEfficiencyClass, priceCents, oldPriceCents, badge, editorialRating, stock,
  shippingWeightGrams, images[]`.
  Et un `images-manifeste.json` (`{ slug: [nomFichier, …] }`) avec les visuels
  téléchargés dans `<dossier>/images/`.

- Dossiers de travail : `.tmp-scrape/` (lave-linge), `.tmp-kaffee/` (café),
  `.tmp-cat/` (catégories en cours). `.tmp-cat/tv/alternate-tv-274.json` contient
  déjà 274 téléviseurs Alternate collectés.

- Identifiants Cloudinary : dans `.env.local`, fonctionnels.
  Dossier cible : `hausgeraete-pfeffer/products`.

---

## 6. Où reprendre

Smartphones : **fait** (50 fiches, session du 28 juillet 2026).

Priorité suivante : aspirateurs et fours via Otto (gros volumes d'avis), puis
le reste. Pour tout ce qui est électronique — téléviseurs, ordinateurs,
montres, jeux vidéo, drones — regarder d'abord si expert.de couvre le rayon :
son API rend la collecte bien plus rapide et fiable qu'Otto ou Alternate, et
elle fournit le GTIN pour 100 % des articles. Il suffit d'y relever
l'identifiant de catégorie.

Rappel : le champ `shortDescription` est limité à 200 caractères, la galerie à
8 images, et les descriptions doivent être **en allemand** — une première rédaction
avait été faite en français par erreur et a dû être reprise.
