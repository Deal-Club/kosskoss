# Mission — Système éditorial « Le Journal » pour KossKoss Select

Tu vas construire un **module éditorial complet** dans ce dépôt : pas un CRUD
`titre + contenu + image`, mais un vrai CMS de contenu intégré au back-office
existant, à la boutique existante et au SEO existant.

Le point le plus important n'est pas la liste des fonctionnalités ci-dessous :
c'est que **le module ressemble au reste du code**. Ce dépôt a des conventions
fortes, documentées dans les commentaires. Un module qui les ignore est un
échec, même s'il fonctionne.

---

## 0. Contexte technique — déjà vérifié, ne le redécouvre pas

| Sujet | Réalité du dépôt |
|---|---|
| Framework | Next.js **16.2** App Router, React 19.2, TypeScript strict |
| ⚠️ Version | Cette version de Next a des ruptures d'API. Lis `node_modules/next/dist/docs/` avant d'écrire du code de routage, de cache ou de metadata |
| Base | PostgreSQL (Neon) via Prisma **7**, client généré dans `src/generated/prisma` |
| Styles | Tailwind **v4** (tokens oklch dans `src/app/globals.css`), `cn()` dans `src/lib/utils.ts` |
| UI | `src/components/ui/` ne contient que `button.tsx` et `CountryCombobox.tsx` — le reste est écrit à la main |
| i18n | `next-intl`, FR à la racine, EN sous `/en`, `localePrefix: "as-needed"`, `localeDetection: false` |
| Icônes | `lucide-react` |
| Marque | KossKoss Select — concept-store cosmétique multimarque, marché Cameroun, devise XAF sans sous-unité (`src/config/brand.ts`) |
| Tests | `node --test --import tsx` sur `src/**/*.test.ts` (`npm test`) |
| Commandes | `npm run dev` · `npm run build` · `npm run lint` · `npm test` · `npm run db:migrate` · `npm run db:seed` |

**Incohérence documentaire connue, ne t'y fie pas :** `README.md`, `TARGET.md`
et plusieurs constantes parlent encore de « MLC Bois » (bois de chauffage). Le
projet réel est KossKoss Select. Ne recopie jamais l'ancienne marque.

---

## 1. Ce qui existe déjà — à RÉUTILISER, jamais à réécrire

Tu as l'interdiction de recréer ces briques :

**Back-office**
- Structure : `src/app/admin/(protected)/` — le layout appelle `requireAdminSession()`. Le back-office est **hors de `[locale]`**, donc entièrement en français.
- Session : cookie HMAC signé (`src/lib/adminAuth.ts`) + second facteur par e-mail (`AdminLoginChallenge`, `src/server/adminOtp.ts`).
- Garde des routes API : `requireAdminApi()` (`src/lib/adminApi.ts`) — union discriminée, `if (unauthorized) return unauthorized;`.
- Navigation : `src/components/admin/AdminSidebar.tsx` (sections `Catalogue` / `Boutique` / `Système`).
- Pagination : `paginate()` + `parsePageParam()` (`src/lib/pagination.ts`, 25 lignes/page, découpage en mémoire) + `<AdminPagination />`.
- Composants prêts : `ImageUploadField`, `GalleryUploadField`, `RichTextField`, `DeleteButton`, `IconAction`, `PreviewPanel`, `ThumbnailZoom`.

**Upload d'images**
- `POST /api/admin/upload` : Cloudinary si configuré, sinon `public/uploads/` en dev uniquement. Contrôle par **signature binaire** (pas par extension déclarée), 5 Mo max, JPG/PNG/WebP/AVIF.
- `next.config.ts` autorise déjà `res.cloudinary.com` dans `images.remotePatterns`.
- → Tu ne touches pas à cette route. Tu la consommes.

**Texte mis en forme — règle de sécurité structurante**
- `src/lib/richText.ts` : trois marques seulement (`**gras**`, `*italique*`, `[texte](lien)`), analysées en **arbre de nœuds React**, rendues par `<RichText />`. Jamais de `dangerouslySetInnerHTML`, jamais de HTML stocké en base. `isSafeHref()` refuse `javascript:`, `data:` et `//externe`.
- → L'injection est impossible **par construction**, pas par filtrage. Ce module doit respecter la même doctrine (voir §5).

**SEO**
- `alternatesFor(href, locale)` (`src/lib/hreflang.ts`) : canonical + hreflang + `x-default`.
- `<JsonLd />`, `<BreadcrumbJsonLd />`, `<OrganizationJsonLd />`, `<ProductJsonLd />` dans `src/components/seo/`.
- `absoluteUrl()` dans `src/server/merchant.ts`.
- `src/app/sitemap.ts` (catégories + produits) et `src/app/robots.ts`.
- `<Breadcrumb />` visible dans `src/components/Breadcrumb.tsx`.

**Publication différée**
- Modèle existant : `POST /api/cron/campaigns` protégé par `CRON_SECRET`, comparaison à temps constant, état entièrement en base, appel externe chaque minute. Aucune boucle en mémoire dans le processus.

**Divers réutilisable**
- `slugify()` (`src/lib/slugify.ts`) — gère `œ`/`æ`, essentiel en français.
- Newsletter : modèle `NewsletterSubscriber` + `POST /api/kk/newsletter` + `<NewsletterBand />`. **Le formulaire existe : branche-toi dessus, n'en crée pas un second.**
- Circuit de modération : `Review` (`pending`/`approved`/`rejected`) + `ReviewModerationTable` — c'est le patron à copier pour les commentaires.
- Chrome de la boutique : `AnnouncementBar`, `SiteHeader`, `SiteFooter` (`src/components/kk/chrome.tsx`).
- Traduction : `src/server/localizedContent.ts` — colonnes `*En` facultatives, repli systématique sur le français.
- Page JSON éditable depuis l'admin : `LegalContent` + `src/server/legalPageInput.ts` — **c'est le précédent direct du système de blocs**, lis-le avant de concevoir le tien.

---

## 2. Ce qui n'existe pas et doit être créé

Aucun modèle `Article`, `Post`, `Category` éditoriale, `Tag`, `Author` ou
`Comment` n'existe. Le mot « article » n'apparaît dans le code que pour
désigner une **ligne de commande** — ne réutilise pas ce terme dans les
libellés de la boutique, tu créerais une ambiguïté avec le panier.

Nom retenu pour l'espace éditorial : **« Le Journal »**, URL `/journal`.

---

## 3. Contraintes dures — non négociables

1. **Pas de processus en arrière-plan.** Pas de `setInterval`, pas de worker, pas de `&`/`nohup`. La publication programmée passe par la route cron.
2. **Pas de secret commité.**
3. **Pas de contenu inventé.** Ni faux témoignage, ni statistique fabriquée, ni certification imaginaire, ni lorem ipsum — y compris dans le seed. Contenu éditorial réel, plausible pour une boutique cosmétique camerounaise, ou champ laissé vide.
4. **Pas d'éditeur WYSIWYG produisant du HTML.** Voir §5.
5. **Pas de nouvelle dépendance sans me demander.** Ce dépôt valide à la main (`parseProductInput`, `normalizeLegalPage`) : **il n'y a pas de zod, n'en installe pas**. Pas de lib de dates, pas de lib de tests supplémentaire, pas de CSS-in-JS.
6. **Pas d'enum Prisma, pas de liste scalaire.** Contrainte assumée du schéma pour la portabilité : les statuts sont des `String` documentés par un type union TypeScript, les listes sont du JSON en `String`.
7. **Interdiction de casser l'existant.** Tu ne modifies ni le catalogue, ni le tunnel d'achat, ni les paiements, ni `src/data/categoryNav.ts` (vide volontairement).
8. **Commentaires et libellés en français.**
9. Travaille sur une branche. `git status` avant et après. Ne jamais écraser mes modifications non commitées (il y en a en cours sur `src/components/kk/*`).

---

## 4. Modèle de données

Migration additive uniquement (`npm run db:migrate`), aucune table existante
modifiée. Colonnes `*En` facultatives partout où du texte est affiché
publiquement, avec repli sur le français.

**`Article`** — champs attendus :
- Identité : `id` (cuid), `slug` `@unique`, `title` / `titleEn`, `excerpt` / `excerptEn`.
- Contenu : `blocks` (String JSON) / `blocksEn`.
- Média : `coverImage`, `coverAlt` / `coverAltEn`, `ogImage`.
- Organisation : `categoryId`, `authorId`, `featured` (Boolean).
- Cycle de vie : `status` (`draft` | `scheduled` | `published` | `archived`), `publishedAt?`, `scheduledAt?`, `deletedAt?` (corbeille), `createdAt`, `updatedAt`, `updatedBy` (e-mail admin, comme `LegalContent` et `CodeSnippet`).
- Lecture : `readingMinutes` (Int, calculé), `viewCount` (Int).
- SEO : `metaTitle` / `metaTitleEn`, `metaDescription` / `metaDescriptionEn`, `focusKeyword`, `canonicalUrl`, `robotsNoindex` (Boolean), `ogTitle`, `ogDescription`, `twitterTitle`, `twitterDescription`, `twitterImage`.
- Options : `commentsEnabled` (Boolean, par défaut `false`).

Index : `@@index([status, publishedAt])`, `@@index([categoryId])`,
`@@index([authorId])`, `@@index([featured, publishedAt])`, `@@index([deletedAt])`.

**`ArticleCategory`** : `slug` `@unique`, `label`/`labelEn`, `description`/`descriptionEn`, `image`, `metaTitle`, `metaDescription`, `position`, `parentId?` (auto-relation, hiérarchie sur **un seul niveau** — au-delà, la navigation devient illisible et le maillage SEO se dilue), `active`.

**`ArticleTag`** : `slug` `@unique`, `label`/`labelEn`. Liaison par table explicite `ArticleTagLink` (`@@id([articleId, tagId])`), cohérente avec `CampaignProduct` et `CustomerFavorite`.

**`ArticleAuthor`** : `slug` `@unique`, `name`, `bio`/`bioEn`, `avatar`, `role`, `socials` (JSON en String), `active`, `adminUserId?`.
→ Justification à conserver : `AdminUser` est un compte technique protégé par 2FA, sans biographie ni photo. Un auteur est une **identité publique**. Les deux ne se confondent pas ; le lien facultatif suffit.

**`ArticleRedirect`** : `oldSlug` `@unique`, `articleId`, `createdAt`. Alimenté automatiquement à chaque changement de slug d'un article **déjà publié** (§6).

**`ArticleRevision`** : `articleId`, `snapshot` (JSON de l'article), `updatedBy`, `createdAt`. Écrite à chaque publication et à chaque sauvegarde manuelle. La restauration peut arriver en v2 ; l'écriture des versions, elle, se fait dès la v1 — sinon l'historique démarre vide le jour où on en a besoin.

**`ArticleComment`** : modèle créé, **non exposé**. `articleId`, `authorName`, `authorEmail`, `body`, `status` (`pending`/`approved`/`rejected`), `createdAt`. Aucune route publique, aucun formulaire. On prépare la table, pas la fonctionnalité.

**Vues** : `ArticleViewDay` (`@@unique([articleId, day])`, `count`) + compteur dénormalisé `Article.viewCount`. Justification en §11.

**Corbeille** : Prisma n'a pas de soft-delete global. `deletedAt` est filtré explicitement dans la couche `src/server/journal/`, jamais dans les composants. Une seule fonction de lecture publique, pour qu'on ne puisse pas l'oublier.

---

## 5. Système de blocs

Le contenu est un **tableau JSON de blocs typés**, stocké dans `Article.blocks`.

- Types dans `src/types/journal.ts` : union discriminée sur `kind`.
- Validation dans `src/server/journal/blockInput.ts`, sur le modèle exact de `normalizeLegalPage()` : bornes de longueur, bloc inconnu refusé, `isSafeHref()` sur tout lien, rapport d'erreur lisible. **La validation est refaite côté serveur même si le formulaire l'a déjà faite** — une requête peut arriver sans passer par le formulaire.
- Rendu dans `src/components/journal/blocks/`, un composant par `kind`, un `<ArticleBlocks />` qui aiguille. Un `kind` inconnu **ne casse pas la page** : il est ignoré silencieusement (un article publié doit survivre à un futur retrait de bloc).
- Le texte à l'intérieur des blocs utilise les marques `richText` et passe par `<RichText />`. **Aucun HTML n'est stocké, aucun `dangerouslySetInnerHTML` n'est ajouté.**

Blocs de la v1 :

| Famille | `kind` |
|---|---|
| Texte | `paragraph`, `heading` (h2/h3), `list` (ordonnée ou non), `quote` |
| Média | `image` (avec `alt` obligatoire), `gallery`, `video` (YouTube/Vimeo : **identifiant seul**, jamais une URL libre, intégration `nocookie`) |
| Mise en avant | `callout` (`info` / `conseil` / `avertissement`), `stats` |
| Marketing | `cta` (lien interne), `productCard` (**slug produit** → réutilise `<ProductCard />`), `newsletter` (réutilise `<NewsletterBand />`) |
| Avancé | `faq` (alimente le schema `FAQPage`), `table`, `divider` |

Pas de bloc `code` : hors sujet pour une boutique cosmétique. Pas de bloc
`embed` libre : ce serait rouvrir l'injection que `richText` ferme.

Le bloc `productCard` est le point d'intérêt réel du module : il relie
l'éditorial au catalogue. Le produit est référencé par **slug**, résolu au
rendu — un prix recopié dans un article se désaligne au premier changement de
tarif, exactement pour la raison documentée sur le modèle `Routine`.

Ajouter un bloc en v2 doit coûter : un type, un cas de validation, un
composant. Rien d'autre.

---

## 6. URLs et routage — attention, il y a un piège

La boutique occupe déjà la racine avec `src/app/[locale]/[group]/[category]/[product]`.

**Conséquence à traiter explicitement :** un segment statique l'emporte sur
`[group]`. Donc `/journal` fonctionnera, mais un univers produit dont le slug
serait `journal` deviendrait injoignable. Ajoute `journal` à une liste de
slugs réservés vérifiée à la création d'un groupe et d'une catégorie produit.

Pour la même raison, **l'espace éditorial reste sous son préfixe** — pas de
`/categorie/...` ni `/tag/...` à la racine, qui entreraient en concurrence
avec les univers du catalogue :

```
/journal                          liste
/journal/<slug-article>           article
/journal/categorie/<slug>         catégorie éditoriale
/journal/tag/<slug>               tag
/journal/auteur/<slug>            auteur
/en/journal/...                   version anglaise
```

Slug : généré par `slugify()` depuis le titre, modifiable à la main, unique
(suffixe `-2`, `-3` en cas de collision). **Tant que l'article n'est pas
publié, le slug suit le titre.** Une fois publié, il se fige : toute
modification crée une ligne `ArticleRedirect` et une redirection 301 servie
par la page article. On ne casse pas une URL indexée en renommant un titre.

---

## 7. Back-office

Écrans, sous `src/app/admin/(protected)/journal/` :

- `page.tsx` — liste : vignette, titre, auteur, catégorie, statut, date, vues, « à la une », actions. Recherche, filtres (statut, catégorie, auteur), tri, pagination via `paginate()`, actions groupées (publier / repasser en brouillon / archiver / corbeille). Onglet corbeille avec restauration.
- `new/page.tsx` et `[id]/page.tsx` — formulaire.
- `[id]/apercu/page.tsx` — aperçu (§10).
- `categories/`, `tags/`, `auteurs/` — gestion simple, sur le modèle de `admin/groups` et `admin/categories`.

Le formulaire est **sectionné**, jamais un mur de champs : `Contenu` ·
`Publication` · `Organisation` · `Média` · `SEO` · `Options`. Chaque section
repliable, la section `Contenu` ouverte par défaut.

La section SEO affiche un aperçu du résultat Google (titre / URL / description)
avec compteur de caractères, et **montre la valeur de repli en grisé** quand le
champ est vide — l'administrateur doit voir que le titre de l'article servira
de `metaTitle`, pas croire que la balise sera absente.

Routes API sous `src/app/api/admin/journal/`, toutes gardées par
`requireAdminApi()`, normalisation dans `src/server/journal/*Input.ts`,
`revalidatePath()` après toute écriture qui change le rendu public.

Menu : nouvelle section **« Éditorial »** dans `AdminSidebar`, entre
`Boutique` et `Système` (icônes `Newspaper`, `FolderTree`, `Tags`, `PenLine`).

---

## 8. Front

Dans `src/components/journal/`, en réutilisant `AnnouncementBar` / `SiteHeader`
/ `SiteFooter` et les tokens Tailwind existants. **Tu ne modifies pas le design
global du site** : Cinzel pour les titres, Gilroy (et ses substituts) pour le
texte, Bleu Profond `#0F3B46` et Beige Sable `#F3E8DD`.

**Page `/journal`** : hero court, catégories, article à la une, grille des
récents, bloc « les plus lus », bande newsletter existante, pagination.

**Page article** : fil d'Ariane, catégorie, titre, chapeau, auteur, date,
temps de lecture, image de couverture, sommaire, blocs, partage, tags,
encart auteur, articles similaires, CTA.

**Sommaire** : généré à partir des blocs `heading` — pas d'analyse de HTML,
la structure est déjà dans les données. Ancres uniques et stables (`slugify()`
du titre + suffixe en cas de doublon).

**Partage** : Facebook, LinkedIn, X, **WhatsApp** (canal principal sur le
marché camerounais, cohérent avec le bouton WhatsApp du site) et copie du lien.
Liens simples, aucun SDK tiers.

**Lecture** : largeur de colonne confortable (~68 caractères), interlignage
généreux, images en `next/image` avec `sizes` correct. Mobile d'abord.

**Accessibilité** : HTML sémantique (`<article>`, `<time datetime>`, `<nav>`
pour le sommaire), hiérarchie de titres respectée (un seul `h1`, les blocs
`heading` produisent `h2`/`h3`), `alt` obligatoire sur les images, contrastes
conformes, navigation clavier.

---

## 9. SEO

- `generateMetadata` sur chaque page, avec `alternatesFor("/journal/...", locale)`.
- Replis intelligents : `metaTitle` vide → titre ; `metaDescription` vide → chapeau ; `ogImage` vide → image de couverture ; `ogTitle` vide → `metaTitle`. Ces replis vivent dans **une fonction pure testée** (`src/server/journal/seo.ts`), pas éparpillés dans les composants.
- Nouveau `src/components/seo/ArticleJsonLd.tsx`, à côté de `ProductJsonLd` : `BlogPosting` avec `headline`, `description`, `image`, `author` (`Person`), `publisher` (Organization KossKoss Select), `datePublished`, `dateModified`, `mainEntityOfPage`.
- `<BreadcrumbJsonLd />` existant, avec **exactement** les mêmes maillons que le fil d'Ariane visible — Google compare les deux.
- `FAQPage` généré depuis les blocs `faq`, uniquement s'il y en a.
- `src/app/sitemap.ts` étendu : articles publiés, catégories **ayant au moins un article**, auteurs **ayant au moins un article**, tags **à partir de 3 articles**. Une page vide indexée est une dette, pas un gain.
- Un article `archived`, `draft` ou en corbeille sort du sitemap et renvoie 404 publiquement.
- `robots.ts` : `/admin` et `/api` restent bloqués, rien à ajouter côté journal.

**⚠️ À me signaler avant de coder, sans le corriger de ton propre chef :**
`src/lib/hreflang.ts`, `src/app/sitemap.ts` et `src/app/robots.ts` retombent
sur `https://mlc-bois.fr` quand `NEXT_PUBLIC_SITE_URL` n'est pas défini. Toutes
les canoniques du journal pointeraient vers le mauvais domaine. C'est un
correctif d'une ligne, mais il touche tout le site : je décide.

---

## 10. Programmation, auto-save, aperçu

**Publication programmée** — deux mécanismes, volontairement redondants :
1. `POST /api/cron/journal`, protégé par `CRON_SECRET`, sur le modèle exact de `/api/cron/campaigns` (comparaison à temps constant, état en base) : bascule `scheduled` → `published` et `revalidatePath()`.
2. Filtre de lecture défensif : la boutique ne sert que `status = "published" ET publishedAt <= maintenant`. Si le cron n'est pas branché, rien ne fuite ; s'il a du retard, l'article sort quand même à la première visite.

Documente la ligne de crontab dans `docs/`, comme pour les campagnes.

**Auto-save** : `PATCH /api/admin/journal/[id]/autosave`, appelé en différé
(~3 s d'inactivité), avec `expectedUpdatedAt` dans le corps. Si la valeur ne
correspond plus, le serveur refuse en 409 et l'interface prévient au lieu
d'écraser. Indicateur « Enregistré il y a Xs ». **Auto-save n'écrit jamais sur
un article publié** : il alimente le brouillon, la publication reste un geste
explicite.

**Aperçu** : `/admin/journal/[id]/apercu`, composant serveur qui rend le
**même** `<ArticleView />` que la page publique. Protégé par le layout admin,
donc aucun jeton public à inventer, aucune surface d'attaque ajoutée. Meta
`noindex` sur la page d'aperçu.

---

## 11. Vues, articles similaires, recherche

**Vues** — la contrainte vient du rendu : les pages du site sont
statiquement générées (voir `next.config.ts`, quatre workers, Neon). Compter
les vues pendant le rendu rendrait chaque article dynamique et coûterait une
écriture en base par visite. Donc :
- ping client après montage vers `POST /api/journal/[slug]/view` ;
- dédoublonnage par `sessionStorage` côté client + fenêtre courte côté serveur ;
- écriture par `upsert` sur `ArticleViewDay` (une ligne par article et par jour) plus incrément de `Article.viewCount` ;
- « les plus lus » lit le compteur dénormalisé, jamais un `COUNT`.

**Articles similaires** : score explicite dans une fonction pure testée —
tags communs (poids fort), même catégorie (poids moyen), récence
(départage). 3 articles, jamais celui qu'on lit, repli sur les récents de la
même catégorie si le score est nul partout.

**Recherche** : réutilise la normalisation `fold()` de
`src/app/[locale]/recherche/page.tsx` (accents, `œ`/`æ`) plutôt que d'en
écrire une deuxième. Recherche sur titre, chapeau, texte des blocs, tags,
catégorie. La page de résultats reste `noindex`, comme la recherche produits.

---

## 12. Performance, sécurité, permissions

**Performance**
- `generateStaticParams()` sur les articles publiés, `dynamicParams = true`.
- `revalidatePath()` ciblé après publication — ne recopie pas le `revalidatePath("/", "layout")` des produits, qui invalide tout le site.
- Aucune requête N+1 : `include` explicites, agrégats calculés en une passe.
- Les blocs sont lus en une seule colonne JSON : pas de table fille par bloc.
- `cache()` de React pour les lectures partagées entre `generateMetadata` et la page (le patron existe déjà dans `src/server/legalPages.ts`).

**Sécurité**
- Toute route admin passe par `requireAdminApi()`.
- Validation serveur systématique, avec bornes de longueur.
- Aucun HTML stocké ni rendu (§5) — l'XSS est fermée par construction.
- Upload : route existante uniquement, jamais d'upload direct depuis le navigateur.
- Le ping de vues est la seule route publique en écriture : limite le débit et ignore silencieusement un slug inconnu.

**Permissions** — le dépôt n'a que deux rôles : `owner` (`SUPERADMIN_ROLE`) et
`admin`. **N'invente pas un système RBAC** que le projet n'a pas. Pour la v1 :
tout administrateur authentifié gère le journal, seul `owner` peut vider la
corbeille définitivement. Si tu juges qu'un rôle `editor`/`author` est
indispensable, propose-le-moi séparément — c'est une modification du système
de comptes, pas du module éditorial.

---

## 13. Seed et tests

**Seed** : `prisma/seed-journal.ts`, ajouté à la chaîne `db:seed` du
`package.json` (aux côtés de `seed-kk`, `seed`, `seed-routines`). Idempotent
par `upsert` sur le slug, comme les seeds existants.

Contenu : 3 catégories, une dizaine de tags, 2 auteurs, 6 à 8 articles
couvrant chaque statut (brouillon, programmé, publié, archivé, corbeille) et
chaque type de bloc. Sujets réels et utiles pour la marque — routines de soin,
lecture d'une liste d'ingrédients, entretien des cheveux crépus en saison
sèche, choix d'une protection solaire. **Aucune statistique, aucun témoignage,
aucune certification inventés.**

**Tests** (`npm test`, `node:test`), sur les fonctions pures :
- slug : génération, unicité, accents et ligatures, gel après publication, création de la redirection ;
- chapeau automatique depuis les blocs (jamais une troncature brutale de balisage) ;
- temps de lecture (vitesse configurable) ;
- normalisateur de blocs : bloc inconnu refusé, dépassement de longueur refusé, `javascript:` refusé, bloc `video` avec URL libre refusé ;
- replis SEO ;
- transitions de statut, y compris la programmation dans le passé ;
- score des articles similaires.

**Vérification à chaque phase**, dans cet ordre : `npx tsc --noEmit`,
`npm run lint`, `npm test`, puis `npm run build` en fin de parcours. Un écran
n'est « fait » qu'après avoir été ouvert dans le navigateur.

---

## 14. Déroulé imposé

Ne livre pas tout d'un bloc. À chaque phase : les fichiers créés, les fichiers
modifiés, les migrations, les commandes à exécuter, les vérifications passées,
ce qui reste.

| Phase | Contenu | Vérification |
|---|---|---|
| 0 | **Analyse et architecture, sans une ligne de code.** Ce qui existe, ce que tu réutilises, ce que tu crées, les risques de collision, tes choix et leurs raisons. **Tu t'arrêtes et tu attends ma validation.** | — |
| 1 | Schéma Prisma + migration + types + fonctions pures (slug, chapeau, temps de lecture, replis SEO) et leurs tests | `tsc`, `test` |
| 2 | Couche serveur `src/server/journal/` : lectures publiques filtrées, écritures, normalisateurs | `test` |
| 3 | Back-office : liste, filtres, corbeille, actions groupées | écran ouvert |
| 4 | Formulaire + éditeur de blocs + upload | article créé de bout en bout |
| 5 | Catégories, tags, auteurs | écrans ouverts |
| 6 | Front : `/journal` et pages de listing | rendu vérifié |
| 7 | Page article : sommaire, blocs, similaires, partage | rendu vérifié |
| 8 | SEO : metadata, JSON-LD, sitemap, redirections | balisage validé |
| 9 | Programmation (cron), auto-save, aperçu | cycle complet testé |
| 10 | Recherche, vues, performance, revue de sécurité | `build` |
| 11 | Seed, tests finaux, note de session | `test`, `build` |

---

## 15. Ce que je dois pouvoir faire à la fin

Créer un article → choisir auteur, catégorie, tags → poser une image →
composer avec des blocs, y compris une fiche produit du catalogue → régler le
SEO → prévisualiser → enregistrer en brouillon → programmer → publier →
suivre les vues → archiver → restaurer.

Et côté visiteur : Accueil → Journal → catégorie → article → lecture →
sommaire → partage WhatsApp → auteur → articles similaires → produit du
catalogue.

---

## 16. Avant de commencer

Pose-moi toutes tes questions maintenant plutôt que de supposer. En
particulier :

1. « Le Journal » et `/journal` te conviennent-ils, ou préfères-tu un autre nom ?
2. Le journal doit-il être **bilingue dès la v1** (colonnes `*En` remplies) ou français seul, l'anglais retombant sur le français ?
3. Le bloc `productCard` doit-il aussi remonter les articles liés **sur la fiche produit** (« lire aussi »), ou le lien reste-t-il à sens unique pour l'instant ?
4. Y a-t-il déjà des articles existants à reprendre quelque part (WordPress, Notion, document) ?

Ne remplace aucune technologie en place parce que tu en préfères une autre.
Quand plusieurs solutions se valent, dis en une phrase laquelle tu choisis et
pourquoi.
