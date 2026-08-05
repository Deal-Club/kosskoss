# 05 — Inventaire Figma (KossKoss Select)

Fichier Figma : `HtTSs9BPATGuaQyhDjJOyo`. Le MCP Figma (plan Starter) a atteint sa limite d'appels après le nœud `14:4743` ; **l'inventaire visuel a été fourni par KossKoss sous forme d'export PNG** dans `assets/figma/` (47 écrans, desktop 1440 / tablette 768 / mobile 390). Ce doc fait foi.

## Charte (voir aussi `13`)
Couleurs Bleu Profond `#0F3B46` + Beige Sable `#F3E8DD` ; titres **Cinzel**, texte **Gilroy** → substitut **Manrope** retenu (décision) ; logo KK. Centralisé dans `src/config/brand.ts`.

## Langage visuel observé (Accueil desktop + mobile)
- **Barre d'annonce** : « Livraison partout au Cameroun ».
- **En-tête desktop** : recherche (gauche) · logo `KOSSKOSS SELECT` centré · compte + panier (droite). Nav : Accueil · Boutique · Diagnostic · À propos · Contact.
- **En-tête mobile** : burger · logo · recherche · panier + **barre de navigation basse** (tab bar).
- **Fond** beige sable, **titres serif Cinzel** bleu profond, généreux blancs, **CTA sombre** bleu profond arrondi.
- **Hero** : titre « La sélection beauté qui vous choisit. » + sous-titre + **bouton « Faire mon diagnostic »** + visuel modèle arrondi.
- **Filtre « Choisissez selon votre peau »** (mobile) : pastilles Sèche / Grasse / Sensible / Mixte (liées aux tags diagnostic).
- **Cartes produit** : badge (Bestseller / Nouveau), image, marque, nom, **prix en FCFA**, bouton d'ajout au panier iconique.
- **Bloc diagnostic** : « Votre routine en quelques réponses » → CTA « Commencer ».
- **Pied de page** bleu profond : colonnes (Notre Maison, Aide/Livraison, Mentions Légales) + **newsletter**.

## Inventaire des écrans (assets/figma/)

| Écran | Déclinaisons fournies | Route web probable | Données / back-office |
|---|---|---|---|
| **Accueil** | Desktop, Desktop Complet, Tablette, Tablette Complet, Mobile, Mobile Complet | `/[locale]` | catégories, produits (badges), tags peau, diagnostic |
| **Catalogue** | Desktop, Tablette, Mobile | `/[locale]/boutique` (ou `[group]/[category]`) | produits, filtres (catégorie, marque, type peau, préoccupation, prix), tri |
| **Fiche Produit** | Desktop, Tablette, Mobile | `/[locale]/.../[product]` | produit, marque, stock, avis, produits liés |
| **Diagnostic — Intro** | Desktop, Mobile | `/[locale]/diagnostic` | — |
| **Diagnostic — Question** | Desktop, Mobile | `/[locale]/diagnostic` (QCM) | questions/réponses/tags (admin) |
| **Diagnostic — Chargement** | Mobile | état transitoire | calcul du score |
| **Diagnostic — Résultat** | Desktop, Mobile | résultat + ajout panier | moteur de reco, priorité stock |
| **Recherche Globale** | Desktop, Mobile | overlay/`/recherche` | recherche nom/marque/catégorie |
| **Résultats de Recherche** | Desktop, Mobile | `/[locale]/recherche` | produits |
| **Mini-Panier** | Desktop (side drawer), Mobile (bottom sheet) | tiroir | panier (revalidation serveur) |
| **Page Panier** | Desktop, Mobile | `/[locale]/panier` | panier |
| **Checkout** | Desktop, Mobile | `/[locale]/commande` | 4 champs + opt-in suivi |
| **Paiement en cours** | Mobile | état transitoire | redirection agrégateur (CinetPay) |
| **Confirmation de commande** | Desktop, Mobile | `/[locale]/confirmation/...` | commande + **bouton WhatsApp** + facture |
| **Tableau de bord Client** | Desktop, Mobile | `/[locale]/compte` | commandes, profil diagnostic, factures |
| **Historique des Commandes** | Desktop | `/[locale]/compte/commandes` | commandes |
| **Contact** | Desktop | `/[locale]/contact` | — |
| **Mentions Légales** | Desktop | `/[locale]/mentions-legales` | contenu légal FR/EN |
| **Html → Body** | 1 écran | (carte technique de structure) | — |
| **Parcours d'achat ①②** | Desktop, Mobile | carte de flux (référence) | — |
| **Diagnostic ③④** | Desktop, Mobile | carte de flux (référence) | — |
| **Recherche ⑤⑥** | Desktop, Mobile | carte de flux (référence) | — |
| **Espace client ⑦⑧** | Desktop, Mobile | carte de flux (référence) | — |
| **⑨ Variantes** | « À intégrer plus tard » | différé | — |

> Les écrans ①–⑨ préfixés `▸` sont des **cartes de parcours** (flow maps), pas des pages à intégrer telles quelles. « ⑨ Variantes » est explicitement marqué **à intégrer plus tard**.

## États à prévoir (par écran, cf `06`)
Chargement, vide, erreur, désactivé, indisponibilité produit/variante, panier vide, recherche sans résultat, **échec de paiement** — à vérifier écran par écran contre l'export.

## Reste à extraire quand le MCP Figma sera de nouveau disponible
Valeurs exactes : espacements, grilles, tailles de police précises, rayons, ombres, variables/tokens nommés, states interactifs. En attendant, les mesures sont **estimées depuis les PNG** et la charte.
