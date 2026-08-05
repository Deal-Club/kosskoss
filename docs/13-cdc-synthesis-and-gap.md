# 13 — Synthèse du cahier des charges KossKoss Select + analyse d'écart avec `mlcbois`

Sources : `KOSSKOSS SELECT_Synthèse.pdf` (charte) + `CDC_KossKoss_Select v2.2 (13 juillet 2026)`. Ce document **prime** sur les hypothèses des docs 05/06/10/11 antérieurs à sa réception.

## 1. Cadre du projet (faits)

| Élément | Valeur |
|---|---|
| Produit | Concept-store **cosmétique** multimarque, 100 % en ligne |
| Marché | **Cameroun** (national) |
| Langues | **FR + EN** (sélecteur), contenus traduisibles depuis l'admin |
| Devise | **Franc CFA (FCFA / XAF)** — ⚠️ **sans sous-unité** (pas de centimes) |
| Usage | **Mobile-first** |
| Paiement | Agrégateur local **Mobile Money** (Orange Money + MTN) + carte ; reco **CinetPay** (alt. Maviance, ElyonPay) |
| Modèle | Mono-vendeur multimarques |
| Livraison | **Externe** (hors périmètre technique) ; modèle mixte **dashboard + WhatsApp manuel** |
| Livraison du projet | **En une seule fois, sans phasage**, avant mise en ligne |
| Perf cible | **PageSpeed mobile > 80** |

### Charte graphique (charte PDF — appliquée strictement)
- **Couleurs** : Primaire **Bleu Profond `#0F3B46`**, Secondaire **Beige Sable `#F3E8DD`**.
- **Typo** : Titres/logo **Cinzel** ; Texte courant **Gilroy** (⚠️ police **payante** → licence webfont à acquérir **ou** substitut libre proche : Manrope / Sora / Poppins — à trancher avant démarrage).
- **Logo** : monogramme **KK** encadré + logotype `KOSSKOSS SELECT` (versions fond clair `#F3E8DD`/blanc et fond sombre `#0F3B46`/noir).
- **Slogan** : « La Sélection beauté qui vous choisit. » · **Ton** : « Merci, votre peau mérite le meilleur. »
- **Contact** : `+237 658 01 36 46` · réseaux `kosskoss_select` (Facebook/Instagram).
- **DA** : premium, épuré, beaucoup de respiration, photos produit soignées, ergonomie tactile pouce.

## 2. Stack imposée par le CDC vs `mlcbois`

| Domaine | CDC KossKoss | `mlcbois` | Verdict |
|---|---|---|---|
| Framework | Next.js App Router + i18n | Next 16 App Router + next-intl | ✅ identique |
| DB / ORM | PostgreSQL + Prisma | idem (Prisma 7 / PG) | ✅ identique |
| Validation | **Zod + react-hook-form** | validation manuelle | ➕ à introduire (déjà planifié) |
| UI | **TailwindCSS + shadcn/ui** | Tailwind v4 + `@base-ui/react` (2 comp.) | ⚠️ migrer vers shadcn/ui |
| Auth admin | **Auth.js** (OTP e-mail) | OTP e-mail **maison** (fonctionnel) | ⚠️ décision : garder maison vs Auth.js |
| Images | Cloudinary **ou ImageKit** | Cloudinary | ✅ compatible |
| Paiement | **CinetPay** (OM/MTN) | Stripe/Mollie/Square/PayPal/Nexi | 🔁 remplacer les adaptateurs, garder l'interface `PaymentProvider` |
| E-mail | **Resend/Brevo/Postmark** | nodemailer SMTP | ⚠️ décision : SMTP existant vs service transactionnel |
| PDF facture | React-PDF / Puppeteer | **pdf-lib** (déjà en place) | ✅ réutiliser pdf-lib (équivalent) |
| Webhooks fiables | QStash / Inngest (file+idempotence) | vérif signature + idempotence maison | ⚠️ suffisant au départ, file à évaluer |
| Hébergement | **Vercel** + PG managé (Neon/Supabase, Paris) | Hostinger (`server.js`) | ⚠️ décision d'hébergement |
| Suivi erreurs | **Sentry** | absent | ➕ à ajouter |

> Conclusion : le CDC **confirme l'Option A** (fork adapté). L'essentiel de la stack correspond déjà ; les écarts sont ciblés (paiement, UI, tracking, quelques services).

## 3. Analyse d'écart fonctionnelle (CDC ↔ base `mlcbois`)

Légende : ✅ réutilisable · 🔁 à adapter · ➕ à créer.

| Besoin CDC | Base `mlcbois` | Action |
|---|---|---|
| Catalogue produits, fiches, panier, checkout | Product/Category/Cart/Order complets | 🔁 adapter (cosmétique, FCFA) |
| **Marques (multimarque)** comme entité | `Product.brand` = String | ➕ **modèle `Brand`** (logo, description, visibilité, FR/EN) |
| Filtres (catégorie, marque, **type de peau, préoccupation**, prix) + tri | filtres catégorie génériques | 🔁 étendre les facettes (liées aux tags diagnostic) |
| **Diagnostic Beauté** (QCM → moteur par tags & score, admin-géré) | **absent** | ➕ **module entier** : `DiagnosticQuestion/Answer/Tag`, tags produit, `CustomerProfile`, moteur de score, admin CRUD, tracking |
| Checkout **minimal** (nom, e-mail, tél. CM, lieu de livraison, opt-in suivi) | checkout complet facturation/livraison | 🔁 **simplifier** fortement |
| Compte créé **auto sur opt-in** post-paiement, mot de passe généré e-mailé | inscription classique | 🔁 nouveau flux (garder scrypt/sessions) |
| **Paiement Mobile Money** (CinetPay OM/MTN), webhook → « Payée » | interface gateway + webhooks vérifiés | ➕ adaptateur **CinetPay** ; 🔁 statuts |
| **FCFA sans centimes** | montants en **centimes** (`priceCents`) | 🔁 **traiter l'entier comme FCFA entier**, adapter formatage (pas de /100) |
| Statuts commande CDC (En attente de paiement, Payée, En préparation, En acheminement, Livrée, Évaluée, Annulée/Remboursée) | statuts **allemands** | 🔁 remplacer par la liste CDC |
| **Livraison externe** + **WhatsApp manuel** + **bouton WhatsApp pré-rempli** (page merci) | modes standard/express, zones FR | ➕ bouton `wa.me` ; 🔁 retirer modes/zones/pays FR |
| **Évaluation** via **Google Form** (lien admin) envoyé WhatsApp | absent | ➕ réglage lien + bouton |
| **Approvisionnement** : fournisseurs, bons de commande, réception→stock, **coût d'achat & marge** | Stock/StockMovement seuls | ➕ `Supplier`, `PurchaseOrder/Item`, coût d'achat sur Product, marge |
| **Facturation** : `Invoice` PDF, numérotation séquentielle, **avoirs/remboursements**, export CSV ventes (coûts/marges) | PDF pdf-lib, pas de table Invoice | ➕ **modèle `Invoice`** + avoirs + export CSV |
| **Avis vérifiés** (badge, réservé aux acheteurs) + réponse marque | avis + modération | 🔁 ajouter vérification achat + réponse |
| **Tracking Meta Pixel + CAPI** (event_id dedup) + **GA4** e-commerce, admin-configurable, consentement cookies | `CodeSnippet` (HTML libre) | ➕ config structurée + **CAPI serveur** + bandeau consentement |
| Dashboard : Traductions FR/EN dédiées, Paramètres (WhatsApp, Google Form, Pixel/CAPI/GA4, paiement), **rôles Admin/Gestionnaire commandes**, **journal d'activité** | admin riche, rôles superadmin/owner/admin, events | 🔁 ajouter écrans réglages/traductions ; adapter rôles |
| `PaymentTransaction` + `WebhookEvent` (tables dédiées) | état paiement porté par `Order` | ➕ tables dédiées (traçabilité/idempotence) |
| **Consentement cookies** | absent (n'était pas nécessaire pour MLC) | ➕ bandeau conditionnant les tags |
| Option WhatsApp **automatisé** (BSP 360dialog/Wati) | — | ➕ **option** (hors périmètre de base) |

## 4. Réutilisation directe (peu ou pas de changement)
Auth admin OTP (concept), comptes clients + sessions (scrypt), avis+modération, upload Cloudinary, catalogue CRUD, Order/OrderItem (archivage), StockMovement, LegalContent/pages, SEO (sitemap/robots/JSON-LD/hreflang), i18n next-intl FR/EN, dashboard/charts, import/export produits, PDF pdf-lib.

## 5. Points de vigilance spécifiques KossKoss

1. **FCFA sans sous-unité** : revoir toute la chaîne monétaire (`*Cents`) — stockage entier = FCFA entier, formatage `15 000 FCFA` (locale fr-CM), aucune division par 100. JSON-LD/tracking en `XAF`.
2. **Mobile Money** : flux de redirection + webhook signé + idempotence ; « Payée » **jamais** depuis le retour navigateur seul.
3. **WhatsApp manuel** : le site **trace** le processus, ne gère pas le transport ; bouton `wa.me` avec message pré-rempli (n° commande, articles, total, nom, tél, lieu).
4. **Diagnostic** = cœur de conversion : à concevoir proprement (moteur par tags pondérés, priorité au stock, exclusions allergènes).
5. **Marge/coût d'achat** = données sensibles **admin-only**, jamais exposées au front.
6. **Licence Gilroy** : bloquant typographique à trancher.
7. **Meta CAPI** : hachage des données utilisateur côté serveur, `event_id` partagé pour déduplication.
8. **Contenus & légaux** (FR+EN), domaine, visuels : **fournis par KossKoss** (cf CDC §20).
