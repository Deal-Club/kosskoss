/**
 * Configuration centrale de la marque KossKoss Select.
 *
 * Source unique de vérité pour l'identité, remplaçant les valeurs dispersées
 * héritées de l'ancien projet (MLC Bois). Les SECRETS ne figurent jamais ici :
 * ils restent dans les variables d'environnement (voir .env.example).
 *
 * Références : charte graphique KossKoss Select + CDC v2.2 (voir docs/13).
 */

export const BRAND = {
  name: "KossKoss Select",
  shortName: "KossKoss",
  // Slogan de marque et ton employé dans les messages de remerciement.
  slogan: "La Sélection beauté qui vous choisit.",
  voiceLine: "Merci, votre peau mérite le meilleur.",
  // Concept-store cosmétique multimarque, 100 % en ligne, marché Cameroun.
  market: "CM",
} as const;

/** Palette de la charte (HEX). La conversion oklch pour globals.css se fait à partir d'ici. */
export const COLORS = {
  // Bleu Profond — couleur primaire (RVB 15.59.70 / CMJN 94.41.44.36)
  primary: "#0F3B46",
  // Beige Sable — couleur secondaire (RVB 243.232.221 / CMJN 5.7.9.0)
  secondary: "#F3E8DD",
  // Neutres de la charte (fonds sombres du logo)
  ink: "#1E1E1E",
  paper: "#FFFFFF",
} as const;

/**
 * Typographie. Cinzel pour les titres/logo, Gilroy pour le texte courant.
 * ⚠️ Gilroy est une police commerciale : soit licence webfont acquise, soit
 * substitut libre visuellement proche. `bodyFallback` liste les substituts
 * candidats (CDC §20) — à figer une fois la licence tranchée.
 */
export const TYPOGRAPHY = {
  display: "Cinzel",
  body: "Gilroy",
  bodyFallback: ["Manrope", "Sora", "Poppins"],
} as const;

/**
 * Devise : Franc CFA d'Afrique centrale (XAF), SANS sous-unité.
 * Les montants sont donc stockés et manipulés en FCFA ENTIERS (pas de centimes).
 * `minorUnit: 0` documente l'absence de division par 100 au formatage.
 */
export const CURRENCY = {
  code: "XAF",
  symbol: "FCFA",
  minorUnit: 0,
  locale: "fr-CM",
} as const;

/** Langues du site. FR par défaut (racine), EN sous /en. */
export const LOCALES = ["fr", "en"] as const;
export const DEFAULT_LOCALE = "fr";

/** Coordonnées publiques connues (charte). Réseaux : @kosskoss_select. */
export const CONTACT = {
  phone: "+237 658 01 36 46",
  social: {
    instagram: "kosskoss_select",
    facebook: "kosskoss_select",
  },
  // Numéro WhatsApp du bouton pré-rempli : géré depuis le back-office (réglage),
  // valeur d'amorçage possible via variable d'environnement. À confirmer.
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
} as const;

/**
 * Coordonnées légales de l'entreprise — À FOURNIR PAR KossKoss (CDC §20).
 * Placeholders explicites : ne pas publier tant qu'ils ne sont pas renseignés.
 */
export const LEGAL = {
  companyName: "KossKoss Select",
  registration: "À COMPLÉTER",
  taxId: "À COMPLÉTER",
  address: "À COMPLÉTER",
  email: "À COMPLÉTER",
} as const;
