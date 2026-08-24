# Target Website

## Historique

Le socle technique vient d'un clone de quelle.de, transformé en boutique
d'électroménager en s'inspirant d'alternate.de, puis repositionné en boutique
française de bois de chauffage (MLC Bois). **Ce chantier l'a repositionné une
seconde fois** : c'est aujourd'hui un **concept-store cosmétique multimarque,
100 % en ligne, pour le marché camerounais** — nom de code interne du projet
`kosskoss`, marque **KossKoss Select**. Le socle technique (Next.js, Prisma,
composants) est conservé ; la langue, la devise, le marché, la marque, le
catalogue et le mode de paiement ont changé une nouvelle fois.

**Ce fichier ne comporte plus aucune trace de l'activité bois de chauffage** :
pas de TVA à 10 %, pas de zones de livraison France, pas de mètre cube
apparent, pas de numérotation `MLC-`. Si un texte du dépôt (page légale,
e-mail, commentaire de code) en porte encore, c'est un résidu à corriger là où
il se trouve — pas une indication à suivre.

## Marque

Source unique de vérité : `src/config/brand.ts`.

- **Nom** : KossKoss Select
- **Marché** : Cameroun (`market: "CM"`)
- **Slogan** : « La Sélection beauté qui vous choisit. »
- **Typographie** : la charte livrée par le client (planche A-8) impose
  Montserrat, Cormorant Garamond et Naishila Dancing Script. Le site tourne
  aujourd'hui sur Manrope, Playfair Display et Cinzel — **écart délibéré**,
  motivé et documenté dans `docs/CONFORMITE-CHARTE.md`. La piste « Gilroy »
  mentionnée jusqu'ici n'a plus d'objet : la charte ne la demande pas.
- **Couleurs** : Bleu Profond `#0F3B46` (primaire), Beige Sable `#F3E8DD`
  (secondaire), gris neutre `#D9D9D9`, doré doux `#C89B3C` (planche A-7). La
  palette d'écran s'en écarte volontairement — relevée sur la maquette et
  ajustée pour le contraste, voir `docs/CONFORMITE-CHARTE.md`.
- **Réseaux** : `@kosskoss_select` (Instagram, Facebook)
- **Dépôt** : `github.com/Deal-Club/kosskoss`

## Langues

- **Français** à la racine (`/`) — langue de référence
- **Anglais** sous `/en` — traduction intégrale
- L'allemand, hérité des activités précédentes, a été entièrement retiré.

## Devise

**Franc CFA d'Afrique centrale (XAF), affiché « FCFA ».**

Le FCFA n'a **pas de sous-unité** : les montants sont des francs entiers, sans
division par 100. Le suffixe `Cents` que portent encore certains champs de la
base (`priceCents`, `costCents`…) est un nom hérité d'une activité
précédente — il ne signifie plus « centimes » et ne doit jamais être divisé
par 100. C'est documenté en tête de `src/lib/kk/marge.ts` et dans l'export des
ventes (`src/app/api/admin/ventes/export/route.ts`).

## Catalogue

Concept-store cosmétique **multimarque** : soins visage et corps, marques
partenaires, diagnostic beauté qui recommande une routine, catalogue de
produits avec variantes (contenances). Pas de catalogue de démonstration figé
dans ce fichier — le catalogue réel vit en base (modèles `Group`, `Category`,
`Brand`, `Product`, `ProductVariant`) et se peuple par `npm run db:seed*`
(voir `docs/HANDOVER.md`).

`src/data/categoryNav.ts` (mise en avant de catégories sur l'accueil et dans
le menu) est aujourd'hui volontairement vide : cette liste est indépendante du
catalogue en base et attend d'être renseignée avec de vraies catégories
vedettes.

## Livraison et contact

- **Livraison au Cameroun**, coordonnée **manuellement par WhatsApp** : le
  tunnel d'achat (`src/server/kk/checkout.ts`) ne calcule aucun frais de
  livraison et ne modélise ni zone ni code postal — la commande capture un
  champ de localisation libre (`location`), et la suite se règle par message.
- Le numéro de téléphone du client est normalisé au plan de numérotation
  camerounais (indicatif `+237`, voir `src/lib/kk/telephone.ts`).
- Le **numéro WhatsApp de la boutique** (bouton pré-rempli sur la page de
  confirmation et le pied de page) se règle depuis le back-office
  (**Paramètres**) ; `NEXT_PUBLIC_WHATSAPP_NUMBER` n'est qu'un repli tant que
  ce réglage est vide.
- Après livraison, un lien de **formulaire d'évaluation** (Google Form)
  peut être envoyé au client — également réglable en back-office.

## Paiement

Moyens de paiement proposés au tunnel de commande, gérés en base
(`PaymentMethod`, activables/désactivables et réordonnables depuis
**Admin → Moyens de paiement**) :

- **Mobile Money** — Orange Money, MTN Mobile Money
- **Carte bancaire**
- **Paiement à la livraison** (espèces à la remise du colis)

Le prix, le stock et le total sont toujours recalculés côté serveur à la
commande, jamais reçus tels quels du navigateur.

## Fidélité au design

Structurelle : schémas de mise en page et de composants hérités de la lignée
quelle.de / alternate.de, mais style, contenu et charte propres à KossKoss
Select (voir « Marque » ci-dessus, et le cahier des charges synthétisé dans
`docs/13-cdc-synthesis-and-gap.md`).

## Scope

### In Scope
- Vitrine cosmétique : accueil, diagnostic beauté avec recommandation de
  routine, catalogue filtrable (marque, type de peau, préoccupation, prix),
  avis clients, journal éditorial
- Tunnel d'achat en FCFA avec compte facultatif
- Espace client, back-office complet (voir `docs/BACK-OFFICE.md`), flux
  Google Merchant
- Mesure GA4 / Meta Pixel / API de conversions Meta, **soumise au
  consentement** (voir `src/server/consent.ts` et `src/lib/consent.ts`)
- Responsive

### Hors périmètre pour l'instant
- Catégories vedettes de l'accueil (`src/data/categoryNav.ts` vide, voir
  « Catalogue » ci-dessus)
- Encaissement automatisé par un agrégateur Mobile Money local pleinement
  validé pour le Cameroun — voir `docs/HANDOVER.md` et
  `docs/ETAT-DES-LIEUX.md` pour l'état exact des passerelles câblées

## À faire avant mise en ligne

Les données d'entreprise (`src/content/legal/company.ts`, constante
`COMPANY`) sont des **valeurs de test** — `COMPANY.provisoire` vaut `true`.
Elles s'impriment sur chaque facture et sur les pages légales tant qu'elles
n'ont pas été remplacées par les vraies coordonnées de la société. Voir
`docs/LEGAL.md` pour le détail des champs à compléter — ce document date
lui-même d'une activité antérieure sur certains points (droit français) et
reste à recouper avec le droit camerounais.
