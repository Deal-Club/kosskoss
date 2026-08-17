/**
 * Contenu de démarrage du Journal.
 *
 * ── CE QUI EST RÉEL, CE QUI NE L'EST PAS ─────────────────────────────────────
 *
 * Les articles ci-dessous sont de VRAIS textes, écrits pour cette boutique :
 * conseils vérifiables sur la lecture d'une liste INCI, sur l'entretien des
 * cheveux crépus en saison sèche, sur la reconnaissance d'un cosmétique
 * contrefait. Ils sont publiables en l'état, ou modifiables depuis le
 * back-office. Aucun lorem ipsum.
 *
 * En revanche, il n'y a **qu'un seul auteur, « L'équipe KossKoss Select »**, et
 * c'est délibéré : inventer une conseillère avec un nom, une photo et une
 * biographie reviendrait à fabriquer une personne sur des pages publiques.
 * Les auteurs nommés doivent être créés depuis « Rubriques & auteurs » avec de
 * vraies coordonnées.
 *
 * Pour la même raison, aucun chiffre d'efficacité n'est avancé : les blocs de
 * statistiques décrivent des gestes, pas des résultats mesurés.
 *
 * Idempotent : relançable sans créer de doublon (upsert sur le slug).
 *
 * Lancement : tsx prisma/seed-journal.ts
 */
import { config as loadEnv } from "dotenv";
import { prisma } from "../src/server/prisma";
import { serializeBlocks } from "../src/lib/journal/blocks";
import { autoExcerpt, readingMinutes } from "../src/lib/journal/content";
import type { ArticleStatus, JournalBlock } from "../src/types/journal";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const JOUR = 24 * 60 * 60 * 1000;
const maintenant = Date.now();
const ilYA = (jours: number) => new Date(maintenant - jours * JOUR);
const dans = (jours: number) => new Date(maintenant + jours * JOUR);

// ---- Rubriques ----

const RUBRIQUES = [
  {
    slug: "conseils",
    label: "Conseils d'experte",
    labelEn: "Expert advice",
    description:
      "Les gestes qui changent quelque chose, expliqués simplement : comment appliquer, dans quel ordre, à quelle fréquence.",
    position: 1,
  },
  {
    slug: "ingredients",
    label: "Comprendre les ingrédients",
    labelEn: "Understanding ingredients",
    description:
      "Ce que veulent dire les noms sur l'étiquette, ce qu'ils font vraiment, et comment repérer ce qui ne convient pas à votre peau.",
    position: 2,
  },
  {
    slug: "guides",
    label: "Guides d'achat",
    labelEn: "Buying guides",
    description:
      "Choisir un soin sans se tromper : ce qui compte, ce qui ne compte pas, et comment reconnaître un produit authentique.",
    position: 3,
  },
];

// ---- Tags ----

const TAGS = [
  { slug: "routine", label: "Routine", labelEn: "Routine" },
  { slug: "hydratation", label: "Hydratation", labelEn: "Hydration" },
  { slug: "peau-grasse", label: "Peau grasse", labelEn: "Oily skin" },
  { slug: "ingredients", label: "Ingrédients", labelEn: "Ingredients" },
  { slug: "cheveux", label: "Cheveux", labelEn: "Hair" },
  { slug: "authenticite", label: "Authenticité", labelEn: "Authenticity" },
  { slug: "protection-solaire", label: "Protection solaire", labelEn: "Sun protection" },
];

// ---- Articles ----

interface SeedArticle {
  slug: string;
  title: string;
  status: ArticleStatus;
  rubrique: string;
  tags: string[];
  featured?: boolean;
  publishedAt?: Date;
  scheduledAt?: Date;
  deletedAt?: Date;
  metaTitle?: string;
  metaDescription?: string;
  blocks: JournalBlock[];
}

const ARTICLES: SeedArticle[] = [
  {
    slug: "lire-la-liste-inci-d-un-cosmetique",
    title: "Lire la liste INCI d'un cosmétique en trois minutes",
    status: "published",
    rubrique: "ingredients",
    tags: ["ingredients", "authenticite"],
    featured: true,
    publishedAt: ilYA(21),
    metaDescription:
      "La liste des ingrédients d'un cosmétique suit des règles précises. Savoir les lire permet de comparer deux produits en trois minutes.",
    blocks: [
      {
        kind: "paragraph",
        text: "Tous les cosmétiques vendus légalement portent au dos une liste d'ingrédients en latin et en anglais. Elle s'appelle la liste INCI, pour *International Nomenclature of Cosmetic Ingredients*. Elle paraît illisible, mais elle obéit à trois règles simples qui suffisent à comparer deux produits.",
      },
      { kind: "heading", level: 2, text: "Règle 1 : l'ordre n'est pas anodin" },
      {
        kind: "paragraph",
        text: "Les ingrédients sont classés du plus présent au moins présent, jusqu'à 1 % de la formule. En dessous de ce seuil, le fabricant range comme il veut. Concrètement : ce qui figure dans les cinq premières lignes constitue l'essentiel du produit.",
      },
      {
        kind: "callout",
        tone: "conseil",
        title: "Le test des cinq premières lignes",
        text: "Si l'actif mis en avant sur le flacon — vitamine C, acide hyaluronique, karité — apparaît en toute fin de liste, il est présent en quantité symbolique. Le nom sur l'emballage ne dit rien de la dose.",
      },
      { kind: "heading", level: 2, text: "Règle 2 : l'eau ouvre presque toujours la marche" },
      {
        kind: "paragraph",
        text: "**Aqua** en premier ingrédient n'est ni un défaut ni un signe de mauvaise qualité : la plupart des crèmes et des sérums sont des émulsions, et l'eau en est le support. Ce qui compte, c'est ce qui vient juste après.",
      },
      {
        kind: "list",
        ordered: false,
        items: [
          "**Glycerin** : humectant, retient l'eau dans la couche superficielle de la peau.",
          "**Butyrospermum Parkii Butter** : beurre de karité, le nom botanique du karité.",
          "**Cetearyl Alcohol** : un alcool gras, émollient — à ne pas confondre avec l'alcool desséchant, qui s'écrit **Alcohol Denat.**",
          "**Parfum** ou **Fragrance** : le parfum, première cause d'intolérance sur peau réactive.",
        ],
      },
      { kind: "heading", level: 2, text: "Règle 3 : les allergènes sont nommés" },
      {
        kind: "paragraph",
        text: "Vingt-six substances parfumantes doivent être déclarées à part quand elles dépassent un certain seuil. Ce sont les noms en fin de liste, souvent en italique : *Limonene*, *Linalool*, *Citronellol*, *Geraniol*. Leur présence n'est pas un défaut, mais si votre peau réagit sans que vous sachiez à quoi, c'est la première piste à examiner.",
      },
      {
        kind: "faq",
        items: [
          {
            question: "Une liste courte est-elle un gage de qualité ?",
            answer:
              "Non. Une formule courte convient souvent aux peaux réactives, mais un soin qui doit à la fois nettoyer, adoucir et parfumer aura mécaniquement plus d'ingrédients. La longueur ne dit rien à elle seule.",
          },
          {
            question: "Pourquoi les noms sont-ils en latin ?",
            answer:
              "Pour que la même plante porte le même nom dans tous les pays. Le karité s'écrit *Butyrospermum Parkii* partout, quelle que soit la langue de l'emballage.",
          },
          {
            question: "Un produit sans liste INCI est-il légal ?",
            answer:
              "Non. L'absence de liste d'ingrédients sur un cosmétique est un signal d'alerte sérieux : c'est souvent le signe d'un produit contrefait ou reconditionné.",
          },
        ],
      },
      {
        kind: "cta",
        title: "Vous ne savez pas par où commencer ?",
        text: "Le diagnostic beauté pose quelques questions sur votre peau et vos habitudes, puis propose une sélection adaptée.",
        href: "/diagnostic",
        label: "Faire le diagnostic",
      },
    ],
  },

  {
    slug: "routine-visage-en-trois-gestes",
    title: "Une routine visage qui tient : trois gestes, pas dix",
    status: "published",
    rubrique: "conseils",
    tags: ["routine", "hydratation"],
    publishedAt: ilYA(14),
    blocks: [
      {
        kind: "paragraph",
        text: "La routine la plus efficace est celle qu'on applique encore dans trois mois. Une liste de huit produits tient une semaine ; trois gestes tiennent des années.",
      },
      { kind: "heading", level: 2, text: "Nettoyer" },
      {
        kind: "paragraph",
        text: "Matin et soir. Le soir surtout : c'est le geste qui retire la poussière, la pollution et les résidus de maquillage. Une peau mal nettoyée annule le soin qui vient après, faute de pouvoir pénétrer.",
      },
      {
        kind: "paragraph",
        text: "Le bon nettoyant est celui qui ne laisse ni tiraillement ni film gras. Si votre peau tire après le rinçage, il est trop décapant, quel que soit son prix.",
      },
      { kind: "heading", level: 2, text: "Hydrater" },
      {
        kind: "paragraph",
        text: "Toutes les peaux ont besoin d'eau, y compris les peaux grasses. Une peau grasse déshydratée produit d'ailleurs davantage de sébum pour compenser : sauter l'hydratation aggrave ce qu'on cherche à corriger.",
      },
      { kind: "heading", level: 3, text: "Quelle texture choisir" },
      {
        kind: "table",
        headers: ["Type de peau", "Texture adaptée"],
        rows: [
          ["Grasse ou mixte", "Gel ou fluide léger"],
          ["Normale", "Crème légère"],
          ["Sèche", "Crème riche, ou baume le soir"],
          ["Réactive", "Formule courte, sans parfum"],
        ],
      },
      { kind: "heading", level: 2, text: "Protéger" },
      {
        kind: "paragraph",
        text: "Le matin, une protection solaire. Sous le climat camerounais, l'ensoleillement est fort toute l'année, y compris en saison des pluies où la couverture nuageuse laisse passer les UVA. C'est le geste qui a le plus d'effet sur l'aspect de la peau à long terme.",
      },
      {
        kind: "callout",
        tone: "avertissement",
        title: "Le soir, pas de protection solaire",
        text: "Elle ne sert à rien la nuit et alourdit inutilement la peau. Le soir, on s'arrête au nettoyage et à l'hydratation.",
      },
      {
        kind: "stats",
        items: [
          { value: "3", label: "gestes seulement" },
          { value: "2 fois", label: "par jour" },
          { value: "5 min", label: "matin et soir" },
        ],
      },
      {
        kind: "paragraph",
        text: "Les sérums, masques et exfoliants viennent après, une fois ces trois gestes installés. Pas avant.",
      },
    ],
  },

  {
    slug: "reconnaitre-un-cosmetique-contrefait",
    title: "Reconnaître un cosmétique contrefait : sept vérifications",
    status: "published",
    rubrique: "guides",
    tags: ["authenticite", "ingredients"],
    publishedAt: ilYA(9),
    metaTitle: "Cosmétique contrefait : sept vérifications avant d'acheter",
    blocks: [
      {
        kind: "paragraph",
        text: "La contrefaçon cosmétique n'est pas seulement une affaire d'argent perdu. Un soin contrefait peut contenir des substances interdites, être fabriqué sans contrôle d'hygiène, ou simplement avoir été stocké au soleil pendant des mois.",
      },
      { kind: "heading", level: 2, text: "Sur l'emballage" },
      {
        kind: "list",
        ordered: true,
        items: [
          "**La liste d'ingrédients existe** et est lisible. Son absence est disqualifiante.",
          "**Le numéro de lot** figure sur le flacon ET sur la boîte, et les deux correspondent.",
          "**La date de durabilité** ou le symbole de la période après ouverture est présent.",
          "**Le nom et l'adresse** du responsable de la mise sur le marché sont indiqués.",
        ],
      },
      { kind: "heading", level: 2, text: "Sur le produit lui-même" },
      {
        kind: "list",
        ordered: true,
        items: [
          "**L'opercule de sécurité** est intact et adhère au flacon.",
          "**La texture et l'odeur** correspondent à ce que vous connaissez du produit.",
          "**Le prix** n'est pas très inférieur au marché : une remise de 70 % sur une marque qui ne solde jamais est un signal, pas une aubaine.",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        title: "En cas de doute",
        text: "N'utilisez pas le produit et contactez le revendeur. Une marque authentique répond à une demande de traçabilité : c'est même la meilleure façon de vérifier.",
      },
      {
        kind: "paragraph",
        text: "Acheter chez un revendeur identifié, qui indique d'où viennent ses produits, reste la protection la plus simple. C'est aussi ce qui permet un recours si quelque chose ne va pas.",
      },
    ],
  },

  {
    slug: "cheveux-crepus-hydratation-saison-seche",
    title: "Cheveux crépus : garder l'hydratation en saison sèche",
    status: "published",
    rubrique: "conseils",
    tags: ["cheveux", "hydratation"],
    publishedAt: ilYA(5),
    blocks: [
      {
        kind: "paragraph",
        text: "En saison sèche, l'air appauvri en humidité tire l'eau de la fibre capillaire. Le cheveu crépu y est plus exposé que les autres : sa forme en spirale freine la descente du sébum le long de la longueur, qui reste donc naturellement plus sèche.",
      },
      { kind: "heading", level: 2, text: "Hydrater, puis sceller" },
      {
        kind: "paragraph",
        text: "L'ordre compte, et c'est le point que l'on rate le plus souvent. Un corps gras seul ne réhydrate rien : il enferme ce qui est déjà présent. Appliqué sur cheveu sec, il scelle la sécheresse.",
      },
      {
        kind: "list",
        ordered: true,
        items: [
          "**De l'eau d'abord** : vaporisateur d'eau, ou leave-in à base aqueuse.",
          "**Un humectant ensuite** : glycérine ou aloe vera, qui retiennent cette eau.",
          "**Un corps gras pour finir** : huile ou beurre, qui ferme l'écaille et ralentit l'évaporation.",
        ],
      },
      {
        kind: "callout",
        tone: "conseil",
        title: "Attention à la glycérine en air très sec",
        text: "La glycérine capte l'humidité de l'air. Quand l'air est plus sec que le cheveu — vent d'harmattan, climatisation — elle peut faire l'inverse et puiser dans la fibre. Dans ces conditions, on réduit sa part au profit des corps gras.",
      },
      { kind: "heading", level: 2, text: "Espacer les shampoings" },
      {
        kind: "paragraph",
        text: "Un lavage par semaine suffit à la plupart des cuirs chevelus. Entre deux, un rinçage à l'eau claire ou un nettoyant sans sulfate retire la poussière sans retirer le film protecteur.",
      },
      {
        kind: "faq",
        items: [
          {
            question: "Faut-il dormir avec un foulard en satin ?",
            answer:
              "C'est utile. Le coton absorbe l'eau et crée des frictions ; le satin et la soie glissent et n'en absorbent pas. Une taie d'oreiller en satin remplit le même rôle si le foulard vous gêne.",
          },
          {
            question: "Le beurre de karité convient-il à tous les cheveux ?",
            answer:
              "Il convient bien aux cheveux épais et très secs. Sur cheveu fin, il peut alourdir : une huile plus légère est alors préférable pour l'étape de scellage.",
          },
        ],
      },
    ],
  },

  {
    slug: "peau-grasse-climat-humide",
    title: "Peau grasse en climat humide : ce qui change vraiment",
    status: "published",
    rubrique: "conseils",
    tags: ["peau-grasse", "routine"],
    publishedAt: ilYA(2),
    blocks: [
      {
        kind: "paragraph",
        text: "Les conseils sur la peau grasse viennent le plus souvent de climats tempérés et secs. Sous un climat chaud et humide, deux ajustements suffisent, et ils vont à contre-courant de ce qu'on lit habituellement.",
      },
      { kind: "heading", level: 2, text: "Ne pas multiplier les nettoyages" },
      {
        kind: "paragraph",
        text: "La brillance en fin de journée vient autant de la transpiration que du sébum. Nettoyer trois ou quatre fois par jour retire le film hydrolipidique et déclenche une production compensatoire : la peau brille davantage le lendemain. Deux nettoyages, matin et soir, restent la bonne fréquence.",
      },
      { kind: "heading", level: 2, text: "Alléger la texture, pas la routine" },
      {
        kind: "paragraph",
        text: "L'erreur suivante consiste à supprimer l'hydratation. Ce qu'il faut changer, c'est la texture : un gel aqueux à la place d'une crème riche. La peau reçoit l'eau dont elle a besoin sans la couche occlusive qui, elle, devient inconfortable dans l'humidité.",
      },
      {
        kind: "quote",
        text: "Une peau grasse déshydratée produit plus de sébum, pas moins.",
        attribution: "",
      },
      {
        kind: "cta",
        title: "Trouver la texture adaptée",
        text: "Le diagnostic tient compte du type de peau et du climat.",
        href: "/diagnostic",
        label: "Faire le diagnostic",
      },
    ],
  },

  {
    slug: "comprendre-le-spf-de-sa-protection-solaire",
    title: "SPF 30 ou SPF 50 : comprendre ce que le chiffre mesure",
    status: "scheduled",
    rubrique: "guides",
    tags: ["protection-solaire", "ingredients"],
    scheduledAt: dans(4),
    blocks: [
      {
        kind: "paragraph",
        text: "Le SPF mesure la protection contre les UVB, ceux qui provoquent le coup de soleil. Il ne dit rien, à lui seul, de la protection contre les UVA, responsables du vieillissement cutané et de certaines taches.",
      },
      { kind: "heading", level: 2, text: "Ce que le chiffre veut dire" },
      {
        kind: "table",
        headers: ["Indice", "UVB filtrés"],
        rows: [
          ["SPF 15", "environ 93 %"],
          ["SPF 30", "environ 97 %"],
          ["SPF 50", "environ 98 %"],
        ],
      },
      {
        kind: "paragraph",
        text: "L'écart entre 30 et 50 est plus faible qu'on ne l'imagine. Ce qui fait la différence en pratique, c'est la quantité appliquée et la fréquence de renouvellement, pas le chiffre sur le tube.",
      },
      { kind: "heading", level: 2, text: "Chercher la mention UVA" },
      {
        kind: "paragraph",
        text: "Le logo « UVA » entouré d'un cercle indique une protection UVA au moins égale au tiers du SPF annoncé. C'est cette mention qu'il faut vérifier, autant que l'indice lui-même.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Renouveler toutes les deux heures",
        text: "En exposition directe, en transpirant ou après une baignade. Sans renouvellement, l'indice affiché n'a plus grand rapport avec la protection réelle.",
      },
    ],
  },

  {
    slug: "nettoyants-gel-lait-ou-huile",
    title: "Gel, lait ou huile : choisir son nettoyant visage",
    status: "draft",
    rubrique: "guides",
    tags: ["routine"],
    blocks: [
      {
        kind: "paragraph",
        text: "Brouillon en cours de rédaction. Comparer les trois familles de nettoyants, leur usage selon le type de peau, et la question du double nettoyage.",
      },
      { kind: "heading", level: 2, text: "Le gel" },
      { kind: "paragraph", text: "À compléter." },
    ],
  },

  {
    slug: "note-editoriale-archivee",
    title: "Note éditoriale de lancement",
    status: "archived",
    rubrique: "conseils",
    tags: [],
    publishedAt: ilYA(60),
    blocks: [
      {
        kind: "paragraph",
        text: "Première note publiée à l'ouverture du Journal, conservée pour mémoire. Archivée : elle n'apparaît plus sur la boutique et sort du sitemap, mais reste consultable depuis le back-office.",
      },
    ],
  },
];

// ---- Semis ----

async function main() {
  console.log("Semis du Journal…");

  // Auteur unique : la rédaction. Voir l'en-tête de ce fichier.
  const auteur = await prisma.articleAuthor.upsert({
    where: { slug: "equipe-kosskoss-select" },
    update: {},
    create: {
      slug: "equipe-kosskoss-select",
      name: "L'équipe KossKoss Select",
      role: "Rédaction",
      roleEn: "Editorial team",
      bio: "Les articles du Journal sont écrits et relus par l'équipe de la boutique. Les conseils s'appuient sur les notices des fabricants et sur la réglementation cosmétique en vigueur ; ils ne remplacent pas l'avis d'un dermatologue.",
      bioEn:
        "Journal articles are written and reviewed by the shop team. Advice is based on manufacturer instructions and current cosmetics regulations; it does not replace a dermatologist's opinion.",
      socials: "{}",
    },
  });

  const rubriques = new Map<string, string>();
  for (const rubrique of RUBRIQUES) {
    const row = await prisma.articleCategory.upsert({
      where: { slug: rubrique.slug },
      update: {
        label: rubrique.label,
        labelEn: rubrique.labelEn,
        description: rubrique.description,
        position: rubrique.position,
      },
      create: {
        slug: rubrique.slug,
        label: rubrique.label,
        labelEn: rubrique.labelEn,
        description: rubrique.description,
        position: rubrique.position,
        active: true,
      },
    });
    rubriques.set(rubrique.slug, row.id);
  }

  const tags = new Map<string, string>();
  for (const tag of TAGS) {
    const row = await prisma.articleTag.upsert({
      where: { slug: tag.slug },
      update: { label: tag.label, labelEn: tag.labelEn },
      create: { slug: tag.slug, label: tag.label, labelEn: tag.labelEn },
    });
    tags.set(tag.slug, row.id);
  }

  for (const article of ARTICLES) {
    const blocks = serializeBlocks(article.blocks);
    const commun = {
      title: article.title,
      excerpt: autoExcerpt(article.blocks),
      blocks,
      readingMinutes: readingMinutes(article.blocks),
      status: article.status,
      categoryId: rubriques.get(article.rubrique) ?? null,
      authorId: auteur.id,
      featured: article.featured ?? false,
      publishedAt: article.publishedAt ?? null,
      scheduledAt: article.scheduledAt ?? null,
      deletedAt: article.deletedAt ?? null,
      metaTitle: article.metaTitle ?? "",
      metaDescription: article.metaDescription ?? "",
      updatedBy: "seed",
    };

    const row = await prisma.article.upsert({
      where: { slug: article.slug },
      update: commun,
      create: { slug: article.slug, ...commun },
    });

    // Ardoise propre sur les tags, comme dans `saveArticle`.
    await prisma.articleTagLink.deleteMany({ where: { articleId: row.id } });
    if (article.tags.length > 0) {
      await prisma.articleTagLink.createMany({
        data: article.tags
          .map((slug) => tags.get(slug))
          .filter((tagId): tagId is string => Boolean(tagId))
          .map((tagId) => ({ articleId: row.id, tagId })),
        skipDuplicates: true,
      });
    }

    console.log(`  ${article.status.padEnd(9)} ${article.slug}`);
  }

  console.log(
    `\n${ARTICLES.length} articles, ${RUBRIQUES.length} rubriques, ${TAGS.length} tags, 1 auteur.`,
  );
  console.log(
    "Rappel : créez les auteurs nommés depuis /admin/journal/taxonomie, avec leurs vraies coordonnées.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
