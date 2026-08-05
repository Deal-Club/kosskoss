# MLC Bois

Boutique en ligne de bois de chauffage, en français et en anglais.
Catalogue, tunnel d'achat conforme au droit français de la vente à distance,
espace client, back-office complet et flux Google Merchant.

Domaine : **mlc-bois.fr**

## Stack

- **Next.js 16** — App Router, React 19, TypeScript strict
- **PostgreSQL (Neon)** via **Prisma 7** — une seule base pour le développement
  et la production
- **Tailwind CSS v4** — jetons de design en oklch
- **next-intl** — français à la racine, anglais sous `/en`
- **Cloudinary** — stockage des images produits
- **Nodemailer** — e-mails transactionnels via le SMTP Hostinger de la boutique

## Démarrer en local

```bash
npm install                # installe et génère le client Prisma
cp .env.example .env.local # puis renseigner les valeurs
npm run dev                # http://localhost:3000
```

Back-office : `http://localhost:3000/admin`. La connexion demande un mot de
passe **puis** un code à six chiffres envoyé par e-mail. Sans SMTP configuré,
le code s'affiche dans la console du serveur — repli réservé au développement.

## Commandes

```bash
npm run dev        # serveur de développement
npm run build      # build de production
npm start          # serveur de production (après build)
npm run lint       # ESLint
npm test           # tests unitaires
npm run db:deploy  # applique les migrations (production)
npm run db:migrate # crée et applique une migration (développement)
npm run db:seed    # peuplement initial du catalogue
npm run db:studio  # explorateur de base Prisma
```

## Documentation

| Fichier | Contenu |
|---|---|
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | **Mise en ligne sur Hostinger** — variables, migrations, cron, vérifications |
| [`docs/HANDOVER.md`](docs/HANDOVER.md) | État du projet, ce qui est construit, limites connues |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Base PostgreSQL, migrations, sauvegardes |
| [`docs/IMAGES.md`](docs/IMAGES.md) | Cloudinary et gestion des visuels produits |
| [`docs/ACCOUNTS.md`](docs/ACCOUNTS.md) | Espace client, RGPD, suppression de compte |
| [`docs/GOOGLE_MERCHANT.md`](docs/GOOGLE_MERCHANT.md) | Flux produits et balisage |
| [`docs/LEGAL.md`](docs/LEGAL.md) | Mentions légales, textes à faire relire |

## Structure

```
src/
  app/[locale]/     # boutique bilingue (français à la racine, anglais sous /en)
  app/admin/        # back-office, hors routage multilingue
  app/api/          # routes serveur (compte, commande, administration, cron)
  app/feed/         # flux Google Merchant (XML et CSV)
  components/       # composants de la boutique et du back-office
  server/           # accès base et logique métier
  messages/         # traductions fr.json / en.json
prisma/             # schéma, migrations, peuplement
docs/               # documentation d'exploitation
```

## Variables d'environnement

Voir [`.env.example`](.env.example) — dix-sept variables, toutes commentées.
Les valeurs réelles vivent dans `.env.local`, jamais dans le dépôt.

## Licence

MIT
