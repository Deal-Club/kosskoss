/**
 * DONNÉES DE DÉMONSTRATION — Accueil KossKoss Select.
 *
 * ⚠️ MOCK explicitement marqué (cahier des charges §10 « Gestion des données
 * incomplètes »). Aucune de ces valeurs n'est définitive : elles servent
 * uniquement à caler le rendu de la page de prévisualisation `/preview` tant
 * que le catalogue réel n'est pas branché sur Prisma. À remplacer par la
 * vraie API produits avant toute mise en production.
 */

import type { KKProductView } from "@/types/kk";

export const MOCK_SELECTION: KKProductView[] = [
  { id: "p1", brand: "Atlas Skincare", name: "Sérum Éclat Nocturne", priceFcfa: 18500, badge: "bestseller", tone: "clay" },
  { id: "p2", brand: "KossKoss Select", name: "Crème Riche Hydratation", priceFcfa: 13500, badge: "nouveau", tone: "sand" },
  { id: "p3", brand: "Solaire Pro", name: "Voile Solaire Invisible", priceFcfa: 9000, badge: null, tone: "teal" },
  { id: "p4", brand: "Botanica", name: "Essence Apaisante Lotus", priceFcfa: 21000, oldPriceFcfa: 24000, badge: null, tone: "rose" },
];

export const MOCK_POPULAR: KKProductView[] = [
  { id: "p5", brand: "Lumière", name: "Advanced Snail 96 Mucin", priceFcfa: 12000, badge: "bestseller", tone: "sand" },
  { id: "p6", brand: "Peau Nette", name: "Nettoyant Doux Aloé", priceFcfa: 7500, badge: null, tone: "teal" },
  { id: "p7", brand: "Baume & Co", name: "Baume Lèvres Karité", priceFcfa: 4500, badge: null, tone: "clay" },
  { id: "p8", brand: "Éclat Royal", name: "Huile Précieuse Argan", priceFcfa: 16000, badge: "nouveau", tone: "rose" },
];

export const MOCK_SKIN_TYPES = [
  { key: "seche", label: "Sèche" },
  { key: "grasse", label: "Grasse" },
  { key: "mixte", label: "Mixte" },
  { key: "sensible", label: "Sensible" },
] as const;

export const MOCK_TESTIMONIALS = [
  {
    id: "t1",
    quote:
      "Le diagnostic m'a proposé exactement ce qu'il fallait pour ma peau sensible. Livraison rapide à Douala.",
    author: "Mariam N.",
    city: "Douala",
    rating: 5,
  },
  {
    id: "t2",
    quote:
      "Enfin une sélection à laquelle je peux faire confiance. Paiement Orange Money en deux clics.",
    author: "Aïcha B.",
    city: "Yaoundé",
    rating: 5,
  },
  {
    id: "t3",
    quote:
      "Des marques que je ne trouvais nulle part ailleurs, et un vrai suivi après l'achat.",
    author: "Laure T.",
    city: "Bafoussam",
    rating: 4,
  },
];
