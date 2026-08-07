/**
 * Types partagés du front KossKoss Select.
 */

export type KKBadge = "bestseller" | "nouveau" | null;

/** `tone` pilote le dégradé du visuel produit quand il n'y a pas de photo. */
export type KKTone = "sand" | "rose" | "teal" | "clay";

/**
 * Avis client réel, prêt à afficher sur l'accueil.
 * Ne provient QUE de la table Review, et uniquement des avis approuvés par la
 * modération : aucun témoignage rédigé par nos soins n'a sa place ici.
 */
export type KKTestimonialView = {
  id: string;
  quote: string;
  author: string;
  /** Ville déclarée par le client ; absente si non renseignée. */
  city?: string;
  rating: number;
  /** Produit concerné, pour situer l'avis. */
  productName: string;
};

/** Vue produit prête à afficher (carte, rail). Montants en FCFA entiers. */
export type KKProductView = {
  id: string;
  brand: string;
  name: string;
  priceFcfa: number;
  oldPriceFcfa?: number;
  badge: KKBadge;
  tone: KKTone;
  /** Photo produit (Cloudinary) ; vide/absent = motif de secours. */
  image?: string | null;
  /** Lien vers la fiche produit ; absent en mode démo. */
  href?: string;
  /** Slug du produit, repris tel quel dans la ligne de panier. */
  slug?: string;
  /**
   * Stock connu au moment du rendu. Le serveur le recontrôle à la commande :
   * il ne sert ici qu'à griser l'ajout rapide et à borner la quantité.
   */
  stock?: number;
  /**
   * Vrai si le produit se décline en plusieurs contenances. L'ajout rapide
   * depuis une vignette renvoie alors vers la fiche : le prix affiché sur la
   * carte est le prix de base, choisir une variante à la place du client
   * reviendrait à facturer un montant qu'il n'a pas vu.
   */
  hasVariants?: boolean;
};

/**
 * Produit mis en favori, tel que rendu par l'API du compte ou relu depuis le
 * navigateur. Même forme dans les deux cas : la vue des favoris ne sait pas si
 * la liste vient de la base ou du localStorage.
 */
export type KKFavoriteView = {
  productId: string;
  slug: string;
  brand: string;
  name: string;
  priceFcfa: number;
  oldPriceFcfa?: number;
  image: string;
  /** Chemin de la fiche produit, préfixe de langue non compris. */
  path: string;
  stock: number;
  hasVariants: boolean;
  /** Horodatage de l'ajout, pour afficher le plus récent en premier. */
  addedAt: number;
};
