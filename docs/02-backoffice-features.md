# 02 — Cartographie des fonctions du back-office et du storefront

Classement de réutilisation :
- **R0** réutilisable sans changement · **R1** réutilisable après adaptation (marque/langue/config) · **P** propre à l'ancien projet (bois/allemand) · **I** incomplet · **X** à remplacer · **N** à créer.

## 1. Authentification & comptes

| Fonction | Emplacement | État | Réutilisation | Adaptation nécessaire | Risque régression |
|---|---|---|---|---|---|
| Connexion/déconnexion client | `src/lib/customerAuth.ts`, `api/account/login\|logout` | OK | R0 | — | faible |
| Inscription client | `api/account/register`, `server/customers.ts` | OK | R1 | civilités `herr/frau` → FR | faible |
| Mot de passe oublié / reset | `api/account/password/*` | OK | R0 | textes e-mail | faible |
| Profil / adresses client | `api/account/profile\|addresses` | OK | R1 | défauts pays `DE`→`FR` | moyen |
| Export / suppression compte (RGPD) | `api/account/export\|delete` | OK | R0 | — | moyen |
| Connexion admin 2FA e-mail | `server/adminOtp.ts`, `api/admin/login*` | OK | R0 | logo e-mail | faible |
| Gestion administrateurs + rôles | `api/admin/users`, `server/admins.ts` | OK | R0 | — | faible |
| Rôles/permissions (superadmin/owner/admin) | `server/admins.ts` | OK partiel | R1 | RBAC ad hoc à durcir | moyen |

## 2. Catalogue

| Fonction | Emplacement | État | Réutil. | Adaptation |
|---|---|---|---|---|
| Univers (Group) | `admin/groups`, `api/admin/groups` | OK | R0 | — |
| Catégories + guide éditorial | `admin/categories`, `api/admin/categories` | OK | R1 | contenu bois → Koss Koss |
| Produits (CRUD, GTIN, MPN, Merchant) | `admin/products`, `api/admin/products`, `server/productInput.ts` | OK | R1 | catalogue réel |
| Variantes (par volume) | modèle `ProductVariant`, `server/variantPricing.ts` | OK | R1 | logique « volume bois » à généraliser (taille/couleur ?) |
| Attributs produit | champs sur `Product` (pas de table Attribute) | partiel | I | pas de système d'attributs génériques |
| Import/export produits (CSV/PDF) | `api/admin/products/import\|export` | OK | R0 | mapping colonnes |
| Prix / prix barré / badge | `Product.priceCents/oldPriceCents/badge` | OK | R0 | — |
| Promotions & remises | via **Campaign** (remise calculée à l'affichage sur période) | OK | R1 | modèle couplé e-mail (voir note) |
| Codes de réduction (coupon classique) | — | absent | N | pas de modèle `Coupon` autonome |
| Stock + mouvements + seuil | `admin/stock`, `server/stock.ts`, `StockMovement` | OK | R1 | motifs allemands `wareneingang…` |
| Entrepôts | — | absent | N | stock scalaire simple par produit |

> Note promotions : il n'existe pas de coupon saisi au panier. Les remises passent par le modèle **Campaign** (période `startsAt/endsAt` + `discountKind` percent/amount/free_shipping). Le prix catalogue n'est jamais réécrit ; la remise est recalculée à l'affichage. Puissant mais **couplé à l'e-mailing** — à découpler si Koss Koss veut de simples coupons.

## 3. Clients & commandes

| Fonction | Emplacement | État | Réutil. | Adaptation |
|---|---|---|---|---|
| Liste clients | `admin/customers` | OK | R0 | — |
| Adresses (facturation/livraison) | modèle `Customer`/`Order` | OK | R1 | défauts `DE` |
| Paniers abandonnés | — | absent | N | panier en localStorage, non persisté serveur |
| Commandes (CRUD, statuts, notes, events) | `admin/orders`, `server/orders.ts` | OK | R1 | statuts allemands `eingegangen…` |
| Numérotation commande | `orders.ts` `MLC-AAAA-NNNNNN` (base 14678) | OK | R1 | préfixe `MLC`→`KOSS` |
| Journal d'événements commande | `OrderEvent` | OK | R0 | — |
| Remboursements | via gateway `refundPayment` (interface) | partiel | I | UI de remboursement à vérifier |
| Paiements (config + historique) | `admin/payments`, `admin/integrations`, `gateways/` | OK | R1 | clés à saisir, Nexi non testé |
| Expéditions / suivi | statut `versandt` + `shippedAt` (pas de transporteur) | partiel | I | pas d'intégration transporteur |
| Retours | texte légal + `MerchantReturnPolicy` (pas de workflow) | partiel | I | rétractation en ligne à construire (cf HANDOVER) |

## 4. Contenu, marketing, SEO

| Fonction | Emplacement | État | Réutil. | Adaptation |
|---|---|---|---|---|
| Avis clients + modération | `admin/reviews`, `api/reviews`, `Review` | OK | R0 | — |
| Campagnes e-mail (wizard, cadence, suivi) | `admin/campaigns`, `server/campaigns*`, cron | OK | R1 | contenus, anti-spam en mémoire |
| Désinscription / suppression liste | `/desinscription`, `EmailSuppression` | OK | R0 | — |
| Pages légales éditables | `admin/pages`, `content/legal`, `LegalContent` | OK | R1 | **tout le texte MLC → Koss Koss** |
| Menus / navigation | `data/categoryNav.ts` + i18n | OK | R1 | structure catalogue |
| Médias (upload Cloudinary) | `api/admin/upload`, `IMAGES.md` | OK | R0 | compte Cloudinary Koss Koss |
| Paramètres SEO produit/catégorie | champs SEO répartis sur modèles + `seo/*JsonLd` | OK partiel | R1 | pas de champs SEO dédiés (title/meta) séparés → à ajouter |
| Snippets / balises (GTM, pixels) | `admin/scripts`, `CodeSnippet` | OK | R0 | — |
| Paramètres généraux boutique | `admin/merchant`, `server/merchant.ts`, `Setting` | OK | R1 | valeurs marque |
| Flux Google Merchant | `feed/google`, `feed/google-csv` | OK | R1 | catalogue réel + GTIN |
| Tableau de bord (stats/graphiques) | `admin/(protected)/page.tsx`, DashboardCharts | OK | R0 | — |
| Notifications commande (e-mail) | `server/emails/order.ts` | OK | R1 | destinataires, marque |
| Rapports | export produits + dashboard (pas de module rapport dédié) | partiel | I | — |

## 5. Synthèse réutilisation

- **Socle transverse R0** (à garder tel quel) : auth admin 2FA + client, sessions, crypto secrets, upload Cloudinary, avis+modération, snippets, dashboard, import/export, désinscription.
- **R1 — adaptation config/langue** : tout le catalogue, commandes, merchant, campagnes, pages légales, feed. L'adaptation est surtout de la **donnée et du texte**, pas de la structure.
- **Manques (N/I)** pour un e-commerce généraliste : coupons autonomes, paniers abandonnés persistés, entrepôts, workflow retours/rétractation en ligne, intégration transporteur, champs SEO dédiés, système d'attributs produit génériques.
