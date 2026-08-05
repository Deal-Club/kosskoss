# 00 — Inventaire du projet source `mlcbois`

> Audit sans modification. Source analysée : `D:\PROJETS\MAXIME\mlcbois` (branche `main`, arbre de travail propre).
> Cible du nouveau projet : Koss Koss (dossier de travail actuel `D:\PROJETS\MAXIME\kosskoss`, vide).

## 1. Nature du projet

`mlcbois` **n'est pas** un simple back-office visuel. C'est une **application Next.js e-commerce complète et fonctionnelle** :

- **Storefront public** bilingue (FR racine `/`, EN sous `/en`) : accueil, catalogue, fiche produit, panier, tunnel de commande, espace client, favoris, recherche, pages légales.
- **Back-office** complet sous `/admin` (protégé, 2FA e-mail) : produits, variantes, catégories, univers, commandes, clients, stock, avis, campagnes e-mail, moyens de paiement, intégrations, pages légales, snippets, utilisateurs.
- **API interne** (Route Handlers) : ~55 routes REST + webhooks paiement + cron campagnes + flux Google Merchant.
- **Base de données** PostgreSQL (Neon en prod) via **Prisma 7**, SQLite possible en dev historique.

Origine documentée (`TARGET.md`, `AGENTS.md`) : template de reverse-engineering → clone quelle.de → boutique électroménager inspirée d'alternate.de → **repositionnée en boutique française de bois de chauffage « MLC Bois »**. Le socle technique a survécu à tous ces pivots, d'où des **résidus allemands** dans le code (voir `01` et `12`).

## 2. Pile technique et versions (verrouillées — à NE PAS changer sans raison)

| Élément | Version | Source |
|---|---|---|
| Node.js | `^20.19 \|\| ^22.12 \|\| >=24.0` (`.nvmrc` : 22) | `package.json` engines |
| Next.js | **16.2.11** (App Router) | `package.json` |
| React / React-DOM | **19.2.4** | `package.json` |
| TypeScript | ^5, **mode strict activé** | `tsconfig.json` |
| Prisma / @prisma/client | **^7.9.0** (client généré dans `src/generated/prisma`) | `package.json`, `schema.prisma` |
| Base de données | PostgreSQL (adapter `@prisma/adapter-pg`, `pg` 8.22) | `schema.prisma` |
| i18n | next-intl ^4.13 | `package.json`, `next.config.ts` |
| CSS | Tailwind CSS **v4** (`@tailwindcss/postcss`), tokens oklch | `globals.css` |
| UI primitives | `@base-ui/react` ^1.3 (+ `components.json` shadcn), `class-variance-authority`, `clsx`, `tailwind-merge` | `package.json` |
| Icônes | `lucide-react` ^1.6 | `package.json` |
| Paiement | `stripe` ^22.4, `@mollie/api-client` ^4.6, `square` ^45 (+ PayPal & Nexi maison) | `package.json` |
| Images | `cloudinary` ^2.10 | `package.json` |
| E-mail | `nodemailer` ^9 (SMTP) | `package.json` |
| PDF | `pdf-lib` ^1.17 (factures) | `package.json` |

## 3. Scripts npm disponibles

| Script | Commande | Dépendance |
|---|---|---|
| `dev` | `next dev` | — |
| `build` | `next build` | **DATABASE_URL requis** (collecte les pages depuis la base) |
| `start` | `next start` | build préalable |
| `lint` | `eslint` | node_modules |
| `test` | `node --test --import tsx "src/**/*.test.ts"` | tests unitaires natifs Node |
| `db:seed` | `tsx prisma/seed.ts` | base + `data/store/*.json` |
| `db:migrate` | `prisma migrate dev` | base |
| `db:deploy` | `prisma migrate deploy` | base |
| `db:studio` | `prisma studio` | base |
| `postinstall` | `prisma generate` | s'exécute à chaque `npm install` |

## 4. Structure des dossiers

```
mlcbois/
  prisma/            schema.prisma (27 Ko) + 6 migrations + seed.ts
  src/
    app/
      [locale]/      storefront FR/EN (accueil, catalogue, compte, panier, commande, légal…)
      admin/         back-office (login + (protected)/*)
      api/           ~55 Route Handlers (account, admin, cart, checkout, payments, cron, reviews)
      feed/          flux Google Merchant (google, google-csv)
      c/ p/ desinscription/  liens de suivi campagne + désinscription
    components/      ~104 .tsx storefront + admin (home, product, cart, checkout, account, seo, admin…)
    content/legal/   pages légales FR/EN en TypeScript (source de vérité + COMPANY)
    data/            categoryNav.ts, seed data
    i18n/            routing.ts (next-intl)
    lib/             utilitaires (auth, cart, price, secrets, slugify, hreflang, mailer…)
    messages/        fr.json / en.json (~796 lignes chacun)
    server/          logique métier (orders, customers, admins, merchant, gateways/, emails/)
    generated/prisma prisma client généré (absent tant que `prisma generate` non lancé)
    types/
  data/store/*.json  jeu de données de peuplement (seed)
  docs/              doc de reprise existante (HANDOVER, DATABASE, PAIEMENT, LEGAL, GOOGLE_MERCHANT, IMAGES, ACCOUNTS, DEPLOY)
  server.js          serveur custom (démarrage prod Hostinger)
  next.config.ts     next-intl + limitation workers de build + redirects + Cloudinary
```

## 5. Documentation de reprise déjà présente (à réutiliser, ne pas réécrire)

`mlcbois/docs/` contient une doc de passation de qualité : `HANDOVER.md` (état, limites connues), `DATABASE.md`, `PAIEMENT.md` (5 prestataires), `LEGAL.md` (données d'entreprise à remplacer), `GOOGLE_MERCHANT.md`, `IMAGES.md` (Cloudinary), `ACCOUNTS.md` (espace client), `DEPLOY.md`. Ces fichiers **documentent l'intention métier** et doivent servir de référence pendant la refonte Koss Koss.

## 6. État initial des contrôles

- `node_modules` : **absent** au moment de l'audit (installation lancée pour exécuter les contrôles).
- `src/generated/prisma` : **absent** (généré par `postinstall`/`prisma generate`).
- Résultats lint/tsc/test/build : voir la section « Contrôles exécutés » du compte rendu et le journal en fin d'audit.
