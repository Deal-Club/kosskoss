# Lot 3D — Rôles et autorisations du back-office

**Critère visé :** 12 (rôles Administrateur / Gestionnaire de commandes).

**C'est le seul point de sécurité du chantier.** Tous les autres lots corrigeaient
des chiffres ou des libellés ; celui-ci ferme une porte ouverte.

---

## 1. L'état des lieux, sans ménagement

`AdminUser` porte déjà une colonne `role` avec trois valeurs en usage —
`superadmin`, `owner`, `admin` — et l'écran `/admin/users` permet de la changer.

**Cette colonne ne sert à rien.** Elle n'est lue nulle part pour autoriser quoi que
ce soit :

- `AdminSession` (`src/lib/adminAuth.ts:35`) ne transporte que `email` et `userId` ;
- `requireAdminApi` (`src/lib/adminApi.ts`) vérifie qu'une session existe, et rien
  d'autre ;
- `requireAdminSession` (`src/lib/dal.ts:12`) fait de même pour les pages.

**Conséquence : tout compte authentifié peut tout faire.** Un compte créé pour
suivre les commandes peut changer les prix du catalogue, modifier la passerelle de
paiement, exporter les ventes et créer d'autres comptes administrateurs. Le seul
usage réel du rôle aujourd'hui est cosmétique : masquer les comptes `superadmin`
dans la liste (`src/server/admins.ts:105`).

Un rôle qu'on affiche et qu'on ne vérifie pas est pire que pas de rôle du tout : il
fait croire à une cloison qui n'existe pas.

---

## 2. Ce que ce lot établit

### 2.1 Quatre rôles

| Rôle | Ce qu'il est |
|---|---|
| `superadmin` | compte technique, invisible dans la liste. Tout. |
| `owner` | le propriétaire de la boutique. Tout, y compris les accès. |
| `admin` | administrateur. Tout sauf la gestion des comptes. |
| `gestionnaire` | **nouveau** — gestionnaire de commandes. Les commandes, les clients, les avis. Rien d'autre. |

`gestionnaire` est le rôle que le cahier des charges demande et qui manquait. Les
trois autres existent déjà et gardent leur sens.

### 2.2 L'autorisation se dit en capacités, pas en adresses

Le back-office compte 26 familles de routes et 20 écrans. Écrire la règle route par
route garantit qu'une route ajoutée demain sera oubliée — et une route oubliée est
une route ouverte.

Cinq capacités, et chaque route en réclame exactement une :

| Capacité | Ce qu'elle couvre |
|---|---|
| `catalogue` | produits, catégories, univers, tags, stock, import/export, Merchant, envoi de fichiers |
| `commandes` | commandes, clients, avis, virements, ventes et export comptable |
| `contenu` | journal, pages légales, bandeau d'annonce, campagnes, scripts |
| `reglages` | paramètres, intégrations, passerelle et moyens de paiement, codes promo, diagnostic |
| `acces` | comptes administrateurs |

| Rôle | catalogue | commandes | contenu | reglages | acces |
|---|---|---|---|---|---|
| `superadmin` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `owner` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `admin` | ✔ | ✔ | ✔ | ✔ | — |
| `gestionnaire` | — | ✔ | — | — | — |

**Le gestionnaire voit les ventes.** C'est délibéré : suivre les commandes sans
voir ce qu'elles rapportent n'a pas de sens, et la marge est déjà lisible sur
chaque fiche produit qu'il ne peut pas modifier.

### 2.3 Le rôle est relu en base à chaque requête

**Décision : le rôle ne va PAS dans le jeton de session.**

Le mettre dans le jeton serait plus rapide d'une requête. Mais un jeton vit
plusieurs jours : rétrograder un compte, ou le désactiver, ne prendrait effet qu'à
sa prochaine connexion. Pour une porte de sécurité, c'est le mauvais compromis —
on révoque un accès parce qu'on veut qu'il cesse maintenant.

La lecture est mémoïsée par requête avec `cache()` de React, comme l'est déjà
`getAdminSession` : une requête de base par requête HTTP, pas une par vérification.

**Le drapeau `active` est vérifié au même endroit.** Aujourd'hui il n'est consulté
qu'à la connexion : un compte désactivé garde son accès jusqu'à l'expiration de son
jeton. Ce lot le referme.

**Un compte introuvable ou désactivé perd l'accès immédiatement**, sans distinction
de rôle : le refus par défaut est la seule position sûre.

### 2.4 Refuser par défaut

`requireCapacite(capacite)` remplace `requireAdminApi()` dans les routes et
`requireAdminSession()` dans les pages. Aucune route n'obtient d'accès sans nommer
sa capacité.

Un test parcourt l'arborescence des routes d'administration et **échoue si une
route n'exige aucune capacité**. C'est le seul garde-fou qui survivra aux lots
suivants : sans lui, la trente-cinquième route sera ouverte, et personne ne le
saura.

Exception unique et nommée : `login`, `logout` et la vérification de code, qui
précèdent par nature toute session.

### 2.5 Ce que voit le gestionnaire

- **Le menu** ne montre que les sections qu'il peut ouvrir. Un menu qui affiche des
  entrées menant à un refus est une invitation à croire à un bogue.
- **La page d'accueil du back-office** est aujourd'hui un tableau de bord du
  catalogue. Pour un gestionnaire, elle redirige vers les commandes.
- **Une page refusée** rend un 403 lisible en français, avec un lien vers ce à quoi
  il a droit — pas une redirection silencieuse vers la connexion, qui ferait croire
  à une session expirée.
- **Une route API refusée** rend `403` et un corps `{ error: "Accès refusé." }`,
  distinct du `401` de l'absence de session. Confondre les deux ferait déconnecter
  l'utilisateur au lieu de l'informer.

---

## 3. Ce qui ne bouge pas

- **La connexion** — mot de passe, code à usage unique, cookie signé : inchangés.
- **Les comptes existants** — la migration ne touche aucune donnée. Tous les comptes
  gardent leur rôle actuel, et `admin` reste le défaut.
- **La visibilité des comptes `superadmin`** — la règle existante est conservée.
- **Le partitionnement du catalogue par gestionnaire** — hors périmètre : le cahier
  des charges ne demande pas que deux gestionnaires voient des commandes
  différentes.

---

## 4. Architecture

```
src/lib/kk/roles.ts        pur — rôles, capacités, matrice, `peut(role, capacite)`
src/lib/kk/roles.test.ts   pur — la matrice, cas par cas
src/server/kk/acces.ts     lecture mémoïsée du rôle en base + garde-fous
src/lib/adminApi.ts        `requireCapaciteApi(capacite)`
src/lib/dal.ts             `requireCapacitePage(capacite)`
src/lib/kk/routesAdmin.ts  pur — la capacité de chaque famille de routes
src/app/api/admin/**       chaque route nomme sa capacité
src/app/admin/(protected)/** chaque page nomme sa capacité
src/components/admin/AdminSidebar.tsx  le menu suit les capacités
src/app/admin/(protected)/refuse/page.tsx  le 403 lisible
prisma/schema.prisma       aucune migration — la colonne existe déjà
```

**Aucune migration.** La colonne `role` est déjà là, avec le bon type et le bon
défaut. Ajouter une valeur à une colonne texte ne demande rien à la base.

---

## 5. Tests

Le module pur des rôles est testé sans base : la matrice complète — quatre rôles ×
cinq capacités — plus le refus d'un rôle inconnu, qui doit se comporter comme le
rôle le moins privilégié et non comme un administrateur.

Un test d'arborescence vérifie que chaque route et chaque page d'administration
déclare une capacité. Il lit le système de fichiers, pas la base.

Les gardes serveur ne sont pas testées unitairement : le dépôt n'a aucune
infrastructure de test avec base de données. Elles sont vérifiées à la main, et le
plan dit exactement quoi essayer avec quel compte.

---

## 6. Le risque de ce lot, nommé

**Une porte fermée trop fort empêche de travailler.** Si la matrice est trop
stricte, le propriétaire de la boutique découvre en production qu'il ne peut plus
faire son travail. C'est pourquoi `owner` et `admin` gardent tout sauf les accès :
le seul rôle réellement restreint est le nouveau, qui n'est encore attribué à
personne.

**Le compte de secours.** Avant la fusion, il faut s'assurer qu'au moins un compte
`owner` ou `superadmin` existe et fonctionne. Un back-office où plus personne ne
peut créer de comptes se rouvre par une requête SQL — c'est faisable, mais cela ne
doit pas être découvert un dimanche.
