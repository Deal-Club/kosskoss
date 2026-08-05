import type { VariantView } from "@/lib/variantPricing";

export interface NavLink {
  label: string;
  href: string;
}

export interface Category {
  label: string;
  href: string;
  image: string;
}

export interface CategoryGroup {
  label: string;
  href: string;
  items: Category[];
}

export interface Product {
  /** Identifiant en base, nécessaire pour rattacher les avis clients */
  id?: string;
  slug?: string;
  sku?: string;
  brand: string;
  name: string;
  bullets: string[];
  /** Description courte, sous le titre dans le bloc d'achat */
  shortDescription?: string;
  /** Description longue, plus bas dans la page */
  description?: string;
  image: string;
  /** Vues complémentaires pour la galerie de la fiche produit, sans l'image principale */
  images?: string[];
  alt: string;
  oldPrice?: string;
  price: string;
  /** Prix unitaire TTC en centimes, source de vérité pour le panier */
  priceCents?: number;
  badge?: string;
  /** Fin de la promotion de campagne, en ISO. Absent hors campagne. */
  promoEndsAt?: string;
  /** La campagne met-elle en avant un compte à rebours ? (vente flash) */
  promoCountdown?: boolean;
  href: string;
  rating?: number;
  /** Nombre d'avis clients validés */
  reviewCount?: number;
  stock?: number;
  inStock?: boolean;
  /** Variations de volume proposées ; vide pour un produit simple. */
  variants?: VariantView[];
}

export interface BrandTeaser {
  name: string;
  href: string;
  count: number;
}

export interface CustomerReview {
  author: string;
  city: string;
  purchase: string;
  rating: number;
  text: string;
}

export interface HeroSlide {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  href: string;
  image: string;
  alt: string;
}

export interface PromoBanner {
  title: string;
  subtitle?: string;
  href: string;
  image: string;
  alt: string;
}
