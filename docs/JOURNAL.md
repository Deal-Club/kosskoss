# Le Journal — module éditorial

Espace éditorial de la boutique : articles, rubriques, tags, auteurs.
Adresse publique `/journal`, administration `/admin/journal`.

## Architecture

```
src/types/journal.ts              types des blocs et des statuts

src/lib/journal/                  LOGIQUE PURE — testée, utilisable côté client
  blocks.ts       normalisation et contrôle des blocs (frontière de sécurité)
  content.ts      texte brut, chapeau automatique, temps de lecture, sommaire
  slug.ts         résolution du slug et gel après publication
  status.ts       visibilité publique, échéance, cohérence statut/dates
  seo.ts          replis des douze champs SEO
  related.ts      score des articles similaires
  listing.ts      filtrage et tri de la liste d'administration
  input.ts        normalisation du formulaire article

src/server/journal/               ACCÈS BASE — jamais importé par un client
  store.ts        CRUD d'administration, slug + redirection + tags + version
  read.ts         lectures publiques localisées (filtre unique)
  taxonomy.ts     rubriques, tags, auteurs
  taxonomyInput.ts normalisation de ces trois formulaires
  products.ts     résolution des produits cités par un bloc
  counter.ts      compteur de vues agrégé par jour
  schedule.ts     bascule des articles programmés
  revalidate.ts   invalidation ciblée du cache

src/components/journal/           boutique
src/components/admin/journal/     back-office
src/components/seo/ArticleJsonLd.tsx
```

La séparation `lib` / `server` n'est pas cosmétique : `ArticleForm` est un
composant client et importe `blocks`, `content` et `seo` pour l'aperçu SEO et le
temps de lecture en direct. Ajouter un import Prisma dans l'un de ces fichiers
casserait le bundle client.

## Décisions structurantes

**Le contenu est un tableau de blocs JSON, pas du HTML.** Le texte porte les
trois marques de `src/lib/richText.ts` et n'est rendu que par `<RichText />`,
qui produit des éléments React. Aucun `dangerouslySetInnerHTML`, donc aucune
balise collée dans le back-office ne s'exécute chez un visiteur : l'injection
est fermée par construction, pas par filtrage. **Ne pas remplacer l'éditeur de
blocs par un WYSIWYG** sans reprendre cette garantie.

**La corbeille est `deletedAt`, pas un statut.** Un article jeté conserve le
statut qu'il avait ; le restaurer le remet où il était. Prisma n'a pas de
suppression douce native : le filtre est appliqué dans `read.ts`, en un seul
endroit.

**Le slug gèle à la publication.** Tant qu'un article n'a jamais été publié, il
suit le titre. Ensuite il se fige ; un changement explicite crée une ligne
`ArticleRedirect` et la page article répond en 301. Renommer un titre ne casse
jamais une URL indexée.

**Les vues sont comptées côté client.** Un composant `ViewPing` appelle
`POST /api/journal/[slug]/view` après affichage, dédoublonné par
`sessionStorage`. Compter pendant le rendu coûterait une écriture en base par
visite. L'agrégat est journalier (`ArticleViewDay`) et le total dénormalisé
(`Article.viewCount`) : « les plus lus » ne fait jamais de `COUNT`.

**Les auteurs sont distincts des comptes d'administration.** `AdminUser` est un
accès technique protégé par un second facteur ; `ArticleAuthor` est une
signature publique avec photo et biographie. `adminUserId` relie les deux
quand c'est la même personne.

## Publication programmée

Deux mécanismes, volontairement redondants :

1. `POST /api/cron/journal`, protégé par `CRON_SECRET`, bascule
   `scheduled` → `published` et invalide le cache ;
2. `isPubliclyVisible` ne sert de toute façon que les articles dont la date est
   passée. Si le cron n'est pas branché, rien ne fuite ; s'il a du retard,
   l'article sort quand même à la première visite.

Tâche planifiée à poser (Coolify, cron système) :

```
*/5 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
    https://VOTRE-DOMAINE/api/cron/journal > /dev/null
```

Toutes les cinq minutes suffisent : une programmation éditoriale ne se joue pas
à la seconde, et le filtre de lecture couvre l'intervalle.

## Hygiène d'indexation

Le sitemap ne déclare pas tout ce qui existe :

| Page | Condition d'entrée au sitemap |
|---|---|
| `/journal` | au moins un article publié |
| `/journal/<slug>` | article publié, non archivé, hors corbeille |
| `/journal/categorie/<slug>` | rubrique active **et** au moins un article |
| `/journal/tag/<slug>` | au moins **trois** articles (`TAG_INDEX_THRESHOLD`) |
| `/journal/auteur/<slug>` | auteur actif **et** au moins un article |

Les pages exclues restent accessibles par leur adresse, mais portent un
`noindex`. Une page vide indexée est une dette, pas un gain.

## Routage — un piège à connaître

La boutique occupe la racine avec `/[locale]/[group]/[category]/[product]`.
Next fait toujours gagner un segment statique sur un segment dynamique, donc
`/journal` fonctionne — mais **un univers produit dont le slug serait `journal`
deviendrait injoignable**. La constante `RESERVED_CATALOG_SLUGS`
(`src/lib/journal/slug.ts`) existe pour ça ; elle n'est pas encore branchée sur
la validation des groupes et catégories du catalogue, c'est un point à traiter.

Pour la même raison, les rubriques et tags vivent sous `/journal/…` et non à la
racine : `/categorie/<slug>` serait entré en concurrence avec `[group]`.

## Commandes

```
npm run db:seed:journal     8 articles de démonstration, 3 rubriques, 7 tags
npm test                    139 tests sur la logique pure du module
npx tsc --noEmit
npm run lint
npm run build
```

## Ce qui reste à faire

- **Traduction du corps des articles.** Les colonnes `blocksEn` existent et sont
  lues ; le formulaire ne permet encore de traduire que le titre et le chapeau.
  La boutique anglaise affiche le contenu français en repli.
- **Commentaires.** Table `ArticleComment` créée avec son circuit de validation
  (`pending`/`approved`/`rejected`), aucune route publique, aucun formulaire.
- **Restauration de versions.** `ArticleRevision` est écrite à chaque
  enregistrement ; la relecture et la restauration ne sont pas exposées.
- **Slugs réservés du catalogue.** Voir la section « Routage » ci-dessus.
- **`NEXT_PUBLIC_SITE_URL`.** `src/lib/hreflang.ts`, `src/app/sitemap.ts` et
  `src/app/robots.ts` retombent sur `https://mlc-bois.fr` quand la variable est
  absente — vestige de l'ancien projet. Les canoniques du Journal en dépendent.
