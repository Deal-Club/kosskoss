# Images produits

Les visuels envoyés depuis le back-office partent sur **Cloudinary**, un service
d'hébergement d'images avec CDN. Le champ `image` du produit contient alors
l'URL complète renvoyée par Cloudinary, et le fichier survit aux déploiements.

Tant que les clés Cloudinary ne sont pas renseignées, le site continue de
fonctionner : voir « Que se passe-t-il sans clés ? » plus bas.

---

## 1. Créer le compte Cloudinary

1. Aller sur <https://cloudinary.com> et cliquer sur **Sign up for free**.
2. Créer le compte (e-mail professionnel, mot de passe).
3. À la question sur le produit souhaité, choisir **Programmable Media**.
4. Valider l'e-mail de confirmation.

Le plan gratuit couvre largement une boutique de cette taille : 25 crédits par
mois, soit environ 25 Go de stockage ou de bande passante. Aucune carte
bancaire n'est demandée.

## 2. Relever les trois valeurs

Une fois connecté, ouvrir **Settings → API Keys** (ou le bandeau
« Product Environment Credentials » du tableau de bord). Trois valeurs sont
nécessaires :

| Valeur dans Cloudinary | À reporter dans           | Exemple                  |
| ---------------------- | ------------------------- | ------------------------ |
| **Cloud name**         | `CLOUDINARY_CLOUD_NAME`   | `dh8k2xqzv`              |
| **API Key**            | `CLOUDINARY_API_KEY`      | `348217659134872`        |
| **API Secret**         | `CLOUDINARY_API_SECRET`   | `aB3…` (cliquer sur l'œil pour l'afficher) |

L'**API Secret** est un mot de passe : il ne doit jamais être publié, ni collé
dans un e-mail, ni committé dans le dépôt.

## 3. Renseigner les valeurs

Uniquement par variables d'environnement : dans `.env.local` en local, ou dans
les variables d'environnement de l'hébergeur.

```
CLOUDINARY_CLOUD_NAME=dh8k2xqzv
CLOUDINARY_API_KEY=348217659134872
CLOUDINARY_API_SECRET=votre-secret
```

Un redémarrage de l'application est nécessaire après les avoir ajoutées.

> Ces trois clés **ne sont plus saisissables depuis le back-office**. Elles
> n'apparaissent donc pas dans « Intégrations & clés API », qui reste réservé
> aux clés métier (Stripe, PayPal, Klarna, SMTP).

---

## Où atterrissent les images

Dossier Cloudinary : **`hausgeraete-pfeffer/products`**.

Chaque fichier reçoit un identifiant lisible dérivé de son nom d'origine, plus
un suffixe aléatoire pour qu'un même nom n'écrase jamais un envoi précédent
(`bosch-serie-6-k3f9a1`).

À l'envoi, l'image est bornée à **1600 × 1600 px** (réduction seulement, jamais
d'agrandissement) et recompressée automatiquement. L'URL enregistrée en base
contient `f_auto,q_auto` : Cloudinary sert alors de l'AVIF ou du WebP selon le
navigateur, à la compression la plus adaptée.

Exemple d'URL stockée :

```
https://res.cloudinary.com/dh8k2xqzv/image/upload/f_auto,q_auto/v1753500000/hausgeraete-pfeffer/products/bosch-serie-6-k3f9a1.jpg
```

Le domaine `res.cloudinary.com` est déjà autorisé dans `next.config.ts`
(`images.remotePatterns`), les images passent donc sans configuration
supplémentaire dans `next/image`.

### Contrôles conservés

L'envoi reste protégé exactement comme avant :

- session administrateur obligatoire ;
- type réel vérifié sur les octets de signature du fichier (JPG, PNG, WebP,
  AVIF) — l'extension déclarée n'est pas crue sur parole ;
- 5 Mo maximum.

L'envoi passe **toujours par le serveur** (`POST /api/admin/upload`). L'API
secret ne quitte jamais le back-end, et aucun envoi direct depuis le navigateur
n'est possible.

---

## Que se passe-t-il sans clés ?

| Contexte              | Comportement                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Développement (`npm run dev`) | L'image est écrite dans `public/uploads/` comme avant. Le formulaire affiche un avertissement orange rappelant que ces fichiers disparaissent à chaque déploiement. |
| Production            | L'envoi est **refusé** (HTTP 503) avec un message expliquant qu'il faut renseigner les clés Cloudinary. Rien n'est écrit sur le disque, qui serait de toute façon effacé au déploiement suivant. |

Le reste du site n'est pas affecté : les produits qui ont déjà une image
continuent de l'afficher, et le champ « image » accepte toujours la saisie
manuelle d'un chemin (`/images/products/…`) ou d'une URL.

Dès que les trois clés sont renseignées, la bascule est automatique : aucun code
à modifier, aucune migration à lancer.

---

## Migrer les images déjà présentes dans `public/uploads/`

Ces fichiers ne sont pas repris automatiquement. Le plus simple, vu le volume :

### Option 1 — réenvoyer depuis le back-office

Pour chaque produit concerné, ouvrir sa fiche, cliquer sur **Envoyer une image**
et sélectionner le fichier depuis `public/uploads/`. Le champ est mis à jour
avec la nouvelle URL Cloudinary. C'est la méthode à privilégier s'il reste
moins d'une vingtaine d'images.

### Option 2 — téléverser en masse dans Cloudinary

1. Dans Cloudinary, ouvrir **Media Library**, créer le dossier
   `hausgeraete-pfeffer/products`.
2. Glisser-déposer tout le contenu de `public/uploads/`.
3. Pour chaque image, copier l'URL (bouton **Copy URL**) et la coller dans le
   champ image du produit correspondant, dans le back-office.

Pour bénéficier de l'optimisation automatique sur ces URL copiées, insérer
`f_auto,q_auto/` juste après `/upload/` :

```
https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto/v1753500000/hausgeraete-pfeffer/products/mon-image.jpg
```

### Après la migration

Une fois toutes les images basculées, le dossier `public/uploads/` peut être
vidé. Il est déjà ignoré par git (`.gitignore`), rien n'est donc versionné.

---

## Détails techniques

- SDK : paquet npm `cloudinary` (v2), utilisé uniquement côté serveur.
- Code : `src/server/cloudinary.ts`
  - `isCloudinaryConfigured()` — les trois valeurs sont-elles disponibles ?
  - `uploadImage(buffer, { filename, folder })` — envoi par `upload_stream`,
    renvoie l'URL de livraison et le `public_id`.
  - `deleteImage(publicId)` — suppression d'un asset, avec purge du cache CDN.
  - `publicIdFromUrl(url)` — retrouve le `public_id` à partir d'une URL stockée.
- Route : `src/app/api/admin/upload/route.ts`. Réponse en cas de succès :

  ```json
  {
    "url": "https://res.cloudinary.com/…",
    "path": "https://res.cloudinary.com/…",
    "storage": "cloudinary",
    "publicId": "hausgeraete-pfeffer/products/bosch-serie-6-k3f9a1",
    "width": 1600,
    "height": 1200,
    "mime": "image/jpeg",
    "size": 348122
  }
  ```

  `storage` vaut `"local"` quand le repli développement a été utilisé.

- Les identifiants sont relus à chaque envoi (pas de cache en mémoire) : une clé
  saisie dans le back-office est prise en compte immédiatement.
- Aucune suppression automatique : changer l'image d'un produit laisse
  l'ancienne sur Cloudinary. Le ménage se fait depuis la Media Library, ou en
  appelant `deleteImage()` depuis un script.
