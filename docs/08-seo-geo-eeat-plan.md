# 08 — Plan SEO technique, GEO (moteurs de réponse) et E-E-A-T

## 1. Acquis dans `mlcbois` (à conserver / réutiliser)

- `generateMetadata` par page, titres et descriptions uniques.
- `src/app/sitemap.ts` : sitemap dynamique (accueil, catégories, produits) avec `hreflang` par URL.
- `src/app/robots.ts` : autorise `/`, bloque `/admin`, `/api`, `/panier`, `/commande`, `/confirmation` (+ EN).
- `hreflang` FR/EN via `src/lib/hreflang.ts` ; canonical par page.
- JSON-LD : `OrganizationJsonLd`, `ProductJsonLd` (+ Offer, MerchantReturnPolicy, shippingDetails, AggregateRating, classe énergétique), `BreadcrumbJsonLd`.
- Flux Google Merchant (`/feed/google`, `/feed/google-csv`) aligné sur le balisage produit.
- HTML sémantique, Server Components (contenu principal rendu côté serveur — bon pour crawl et GEO).

## 2. SEO technique — actions Koss Koss

| Action | Détail |
|---|---|
| Métadonnées globales + dynamiques | reprendre `generateMetadata`, réécrire tous les textes pour Koss Koss |
| **Champs SEO dédiés** (nouveau) | ajouter `metaTitle`, `metaDescription`, `canonicalUrl?`, `noindex?`, `ogImage?`, `altText` sur Product/Category/Page — **séparés** des champs commerciaux |
| URL canoniques | une URL canonique par entité, gérée en base pour les cas particuliers |
| robots.txt / indexation | reconduire les `Disallow` transactionnels ; **ne pas indexer** admin, compte, panier, paiement, confirmation, reset mot de passe, prévisualisations, résultats de recherche internes |
| Sitemaps | pages + produits + catégories ; images si pertinent |
| **Filtres & paramètres d'URL** | **éviter l'explosion d'URL indexables** issues des combinaisons de filtres : `noindex`/canonical sur les URL filtrées, ou paramètres non crawlables ; garder de **vraies URL HTML** pour les catégories importantes |
| Pagination / lazy-load | ne pas empêcher les robots de découvrir les produits (liens HTML réels, pagination crawlable) |
| Redirections | reprendre le mécanisme `next.config.ts redirects()` ; **retirer les redirects allemands** hérités |
| 404 / erreurs | pages d'erreur propres, non indexées |
| Fil d'Ariane + maillage interne | Breadcrumb visible + BreadcrumbList ; liens produits ↔ catégories ↔ guides |
| Langue du document | `lang` correct par locale (déjà géré) |
| Contenus dupliqués | descriptions produit uniques ; **pas de génération de centaines de descriptions quasi identiques** |

## 3. Données structurées (JSON-LD) — règles

- Types selon la page : `Organization`, `WebSite`, `WebPage`, `BreadcrumbList`, `CollectionPage`, `Product`, `ProductGroup` (variantes), `Offer`, `AggregateOffer`, `Brand`, `MerchantReturnPolicy`, `OfferShippingDetails`.
- **Interdits** : faux avis, fausses notes, faux stocks/prix/promos, données non visibles, balisage sans rapport.
- Prix, disponibilité, devise, variantes, SKU/GTIN/MPN **issus des données réelles** uniquement.
- Fonction centrale typée pour générer + tester le JSON-LD ; **sérialisation protégée contre l'injection** (échapper `<`, sortie sûre) — à généraliser à partir de `src/components/seo/JsonLd.tsx`.

## 4. SEO produits & catégories

- **Produit** : nom précis, slug stable, description courte + longue, caractéristiques, dimensions/matières/entretien si pertinent, variantes, prix, devise, disponibilité, SKU, marque, catégorie, images + textes alternatifs, infos livraison/retour, titre + méta SEO, canonical, produits liés.
- **Catégorie** : titre clair, introduction utile (`guideIntro/Closing` existent déjà), produits accessibles par liens, filtres, tri, pagination crawlable, contenu éditorial réellement lié (`GuideSection`), FAQ **seulement si vraies questions**, liens sous-catégories, métadonnées uniques.
- **Pas de bourrage de mots-clés.**

## 5. GEO — moteurs de réponse (IA)

- HTML rendu côté serveur pour les informations principales (déjà le cas via Server Components).
- Identité d'entreprise cohérente et stable (nom, adresse, contact vérifiables — voir E-E-A-T).
- Données produit structurées ; descriptions précises ; prix et stock non ambigus.
- Réponses directes aux questions commerciales (livraison, retours, paiement) en **pages claires**.
- Tableaux de caractéristiques en **HTML** quand les données s'y prêtent ; contenus lisibles sans interaction obligatoire.
- Dates de mise à jour quand elles apportent une vraie information ; entités nommées stables ; sources citées dans les guides.
- `llms.txt` : **ajout expérimental** possible, jamais en remplacement du sitemap, des données structurées, du maillage ou du HTML.
- **Aucune garantie** d'apparition dans un moteur d'IA ne sera présentée comme telle.

## 6. E-E-A-T & confiance

Pages/infos à prévoir : à propos, coordonnées, moyen de contact, mentions légales, confidentialité, CGV, livraison, retours, remboursements, paiement sécurisé, service client, identité du vendeur, adresse si elle doit être publique, auteurs/dates des guides, sources des affirmations techniques, avis réels et modérés, garanties. La base existe (`content/legal`, avis modérés, `MerchantReturnPolicy`). **Interdits** : faux profils d'auteurs, fausses certifications, faux témoignages.

## 7. Dette SEO héritée à corriger

- Textes, titres, descriptions **MLC Bois / bois de chauffage** partout → réécriture Koss Koss.
- Redirections d'anciennes URL **allemandes** dans `next.config.ts` → à retirer.
- Vérifier qu'aucun identifiant analytique de l'ancien projet ne subsiste (voir `09`, `20`).
