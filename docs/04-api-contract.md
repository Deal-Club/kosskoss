# 04 — Cartographie des API et contrat de données

~55 Route Handlers (`src/app/api/**/route.ts`) + flux publics (`src/app/feed/**`) + webhooks + cron. Validation **manuelle** (pas de Zod), centralisée dans des parsers `src/server/*Input.ts`. **Recalcul serveur systématique** des montants sensibles.

## 1. Routes publiques / client

| Route | Méthodes | Auth | Validation | Effets |
|---|---|---|---|---|
| `/api/account/login` | POST | publique | manuelle + rate-limit | session client |
| `/api/account/register` | POST | publique | `parseSignUpPayload()` | e-mail bienvenue (pas de session auto) |
| `/api/account/logout` | POST | client | — | efface cookie |
| `/api/account/profile` | PATCH | client | `parseProfilePayload()` | MàJ profil |
| `/api/account/addresses` | PUT | client | `parseAddressPayload()` | MàJ adresses |
| `/api/account/password/change\|forgot\|reset` | POST | client / publique | manuelle | reset (SHA-256 jeton) |
| `/api/account/delete` | POST | client | mot de passe + `confirm` | suppression + anonymisation commandes |
| `/api/account/export` | GET | client | — | export RGPD JSON |
| `/api/cart` | POST | publique | filtre lignes | **revalide prix/stock/promos en base** |
| `/api/checkout` | POST | client optionnel | `parseCheckoutPayload()` → `createOrder()` | **recalcule tout**, décrémente stock, e-mails, redirect paiement |
| `/api/reviews` | POST | publique | manuelle + anti-spam (mémoire) | avis `pending` |
| `/api/campaign-context` | GET | cookie campagne | — | contexte remise (no-store) |

## 2. Routes admin (toutes derrière `requireAdminApi()`)

| Domaine | Routes | Validation |
|---|---|---|
| Auth | `/api/admin/login`, `/login/verify`, `/login/resend`, `/logout` | manuelle + OTP + rate-limit |
| Produits | `/api/admin/products` (GET/POST), `/[id]` (GET/PUT/DELETE), `/export`, `/import` | `parseProductInput()` |
| Catégories/Univers | `/api/admin/categories`, `/[...id]`, `/groups`, `/groups/[id]` | manuelle + `parseGuide()` |
| Commandes | `/api/admin/orders/[id]` (GET/PATCH/DELETE) | enums `isOrderStatus`/`isPaymentStatus` |
| Avis | `/api/admin/reviews`, `/[id]` | enum statut |
| Campagnes | `/api/admin/campaigns` (+ `/[id]`, `/launch`, `/actions`, `/test`, `/contacts`, `/products`) | `parseCampaignInput()` |
| Moyens de paiement | `/api/admin/payment-methods`, `/[id]` | manuelle |
| Passerelle/Intégrations | `/api/admin/payment-gateway`, `/test`, `/integrations`, `/[key]` | vérif `isGatewayId` + secrets chiffrés |
| Utilisateurs | `/api/admin/users`, `/[id]` | e-mail/password/role + garde-fous |
| Stock | `/api/admin/stock` (GET/POST) | XOR delta/stock |
| Upload | `/api/admin/upload` | **magic bytes** (JPG/PNG/WebP/AVIF), max 5 Mo |
| Pages légales | `/api/admin/pages/[slug]` | `normalizeLegalPage()` |
| Virement | `/api/admin/bank-transfer` | manuelle |
| Snippets | `/api/admin/scripts`, `/[id]` | `normalizeCodeSnippet()` |

## 3. Webhooks / cron / feeds

| Route | Auth | Sécurité clé |
|---|---|---|
| `/api/payments/webhook/[provider]` | signature prestataire | **montant + devise re-vérifiés** contre `Order` ; mismatch → reste pending + log ; idempotent |
| `/api/cron/campaigns` | `CRON_SECRET` (Bearer/query) | comparaison timing-safe SHA-256 ; 503 en prod si absent |
| `/feed/google` | publique | RSS 2.0 Merchant, cache `s-maxage=3600`, produits actifs |
| `/feed/google-csv` | publique | TSV, cache 3600 |

## 4. Sécurité serveur (points vérifiés)

- **Prix/stock/total jamais fiés au client** : `createOrder()` (`src/server/orders.ts`) relit la base, applique promo, recalcule port ; `/api/cart` revalide.
- Sessions signées HMAC-SHA256, cookies httpOnly/secure/sameSite lax, `timingSafeEqual`.
- Secrets d'intégration chiffrés AES-256-GCM, jamais renvoyés en clair.
- Upload vérifié par signature de fichier.
- **Faiblesses** : rate-limiting **en mémoire** (perte au redémarrage, non multi-instance) ; **RBAC ad hoc** (toutes les routes admin exigent une session mais peu vérifient le rôle précis) ; **pas de jeton CSRF** ; anti-spam avis en mémoire.

## 5. Incohérences de nommage (à normaliser pour Koss Koss)

Mélange **FR / DE / EN** : statuts commande allemands (`eingegangen`, `bezahlt`…), motifs stock (`wareneistock…`), civilités (`herr/frau`), messages d'erreur parfois en allemand dans les réponses (`categories/[...id]`), `feeLabel "kostenlos"`, `Standardversand`. → **Une seule source de vérité** typée pour statuts/rôles/devises est recommandée.

## 6. Appels réseau depuis composants

Tous les `fetch()` client sont dans des **Client Components** légitimes (checkout, cart, formulaires admin, upload). Aucun appel réseau détecté dans un Server Component. Pas de logique métier sensible côté navigateur.

## 7. Contrat typé proposé pour Koss Koss (§7 du cahier des charges)

Réutiliser les types domaine existants (`src/server/*`, `src/generated/prisma`) et **introduire Zod** comme frontière unique de validation, partagée client/serveur. Types/schémas à formaliser :

```
Product, ProductVariant, Category, Group(Collection), Media, Inventory,
Price(Money=centimes+currency), Discount, Cart, CartLine, Customer, Address,
Order, OrderItem, Payment, Shipping, Return, SeoContent
```

Structure d'erreur stable unique (à généraliser sur toutes les routes) :

```ts
type ApiError = {
  code: string;                          // ex. "validation_error", "out_of_stock"
  message: string;                       // message public sûr (pas de trace/SQL/chemin)
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
};
```

Règle : **une seule source de vérité** pour statuts de commande/paiement, rôles, devises, taxes, types de produit — exposée en constantes typées partagées, jamais dupliquée entre front et back.
