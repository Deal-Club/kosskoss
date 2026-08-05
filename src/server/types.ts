import type { VariantInput } from "@/lib/variantPricing";

export interface CategoryGuideSection {
  heading: string;
  body: string;
}

export interface CategoryGuide {
  intro: string;
  sections: CategoryGuideSection[];
  closing: string;
}

// Les univers viennent désormais de la table "Group" et sont donc librement
// extensibles ; le type reste un alias de chaîne pour ne rien casser.
export type ProductGroup = string;

export interface CategoryRecord {
  id: string;
  group: ProductGroup;
  slug: string;
  label: string;
  description: string;
  image: string;
  guide: CategoryGuide;
}

export interface ProductRecord {
  id: string;
  categoryId: string;
  brand: string;
  name: string;
  bullets: string[];
  /** Description courte, affichée sous le titre de la fiche produit */
  shortDescription?: string;
  /** Description longue, affichée plus bas dans la fiche produit */
  description?: string;
  image?: string;
  /** Vues complémentaires de la galerie, dans l'ordre d'affichage */
  images?: string[];
  oldPrice?: string;
  price: string;
  badge?: string;
  rating?: number;
  stock?: number;
  lowStockThreshold?: number;
  inStock?: boolean;
  /** Attributs exigés par Google Merchant Center */
  gtin?: string;
  mpn?: string;
  condition?: string;
  googleProductCategory?: string;
  shippingWeightGrams?: number;
  energyEfficiencyClass?: string;
  /** Variations de volume ; vide pour un produit simple. */
  variants?: VariantInput[];
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewRecord {
  id: string;
  productId: string;
  productName?: string;
  authorName: string;
  authorEmail?: string;
  city?: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  moderatorNote?: string;
  createdAt: string;
  moderatedAt?: string;
}

export interface PaymentMethodRecord {
  id: string;
  key: string;
  label: string;
  description: string;
  icon: string;
  feeLabel: string;
  enabled: boolean;
  position: number;
}

export interface IntegrationRecord {
  id: string;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  /** Affichage masqué, par ex. "••••4242" — le clair ne quitte jamais le serveur. */
  maskedValue?: string;
  configured: boolean;
  updatedAt?: string;
}

export interface StockMovementRecord {
  id: string;
  productId: string;
  productName?: string;
  delta: number;
  reason: string;
  note?: string;
  createdAt: string;
  createdBy?: string;
}
