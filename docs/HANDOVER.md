# Reprise du projet

Ce document dit ce qui est vrai aujourd'hui sur l'infrastructure : la base de
données, la façon de la faire évoluer sans danger, les variables
d'environnement réellement lues, et le déploiement. Pour ce que fait la
boutique (marché, marque, catalogue), voir `TARGET.md`. Pour le manuel du
commerçant, voir [`docs/BACK-OFFICE.md`](BACK-OFFICE.md).

## Démarrer en local

```bash
npm install     # installe les dépendances et génère le client Prisma (postinstall)
cp .env.example .env.local   # puis renseigner DATABASE_URL et les secrets
npm run dev     # http://localhost:3000
```

**Il n'y a rien à migrer pour démarrer.** La base est unique (voir plus bas) :
elle porte déjà toutes les migrations du dépôt et le catalogue. `npm install`
suffit — **ne pas lancer `npm run db:migrate`** à ce stade, voir la section
suivante.

Back-office : `http://localhost:3000/admin`. La connexion demande un mot de
passe **puis** un code à six chiffres envoyé par e-mail (`AdminUser` +
`AdminLoginChallenge`, deuxième facteur obligatoire, voir plus bas). Sans SMTP
configuré, le code s'affiche dans la console du serveur — ce repli n'existe
qu'en développement (`NODE_ENV === "development"` **et** SMTP non configuré,
voir `src/server/adminOtp.ts`) ; en production, la connexion échoue proprement
tant que l'envoi n'est pas possible.

## Base de données : une seule base, partagée

**Une seule base PostgreSQL, hébergée sur Neon, sert le développement ET la
production.** Il n'y a pas de base locale. Ce qui est modifié en
développement — schéma comme données — l'est directement sur la même base
qui sert les visiteurs du site en production.

Vérifié dans cet environnement :

```bash
npx prisma migrate status
# → « N migrations found in prisma/migrations », « Database schema is up to date! »
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
# → rend une migration vide : la base et prisma/schema.prisma sont en phase
```

Conséquence directe : **toute commande Prisma qui écrit sur la base agit sur
la production**, pas sur un bac à sable. C'est la contrainte qui gouverne
toute la procédure ci-dessous.

La connexion passe par `DATABASE_URL` (`postgresql://…/…?sslmode=require`),
lue par l'adaptateur `@prisma/adapter-pg` (`src/server/prisma.ts`) et par la
CLI Prisma via `prisma.config.ts`, qui charge `.env.local` puis `.env` — dans
cet ordre, comme Next.js.

Neon met le calcul en veille après une période d'inactivité : la première
requête après une pause le réveille, ce qui peut prendre une à deux secondes
et occasionnellement dépasser un délai d'attente. Ce n'est pas une panne.

## Faire évoluer le schéma, sans danger

**`npm run db:migrate` (= `prisma migrate dev`) est PROSCRIT sur ce projet.**
Ce n'est pas une préférence de style, ce sont deux faits vérifiés :

1. **Elle se bloque dans cet environnement.** `migrate dev` peut ouvrir une
   invite interactive (confirmation d'une migration, choix en cas de dérive) ;
   un shell non interactif comme celui utilisé pour développer ce projet n'a
   personne pour y répondre, et la commande reste suspendue indéfiniment.
2. **Elle peut proposer une réinitialisation.** Quand `migrate dev` détecte
   une dérive entre l'historique des migrations et l'état réel de la base,
   elle peut proposer de **réinitialiser la base** pour repartir d'un état
   propre. Comme la base est unique et partagée (section précédente), un
   « oui » — ou un défaut qui vaudrait oui — sur cette invite efface la
   production. Ce risque à lui seul suffit à écarter la commande, indépendamment
   du blocage du point 1.

**La procédure qui marche réellement ici**, éprouvée sur ce dépôt (voir les
migrations dans `prisma/migrations/`, écrites de cette façon depuis
mi-août 2026) :

```bash
# 1. Modifier prisma/schema.prisma normalement.

# 2. Lire le SQL que Prisma produirait, SANS RIEN ÉCRIRE (commande en lecture
#    seule : elle n'ouvre aucune transaction d'écriture sur la base).
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script

# 3. Vérifier ce SQL À L'ŒIL avant d'aller plus loin. Sur ce projet, un ALTER
#    TABLE ... ADD COLUMN est attendu ; un DROP ou un NOT NULL sans défaut sur
#    une colonne existante doit arrêter la procédure et se discuter avant
#    d'aller plus loin.

# 4. Créer le dossier de migration à la main, au format que Prisma utilise
#    lui-même (horodatage UTC à la seconde + description) :
mkdir -p "prisma/migrations/$(date -u +%Y%m%d%H%M%S)_description_courte"
# … et y écrire le SQL vérifié à l'étape 3 dans un fichier migration.sql —
# exactement, sans le modifier : c'est le même texte qui sera appliqué.

# 5. Appliquer la migration ainsi écrite. C'est la SEULE commande d'écriture
#    de toute la procédure, et elle applique exactement le SQL relu :
npx prisma migrate deploy

# 6. Régénérer le client, pour que TypeScript connaisse le nouveau schéma :
npx prisma generate
```

`migrate diff` (étape 2) et `migrate status` sont les deux seules commandes
Prisma sans danger à lancer librement : elles ne modifient jamais la base,
quel que soit leur résultat.

## Variables d'environnement

Modèle complet et commenté : [`.env.example`](../.env.example). Les valeurs
réelles vivent dans `.env.local`, jamais dans le dépôt. Chaque variable
ci-dessous a été vérifiée par une recherche de son usage dans le code
(`process.env.<NOM>`) — aucune n'est recopiée d'une documentation antérieure
sans ce contrôle.

| Variable | Rôle | Secret ? |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL canonique, sitemap, flux Merchant, liens d'e-mail — lue **au build** | non |
| `DATABASE_URL` | Connexion PostgreSQL (Neon), chaîne « pooled » avec `sslmode=require` | **oui** |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Compte d'amorçage, utilisé uniquement si la table `AdminUser` est vide ; `ADMIN_EMAIL` sert aussi de destinataire à la notification « nouvelle commande » | **oui** |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | Lues seulement par `scripts/acces-admin.ts` (compte masqué, rôle `superadmin`) — jamais par l'application elle-même | **oui**, le temps du script |
| `ADMIN_SESSION_SECRET` | Signature des cookies de session du back-office | **oui** |
| `CUSTOMER_SESSION_SECRET` | Signature des cookies de session des clients | **oui** |
| `INTEGRATION_ENCRYPTION_KEY` | Chiffrement AES-256-GCM des secrets d'intégration stockés en base (32 octets hex). **Ne doit jamais changer une fois des clés enregistrées** : elles deviendraient illisibles | **oui** |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Envoi des e-mails transactionnels (code de connexion, confirmation de commande, facture) | `SMTP_PASSWORD` **oui**, le reste non |
| `MAIL_FROM` / `MAIL_FROM_NAME` | Expéditeur des e-mails | non |
| `ORDER_NOTIFICATION_EMAILS` | Destinataires de la notification « nouvelle commande » | non |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Stockage des images produits. Sans elles, l'envoi reste local en développement et est **refusé en production** (les fichiers locaux disparaîtraient au déploiement suivant) | `CLOUDINARY_API_SECRET` **oui**, le reste non |
| `CRON_SECRET` | Protège `/api/cron/campaigns` (envoi programmé des campagnes e-mail) | **oui** |
| `NEXT_PUBLIC_SMARTSUPP_KEY` | Widget de chat flottant (facultatif) | non |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Repli du numéro WhatsApp tant que le réglage back-office (**Paramètres**) est vide | non |
| `MAINTENANCE_MODE` | `0` = boutique ouverte (défaut), `1` = page d'attente pour tout le monde sauf `/admin` — lue **au démarrage**, un changement impose un redémarrage | non |
| `GENIUSPAY_API_KEY` / `GENIUSPAY_API_SECRET` / `GENIUSPAY_WEBHOOK_SECRET` | Passerelle de paiement GeniusPay (Mobile Money + carte). Sans elles, le tunnel reste en confirmation manuelle par WhatsApp | **oui** |
| `GENIUSPAY_BASE_URL` | Base de l'API GeniusPay (forcée en `https://` par défaut) | non |

Deux variables supplémentaires, hors `.env.example` car réservées au réglage
fin du build ou fournies par la plateforme d'hébergement, pas à la saisie
manuelle : `NEXT_BUILD_CPUS` (plafonne les workers du build Next, utile sur un
hébergement mutualisé) et `PORT` (imposé par l'hébergeur, lu par `server.js`).

## Authentification du back-office

- Mots de passe hachés (scrypt), plusieurs comptes possibles, activation et
  désactivation par un compte disposant de la capacité `acces`.
- Sessions signées (HMAC), cookie `httpOnly`, **8 heures** (`src/lib/adminAuth.ts`).
- **Cinq échecs de connexion par adresse → blocage de quinze minutes**
  (`src/server/loginRate.ts`). Ce compteur est **en mémoire du processus** :
  il protège un serveur unique, pas plusieurs instances qui ne partageraient
  rien entre elles.
- Le dernier compte **actif** ne peut être ni désactivé ni supprimé
  (`src/server/admins.ts`).
- **Double facteur obligatoire** : après le mot de passe, un code à
  **six chiffres** part par e-mail (`src/server/adminOtp.ts`). Valable
  **10 minutes**, **5 tentatives**, renvoi possible après **60 secondes**. Les
  codes sont hachés en base et jamais stockés en clair.
- Le rôle d'un compte est **relu en base à chaque requête**
  (`src/server/kk/acces.ts`), jamais mis en cache dans le jeton de session :
  rétrograder ou désactiver un compte prend effet **immédiatement**, sans
  attendre l'expiration de sa session. Détail dans
  [`docs/BACK-OFFICE.md`](BACK-OFFICE.md).

## Déploiement

Deux procédures existent dans le dépôt : [`docs/DEPLOY.md`](DEPLOY.md)
(hébergement Node.js Hostinger, VPS ou mutualisé) et
[`docs/DEPLOY-VERCEL.md`](DEPLOY-VERCEL.md) (Vercel). **Aucune des deux n'est
à jour sur la marque** : `DEPLOY.md` porte encore le domaine et les
identifiants de l'activité précédente (bois de chauffage). Ce sont des guides
de procédure technique restés valables sur le fond — postinstall qui génère le
client Prisma, `npx prisma migrate deploy` (jamais `migrate dev`) pour
appliquer les migrations en production, build qui interroge la base — mais
leur texte n'a pas suivi le repositionnement KossKoss et reste à corriger.

Ce qui ne dépend d'aucun des deux guides, vérifié ici :

- **`npx prisma migrate deploy` est la seule commande de migration à lancer en
  production.** Elle applique les migrations déjà écrites et relues dans le
  dépôt ; elle n'en génère aucune, contrairement à `migrate dev`.
- Le premier peuplement (`npm run db:seed` et ses variantes `db:seed:*`) ne se
  relance pas sur une base déjà peuplée — c'est le cas ici, la même base sert
  développement et production.
- `DATABASE_URL` doit être une chaîne **poolée** (`-pooler` dans l'hôte) : le
  build interroge la base pour pré-générer les pages du catalogue, et une
  connexion directe s'épuise sous le nombre de workers d'un build.

## Ce qui a été construit

Le détail écran par écran du back-office — rôles, produits, marques, tags,
approvisionnement, ventes, traductions, réglages, commandes et facturation,
consentement et mesure — est dans [`docs/BACK-OFFICE.md`](BACK-OFFICE.md),
vérifié dans le code au moment de la rédaction de ce document.

Sur la boutique : site bilingue français/anglais (français à la racine),
diagnostic beauté qui recommande une routine, avis clients avec validation
obligatoire par un administrateur avant publication, moyens de paiement et
clés d'intégration configurables depuis le back-office (secrets chiffrés,
jamais ressortis en clair), espace client facultatif (la commande en invité
reste possible), liste de souhaits sans compte.

## Limites connues

- **Le renvoi manuel d'une facture n'est pas outillé.** Si l'envoi de l'e-mail
  échoue après l'émission (facture déjà écrée en base, numéro déjà consommé),
  l'historique de la commande le signale, mais il n'existe pas d'écran de
  factures ni de bouton « renvoyer » — voir `src/server/kk/facture.ts`.
- **Aucune passerelle Mobile Money locale n'est pleinement validée pour le
  Cameroun.** GeniusPay (`src/server/gateways/geniuspay.ts`) est câblée, mais
  le prestataire ne liste pas le Cameroun dans sa couverture documentée et son
  API refuse la devise XAF en l'état (elle n'accepte que le XOF) — à confirmer
  avec le prestataire avant d'ouvrir le paiement en ligne. En attendant, le
  tunnel reste en confirmation manuelle par WhatsApp.
- **`src/data/categoryNav.ts` (catégories mises en avant sur l'accueil) est
  vide** : le menu et la rangée de catégories ne s'affichent pas tant qu'il
  n'est pas renseigné. Sans effet sur le catalogue lui-même, qui vit en base.
- **Un chemin de création de commande antérieur est mort mais conservé**
  (`src/server/orders.ts`, route HTTP toujours active) : il calcule les
  montants autrement que le tunnel actuel (`src/server/kk/checkout.ts`) et
  n'a plus d'appelant côté navigation.
