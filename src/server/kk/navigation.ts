import { cache } from "react";
import { prisma } from "@/server/prisma";
import { packshot } from "@/lib/kk/packshot";
import { pickText, needsTranslation } from "@/server/localizedContent";
import type { Locale } from "@/i18n/routing";

/**
 * Navigation de la boutique, lue en base.
 *
 * Les univers et catégories étaient jusqu'ici écrits en dur dans l'en-tête :
 * ajouter une catégorie au back-office la laissait invisible, et en retirer une
 * laissait un lien mort. La navigation suit désormais le catalogue.
 *
 * `cache()` de React garantit une seule requête par rendu, même si l'en-tête,
 * le menu mobile et le pied de page la demandent chacun de leur côté.
 */

export interface NavCategory {
  slug: string;
  label: string;
  /** Chemin complet, préfixe de langue non compris. */
  href: string;
  productCount: number;
}

export interface NavGroup {
  slug: string;
  label: string;
  href: string;
  categories: NavCategory[];
}

/**
 * Le méga-menu est sur toutes les pages : un menu français y annulerait
 * l'effet de toute autre traduction. `locale` est facultative, comme sur
 * `getShopBrands` ci-dessous — le français par défaut couvre les appelants
 * qui ne connaissent pas encore la langue de la page.
 */
export const getShopNavigation = cache(async (locale: Locale = "fr"): Promise<NavGroup[]> => {
  const groups = await prisma.group.findMany({
    orderBy: { position: "asc" },
    include: {
      categories: {
        orderBy: { position: "asc" },
        include: { _count: { select: { products: true } } },
      },
    },
  });

  const traduire = needsTranslation(locale);

  return (
    groups
      .map((group) => ({
        slug: group.slug,
        label: pickText(group.label, traduire ? group.labelEn : undefined),
        href: `/${group.slug}`,
        categories: group.categories
          // Une catégorie vide n'a rien à proposer : elle mènerait à une page
          // vide et donnerait l'impression d'une boutique en travaux.
          .filter((category) => category._count.products > 0)
          .map((category) => ({
            slug: category.slug,
            label: pickText(category.label, traduire ? category.labelEn : undefined),
            href: `/${group.slug}/${category.slug}`,
            productCount: category._count.products,
          })),
      }))
      .filter((group) => group.categories.length > 0)
  );
});

/** Produit mis en avant dans le méga-menu. */
export interface NavHighlight {
  id: string;
  brand: string;
  name: string;
  priceFcfa: number;
  image: string | null;
  href: string;
  /** « bestseller » ou « nouveau » ; null si le produit n'en porte pas. */
  badge: string | null;
}

/**
 * Deux produits montrés dans le méga-menu.
 *
 * Un menu de catalogue qui n'aligne que des noms de rayons demande au visiteur
 * de se projeter : il doit imaginer ce qu'il y a derrière « Sérums » avant de
 * cliquer. Deux vignettes réelles suffisent à faire basculer le menu de la
 * table des matières vers la vitrine — c'est le rôle qu'il tient dans une
 * boutique, et c'est là que se gagne le clic.
 *
 * Priorité aux produits badgés au back-office (« bestseller », « nouveau ») :
 * c'est le seul signal de mise en avant que le catalogue porte réellement.
 * À défaut, les dernières références entrées. Aucun classement inventé.
 */
export const getNavHighlights = cache(
  async (locale: Locale = "fr", limit = 2): Promise<NavHighlight[]> => {
    const rows = await prisma.product.findMany({
      where: { active: true, badge: { in: ["bestseller", "nouveau"] } },
      orderBy: [{ badge: "asc" }, { createdAt: "desc" }],
      take: limit,
      include: { category: { include: { group: true } } },
    });

    // Repli : catalogue sans aucun produit badgé — on montre les plus récents
    // plutôt que de laisser un trou dans le menu.
    const complement =
      rows.length < limit
        ? await prisma.product.findMany({
            where: { active: true, id: { notIn: rows.map((r) => r.id) } },
            orderBy: { createdAt: "desc" },
            take: limit - rows.length,
            include: { category: { include: { group: true } } },
          })
        : [];

    const traduire = needsTranslation(locale);

    return [...rows, ...complement].map((row) => ({
      id: row.id,
      // La marque ne se traduit jamais.
      brand: row.brand,
      name: pickText(row.name, traduire ? row.nameEn : undefined),
      priceFcfa: row.priceCents,
      image: packshot(row.image),
      href: `/${row.category.group.slug}/${row.category.slug}/${row.slug}`,
      badge: row.badge,
    }));
  },
);

/**
 * Marque telle que montrée sur `/marques` : soit une entité (logo, accroche,
 * fiche dédiée), soit un simple nom en mode repli — voir `getShopBrands`.
 */
export interface NavBrand {
  /** Chemin de la fiche marque, préfixe de langue non compris ; absent en repli. */
  href: string | null;
  name: string;
  logo: string | null;
  tagline: string | null;
}

/**
 * Marques de la vitrine, dans l'ordre `position` puis alphabétique.
 *
 * Lit la table `Brand` : marques actives ayant au moins un produit actif — une
 * marque sans produit ne s'affiche pas, une page vide déçoit plus qu'une
 * absence.
 *
 * ── REPLI SUR LE CATALOGUE, ET POURQUOI IL RESTE NÉCESSAIRE ─────────────────
 *
 * Le rattachement `Product.brandId` se fait par un bouton du back-office
 * (`importerMarquesDuCatalogue`), pas par la migration : une installation où
 * personne ne l'a encore lancé a une table `Brand` VIDE alors que son
 * catalogue affiche déjà des marques sur chaque fiche produit. Sans ce repli,
 * `/marques` — qui existait avant cette table — se viderait le jour du
 * déploiement de cette lecture, et le resterait tant que l'import n'a pas été
 * cliqué. Ce n'est donc pas du code mort : ne le retire que si l'import
 * devient automatique ou obligatoire au déploiement.
 *
 * Le repli se décide sur `prisma.brand.count() === 0` — la table est-elle
 * VIDE — et non sur `rows.length === 0` : `rows` est déjà filtré sur les
 * marques ACTIVES ayant un produit actif, donc un administrateur qui masque
 * ses douze marques (le geste que ce lot introduit) viderait `rows` sans
 * vider la table. Décider sur `rows` ferait alors resurgir, via le repli, les
 * douze noms qu'on vient précisément de masquer — le masquage ne masquerait
 * plus rien.
 *
 * En repli, chaque marque n'est qu'un nom sans fiche dédiée (`href: null`) :
 * `/marques/[slug]` n'existe que pour les marques réellement rattachées.
 */
export const getShopBrands = cache(async (locale: Locale = "fr"): Promise<NavBrand[]> => {
  const totalMarques = await prisma.brand.count();

  if (totalMarques > 0) {
    const rows = await prisma.brand.findMany({
      where: { active: true, products: { some: { active: true } } },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
    return rows.map((row) => ({
      href: `/marques/${row.slug}`,
      name: pickText(row.name, locale === "en" ? row.nameEn : undefined),
      logo: row.logo || null,
      tagline: pickText(row.description, locale === "en" ? row.descriptionEn : undefined) || null,
    }));
  }

  const fallback = await prisma.product.findMany({
    where: { active: true },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  return fallback
    .map((row) => row.brand.trim())
    .filter((name) => name.length > 0)
    .map((name) => ({ href: null, name, logo: null, tagline: null }));
});

/** Routine telle qu'annoncée dans le méga-menu. */
export interface NavRoutine {
  slug: string;
  name: string;
  /** Accroche d'une ligne : le besoin auquel la routine répond. */
  claim: string;
  /** Jeton de teinte — l'un des `--tint-*` de globals.css. */
  tint: string;
  image: string | null;
  href: string;
  /** Nombre de gestes, seule quantité utile au visiteur à ce stade. */
  stepCount: number;
}

/**
 * Routines actives, pour le panneau « Routines » de la barre.
 *
 * Requête volontairement maigre : l'en-tête est rendu sur CHAQUE page, et
 * `getRoutines` charge les produits complets de chaque geste — prix, stock,
 * variations, catégorie — pour n'en afficher ici que le nombre. On ne lit donc
 * que les colonnes montrées, plus un comptage.
 *
 * Une routine sans geste est écartée : elle ouvrirait une page vide, comme une
 * catégorie sans produit.
 *
 * TROIS PAR DÉFAUT, et pas davantage. Un panneau de navigation n'est pas la
 * page « Routines » : il donne un aperçu et un chemin. Les cinq routines
 * tenaient sur deux rangées de vignettes serrées, où les noms longs passaient à
 * la ligne — on y lisait moins bien que sur la page elle-même, qui reste à un
 * clic par le bouton « Voir toutes les routines ».
 */
export const getNavRoutines = cache(
  async (locale: Locale = "fr", limit = 3): Promise<NavRoutine[]> => {
    const rows = await prisma.routine.findMany({
      where: { active: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        slug: true,
        name: true,
        nameEn: true,
        claim: true,
        claimEn: true,
        tint: true,
        image: true,
        _count: { select: { steps: true } },
      },
    });

    const traduire = needsTranslation(locale);

    return rows
      .filter((row) => row._count.steps > 0)
      .slice(0, limit)
      .map((row) => ({
        slug: row.slug,
        name: pickText(row.name, traduire ? row.nameEn : undefined),
        claim: pickText(row.claim, traduire ? row.claimEn : undefined),
        tint: row.tint,
        image: packshot(row.image) || null,
        href: `/routines/${row.slug}`,
        stepCount: row._count.steps,
      }));
  },
);
