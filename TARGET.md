# Target Website

## Design Reference
https://www.alternate.de/ (layout, color language, product-card pattern)

Historique : le projet est parti d'un clone de quelle.de, a été transformé en boutique
d'électroménager en s'inspirant d'alternate.de, puis **repositionné en boutique française
de bois de chauffage**. Le socle technique et les composants sont conservés ; la langue,
le droit applicable, la marque et le catalogue ont changé.

## Brand
- Name: **MLC Bois**
- Domain: mlc-bois.fr
- Contact: contact@mlc-bois.fr

## Langues
- **Français** à la racine (`/`) — langue de référence, celle qui engage la société
- **Anglais** sous `/en` — traduction intégrale
- L'allemand a été entièrement retiré du projet (messages, pages légales, e-mails,
  slugs d'URL, facture, flux Merchant)

## Scope

### Fidelity Level
- [x] **Structural** — schémas de mise en page et de composants empruntés à alternate.de,
      style et contenu propres, palette dérivée mais non identique

### In Scope
- Vitrine bois de chauffage : hero, réassurance, catalogue, échelle d'humidité,
  comparatif des essences, déroulé de livraison, avis clients, FAQ
- Tunnel d'achat conforme au droit français de la vente à distance
- Espace client, back-office, flux Google Merchant
- Responsive

### Out of Scope (pour l'instant)
- Catalogue produit définitif : les catégories ont été retirées du code
  (`src/data/categoryNav.ts` est volontairement vide) et seront redéfinies à partir
  des sites de référence fournis
- Bandeau de consentement aux cookies : inutile tant que seuls des cookies strictement
  nécessaires sont déposés

## Paramètres métier retenus
- **TVA 10 %** — bois de chauffage à usage domestique, art. 278 bis du CGI
  (à confirmer par le comptable)
- **Livraison France métropolitaine uniquement** (`SUPPORTED_COUNTRIES = ["FR"]`)
- **Zones** : A Paris et petite couronne · B grande couronne, Oise, Eure-et-Loir ·
  C reste de la France par transporteur
- **Unité de vente** : mètre cube apparent (MAP) ; 1 MAP ≈ 0,7 stère ≈ 0,4 m³ réel
- **Numéro de commande** : `MLC-AAAA-NNNNNN`

## À faire avant mise en ligne
Voir [`docs/LEGAL.md`](docs/LEGAL.md) § 3 : toutes les données d'entreprise
(RCS, TVA intracommunautaire, capital, adresse, téléphone, médiateur, assureur)
sont des valeurs d'exemple.
