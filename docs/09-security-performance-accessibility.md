# 09 — Sécurité, performance, accessibilité, observabilité

## 1. Sécurité

### Acquis (à conserver)
- Sessions signées HMAC-SHA256, secrets admin/client **distincts**, cookies httpOnly/secure/sameSite lax, `timingSafeEqual`.
- Mots de passe **scrypt** ; 2FA e-mail admin ; jetons de reset stockés en SHA-256 seulement.
- Secrets d'intégration chiffrés **AES-256-GCM**, jamais renvoyés en clair.
- **Recalcul serveur** des prix/stock/totaux au checkout ; webhooks paiement à **montant + devise re-vérifiés**.
- Upload validé par **signature de fichier** (magic bytes), taille max 5 Mo.
- Prisma (requêtes paramétrées) → pas d'injection SQL.
- Pas de révélation d'existence de compte.

### À renforcer pour Koss Koss
| Point | Risque | Action |
|---|---|---|
| **RBAC ad hoc** | une session admin suffit souvent, rôle rarement vérifié | contrôle de permission explicite par action (masquer un bouton ne protège pas) |
| **Rate-limiting en mémoire** | perte au redémarrage, inefficace multi-instance | store partagé (DB/Redis) si multi-instance |
| **Pas de jeton CSRF** | reliance seule sur SameSite | ajouter CSRF sur les mutations sensibles, ou vérifier Origin |
| **En-têtes de sécurité / CSP** | non audités | définir CSP (attention aux `CodeSnippet` injectés), HSTS, X-Content-Type-Options, Referrer-Policy |
| **Snippets HTML injectés** | exécution de HTML tiers (`CodeSnippet`) | déjà réservé admin ; encadrer par CSP + journal `updatedBy` (présent) |
| **Webhooks** | pas de déduplication persistée | idempotence via table d'événements |
| **Messages d'erreur publics** | ne doivent pas exposer trace/SQL/chemin/secret | normaliser via `ApiError` (voir `04`) |
| **Nexi** | adaptateur jamais testé | paiement de test obligatoire avant activation |

## 2. Performance (cibles p75 : LCP ≤ 2,5 s · INP ≤ 200 ms · CLS ≤ 0,1)

### Acquis
- `next/image` utilisé systématiquement (`sizes`, `priority` ciblé sur hero/logo).
- Server Components dominants (JS client minimal) ; un seul `"use client"` de page.
- Build : workers plafonnés à 4 + `staticGenerationMinPagesPerWorker` (évite l'écroulement Prisma/Neon).
- `prefers-reduced-motion` respecté.

### À faire
- Mesurer **avant/après** (Lighthouse/Web Vitals) sur données réelles.
- Attribut `sizes` correct partout, dimensions fixes des médias (éviter CLS), formats modernes (WebP/AVIF déjà acceptés à l'upload).
- Limiter les scripts tiers (`CodeSnippet`, Smartsupp, WhatsApp) ; chargement différé.
- Découper les composants volumineux (voir §4) ; éviter les requêtes en cascade ; Suspense/streaming où utile.
- Ne pas charger toutes les images du catalogue au premier rendu ; ne pas mettre une page entière en Client Component.

## 3. Accessibilité (cible WCAG 2.2 AA)

### Acquis
- Labels reliés aux champs, `aria-invalid`, `role="status"`/`role="alert"`, `aria-label` sur liens iconographiques, `aria-hidden` sur décoratif, Breadcrumb labellisé.

### À tester systématiquement (cf. `06`)
Navigation clavier, ordre de tabulation, focus visible, lien d'évitement, menus, tiroirs (panier), modales (focus piégé + Échap), formulaires, contraste, textes alternatifs, boutons iconiques, **annonce des mises à jour du panier** (aria-live), champs obligatoires, états désactivés, réduction d'animations, zoom 200 %, mobile, lecteurs d'écran sur les parcours clés. Privilégier les éléments natifs HTML.

## 4. Composants volumineux à découper (dette qualité)

| Fichier | Taille approx. | Note |
|---|---|---|
| `src/components/checkout/CheckoutFlow.tsx` | ~715 lignes | tunnel 3 étapes → sous-composants |
| `src/app/[locale]/confirmation/[orderNumber]/page.tsx` | ~424 lignes | — |
| `src/components/admin/ProductForm.tsx` | ~535 lignes | admin |
| `src/components/admin/LegalPageForm.tsx` | ~522 lignes | admin |
| `src/app/admin/(protected)/campaigns/[id]/page.tsx` | ~591 lignes | admin |
| `src/components/cart/CartView.tsx` | ~304 lignes | limite |
| `src/components/PaymentIcons.tsx` | ~299 lignes | icônes inline |

## 5. Observabilité & suivi (§20)

- Gérer proprement : erreurs serveur/client, `requestId`, événements métier (commandes, paiements, webhooks, échecs e-mail, erreurs de stock). Journaux d'événements déjà présents (`OrderEvent`, `CampaignEvent`).
- **Ne jamais journaliser** données personnelles ni informations de paiement.
- Plan de mesure : vue produit, recherche, filtre, ajout/retrait panier, début de paiement, achat, coupon, erreur de paiement.
- **Ne copier aucun identifiant Google Analytics / publicitaire** de l'ancien projet ; nouveaux identifiants Koss Koss uniquement.

## 6. Tests (§19)

Outils présents : `node --test` + `tsx` (tests unitaires natifs). À compléter selon besoin : tests de composants, intégration, **contrats API**, e2e (Playwright recommandé), accessibilité (axe), visuels.
Parcours e2e prioritaires : catalogue, recherche, filtre, sélection variante, ajout/modif/suppression panier, connexion, création compte, commande, **échec** et succès de paiement, consultation commande, création/édition produit admin. Cas non nominaux : produit/variante indisponible, prix modifié, coupon invalide, stock insuffisant, session expirée, API indisponible, image manquante, paiement refusé, double soumission.
