# Base de données

Le site tourne sur Prisma 7. Toute la boutique (catalogue, avis, paiements,
intégrations, stock, comptes admin) est en base — plus rien n'est lu depuis
`data/store/*.json`, ces fichiers ne servent plus qu'au premier peuplement.

## Moteur : PostgreSQL (Neon)

Une seule base sert le développement et la production : PostgreSQL 18 hébergé
sur Neon. Il n'y a pas de base locale : ce qui est modifié en développement
l'est directement en ligne.

La connexion passe par `DATABASE_URL`, lue dans `.env.local` :

```
DATABASE_URL="postgresql://utilisateur:motdepasse@hote.neon.tech/neondb?sslmode=require"
```

L'adaptateur Prisma est `@prisma/adapter-pg`, câblé dans `src/server/prisma.ts`.

```bash
npm run db:migrate   # applique les migrations
npm run db:seed      # remplit le catalogue de démonstration, les paiements, le compte admin
npm run db:studio    # interface graphique pour inspecter les données
npm run dev          # http://localhost:3000
```

> `npm run db:seed` réinjecte le **catalogue de démonstration** (78 produits
> fictifs). Sur une boutique déjà remplie à la main, il n'y a aucune raison de
> le lancer.

### Démarrage à froid

Neon met le calcul en veille après une période d'inactivité. Le premier accès
le réveille : compter environ deux secondes pour l'établissement de la
connexion. Une page qui lance plusieurs requêtes en parallèle juste à ce
moment-là peut dépasser le délai d'acquisition du pool (dix secondes) et
renvoyer une erreur `pool timeout` ; le rechargement suivant passe.

C'est le comportement normal d'une base qui se met en veille, pas une panne.

## Particularités du schéma

Sous PostgreSQL, un `String` Prisma est un `text` sans limite de longueur :
aucune annotation n'est nécessaire sur les descriptions, les colonnes JSON
(`bullets`, `images`) ou les notes. C'était l'inverse sous MySQL, où il fallait
`@db.Text` partout pour échapper au `VARCHAR(191)` par défaut.

Le schéma reste par ailleurs volontairement portable : aucun enum Prisma,
aucune liste scalaire, uniquement des types communs aux moteurs SQL.

`AdminLoginChallenge.adminUserId` porte un index **unique** : un compte n'a
qu'un défi de connexion vivant à la fois. C'est la base qui garantit
l'invariant, et non l'ordre d'arrivée des requêtes — sans lui, deux connexions
simultanées créaient deux défis et expédiaient deux codes par e-mail.

## Migrations

`prisma/migrations/0_init` est la ligne de base PostgreSQL, générée avec
`prisma migrate diff`. Les migrations des moteurs précédents sont conservées
hors du dossier Prisma, à titre d'archive seulement :

- `prisma-migrations-sqlite.bak/` — l'historique SQLite d'origine
- `prisma-migrations-mysql.bak/` — la parenthèse MySQL/MariaDB (Hostinger)

Aucune des deux n'est transposable telle quelle.

## Variables d'environnement

| Variable | Rôle | Où |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL | `.env.local` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Compte de secours utilisé uniquement si la table `AdminUser` est vide | `.env.local` |
| `ADMIN_SESSION_SECRET` | Signature des cookies de session du back-office | `.env.local` |
| `CUSTOMER_SESSION_SECRET` | Signature des cookies de session des clients | `.env.local` |
| `INTEGRATION_ENCRYPTION_KEY` | Clé AES-256-GCM chiffrant les clés API saisies dans le back-office (32 octets en hexadécimal) | `.env.local` |
| `SMTP_*` / `MAIL_FROM*` | Envoi des e-mails transactionnels (voir `docs/HANDOVER.md`) | `.env.local` |
| `CLOUDINARY_*` | Stockage des images produits (voir `docs/IMAGES.md`) | `.env.local` |

`.env.local` prime sur `.env`, pour l'application Next comme pour la CLI Prisma
(`prisma.config.ts` charge les deux fichiers dans cet ordre).

`INTEGRATION_ENCRYPTION_KEY` ne doit jamais changer une fois des clés API
enregistrées : les secrets déjà stockés deviendraient illisibles. En cas de
rotation, effacer puis ressaisir les clés dans le back-office.

## Sauvegardes

Neon conserve un historique permettant de restaurer la base à un instant
antérieur, depuis sa console. Pour un export manuel :

```bash
pg_dump "$DATABASE_URL" > sauvegarde.sql
```

Le fichier `dev.db` à la racine est l'ancienne base SQLite, conservée telle
qu'elle était avant les bascules successives. Elle n'est plus lue par
l'application, mais reste la source du catalogue de démonstration.
