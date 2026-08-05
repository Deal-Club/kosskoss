# Espace client `/konto` — MLC Bois

Ce document décrit l'espace client livré dans `src/app/[locale]/konto/`, les décisions de
sécurité qui le sous-tendent, ce qui est couvert au regard du droit français et du RGPD,
et ce qui reste à faire.

> **Avertissement.** Ce document explique des choix techniques motivés par des textes
> juridiques. Ce n'est pas un conseil juridique. Le dispositif doit être relu par un avocat
> spécialisé en droit du commerce électronique français avant la mise en ligne, en même temps
> que la Datenschutzerklärung (`src/content/legal/`), qui doit être complétée pour décrire le
> traitement « Kundenkonto ».

---

## 1. Ce qui est livré

### Base de données

| Modèle | Rôle |
| --- | --- |
| `Customer` | Compte client : e-mail unique, mot de passe scrypt, civilité, nom, téléphone, adresses de facturation et de livraison, langue, `emailVerified`, `active`, dates |
| `CustomerPasswordReset` | Réinitialisation : **SHA-256 du jeton** (jamais le jeton), expiration, consommation |
| `Order.customerId` | Relation **facultative** vers `Customer`, `onDelete: SetNull` |
| `Order.anonymizedAt` | Horodatage posé quand le compte rattaché est supprimé |

Migration : `prisma/migrations/20260726140930_customer_accounts/`.
Aucun enum Prisma, aucune liste scalaire : le schéma reste identique sous SQLite et sous
PostgreSQL.

### Couche serveur

| Fichier | Rôle |
| --- | --- |
| `src/server/customers.ts` | Inscription, authentification, profil, adresses, mot de passe, réinitialisation, export RGPD, suppression, liste pour le back-office |
| `src/lib/customerAuth.ts` | Jeton de session signé HMAC-SHA256, nom du cookie, durée |
| `src/server/customerSession.ts` | `getCustomerSession()`, `getCurrentCustomer()`, `requireCustomer()`, ouverture et fermeture du cookie |
| `src/server/customerRate.ts` | Trois compteurs en mémoire : connexion, réinitialisation, inscription |
| `src/server/accountMessages.ts` | Messages d'erreur français des routes API |
| `src/server/emails/customerAccount.ts` | Gabarits d'e-mail (bienvenue, compte déjà existant, réinitialisation), DE et EN |

### Routes API — `src/app/api/account/`

| Route | Méthode | Session requise |
| --- | --- | --- |
| `/api/account/register` | POST | non |
| `/api/account/login` | POST | non |
| `/api/account/logout` | POST | non |
| `/api/account/password/forgot` | POST | non |
| `/api/account/password/reset` | POST | non (jeton) |
| `/api/account/password/change` | POST | **oui** |
| `/api/account/profile` | PATCH | **oui** |
| `/api/account/addresses` | PUT | **oui** |
| `/api/account/export` | GET | **oui** |
| `/api/account/delete` | POST | **oui** |

### Pages — `src/app/[locale]/konto/`

| Chemin | Protégée | Contenu |
| --- | --- | --- |
| `/konto` | oui | Tableau de bord : salutation, accès rapides, trois dernières commandes |
| `/konto/anmelden` | non | Connexion |
| `/konto/registrieren` | non | Inscription |
| `/konto/passwort-vergessen` | non | Demande de réinitialisation |
| `/konto/passwort-zuruecksetzen` | non (jeton) | Choix du nouveau mot de passe |
| `/konto/bestellungen` | oui | Historique |
| `/konto/bestellungen/[orderNumber]` | oui | Détail, même présentation que la confirmation de commande |
| `/konto/adressen` | oui | Adresses de facturation et de livraison |
| `/konto/daten` | oui | Données personnelles, mot de passe, export RGPD, suppression |

Toutes ces pages sont en `robots: { index: false, follow: false }` et en `force-dynamic`.
Les textes vivent dans le namespace `account` de `src/messages/fr.json` et
`src/messages/en.json` — 164 clés, strictement identiques dans les deux fichiers.

### Back-office

`src/app/admin/(protected)/customers/page.tsx` — liste paginée en français (nom, e-mail,
ville, nombre de commandes, inscription, dernière connexion, statut), recherche, entrée
« Clients » dans la barre latérale (section « Boutique », icône `UserRound`).
La page est en **lecture seule** : elle ne charge aucun mot de passe et ne permet ni
modification ni suppression d'un compte. La suppression relève du droit à l'effacement, que
le client exerce lui-même — c'est ce qui garantit qu'elle s'accompagne toujours de
l'anonymisation des commandes.

---

## 2. Décisions de sécurité

### 2.1 Sessions strictement séparées du back-office

Le cookie client s'appelle `customer_session` et il est signé avec `CUSTOMER_SESSION_SECRET`,
**différent** de `ADMIN_SESSION_SECRET`. Renommer un cookie client en `admin_session` ne donne
rien : la signature ne correspond pas (vérifié, la redirection vers `/admin/login` est
maintenue). Les deux systèmes ne partagent aucun module.

| Paramètre | Valeur | Motif |
| --- | --- | --- |
| `httpOnly` | oui | Le JavaScript de la page ne doit pas pouvoir lire la session |
| `secure` | en production | HTTP en local, HTTPS en ligne |
| `sameSite` | `lax` | `strict` déconnecterait le client arrivant depuis un lien d'e-mail. Une requête POST venue d'un autre site n'emporte pas un cookie `lax` : la protection CSRF sur les écritures est conservée |
| `maxAge` | 14 jours | Compromis entre confort et fenêtre d'usage d'un cookie volé (art. 32 RGPD) |
| Contenu | identifiant + e-mail + expiration, signés | Aucun secret d'authentification dans le cookie |

Un jeton neuf est émis à chaque connexion : l'identifiant de session change après
l'authentification, ce qui coupe court à la fixation de session. Le compte est en outre relu
en base à chaque page protégée (`getCurrentCustomer`) : un compte désactivé ou supprimé rend
la session inopérante immédiatement, sans attendre l'expiration du cookie.

### 2.2 Aucune énumération de comptes

C'est la contrainte qui a le plus dicté la conception. OWASP (Authentication Cheat Sheet,
WSTG-IDNT-04) et le BSI (IT-Grundschutz ORP.4.A23, « keinen Hinweis darauf geben, ob Passwort
oder Kennung falsch sind ») demandent la même chose : rien ne doit dire si une adresse est
enregistrée.

| Écran | Comportement |
| --- | --- |
| Connexion | Message unique `invalid_credentials` et statut 401, que l'adresse soit inconnue, le mot de passe faux ou le compte désactivé. Quand l'adresse n'existe pas, un **haché factice** est tout de même vérifié (`DUMMY_HASH`) pour que la durée de la réponse ne trahisse rien |
| Inscription | Réponse **rigoureusement identique** dans les deux cas : même statut 200, même corps. L'information passe par la boîte aux lettres du titulaire — soit l'e-mail de bienvenue, soit « un compte existe déjà, voici le lien de réinitialisation » |
| Mot de passe oublié | Réponse identique dans les deux cas, formulation OWASP : « Falls ein Konto mit dieser E-Mail-Adresse besteht … ». Aucun e-mail n'est envoyé à une adresse inconnue |
| Compteurs de tentatives | Ils s'incrémentent que le compte existe ou non : un blocage 429 qui n'arriverait que sur les adresses connues serait un aveu |

**Conséquence assumée : pas de connexion automatique après l'inscription.** Ouvrir une session
seulement quand l'adresse était libre rendrait les deux cas distinguables (cookie posé ou non).
Le client se connecte donc ensuite avec le mot de passe qu'il vient de choisir. Le parcours est
un clic plus long ; c'est le prix de la règle.

### 2.3 Mots de passe

- Hachage **scrypt** via `src/lib/password.ts`, déjà en place pour le back-office. Sel unique
  par compte, comparaison en temps constant.
- Longueur minimale **12 caractères**, maximum 200, **aucune règle de composition** et aucune
  expiration périodique — la longueur prime sur la complexité (BSI ORP.4.A22, OWASP).
  La borne haute évite qu'une entrée démesurée serve de levier de déni de service sur scrypt.
- Le mot de passe **n'est jamais renvoyé, même haché** (aucun `passwordHash` ne sort de
  `src/server/customers.ts` : `CustomerRecord` ne le contient pas) et **n'est jamais journalisé**.
- Changer son mot de passe exige le mot de passe actuel : un cookie volé ne suffit pas à
  verrouiller le titulaire hors de son compte. L'opération invalide les liens de
  réinitialisation encore en circulation.

### 2.4 Réinitialisation

- Jeton de **32 octets aléatoires** (`randomBytes`), transmis uniquement dans le lien.
- La base ne stocke que son **SHA-256** — une fuite de la base ne permet pas de prendre la main
  sur un compte.
- Validité **30 minutes**, usage unique, et toutes les demandes du même compte tombent
  ensemble à la première utilisation.
- Aucune session n'est ouverte après la réinitialisation : le client se reconnecte, ce qui
  vérifie que le nouveau mot de passe est bien celui qu'il croit avoir choisi.

### 2.5 Freins aux tentatives automatisées

`src/server/customerRate.ts`, compteurs en mémoire, sur le modèle de `src/server/loginRate.ts` :

| Action | Limite |
| --- | --- |
| Connexion | 5 échecs par adresse, puis 15 minutes |
| Mot de passe oublié | 3 demandes par adresse et par heure |
| Inscription | 5 par adresse et par heure (anti-mailbombing) |

### 2.6 Cloisonnement des données

- Une commande n'est visible dans l'espace client que si elle porte l'identifiant du compte
  (`getCustomerOrder`). Une commande d'un autre compte, ou passée en invité, renvoie **404** —
  rien n'indique si le numéro existe ailleurs (vérifié).
- Le rattachement d'une commande à un compte est un **paramètre serveur** de `createOrder`, pas
  un champ de la charge utile : le navigateur ne peut pas désigner le compte à créditer.
- Le chemin de retour après connexion (`?weiter=`) est filtré par `safeReturnPath` : seuls les
  chemins internes commençant par `/konto` sont acceptés, ce qui exclut la redirection ouverte.
- L'export RGPD part en `Cache-Control: no-store`, en pièce jointe.

---

## 3. Conformité — ce qui est couvert et pourquoi

### 3.1 La commande en tant qu'invité reste possible

C'est le point le plus important, et il est structurel : **aucune fonction de l'espace client
n'est appelée par le tunnel de commande invité**. `src/app/api/checkout/route.ts` lit une
éventuelle session, mais ne l'exige jamais ; sans compte, le comportement est identique à celui
d'avant (vérifié : commande invité `HP-2026-000005`, HTTP 201, `customerId` nul).

La Datenschutzkonferenz, dans son *Beschluss* du 24 mars 2022 « Datenschutzkonformer
Online-Handel mittels Gastzugang », demande que les commerçants proposent « grundsätzlich einen
Gastzugang », au motif du principe de minimisation (art. 5 § 1 c RGPD) : pour une commande
ponctuelle, seules les données nécessaires à *ce* contrat relèvent de l'art. 6 § 1 b, un compte
permanent supposant un consentement libre au sens de l'art. 7 § 4.

Nuance à connaître : l'**OLG Hamburg** (27 février 2025, 5 U 30/24, affaire Otto.de) a jugé que
ce Beschluss n'a « keinerlei Bindungswirkung für Gerichte » et qu'un compte obligatoire peut
être licite dans des circonstances particulières (place de marché multi-vendeurs, collecte
mesurée, suppression automatique des comptes inactifs). Pour une boutique mono-vendeur
classique, la commande invité reste la seule voie sans risque, les autorités de contrôle
continuant d'appliquer leur position.

En pratique : le rappel « Ein Kundenkonto ist freiwillig … » est affiché sur les pages de
connexion et d'inscription ainsi que sur le tableau de bord, et repris dans l'e-mail de
bienvenue.

### 3.2 Droit d'accès et portabilité (art. 15 et 20)

`/konto/daten` → « Daten als JSON herunterladen » → `GET /api/account/export`.

Le fichier est du **JSON**, format structuré, couramment utilisé et lisible par machine, comme
l'exige l'art. 20 § 1. Il contient le compte, les adresses et l'intégralité des commandes avec
leurs positions et leur historique de statuts. Le mot de passe n'y figure pas, et le fichier le
dit explicitement.

### 3.3 Droit à l'effacement (art. 17) et conservation comptable

`/konto/daten` → « Konto löschen ». Deux garde-fous : le mot de passe est redemandé et le
client doit recopier le mot `LÖSCHEN`.

**Ce qui est supprimé** : le compte, le mot de passe haché, les adresses enregistrées, le
téléphone, les demandes de réinitialisation en cours, la session.

**Ce qui subsiste, et pourquoi** : la commande. Les justificatifs comptables et les factures se
conservent **huit ans** depuis le *Viertes Bürokratieentlastungsgesetz* (BEG IV, BGBl. du
29 octobre 2024, en vigueur au 1ᵉʳ janvier 2025) — § 147 al. 3 AO et § 257 al. 4 HGB ; les
livres, inventaires et comptes annuels restent à **dix ans**. L'art. 17 § 3 b RGPD réserve
expressément le traitement nécessaire au respect d'une obligation légale.

Le traitement appliqué à chaque commande rattachée :

| Champ | Traitement | Motif |
| --- | --- | --- |
| `customerId` | mis à nul | La commande n'est plus reliée à une personne identifiée dans la base opérationnelle |
| `anonymizedAt` | horodaté | Marqueur du statut « conservée au seul titre de l'obligation légale » |
| `email` | remplacé par `geloescht@konto.invalid` | Coordonnée de contact, non exigée par la facture |
| `phone` | vidé | idem |
| `customerNote` | vidé | Message libre du client, sans valeur comptable |
| `accessToken` | régénéré | Les anciens liens de confirmation cessent de fonctionner |
| Nom et adresse de facturation | **conservés** | Mentions obligatoires de la facture (§ 14 al. 4 UStG) : les retirer rendrait la pièce comptable non conforme |
| Montants, TVA, positions, dates | conservés | Cœur de la pièce comptable |

Le client est informé **avant** de confirmer, en toutes lettres et avec les références légales
(`account.data.deleteRetention`), puis une seconde fois dans la réponse de l'API. C'est ce qui
évite le reproche d'un art. 17 mal exécuté.

Vérifié en conditions réelles : compte supprimé, commande `HP-2026-000006` conservée avec ses
montants et sa ligne d'article, `customerId` nul, `anonymizedAt` posé, e-mail et note effacés,
jeton d'accès changé.

### 3.4 Autres points

- **Rectification (art. 16)** : `/konto/daten`, formulaire des données personnelles.
- **Pas de double opt-in obligatoire** pour un simple compte client : cette exigence relève du
  § 7 UWG et concerne la publicité par e-mail, pas la création d'un compte. Le drapeau
  `emailVerified` est néanmoins en place pour l'ajouter (voir § 5).
- **Aucun couplage publicitaire** : la création du compte ne s'accompagne d'aucune case
  d'inscription à une newsletter, et l'e-mail de bienvenue est purement transactionnel — un
  message de confirmation contenant de la publicité est une cause classique d'Abmahnung.
- **§ 312j BGB** : l'espace client ne propose **aucune commande en un clic ni recommande**
  depuis l'historique. Le seul chemin de commande reste le tunnel existant, avec son
  récapitulatif complet et son bouton « zahlungspflichtig bestellen ». Le pré-remplissage des
  coordonnées ne dispense de rien : il ne touche que la saisie, pas l'affichage.
- **§ 312f BGB** : la page de détail d'une commande reprend l'information post-contractuelle
  sur le droit de rétractation.

---

## 4. Configuration

Une seule variable nouvelle, à ajouter en production (`.env.example` la documente) :

```
# Générer avec : openssl rand -hex 32
CUSTOMER_SESSION_SECRET=…
```

Elle **doit être différente** de `ADMIN_SESSION_SECRET`. Sans elle, l'espace client lève une
erreur explicite au lieu de tomber sur une valeur par défaut.

Les e-mails passent par le module existant `src/lib/mailer.ts` (SMTP Hostinger,
`SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD`). En développement, sans ces variables, le repli
est conservé : le lien de réinitialisation est écrit dans la console du serveur et renvoyé à la
page, exactement comme le code de connexion du back-office. Le garde-fou porte sur
`NODE_ENV === "development"`.

---

## 5. Ce qui reste à faire

1. **Vérification de l'adresse e-mail (double opt-in).** Le champ `emailVerified` existe mais
   n'est jamais mis à `true`. Sans vérification, un tiers peut créer un compte au nom d'une
   adresse qui ne lui appartient pas. Ce n'est pas une obligation formelle pour un compte
   client, mais c'est recommandé au titre de l'art. 5 § 1 d (exactitude) et de l'art. 32.
2. **Changement d'adresse e-mail.** Volontairement absent : la changer sans vérifier la
   nouvelle boîte permettrait de détourner un compte. À implémenter avec un jeton de
   confirmation envoyé à la nouvelle adresse, sur le modèle de la réinitialisation.
3. **Compteurs de tentatives partagés.** Les trois compteurs sont en mémoire : ils repartent à
   zéro à chaque redémarrage et ne se partagent pas entre instances. À déplacer dans Redis avant
   toute mise à l'échelle horizontale. Ajouter aussi une limite **par adresse IP**, en plus de
   la limite par adresse e-mail (OWASP recommande les deux).
4. **Repli de développement et énumération.** En développement sans fournisseur d'e-mail, la
   route « mot de passe oublié » renvoie `devLink` uniquement pour une adresse connue : c'est un
   canal d'énumération, dev-only, gardé par `NODE_ENV === "development"`. À ne jamais activer en
   production, et à supprimer si l'environnement de recette est exposé.
5. **Suppression des comptes inactifs.** Le Beschluss de la DSK insiste sur la suppression
   automatisée après une période d'inactivité. Rien n'est planifié aujourd'hui ; il faudra une
   tâche périodique (par exemple : suppression après trois ans sans connexion, avec préavis par
   e-mail).
6. **Archivage séparé des pièces comptables (« Datensperrung »).** La DSK demande de séparer
   techniquement les données conservées au seul titre d'une obligation légale des données en
   accès opérationnel. Aujourd'hui, la commande anonymisée reste dans la même table, marquée par
   `anonymizedAt`. L'étape suivante est un stockage à accès restreint et journalisé, puis une
   purge automatique à huit ans (sous réserve de l'*Ablaufhemmung* du § 147 al. 3 AO : un
   contrôle fiscal gèle la purge).
7. **Rattachement des commandes invité après coup.** Non implémenté, et volontairement : rien ne
   prouverait que l'adresse e-mail d'une commande invité appartient au titulaire du compte. Il
   faudrait exiger le numéro de commande **et** le jeton d'accès reçu par e-mail.
8. **Liste des sessions actives et révocation.** Recommandée par l'OWASP Session Management
   Cheat Sheet. Suppose de passer d'un jeton auto-porté à des sessions stockées en base.
9. **Blocklist de mots de passe compromis** (API k-anonymity de Have I Been Pwned) : la mesure
   au meilleur rapport efficacité/friction, non implémentée.
10. **Datenschutzerklärung.** `src/content/legal/fr.ts` et `en.ts` doivent décrire le traitement
    « Kundenkonto » : finalités, base légale, durée de conservation, sort des données à la
    suppression du compte. Ce n'est pas fait par cette livraison.
11. **Lien « Konto » de l'en-tête.** Il pointe toujours vers `/konto`, qui rend le tableau de
    bord au client connecté et redirige les autres vers `/konto/anmelden`. Lire le cookie
    directement dans `src/components/Header.tsx` rendrait dynamiques toutes les pages du
    catalogue, aujourd'hui prérendues (`generateStaticParams`). Le comportement visible est le
    bon ; le coût, lui, est nul. À revoir si le projet active un jour le rendu partiel
    prégénéré, qui permettrait de lire la session sans sacrifier le prérendu.

---

## 6. Sources

- DSK, *Beschluss* du 24 mars 2022, « Datenschutzkonformer Online-Handel mittels Gastzugang » —
  <https://www.datenschutzkonferenz-online.de/media/dskb/20222604_beschluss_datenminimierung_onlinehandel.pdf>
- OLG Hamburg, 27 février 2025, 5 U 30/24 (limites du Beschluss précédent)
- § 147 AO — <https://www.gesetze-im-internet.de/ao_1977/__147.html>
- § 257 HGB — <https://www.gesetze-im-internet.de/hgb/__257.html>
- Viertes Bürokratieentlastungsgesetz (BEG IV), BGBl. du 29 octobre 2024 : justificatifs
  comptables ramenés de dix à huit ans au 1ᵉʳ janvier 2025
- § 14 al. 4 UStG (mentions obligatoires de la facture) ; § 312f et § 312j BGB
- RGPD, art. 5 § 1 c, 6 § 1 b, 7 § 4, 15, 16, 17 (dont § 3 b), 20, 32
- OWASP Authentication Cheat Sheet —
  <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>
- OWASP WSTG-IDNT-04, « Testing for Account Enumeration »
- OWASP Session Management Cheat Sheet —
  <https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html>
- BSI IT-Grundschutz ORP.4 (A13, A22, A23) —
  <https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Grundschutz/IT-GS-Kompendium_Einzel_PDFs_2023/02_ORP_Organisation_und_Personal/ORP_4_Identitaets_und_Berechtigungsmanagement_Editon_2023.pdf>

---

## 7. Compte de test laissé en base

Un seul compte de test subsiste, volontairement identifiable :

```
testkonto+claude@mlc-bois.fr   /   WiederEinNeuesPasswort26
```

Il porte la commande `HP-2026-000004`. À supprimer avant toute mise en production — depuis
`/konto/daten`, ce qui exerce au passage le chemin de suppression décrit au § 3.3.
La commande `HP-2026-000006` est le résidu anonymisé du compte de test supprimé, et
`HP-2026-000005` une commande invité de vérification.
