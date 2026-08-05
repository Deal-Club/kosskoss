# 01 — Architecture existante de `mlcbois`

## 1. Vue d'ensemble

**Une seule application Next.js 16 (App Router)** hébergeant à la fois la vitrine, l'espace client, le back-office `/admin` et l'API. Pas de monorepo, pas d'API externe : la logique métier vit dans `src/server`, exposée aux composants via Server Components et Route Handlers.

```
Navigateur
   │
   ├─ Server Components  (src/app/[locale]/**)      → lisent src/server/* directement (Prisma)
   ├─ Client Components  (interactions : panier, checkout, forms) → fetch() vers src/app/api/**
   │
Route Handlers (src/app/api/**) ── requireAdminApi / getCurrentCustomer ──┐
Server layer (src/server/**)  ── règles métier (prix, stock, commandes) ──┤
lib (src/lib/**)              ── crypto, sessions, cart math, slug, seo ───┤
                                                                          ▼
                                                            Prisma 7 → PostgreSQL (Neon)
Externes : Cloudinary (images), SMTP (nodemailer), Stripe/Mollie/Square/PayPal/Nexi (webhooks)
```

## 2. Couches identifiées

| Couche | Emplacement | Rôle |
|---|---|---|
| Présentation | `src/app/**`, `src/components/**` | Pages (Server Components dominants), UI |
| Application/API | `src/app/api/**/route.ts` | Points d'entrée HTTP, validation, orchestration |
| Domaine | `src/server/**` | Règles métier : `orders.ts`, `customers.ts`, `admins.ts`, `merchant.ts`, `stock.ts`, `campaigns`, `gateways/` |
| Infrastructure | `src/lib/**`, Prisma, `src/server/gateways/**`, `src/lib/mailer.ts` | Crypto, sessions, e-mail, paiement, prisma client |

La séparation présentation/domaine est **globalement respectée** : les Server Components appellent `src/server/*`, la logique sensible (recalcul des totaux) est côté serveur. Points faibles : validation dispersée (pas de schéma unique), quelques composants très volumineux (voir `09`).

## 3. Rendu

- **Server Components par défaut** : quasiment tout le storefront et **tout le back-office** sont des Server Components. Un seul `"use client"` de page détecté (`src/app/admin/login/page.tsx`, gestion de l'état OTP). Les interactions (panier, checkout, formulaires) sont isolées dans des composants client dédiés (`CartProvider`, `CheckoutFlow`, formulaires de compte).
- `generateMetadata` par page, `setRequestLocale` pour next-intl.
- `next.config.ts` limite les workers de build à 4 (`experimental.cpus`) et impose `staticGenerationMinPagesPerWorker: 40` — contournement d'un problème de connexions Prisma/Neon en build sur hébergement mutualisé. **À conserver.**

## 4. Authentification & sessions

Deux systèmes **volontairement séparés** (secrets distincts, un cookie client ne peut jamais passer pour admin) :

- **Admin** (`src/lib/adminAuth.ts`, `src/server/admins.ts`, `src/server/adminOtp.ts`) :
  mot de passe scrypt → **2FA code 6 chiffres par e-mail** (table `AdminLoginChallenge`, TTL 10 min, 5 tentatives, cooldown 60 s) → session HMAC-SHA256 (`ADMIN_SESSION_SECRET`), cookie `admin_session` httpOnly 8 h. Rôles : `superadmin` (masqué), `owner`, `admin`. Blocage 15 min après 5 échecs. Le dernier admin actif ne peut être ni désactivé ni supprimé.
- **Client** (`src/lib/customerAuth.ts`, `src/server/customers.ts`) :
  scrypt, session HMAC-SHA256 (`CUSTOMER_SESSION_SECRET`), cookie `customer_session` 14 j. **Compte facultatif** (commande invité possible — exigence RGPD/droit français). Pas de révélation d'existence de compte. Réinitialisation mot de passe : seul le SHA-256 du jeton est stocké.

Gardes : `requireAdminApi()` (toutes les routes `/api/admin/*`), `getCurrentCustomer()` (routes client). Cookies `httpOnly`, `secure` en prod, `sameSite: lax`. **Pas de jeton CSRF explicite** (reliance sur SameSite).

## 5. Middleware → `src/proxy.ts` (Next 16 !)

**Correction d'audit** : il n'y a pas de `src/middleware.ts`, mais **Next 16 a renommé la convention `middleware.ts` en `proxy.ts`**. Le fichier `src/proxy.ts` existe bien et fait tourner : (a) le **routage multilingue** next-intl (`createMiddleware(routing)`), (b) le **mode maintenance** (503). Son `matcher` couvre tout sauf `_next`, `_vercel` et les chemins avec extension ; une fonction `horsRoutageMultilingue()` exclut `/api`, `/admin`, `/feed`, `/c/`, `/p/`, `/desinscription/`, `sitemap.xml`, `robots.txt`.

⚠️ **Conséquence pratique** (rencontrée en Lot 1) : toute nouvelle route hors `[locale]` (ex. `/preview`) est sinon réécrite en `/fr/...` par next-intl et renvoie 404 — il faut l'ajouter à `horsRoutageMultilingue()`. Les vraies pages boutique vivront **sous `[locale]`** et ne sont pas concernées.

## 6. i18n

next-intl, locales `["fr", "en"]`, `defaultLocale: "fr"`, **pas de détection auto** de la langue du navigateur (choix explicite). FR à la racine, EN sous `/en`. Repli systématique : les champs `*En` vides retombent sur le français (voir schéma). Messages dans `src/messages/{fr,en}.json` (~796 lignes). `hreflang` généré via `src/lib/hreflang.ts`.

## 7. Paiement (voir `04` et `PAIEMENT.md`)

Interface commune `src/server/gateways/types.ts`, un seul prestataire actif à la fois (table `Setting` clé `payment_gateway`), clés chiffrées AES-256-GCM (table `Integration`). Prestataires câblés : **Stripe, Mollie, PayPal, Square, Nexi**. Webhooks : signature vérifiée (ou relecture API pour Mollie), **montant et devise re-vérifiés** contre la commande avant passage en « payée ». Nexi jamais éprouvé en réel.

## 8. Serveur custom

`server.js` : point d'entrée Node pour l'hébergement (Hostinger). `next.config.ts` gère aussi des `redirects()` d'anciennes URL allemandes (`/widerrufsrecht` → `/retractation`, etc.) — résidus à nettoyer pour Koss Koss.

## 9. Diagnostic architectural

**Solide** : séparation admin/client, recalcul serveur des montants, Server Components dominants, SEO natif, i18n propre, crypto correcte. **À adapter** : validation à centraliser (pas de Zod), rate-limiting en mémoire (non scalable multi-instance), résidus allemands, config marque à extraire, quelques composants > 500 lignes.
