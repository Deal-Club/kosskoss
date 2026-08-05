# 07 — Architecture cible

## 1. Options comparées

### Option A — Une seule application Next.js (boutique + `/admin` + API partagée)
C'est **l'architecture actuelle de `mlcbois`**, qui fonctionne.
- **+** Aucune réécriture ; logique métier et types partagés en direct ; un seul déploiement ; SEO/SSR déjà en place ; le back-office existant est immédiatement réutilisable.
- **−** Couplage vitrine/admin dans un même déploiement ; bundle admin et boutique dans le même projet (mais séparés par segments de route).

### Option B — Monorepo (`apps/storefront`, `apps/admin`, `packages/*`)
- **+** Frontière nette public/admin ; packages `ui/types/api-client` réutilisables.
- **−** **Réécriture importante** : il faudrait éclater une app monolithique fonctionnelle, dupliquer la config, gérer un outil de monorepo, réintroduire une frontière API entre admin et domaine aujourd'hui appelés en direct. Coût et risque de régression élevés pour un bénéfice surtout esthétique. Le cahier des charges interdit explicitement de « transformer en monorepo uniquement parce que ça paraît plus moderne ».

### Option C — Deux projets séparés (ancien admin conservé + nouvelle boutique, communication par API typée)
- **+** Isole la refonte visuelle du back-office.
- **−** Duplication des types et du domaine ; il faudrait exposer une API publique stable là où tout est aujourd'hui interne ; deux déploiements, deux jeux de dépendances ; latence et surface d'attaque accrues.

## 2. Recommandation : **Option A** (fork adapté de `mlcbois`)

**Koss Koss = un fork propre de `mlcbois`**, conservant l'architecture d'application unique, sur lequel on remplace **la donnée, l'identité et le thème**, pas la structure.

Justification appuyée sur le dépôt :
1. `mlcbois` est **déjà** une application unique complète et fonctionnelle (auth, catalogue, commandes, paiement, SEO, i18n). Le travail restant est majoritairement **configuration + contenu + thème**, pas architecture.
2. La logique sensible (recalcul prix/stock/total, sessions, crypto, webhooks vérifiés) est saine et **directement réutilisable** — la réécrire introduirait un risque de régression sans gain.
3. Le back-office est riche et couvre les besoins ; le reconstruire serait du gaspillage (interdit par le cahier des charges §2).
4. Versions verrouillées (Next 16, React 19, Prisma 7, Node 22) : on ne change pas les versions majeures.

Ce que l'Option A ne coûte pas mais qu'on met en place quand même : une **frontière de validation typée (Zod)** et une **configuration marque centralisée** — bénéfices de la B/C sans leur coût.

## 3. Organisation cible dans le fork

```
koss-koss/  (fork de mlcbois, historique Git réinitialisé, secrets purgés)
  src/
    app/
      (shop)/[locale]/**      layout header complet
      (checkout)/[locale]/**  layout header minimal (cf nœud Figma 14:4743)
      admin/**                back-office (repris)
      api/**                  Route Handlers (repris)
    config/
      brand.ts                ← identité Koss Koss centralisée (nom, logo, couleurs, coordonnées, devise, locale, TVA, livraison, réseaux, SEO, analytics)
    domain/  (= src/server actuel, à renommer progressivement) règles métier
    lib/ components/ messages/ content/legal/ data/ i18n/
  packages? NON (pas de monorepo)
```

> Le passage `(shop)`/`(checkout)` en groupes de routes est une **évolution légère** de l'App Router existant, pas une réécriture.

## 4. Décisions d'architecture retenues

| Sujet | Décision |
|---|---|
| Type de projet | Application Next.js unique (Option A), fork de `mlcbois` |
| Router | App Router (conservé) |
| Rendu | Server Components par défaut, Client Components pour interactions (conservé) |
| TypeScript | strict (déjà actif) |
| Validation | **Introduire Zod** comme frontière unique client/serveur |
| Config marque | Fichier `src/config/brand.ts` unique + variables d'env pour les secrets |
| Statuts/rôles/devises | Constantes typées, **une seule source de vérité** (migrer les valeurs allemandes) |
| i18n | next-intl FR/EN (conservé) |
| Base | PostgreSQL/Prisma 7 (conservé) ; migrations **additives** uniquement |
| Paiement | Interface `PaymentProvider` conservée ; prestataire à décider (voir `11`) — **aucune clé côté navigateur** |
| Déploiement | à confirmer (Hostinger existant vs Vercel) — voir `11` |

## 5. Limites claires à préserver

`presentation` (app/components) → `application` (api) → `domain` (server) → `infrastructure` (lib/prisma/gateways/mailer). Interdits reconduits : appels API dispersés dans les composants d'affichage, logique métier dans l'UI, `any` injustifiés, réponses non validées, composants > ~300 lignes non découpés, duplication des règles de prix, dépendances circulaires.
