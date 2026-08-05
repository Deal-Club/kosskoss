# Mise en ligne — Hostinger

Procédure de déploiement de MLC Bois sur Hostinger, en Node.js.

Deux hébergements Hostinger permettent de faire tourner ce site. Ils ne se
déploient pas de la même façon :

| | Hébergement web Node.js (hPanel) | VPS |
|---|---|---|
| Démarrage | Passenger exécute `server.js` | `npm start` sous PM2 |
| Reverse proxy | fourni | à installer (Nginx) |
| Certificat SSL | fourni | Certbot |
| Tâche planifiée | onglet « Cron Jobs » de hPanel | `crontab -e` |

Le VPS est la voie la plus sûre : le site est une application rendue côté
serveur avec base de données, envoi d'e-mails et tâche planifiée à la minute.
L'hébergement mutualisé fonctionne, mais la mémoire allouée à la compilation y
est limitée — voir « Build sur une machine limitée » plus bas.

---

## 1. Ce qu'il faut avoir sous la main

- **Node 22 recommandé**, et surtout pas n'importe quelle version 20. Prisma 7
  n'accepte que `20.19+`, `22.12+` ou `24+` — et refuse de s'installer sur les
  autres, l'installation entière échoue :

  ```
  npm error command sh -c node scripts/preinstall-entry.js
  Prisma only supports Node.js versions 20.19+, 22.12+, 24.0+.
  ERROR: Failed to install dependencies
  ```

  Hostinger sert par défaut une version 20 antérieure à 20.19, qui tombe
  exactement dans le trou. Le correctif est dans hPanel : **Avancé → Node.js →
  Node.js version → 22**, puis relancer le déploiement. Le `.nvmrc` du dépôt
  demande la même version pour les outils qui savent le lire.
- L'URL de la base **PostgreSQL Neon** (chaîne « pooled », avec `sslmode=require`).
- Les trois clés **Cloudinary** — sans elles, l'envoi d'images est refusé en
  production, et c'est par là que passeront toutes les photos produits.
- Les identifiants **SMTP Hostinger** de `contact@mlc-bois.fr`.
  Sans eux, plus personne n'entre dans le back-office : le code de connexion à
  six chiffres part par e-mail et le repli console n'existe qu'en développement.
- Le domaine **mlc-bois.fr** pointé sur l'hébergement.

## 2. Variables d'environnement

La liste complète et commentée est dans [`.env.example`](../.env.example).
Elles vivent dans un fichier `.env.local` déposé à la racine sur le serveur —
jamais dans le dépôt Git, qui est public.

Générer chaque secret séparément :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Trois secrets doivent être **régénérés pour la production**, différents de ceux
utilisés en développement :

- `ADMIN_SESSION_SECRET` — signature des sessions du back-office
- `CUSTOMER_SESSION_SECRET` — signature des sessions clients
- `INTEGRATION_ENCRYPTION_KEY` — chiffrement des clés de paiement en base

Attention à `INTEGRATION_ENCRYPTION_KEY` : la changer après coup rend
illisibles les clés d'intégration déjà enregistrées en base. Elle se fixe
**avant** la première saisie de clés en production, puis ne bouge plus.

Ne pas oublier non plus :

- `NEXT_PUBLIC_SITE_URL=https://mlc-bois.fr` — sans barre finale. Cette
  variable est lue **au moment du build**, pas au démarrage : la changer impose
  de reconstruire. Elle alimente les URL canoniques, le sitemap, le flux Google
  Merchant et tous les liens contenus dans les e-mails.
- `NODE_ENV=production`
- `CRON_SECRET` — sinon la route d'envoi des campagnes reste fermée.

## 3. Déploiement sur VPS Hostinger

```bash
# Sur le serveur, une seule fois
sudo apt update && sudo apt install -y git nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

git clone https://github.com/mlcbois/mlcbois.git /var/www/mlc-bois
cd /var/www/mlc-bois
```

Créer `/var/www/mlc-bois/.env.local` avec les variables de l'étape 2, puis :

```bash
npm ci                 # installe et lance `prisma generate` (postinstall)
npx prisma migrate deploy   # applique les migrations à la base Neon
npm run build
pm2 start npm --name mlc-bois -- start
pm2 save && pm2 startup     # relance automatique au redémarrage du serveur
```

Nginx en frontal, dans `/etc/nginx/sites-available/mlc-bois` :

```nginx
server {
    server_name mlc-bois.fr www.mlc-bois.fr;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Les envois d'images passent par Cloudinary, mais l'import CSV de produits
    # peut atteindre plusieurs mégaoctets.
    client_max_body_size 12M;
}
```

Puis activer le site et poser le certificat :

```bash
sudo ln -s /etc/nginx/sites-available/mlc-bois /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d mlc-bois.fr -d www.mlc-bois.fr
```

`X-Forwarded-Proto` n'est pas décoratif : sans lui, l'application se croit en
HTTP et les cookies de session, marqués `Secure`, ne sont jamais posés — la
connexion au back-office tourne alors en boucle.

## 4. Déploiement sur hébergement web Node.js (hPanel)

1. hPanel → **Avancé → Node.js** → créer l'application.
   - Version de Node : **22** (voir l'étape 1 — une version 20 antérieure à
     20.19 fait échouer l'installation de Prisma)
   - Racine de l'application : le dossier du site
   - Fichier de démarrage : **`server.js`** (fourni à la racine du dépôt)
2. Déposer le code : `git clone https://github.com/mlcbois/mlcbois.git`
   depuis le terminal SSH, ou l'onglet Git de hPanel.
3. **Créer `.env.local` à la racine de l'application**, avec les variables de
   l'étape 2.

   Les variables saisies dans l'onglet « Variables d'environnement » de hPanel
   sont posées dans le processus démarré par Passenger — pas dans la session
   SSH où l'on construit. Le build ne les verrait pas, échouerait faute de
   `DATABASE_URL`, et figerait `NEXT_PUBLIC_SITE_URL` sur `localhost` dans tous
   les liens des e-mails. Un `.env.local` sur le serveur couvre les deux : Next
   le lit au build comme au démarrage. Les saisir en plus dans hPanel ne gêne
   pas, mais ne remplace pas le fichier.

4. Dans le terminal SSH, à la racine de l'application :

```bash
npm ci                        # installe et génère le client Prisma
npx prisma migrate deploy     # applique les migrations à la base Neon
npm run build                 # base réveillée au préalable — voir plus bas
```

5. **Restart** de l'application depuis hPanel.

`server.js` ne choisit pas son port : il lit `PORT`, imposé par Passenger. Ne
pas le modifier.

### Le build a besoin de la base

`npm run build` ne compile pas seulement : il interroge PostgreSQL pour
produire les pages statiques du catalogue. Deux conséquences.

**La base doit être réveillée.** Neon met le calcul en veille après inactivité,
et le réveil est plus lent que le délai d'attente du build. Symptôme :

```
Error: Connection terminated due to connection timeout
Failed to collect page data for /[locale]/[group]/[category]/[product]
```

Ce n'est pas une erreur de code. Réveiller la base avant de construire, puis
relancer :

```bash
node -e "const{Client}=require('pg');const c=new Client(process.env.DATABASE_URL);c.connect().then(()=>c.query('select 1')).then(()=>{console.log('base réveillée');return c.end()})"
npm run build
```

**`DATABASE_URL` doit être lisible au moment du build**, pas seulement au
démarrage. Sur hPanel, saisir les variables **avant** de lancer le build.

**`DATABASE_URL` doit être la chaîne « pooled ».** L'endpoint Neon existe en
deux formes ; c'est celle qui porte `-pooler` qu'il faut :

```
ep-xxxxxxxx-pooler.c-5.us-east-2.aws.neon.tech    ← oui
ep-xxxxxxxx.c-5.us-east-2.aws.neon.tech           ← non, connexion directe
```

Sur la chaîne directe, le build échoue sur :

```
Error: timeout exceeded when trying to connect
Failed to collect page data for /[locale]/[group]/[category]
```

La cause n'est pas une base injoignable mais un **épuisement des connexions**.
Next dimensionne ses processus de build sur `os.cpus()`, qui sur un hébergement
mutualisé renvoie les cœurs de la machine hôte — soixante-trois workers observés
sur Hostinger. Chacun ouvre son propre client Prisma, jusqu'à dix connexions :
plusieurs centaines de connexions simultanées sur un endpoint direct qui plafonne
bien plus bas. Le pooler (PgBouncer) les absorbe.

`next.config.ts` plafonne désormais le pool à quatre workers, ajustable par
`NEXT_BUILD_CPUS`. Les deux correctifs sont complémentaires : le pooler traite la
cause, le plafond limite la pression.

**La latence compte aussi.** Une base Neon en `us-east-2` (Ohio) servie depuis un
serveur européen fait payer l'aller-retour transatlantique à chaque connexion, ce
qui rapproche d'autant du délai d'attente. Un projet Neon en région européenne
supprime ce facteur — c'est une migration de base, pas un réglage.

### Build sur une machine limitée

Si `npm run build` s'interrompt sans message — le processus est tué faute de
mémoire —, construire en local et n'envoyer que le dossier `.next/`.

Ne **jamais** transférer `node_modules/` depuis un poste de développement :
Prisma y installe un moteur de requête compilé pour le système du poste. Un
`node_modules` construit sous macOS ne démarre pas sous le Linux d'Hostinger.
Les dépendances s'installent toujours sur le serveur, avec `npm ci`.

```bash
# En local
npm run build

# Sur le serveur : dépendances d'abord, puis on dépose le .next/ construit en local
npm ci
```

### Vérifier qu'un build a réellement réussi

Un détail qui coûte cher : `npm run build | tail` renvoie le code de sortie de
`tail`, jamais celui de `npm`. Un build en échec y ressort en « succès ». Pour
un verdict fiable :

```bash
set -o pipefail
npm run build > build.log 2>&1; echo "code de sortie : $?"
```

## 5. Base de données

Les migrations ne se génèrent jamais en production. On applique celles du dépôt :

```bash
npx prisma migrate deploy
```

Le premier peuplement (catalogue, moyens de paiement, compte administrateur)
se fait une seule fois :

```bash
npm run db:seed
```

À sauter si la base Neon contient déjà le catalogue — c'est le cas ici, la même
base sert le développement et la production (voir [`DATABASE.md`](DATABASE.md)).

Neon met le calcul en veille après inactivité : la première requête après une
nuit calme peut prendre une à deux secondes. C'est normal.

## 6. Mode maintenance

**En production, la boutique est fermée par défaut.** Rien à faire pour cela :
un déploiement neuf sert la page d'attente, et il faut demander explicitement
l'ouverture. C'est le sens sûr de l'erreur — un oubli laisse le site fermé
plutôt que d'exposer un catalogue inachevé.

Ce qui se passe tant qu'elle est fermée :

| Adresse | Réponse |
|---|---|
| Toute la boutique | page d'attente en français, **503** |
| `/api/...` (panier, commande, compte) | JSON d'erreur, **503** |
| `/admin` et `/api/admin/...` | **ouverts** — c'est par là qu'on entre |
| `/api/cron/...` | ouvert, déjà protégé par `CRON_SECRET` |
| La boutique, **connecté en administrateur** | site complet et normal |

Cette dernière ligne est tout l'intérêt du dispositif : on se connecte sur
`/admin`, et la boutique se comporte comme si elle était ouverte — on peut la
parcourir, tester le tunnel d'achat, vérifier chaque fiche, pendant que les
visiteurs ne voient que la page d'attente. La session admin est reconnue sur la
seule signature de son jeton, sans requête en base : le jeton est signé et
daté, il ne s'obtient pas sans être passé par le mot de passe **et** le code à
six chiffres.

Le 503 n'est pas un détail : c'est le code qui dit aux moteurs de recherche
« indisponible, revenez plus tard », avec un `Retry-After` d'une heure. Un 200
sur une page d'attente leur ferait indexer celle-ci à la place de chaque fiche
produit.

**Pour ouvrir la boutique**, le jour venu :

```
MAINTENANCE_MODE=0
```

puis redémarrer l'application depuis hPanel (la variable est lue au
démarrage). Rien d'autre à changer. Supprimer la variable ne suffit pas —
c'est voulu : seule une décision écrite ouvre la boutique.

L'interrupteur est une variable d'environnement et non un réglage du
back-office : on coupe souvent le site précisément parce que la base est en
travaux, et une page de maintenance qui dépendrait de la base ne s'afficherait
pas ce jour-là. Contrepartie assumée : il faut un redémarrage.

### Vérifier que la fermeture fonctionne

En navigation privée, sinon le test est faussé : si votre navigateur porte
encore un cookie de session administrateur, le site vous répondra normalement
— et c'est exactement ce qui est demandé, mais ce n'est pas ce que voit un
visiteur.

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://mlc-bois.fr/
# 503 attendu
```

## 7. Tâche planifiée des campagnes e-mail

Sans elle, les campagnes programmées ne partent jamais. Toutes les minutes :

```
* * * * * curl -fsS -X POST -H "Authorization: Bearer LE_CRON_SECRET" https://mlc-bois.fr/api/cron/campaigns > /dev/null
```

Sur VPS : `crontab -e`. Sur hébergement web : hPanel → **Cron Jobs**.

Appeler la route trop souvent est sans effet : le répartiteur ne fait rien tant
que l'heure du prochain lot n'est pas atteinte.

## 8. Vérifications après mise en ligne

```bash
curl -I https://mlc-bois.fr/                    # 200
curl -s https://mlc-bois.fr/sitemap.xml | head  # XML des pages
curl -s https://mlc-bois.fr/robots.txt          # autorise l'indexation
curl -s "https://mlc-bois.fr/feed/google" | head -20   # flux Merchant
```

Puis, dans le navigateur :

- `/admin` → connexion, **réception réelle du code à six chiffres par e-mail**
- Changer le mot de passe administrateur (menu **Accès**, `/admin/users`)
- Envoyer une image produit depuis le back-office → l'URL renvoyée doit être en
  `res.cloudinary.com`
- Une commande de test de bout en bout, puis la supprimer

## 9. Ce qui reste à traiter avant d'ouvrir la boutique

Repris de [`HANDOVER.md`](HANDOVER.md) — ces points ne bloquent pas le
déploiement mais bloquent la vente réelle :

0. **Supprimer les avis de démonstration.** La base en contient plusieurs
   milliers, générés pour juger du rendu d'un catalogue fourni. Ce ne sont pas
   des avis de clients : les laisser en ligne constituerait une pratique
   commerciale trompeuse en toutes circonstances (art. L121-4, 23° du Code de
   la consommation — donner de fausses indications sur les avis de
   consommateurs), et exposerait la boutique à une mise en demeure autant qu'à
   une pénalité Google sur les étoiles affichées en résultat de recherche.

   ```bash
   npx tsx --env-file=.env.local scripts/avis-demonstration.ts --purger
   ```

   La commande ne touche qu'aux avis portant la marque de démonstration : les
   avis réellement déposés par des clients ne sont pas concernés. À lancer
   **avant** d'ouvrir la boutique au public.

1. Paiement en ligne à configurer : Stripe, Square, Mollie, PayPal et Nexi sont
   câblés, mais n'encaissent qu'une fois leurs clés saisies dans **Admin →
   Moyens de paiement** et leur webhook déclaré. Marche à suivre :
   [`PAIEMENT.md`](PAIEMENT.md). Sans clés, toutes les commandes restent réglées
   par virement. L'adaptateur Nexi reste à valider contre un vrai compte.
2. **Rétractation en libre-service.** Le client doit aujourd'hui vous
   contacter pour se rétracter ; l'information légale est en place (page
   « Droit de rétractation ») mais rien n'automatise la démarche depuis son
   compte. Ce n'est pas une obligation du droit français comparable au
   « bouton de rétractation » allemand — plutôt un gain d'expérience client à
   évaluer, pas un blocage légal.
3. IBAN de démonstration sur la page de confirmation, déjà signalé comme tel.
4. Informations d'entreprise fictives dans les mentions légales — voir
   [`LEGAL.md`](LEGAL.md) § 3, à faire relire par un juriste avant publication.
5. Supprimer les commandes et avis de test restés en base.
