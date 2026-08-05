# 11 — Questions ouvertes (non bloquantes sauf indication)

Recherche effectuée d'abord dans : code, `.env.example`, migrations, docs du dépôt, Figma (partiel), historique Git. Les points ci-dessous restent à trancher.

## Bloquant l'implémentation concernée (à arrêter avant d'engager)

| # | Question | Pourquoi ça bloque | Piste |
|---|---|---|---|
| Q1 | **Prestataire de paiement** de Koss Koss (Stripe recommandé pour la France ; Mollie/Square/PayPal/Nexi câblés) | engage un prestataire, des clés, une conformité | décider avant Lot 7 ; interface `PaymentProvider` déjà là |
| Q2 | **Base de données de production** (réutiliser Neon ? nouveau projet ?) | migration/prod | ne jamais toucher une base prod existante ; base Koss Koss dédiée |
| Q3 | **Taux de TVA & régime** applicables au catalogue Koss Koss | change les règles de taxe (calcul, factures) | dépend du type de produits vendus (inconnu) ; à confirmer par un comptable |
| Q4 | **Zones/coûts de livraison** réels | change les règles de livraison | actuellement standard 0 €/express 60-70 € codés en dur |
| Q5 | **Méthode d'authentification** conservée (sessions maison actuelles) ou externalisée | change la sécurité | conserver l'existant par défaut |
| Q6 | **Contenu juridique réel** (identité société, RCS, TVA intraco, capital, médiateur, assureur) | collecte/publication de données d'entreprise | `LEGAL.md` liste les placeholders ; relecture juriste obligatoire |

## Non bloquant (hypothèses réversibles prises en attendant)

| # | Question | Hypothèse retenue |
|---|---|---|
| Q7 | **Nom exact du dossier cible** : le cahier des charges propose `koss-koss`, mais le dossier de travail actuel est `kosskoss` (sans tiret), vide | docs créés dans `kosskoss/docs` (dossier de travail). À confirmer avant de scaffolder le projet. |
| Q8 | **Catalogue Koss Koss** : quels produits/catégories ? (l'ancien est du bois de chauffage) | inconnu — attendre Figma + brief produit ; le modèle de données est généraliste |
| Q9 | **Langues** cibles (FR/EN comme l'ancien ? autres ?) | reprendre FR/EN par défaut |
| Q10 | **Déploiement** : Hostinger (comme l'ancien, `server.js`) ou Vercel ? | à confirmer ; impacte le stockage d'images (Cloudinary déjà prévu) |
| Q11 | **Système de variantes** : mono-axe (comme « volume ») suffit-il, ou multi-axes (taille×couleur) ? | dépend du catalogue (Q8) |
| Q12 | **Coupons** : Koss Koss a-t-il besoin de codes promo classiques (absents, remises via Campaign) ? | à confirmer ; sinon garder le modèle Campaign |

## Bloqué par outillage

| # | Question | Blocage |
|---|---|---|
| Q-FIGMA | **Inventaire Figma complet** (pages, frames, tokens, composants, variantes, mobile/tablette) | **Limite d'appels MCP Figma du plan Starter atteinte** (voir `05`). À reprendre quand le quota se réinitialise ou après montée en gamme du plan. Seul le nœud `14:4743` a pu être lu. La **charte de marque** est en revanche connue (PDF fourni, voir `13`). |

---

## MISE À JOUR — Cahier des charges KossKoss Select reçu (v2.2)

Le CDC + la charte (voir `13`) **résolvent** la plupart des questions ci-dessus :

| Ancien # | Résolution |
|---|---|
| Q1 paiement | **Agrégateur Mobile Money, reco CinetPay** (OM/MTN) — reste à confirmer selon l'activation du compte marchand KossKoss |
| Q3 TVA | Devise **FCFA sans sous-unité** ; fiscalité hors périmètre logiciel (factures + export CSV seulement) |
| Q4 livraison | **Externe**, coordonnée par **WhatsApp manuel** — plus de zones/modes FR |
| Q8 catalogue | **Cosmétique multimarque** |
| Q9 langues | **FR + EN** confirmé |
| Q11 variantes | à préciser selon le catalogue cosmétique (contenance ?) |
| Q12 coupons | non demandé ; remises hors périmètre de base |

**Questions encore ouvertes (issues du CDC) :**

| # | Question | Impact |
|---|---|---|
| Q13 | **Licence Gilroy** : acquérir la webfont **ou** valider un substitut libre (Manrope / Sora / Poppins) | typographie — bloquant avant de figer le design system |
| Q14 | **Auth admin** : conserver l'OTP e-mail **maison** de `mlcbois` (fonctionnel) ou migrer vers **Auth.js** comme le suggère le CDC | sécurité/auth |
| Q15 | **E-mail transactionnel** : garder SMTP nodemailer existant ou passer à **Resend/Brevo/Postmark** (délivrabilité) | notifications |
| Q16 | **Hébergement** : **Vercel + PG managé (Neon/Supabase)** comme le CDC, ou Hostinger comme `mlcbois` | déploiement, `server.js` |
| Q17 | **Confirmation CinetPay** (vs Maviance/ElyonPay) selon activation compte marchand | paiement |
| Q18 | **Contenus, textes légaux (FR+EN), domaine, visuels produits** fournis par KossKoss | contenu — bloquant mise en ligne |
| Q19 | **Option WhatsApp automatisé** (BSP) : incluse ou non ? | périmètre/chiffrage |
