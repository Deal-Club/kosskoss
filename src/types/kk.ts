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
  /** Titre laissé par le client ; vide dans la plupart des cas. */
  title?: string;
  /** Fiche du produit concerné, pour que l'avis y renvoie. */
  href?: string;
  /** Date de publication, au format ISO — mise en forme à l'affichage. */
  publishedAt?: string;
};

/**
 * Agrégat des avis publiés.
 *
 * Il ne sort de la base que des avis MODÉRÉS : afficher une moyenne calculée
 * sur des avis en attente reviendrait à publier ce qui n'a pas été relu.
 * `total` vaut 0 tant qu'aucun avis n'est approuvé, et la section se masque —
 * une note moyenne inventée est une allégation commerciale trompeuse au sens
 * de l'article L121-2 du Code de la consommation.
 */
export type KKReviewsSummary = {
  /** Moyenne sur 5, arrondie au dixième. */
  average: number;
  /** Nombre d'avis publiés retenus dans la moyenne. */
  total: number;
  /** Nombre d'avis par note, de 5 à 1 — pour la répartition. */
  distribution: { rating: number; count: number }[];
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
   * Description courte, révélée au survol de la vignette. Facultative : une
   * fiche sans résumé n'ouvre simplement pas le panneau.
   */
  shortDescription?: string;
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

/* ---------------------------------------------------------------- Routines -- */

/** Un geste de routine : le rôle, la raison, le produit. */
export type KKRoutineStepView = {
  id: string;
  /** « Nettoyer », « Traiter », « Protéger »… */
  label: string;
  /** Pourquoi ce geste dans CETTE routine. Peut être vide. */
  why: string;
  /**
   * Rôle du geste (master, colonne Role) — peut différer de `label` en
   * formulation. Vide sur les 5 routines historiques, non couvertes par le
   * master : l'affichage retombe alors sur `label`.
   */
  role: string;
  /** Moment d'application (« AM/PM », « AM », « PM »…). Peut être vide. */
  moment: string;
  product: KKProductView;
};

/**
 * Une routine prête à l'emploi, telle qu'affichée sur l'accueil et sur sa page.
 *
 * `totalFcfa` est calculé au rendu, jamais lu en base : c'est la somme des
 * gestes réellement servables au moment de l'affichage.
 */
export type KKRoutineView = {
  id: string;
  slug: string;
  name: string;
  /** Accroche d'une ligne : le besoin auquel la routine répond. */
  claim: string;
  description: string;
  /**
   * Étiquette de besoin correspondante (`src/lib/kk/besoins.ts`). Elle ouvre le
   * rayon filtré pour qui veut choisir lui-même — en second recours, la routine
   * restant la porte principale.
   */
  besoinTag: string;
  /** Jeton de teinte : l'un des `--tint-*` de globals.css. */
  tint: string;
  image: string | null;
  /** Chemin de la page routine, préfixe de langue non compris. */
  href: string;
  steps: KKRoutineStepView[];
  totalFcfa: number;
  /**
   * « eco » ou « premium » — texte brut du champ `Routine.niveau`, jamais
   * affiché tel quel : le libellé se lit par `libelleNiveau` (module pur
   * `src/lib/kk/routines-niveau.ts`), jamais écrit en dur.
   */
  niveau: string;
  /** Identifiant du master (« TAC-ECO »…), `null` sur les 5 routines
   *  historiques, antérieures au master. */
  code: string | null;
  /** Profil visé, texte libre du master. Peut être vide. */
  profilCible: string;
  usageMatin: string;
  usageSoir: string;
  /** Le mot de l'équipe sur cette routine. Peut être vide. */
  noteKossKoss: string;
  /**
   * Accroche courte du master (« Meilleur rapport efficacité/prix »…), champ
   * `Routine.badge` — texte libre, SANS RAPPORT avec `KKBadge` (qui distingue
   * « bestseller »/« nouveau » sur les produits). Peut être vide.
   */
  badge: string;
  /**
   * Union des `Product.tags` des produits encore servables de la routine —
   * pour la ligne de préoccupations de la fiche routine (lot 7D), au même
   * registre que la fiche produit (`src/lib/kk/besoins.ts`, `PREOCCUPATIONS`).
   * Aucun champ dédié n'existe côté master pour une routine : ce sont les
   * mêmes tags que ceux posés sur chaque produit qui la compose.
   */
  tags: string[];
};
