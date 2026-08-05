# 12 — Journal des décisions

Format : Décision · Raison · Statut · Réversibilité.

## Phase d'audit

| # | Décision | Raison | Statut | Réversible |
|---|---|---|---|---|
| D1 | Traiter `mlcbois` comme **application e-commerce complète**, pas un simple back-office | l'inspection montre storefront + admin + API + DB fonctionnels | Actée | — |
| D2 | Documentation d'audit créée dans `kosskoss/docs/` (dossier de travail courant) | c'est le répertoire de travail ; cible `koss-koss` non encore créée | Actée | oui (déplaçable) |
| D2b | **Projet initialisé dans `kosskoss`** (pas de nouveau `koss-koss`) — décision utilisateur du 2026-08-05 | le dossier de travail est déjà en place avec les docs | Actée | oui |
| D2c | **Amorçage par fork de `mlcbois`** (Option A confirmée) — décision utilisateur | réutiliser le socle fonctionnel | Actée | oui |
| D2d | **Figma fourni par l'utilisateur** (export manuel) — le quota MCP Starter étant épuisé | débloque l'inventaire visuel ; travail visuel (Lot 1+) en attente de cet export | Actée | — |
| D3 | **Ne rien modifier** dans `mlcbois` (audit seul) ; installation de deps + génération Prisma = artefacts gitignorés | respect du cahier des charges §2-3 ; arbre Git resté propre | Actée | oui |
| D4 | Générer le client Prisma avec un `DATABASE_URL` **factice** pour obtenir un typecheck honnête | `prisma.config.ts` exige la variable même pour `generate` (qui ne se connecte pas) | Actée | oui (aucune base touchée) |
| D5 | Ne **pas** exécuter de migration ni de connexion à une base réelle | interdiction migrations destructives / base prod | Actée | — |

## Architecture cible (voir `07`)

| # | Décision | Raison | Statut | Réversible |
|---|---|---|---|---|
| D6 | **Option A** : Koss Koss = fork adapté d'une **application Next.js unique** | app existante fonctionnelle ; monorepo/2-projets = réécriture coûteuse sans gain justifié | Recommandée (à valider) | oui |
| D7 | Conserver les versions majeures (Next 16, React 19, Prisma 7, Node 22) | interdiction de changer les versions majeures ; socle sain | Actée | — |
| D8 | Introduire **Zod** comme frontière de validation unique | validation actuelle manuelle et dispersée | Proposée | oui |
| D9 | Centraliser l'identité dans `src/config/brand.ts` + secrets en env | valeurs marque aujourd'hui dispersées (`content/legal`, `merchant.ts`, `globals.css`) | Proposée | oui |
| D10 | Introduire des groupes de routes `(shop)` / `(checkout)` | la maquette prévoit un header transactionnel minimal (nœud `14:4743`) | Proposée | oui |
| D11 | Migrer les valeurs **allemandes** (statuts, motifs, civilités, pays `DE`, TVA `19`, `Standardversand`, `kostenlos`) vers une source de vérité FR | résidus de la lignée quelle.de/alternate.de | Proposée (migration **additive**) | oui |

## Décisions en attente (voir `11`)

| # | En attente | Bloque |
|---|---|---|
| D12 | Prestataire de paiement | Lot 7 |
| D13 | Base de données de production | mise en prod |
| D14 | TVA / régime fiscal | règles de taxe |
| D15 | Zones/coûts de livraison | règles de livraison |
| D16 | Contenu juridique réel (relecture juriste) | pages légales |
| D17 | Nom exact du dossier cible (`koss-koss` vs `kosskoss`) | scaffolding |
| D18 | Catalogue et système de variantes | modélisation produit |

## Décisions issues du CDC KossKoss Select v2.2 (voir `13`)

| # | Décision | Raison | Statut |
|---|---|---|---|
| D19 | Marché **Cameroun**, devise **FCFA (XAF) sans sous-unité** | CDC | Actée |
| D20 | Paiement **Mobile Money via agrégateur (CinetPay reco.)** ; garder l'interface `PaymentProvider`, écrire un adaptateur CinetPay | CDC | Actée (prestataire à confirmer, Q17) |
| D21 | **FCFA entier** : conserver le stockage entier mais retirer la sémantique « centimes » (pas de /100), formatage `fr-CM` | XAF n'a pas de sous-unité | Actée |
| D22 | Ajouter **module Diagnostic Beauté** (QCM + moteur par tags/score, admin-géré) | fonctionnalité clé CDC | Actée |
| D23 | Ajouter **Marques** comme entité, **Fournisseurs/Bons de commande/Marge**, **Invoice + avoirs**, **PaymentTransaction/WebhookEvent**, **CustomerProfile** | CDC §11/12/16 | Actée |
| D24 | **Livraison externe** + **WhatsApp manuel** (bouton `wa.me` pré-rempli, réglage n° en admin) ; retirer modes/zones/pays FR | CDC §10 | Actée |
| D25 | Statuts commande = liste CDC (En attente de paiement, Payée, En préparation, En acheminement, Livrée, Évaluée, Annulée/Remboursée) | CDC | Actée (remplace les statuts allemands) |
| D26 | **Tracking Meta Pixel + CAPI + GA4** configurables en admin + **consentement cookies** | CDC §15 | Actée |
| D27 | UI : migrer vers **shadcn/ui** (le CDC l'impose ; `mlcbois` n'a que `@base-ui/react`) | CDC §16 | Proposée |
| D28 | Validation **Zod + react-hook-form** | CDC §16 | Actée |
| D29 | Ajouter **Sentry** (suivi erreurs) | CDC §16 | Proposée |
| D30 | **Config de marque** créée : `src/config/brand.ts` (couleurs `#0F3B46`/`#F3E8DD`, Cinzel/Gilroy, FCFA, contact) | charte fournie | Actée |
| D31 | **Auth.js vs OTP maison** ; **Resend/Brevo vs SMTP** ; **Vercel vs Hostinger** | à trancher | En attente (Q14/Q15/Q16) |

## Incohérences Figma
Voir `06`. **Aucune incohérence corrigée en silence.** Table de décisions Figma en attente de l'inventaire complet (bloqué, Q-FIGMA). La **charte** (couleurs, typo, logo, ton) est en revanche connue et actée (`13`).
