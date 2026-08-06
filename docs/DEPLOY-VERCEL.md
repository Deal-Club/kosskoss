# Déploiement Vercel — KossKoss Select

Le projet est un Next.js standard : Vercel le construit directement (`next build`).
Le `server.js` (hébergement Hostinger historique) est **ignoré** par Vercel.
Build de production vérifié en local : ✅ `next build` réussit.

## 1. Prérequis
- Dépôt GitHub : `Deal-Club/kosskoss` (déjà poussé sur `main`).
- Base Neon **déjà migrée et peuplée** : la branche de développement contient le
  schéma + le catalogue démo + le questionnaire.
  → on la pointe directement pour la présentation.
  ⚠️ Les migrations ne tournent PAS pendant le build Vercel : la base doit déjà
  être à jour (c'est le cas de la branche dev).

## 2. Importer le projet
1. vercel.com → **Add New… → Project → Import Git Repository** → `Deal-Club/kosskoss`.
2. Framework : **Next.js** (détecté automatiquement). Laisser Build/Install par défaut.
3. Node : 22 (lu depuis `.nvmrc` / `engines`).

## 3. Variables d'environnement (Production + Preview)
Copier les valeurs des secrets depuis ton `.env.local` (elles ne sont **pas** dans Git).

| Variable | Valeur | Requis |
|---|---|---|
| `DATABASE_URL` | chaîne **poolée** de la branche Neon (celle de `.env.local`) | ✅ |
| `ADMIN_SESSION_SECRET` | valeur de `.env.local` (ou 32 octets hex) | ✅ |
| `CUSTOMER_SESSION_SECRET` | valeur de `.env.local` | ✅ |
| `INTEGRATION_ENCRYPTION_KEY` | valeur de `.env.local` | ✅ |
| `NEXT_PUBLIC_SITE_URL` | l'URL Vercel, ex. `https://kosskoss.vercel.app` | ✅ |
| `SMTP_HOST` | ton serveur SMTP | ✅ (e-mails) |
| `SMTP_PORT` | `465` (SSL) ou `587` | ✅ |
| `SMTP_USER` | adresse complète du compte | ✅ |
| `SMTP_PASSWORD` | mot de passe SMTP | ✅ |
| `MAIL_FROM` | adresse expéditrice (souvent = `SMTP_USER`) | ✅ |
| `MAIL_FROM_NAME` | `KossKoss Select` | conseillé |
| `ADMIN_EMAIL` | e-mail du 1er admin (**boîte réelle** : reçoit le code 2FA) | ✅ (back-office) |
| `ADMIN_PASSWORD` | mot de passe d'amorçage du 1er admin | ✅ |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | n° WhatsApp de la boutique (bouton de confirmation) | conseillé |
| `MAINTENANCE_MODE` | `0` | facultatif |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | upload d'images admin | facultatif |
| `CRON_SECRET` | protège `/api/cron/campaigns` (e-mailing, non ouvert) | facultatif |

> `générer un secret` : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 4. Déployer
Cliquer **Deploy**. Le build lance `prisma generate` (postinstall) puis `next build`
(qui interroge la base pour pré-générer les pages — d'où l'importance de
`DATABASE_URL`).

## 5. Après le premier déploiement
1. Si l'URL finale diffère, mettre `NEXT_PUBLIC_SITE_URL` à jour et **redéployer**
   (elle sert au sitemap, aux canoniques et aux liens d'e-mail).
2. **Back-office** : aller sur `/admin/login`, saisir `ADMIN_EMAIL` / `ADMIN_PASSWORD`
   → un **code à 6 chiffres** arrive par e-mail (SMTP) → valider. Le compte admin
   est créé au premier accès (table `AdminUser` vide).
3. **Vérifier en live** : `/` · `/soins-visage` · `/diagnostic` · passer une commande
   test (opt-in coché) → page de confirmation + **e-mails** (confirmation + accès
   compte) → `/compte`.

## 6. Notes
- **Neon** peut mettre la branche en veille après inactivité : la 1re requête la
  réveille (~1–2 s), géré par le timeout Prisma.
- E-mails **best-effort** : si le SMTP échoue, la commande aboutit quand même
  (l'e-mail est simplement sauté).
- Pour une **vraie base de production** (séparée de la dev), créer une branche/DB
  Neon dédiée, y lancer `npx prisma migrate deploy` + `npx tsx prisma/seed-kk.ts`,
  puis pointer `DATABASE_URL` dessus.
