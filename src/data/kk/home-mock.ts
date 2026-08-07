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

// Aucune de ces vignettes ne porte de `href` : sans fiche produit derrière, le
// bouton d'ajout rapide et le cœur des favoris restent inertes sur /preview.
// C'est voulu — la page sert à regarder le rendu, pas à remplir un panier avec
// des identifiants qui n'existent pas en base.
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

/*
 * Il n'y a volontairement PAS de témoignages de démonstration ici.
 *
 * Trois avis fictifs signés « Mariam N., Douala », « Aïcha B., Yaoundé » et
 * « Laure T., Bafoussam » étaient auparavant affichés sur l'accueil sous le
 * titre « Avis vérifiés ». Des avis fabriqués présentés comme authentiques
 * ruinent le pilier « tiers de confiance » et constituent une pratique
 * commerciale trompeuse.
 *
 * L'accueil lit désormais les vrais avis modérés via
 * `getHomeTestimonials()` (src/server/kk/home.ts) et masque la section tant
 * qu'il n'y en a aucun. Ne pas réintroduire de faux avis ici.
 */
