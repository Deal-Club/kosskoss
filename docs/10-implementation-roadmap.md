# 10 — Feuille de route d'implémentation (page par page)

Approche : **fork adapté de `mlcbois`** (voir `07`). On ne régénère pas tout d'un coup. Estimations relatives XS < S < M < L < XL. Contrôles après chaque lot : `lint`, `tsc --noEmit`, `test`, `build`.

> Ordre à ajuster à l'inventaire Figma réel (bloqué, voir `05`).

## Lot 0 — Amorçage du projet cible (préalable, hors « refonte »)
- **Objectif** : créer le fork Koss Koss, purger tout secret/identité, brancher une base de dev.
- **Fichiers** : nouveau dépôt Git ; `.env.example` (sans secret) ; `src/config/brand.ts` (nouveau) ; purge des redirects allemands (`next.config.ts`) ; nouveaux secrets générés.
- **Données** : base de dev Koss Koss (Neon/local), migrations **additives**.
- **Tests** : lint/tsc/test/build passent sur base de dev.
- **Critères** : aucune chaîne « MLC/mlc-bois/bois de chauffage » résiduelle non intentionnelle ; aucun secret versionné.
- **Risques** : oublier un secret hérité. **Estimation : M**

## Lot 1 — Fondations design system + layouts globaux
- **Objectif** : tokens graphiques Koss Koss (couleurs, typo, espacements, rayons), primitives UI, en-tête complet + **en-tête minimal transactionnel** (nœud Figma `14:4743`), pied de page, navigation desktop/mobile, états vides/erreur/skeletons, notifications.
- **Pages** : layouts `(shop)` et `(checkout)` ; aucune page métier encore.
- **Données** : `src/config/brand.ts`, `globals.css` (tokens), `src/messages` (libellés).
- **Fichiers probables** : `src/app/globals.css`, `src/app/(shop)/layout.tsx`, `src/app/(checkout)/layout.tsx`, `src/components/Header.tsx`, `Footer.tsx`, `src/components/ui/*`, `src/components/brand/Logo.tsx`.
- **Tests** : accessibilité clavier de la nav, contraste, responsive ; visuels.
- **Critères** : header/footer conformes Figma, navigables clavier, AA.
- **Dépendances** : Lot 0 + tokens Figma (bloqué). **Estimation : L**

## Lot 2 — Accueil
- **Objectif** : page d'accueil Koss Koss (hero, réassurance, mise en avant catégories/produits, blocs éditoriaux).
- **Données** : catégories/produits (Prisma) ; contenu marque.
- **Fichiers** : `src/app/(shop)/[locale]/page.tsx`, composants `home/*` (adaptés depuis `HeroBrennholz`, `TrustStrip`, `SortimentGrid`, etc. — **renommés/dé-thématisés**).
- **États** : chargement, catalogue vide.
- **SEO** : `generateMetadata`, OrganizationJsonLd, WebSite.
- **Tests** : rendu SSR, métadonnées uniques, LCP hero.
- **Critères** : conforme Figma desktop+mobile, JSON-LD valide, pas de contenu MLC.
- **Dépendances** : Lot 1. **Estimation : L**

## Lot 3 — Catalogue : univers → catégorie (grille + filtres + tri + pagination)
- **Objectif** : listing filtrable crawlable.
- **Données** : `Group`, `Category`, `Product`.
- **Fichiers** : `[group]/page.tsx`, `[group]/[category]/page.tsx`, `CategoryFilters`, `CategoryProductBrowser`, `ProductCard`, `ProductGrid`, `Breadcrumb(+JsonLd)`.
- **États** : vide, chargement, filtre sans résultat.
- **SEO** : URL HTML réelles, gestion des filtres pour **éviter l'explosion d'URL** (voir `08`), CollectionPage/BreadcrumbList.
- **Tests** : filtres mobile/clavier, pagination crawlable.
- **Critères** : filtres accessibles, canonicals corrects. **Estimation : XL**

## Lot 4 — Fiche produit
- **Objectif** : détail produit + galerie + variantes + prix + stock + avis + produits liés.
- **Données** : `Product`, `ProductVariant`, `Review`.
- **Fichiers** : `[group]/[category]/[product]/page.tsx`, `ProductGallery`, `ProductPurchaseBox`, `ProductReviewSection`, `ProductJsonLd`.
- **États** : indisponible, variante indisponible, image manquante, sans avis.
- **SEO** : Product/Offer/ProductGroup/AggregateRating **depuis données réelles**.
- **Tests** : sélection variante, ajout panier, indisponibilité.
- **Critères** : prix/stock/variantes réels, JSON-LD conforme au visible. **Estimation : XL**

## Lot 5 — Panier
- **Objectif** : affichage/édition panier, revalidation serveur.
- **Données** : `/api/cart` (revalide prix/stock/promo).
- **Fichiers** : `panier/page.tsx`, `CartView`, `CartDrawer`, `CartProvider`, `AddToCartButton`.
- **États** : vide, ligne indisponible, quantité max, prix modifié.
- **A11y** : annonce des mises à jour (aria-live).
- **Tests** : ajout/modif/suppression, stock insuffisant, double soumission. **Estimation : L**

## Lot 6 — Identification (connexion / inscription / mot de passe)
- **Fichiers** : `compte/connexion|inscription|mot-de-passe-oublie|nouveau-mot-de-passe`, formulaires `account/*`, API `/api/account/*`.
- **Sécurité** : reprise des mécanismes existants (scrypt, sessions).
- **SEO** : `noindex` sur ces pages. **Estimation : M**

## Lot 7 — Commande (tunnel) + Confirmation
- **Objectif** : tunnel conforme droit français, **header minimal** `14:4743`, recalcul serveur, paiement.
- **Données** : `parseCheckoutPayload` → `createOrder` (recalcule tout), gateways.
- **Fichiers** : `(checkout)/commande/page.tsx`, `CheckoutFlow` (**à découper**), `CheckoutSummary`, `confirmation/[orderNumber]`.
- **États** : **échec de paiement**, produit indisponible, session expirée, coupon invalide, double soumission.
- **Sécurité** : aucune clé de paiement au navigateur ; `noindex`.
- **Décision engageante** : choix du prestataire de paiement → **s'arrêter** avant activation (voir `11`, `07`).
- **Tests** : e2e succès + échec paiement. **Estimation : XL**

## Lot 8 — Compte client & historique commandes
- **Fichiers** : `compte/*`, `compte/commandes/[orderNumber]`, export/suppression RGPD.
- **SEO** : `noindex`. **Estimation : M**

## Lot 9 — Recherche + Favoris + Vus récemment
- **Fichiers** : `recherche/`, `favoris/`, `vus-recemment/`. **Estimation : M**

## Lot 10 — Pages éditoriales & légales
- **Objectif** : à propos, contact, livraison, retours, CGV, mentions légales, confidentialité, rétractation, FAQ, moyens de paiement.
- **Données** : `content/legal` (réécrit Koss Koss) + `LegalContent`.
- **E-E-A-T** : identité vérifiable, dates, sources.
- **Décision engageante** : contenu juridique réel → relecture juriste (voir `11`). **Estimation : L**

## Lot 11 — Back-office : adaptation config marque + normalisation statuts
- **Objectif** : dé-thématiser l'admin, migrer les valeurs allemandes (statuts, motifs, civilités, pays, TVA) vers une source de vérité FR.
- **Migrations** : **additives**, non destructives.
- **Tests** : parcours admin création/édition produit. **Estimation : L**

## Lot 12 — SEO/GEO/observabilité transverses
- sitemaps, robots, JSON-LD central testé, redirections nettoyées, plan de mesure analytics (nouveaux identifiants), en-têtes de sécurité/CSP. **Estimation : L**

## Addendum CDC KossKoss Select (voir `13`) — lots supplémentaires / modifiés

Le CDC ajoute des modules absents de `mlcbois`. À intercaler dans la séquence :

| Lot | Objectif | Estimation |
|---|---|---|
| **A — Fondation monétaire FCFA** | retirer la sémantique « centimes », montants FCFA entiers, formatage `fr-CM`, devise `XAF` dans JSON-LD/tracking. Préalable transverse. | M |
| **B — Modèle de données cosmétique** | `Brand` (entité), tags produit, coût d'achat/marge, `Supplier` + `PurchaseOrder/Item`, `Invoice` + avoirs, `PaymentTransaction` + `WebhookEvent`, `CustomerProfile`. Migrations **additives**. | XL |
| **C — Paiement Mobile Money** | adaptateur **CinetPay** (OM/MTN) sur l'interface `PaymentProvider` ; init serveur, redirection, webhook signé + idempotence → « Payée ». Aucune clé au navigateur. | L |
| **D — Diagnostic Beauté** | `DiagnosticQuestion/Answer/Tag`, moteur par tags/score (priorité stock, exclusions), parcours front QCM, admin CRUD FR/EN, tracking (`generate_lead`). **Fonctionnalité pivot.** | XL |
| **E — Checkout minimal + flux WhatsApp** | checkout 4 champs + opt-in ; compte auto opt-in (mot de passe généré) ; page de remerciement avec **bouton `wa.me` pré-rempli** ; statuts commande CDC. | L |
| **F — Approvisionnement & marge (admin)** | fournisseurs, bons de commande, réception→stock, coût d'achat, marge unitaire/globale, alertes seuil. | L |
| **G — Facturation** | `Invoice` PDF (pdf-lib) numérotée, avoirs/remboursements, export CSV ventes (coûts/marges), en-tête personnalisable. | L |
| **H — Tracking paramétrable** | Meta Pixel + **CAPI serveur** (`event_id` dedup), GA4 e-commerce, réglages admin, **bandeau consentement cookies**. | L |
| **I — Migration UI shadcn/ui** | remplacer `@base-ui/react` par shadcn/ui, appliquer la charte (Cinzel/Gilroy, `#0F3B46`/`#F3E8DD`). | L |

> Le CDC exige une **livraison sans phasage** (tout avant mise en ligne) ; ces lots restent l'**ordre de construction interne**, pas une livraison échelonnée au client.

## Premier cycle (à exécuter à l'ouverture de l'implémentation)
Compte tenu du CDC, le premier cycle Figma-indépendant recommandé est :
**Lot 0 dé-thématisation** (identité MLC→KossKoss via `src/config/brand.ts`, retrait des redirects allemands) **+ Lot A (fondation FCFA)** **+ Lot 1 (design system charté + layouts)**, puis la première page (**Accueil**) une fois l'export Figma disponible.
