# KossKoss Select

Concept-store cosmétique multimarque, 100 % en ligne, marché Cameroun — en
français et en anglais. Diagnostic beauté, catalogue, tunnel d'achat en FCFA,
espace client, back-office complet et flux Google Merchant. Détail dans
[`TARGET.md`](TARGET.md).

## Stack

- **Next.js 16** — App Router, React 19, TypeScript strict
- **PostgreSQL (Neon)** via **Prisma 7** — une seule base pour le développement
  et la production
- **Tailwind CSS v4** — jetons de design en oklch
- **next-intl** — français à la racine, anglais sous `/en`
- **Cloudinary** — stockage des images produits
- **Nodemailer** — e-mails transactionnels

## Démarrer en local

```bash
npm install                # installe et génère le client Prisma
cp .env.example .env.local # puis renseigner les valeurs
npm run dev                # http://localhost:3000
```

La base est partagée entre développement et production (voir
[`docs/HANDOVER.md`](docs/HANDOVER.md)) : il n'y a rien à migrer pour
démarrer, `.env.local` renseigné suffit.

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
npm run db:deploy  # applique les migrations déjà écrites (sûr, y compris en production)
npm run db:migrate # PROSCRIT sur ce projet — voir docs/HANDOVER.md
npm run db:seed    # peuplement initial du catalogue
npm run db:studio  # explorateur de base Prisma
```

`npm run db:migrate` (= `prisma migrate dev`) se bloque dans cet environnement
et peut proposer une réinitialisation de la base — dangereux tant que la même
base sert la production. La procédure de migration réelle est documentée dans
[`docs/HANDOVER.md`](docs/HANDOVER.md).

## Documentation

| Fichier | Contenu |
|---|---|
| [`docs/HANDOVER.md`](docs/HANDOVER.md) | Base de données, migrations, variables d'environnement, déploiement, limites connues |
| [`docs/BACK-OFFICE.md`](docs/BACK-OFFICE.md) | Manuel du back-office, écran par écran |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Mise en ligne — hébergement Node.js (Hostinger) |
| [`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md) | Mise en ligne — Vercel |
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

Voir [`.env.example`](.env.example), et le détail de chaque variable — rôle et
statut de secret — dans [`docs/HANDOVER.md`](docs/HANDOVER.md). Les valeurs
réelles vivent dans `.env.local`, jamais dans le dépôt.

## Licence

MIT
