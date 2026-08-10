/**
 * Routines prêtes à l'emploi — les cinq de la maquette client.
 *
 * Elles reprennent à la lettre le bloc 5 de la maquette « Toutes pages »
 * (docs/design-references/kks/) : « ACHAT RAPIDE : NOS ROUTINES PRÊTES À
 * L'EMPLOI », cinq entrées par préoccupation, chacune avec son ajout direct au
 * panier.
 *
 * LA COMPOSITION N'EST PAS ÉCRITE EN DUR. Chaque geste déclare la catégorie où
 * puiser et les étiquettes qui comptent ; le produit est choisi dans la base au
 * moment du semis, par score de correspondance. Une routine écrite avec des
 * slugs figés serait cassée au premier produit retiré du catalogue — et le
 * catalogue est appelé à bouger.
 *
 * Aucun prix n'est stocké : il est la somme des gestes, calculée au rendu.
 *
 * Lancement : tsx prisma/seed-routines.ts
 */
import { config as loadEnv } from "dotenv";
import { prisma } from "../src/server/prisma";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

type Geste = {
  label: string;
  labelEn: string;
  /** Catégorie du catalogue où chercher (slug réel : voir kk-catalog.json). */
  category: string;
  /** Étiquettes qui font monter un candidat, par ordre décroissant de poids. */
  tags: string[];
  /**
   * Produits épinglés, par slug, dans l'ordre de préférence. Le premier
   * disponible l'emporte ; si aucun ne l'est, on retombe sur le choix
   * automatique.
   *
   * Composer une routine reste une décision de merchandising, pas un problème
   * d'algorithme. Le score par étiquettes donne un bon défaut, mais il choisit
   * mal dans deux cas : quand un produit très étiqueté écrase un produit bien
   * adapté et deux fois moins cher, et quand le nom du produit dit autre chose
   * que ses étiquettes (un « tonique correcteur de taches » techniquement
   * hydratant reste incongru dans une routine Hydratation). L'épinglage tranche
   * ces cas sans figer le reste.
   */
  prefer?: string[];
  /** Le rôle du geste DANS CETTE routine — vrai quel que soit le produit élu. */
  why: string;
  whyEn: string;
};

type RoutineDef = {
  slug: string;
  name: string;
  nameEn: string;
  claim: string;
  claimEn: string;
  description: string;
  descriptionEn: string;
  besoinTag: string;
  tint: string;
  gestes: Geste[];
};

/**
 * Les cinq routines, dans l'ordre de la maquette.
 *
 * « Protéger » n'apparaît que là où la protection solaire change réellement le
 * résultat — sur les taches et l'anti-âge, où le soleil défait le travail des
 * actifs. Ailleurs, un troisième geste utile vaut mieux qu'un geste ajouté pour
 * faire nombre : la charte demande une sélection courte, pas un panier gonflé.
 */
const ROUTINES: RoutineDef[] = [
  {
    slug: "routine-acne",
    name: "Routine Acné",
    nameEn: "Acne Routine",
    claim: "Assainir sans décaper",
    claimEn: "Clear skin without stripping it",
    description:
      "Trois gestes pour les peaux sujettes aux imperfections. On nettoie sans agresser — une peau décapée produit davantage de sébum —, on traite le bouton et l'inflammation, puis on hydrate d'une texture légère qui ne rebouche rien.",
    descriptionEn:
      "Three steps for blemish-prone skin. Cleanse without stripping — stripped skin makes more oil — treat the blemish and the inflammation, then hydrate with a light texture that clogs nothing.",
    besoinTag: "imperfections",
    tint: "acne",
    gestes: [
      {
        label: "Nettoyer",
        labelEn: "Cleanse",
        category: "nettoyants",
        tags: ["imperfections", "peau_grasse", "matifiant", "nettoyage"],
        why: "Retire sébum et impuretés sans décaper : une peau agressée compense en produisant davantage.",
        whyEn: "Removes oil and impurities without stripping: stripped skin compensates by making more.",
      },
      {
        label: "Traiter",
        labelEn: "Treat",
        category: "traitements",
        tags: ["imperfections", "matifiant", "peau_grasse", "traitement"],
        why: "Le geste central : il agit sur l'imperfection installée et sur l'inflammation qui laisse la marque.",
        whyEn: "The core step: it works on the blemish and on the inflammation that leaves the mark.",
      },
      {
        label: "Hydrater",
        labelEn: "Hydrate",
        category: "hydratants",
        tags: ["matifiant", "peau_grasse", "peau_mixte", "hydratation"],
        why: "Texture légère : une peau grasse a besoin d'eau, pas d'huile.",
        whyEn: "Light texture: oily skin needs water, not oil.",
      },
    ],
  },
  {
    slug: "routine-taches-hyperpigmentation",
    name: "Routine Taches & Hyperpigmentation",
    nameEn: "Dark Spots & Hyperpigmentation Routine",
    claim: "Estomper les marques, et les empêcher de revenir",
    claimEn: "Fade the marks, and keep them from coming back",
    description:
      "La demande la plus fréquente sur les peaux riches en mélanine : la moindre inflammation y laisse une marque sombre qui tient des mois. Le sérum estompe, la protection solaire empêche la marque de se réinstaller. Sans le second geste, le premier travaille pour rien.",
    descriptionEn:
      "The most common request on melanin-rich skin: the slightest inflammation leaves a dark mark that lasts for months. The serum fades it, the sunscreen keeps it from settling back in. Without the second step, the first works for nothing.",
    besoinTag: "taches",
    tint: "taches",
    gestes: [
      {
        label: "Nettoyer",
        labelEn: "Cleanse",
        category: "nettoyants",
        tags: ["eclat", "taches", "apaisant", "nettoyage"],
        why: "Une base propre, pour que les actifs du sérum atteignent la peau.",
        whyEn: "A clean base, so the serum's actives reach the skin.",
      },
      {
        label: "Traiter",
        labelEn: "Treat",
        category: "traitements",
        tags: ["taches", "eclat", "traitement"],
        why: "Agit sur la marque installée et freine la surproduction de pigment.",
        whyEn: "Works on the existing mark and slows pigment overproduction.",
      },
      {
        label: "Protéger",
        labelEn: "Protect",
        category: "solaires",
        tags: ["solaire", "taches", "eclat"],
        why: "Le geste non négociable : sans protection, le soleil réinstalle la tache plus vite que le sérum ne l'estompe.",
        whyEn: "The non-negotiable step: without protection, the sun brings the spot back faster than the serum fades it.",
      },
    ],
  },
  {
    slug: "routine-eclat-uniformite",
    name: "Routine Éclat & Uniformité",
    nameEn: "Glow & Even Tone Routine",
    claim: "Un teint réveillé, régulier",
    claimEn: "A brighter, more even complexion",
    description:
      "Pour un teint terne ou irrégulier, sans problème installé. On désencombre la surface, on relance l'éclat par un actif ciblé, on fixe le résultat par une hydratation qui fait la lumière.",
    descriptionEn:
      "For a dull or uneven complexion, with no underlying condition. Clear the surface, revive radiance with a targeted active, then lock it in with hydration that carries the light.",
    besoinTag: "eclat",
    tint: "eclat",
    gestes: [
      {
        label: "Nettoyer",
        labelEn: "Cleanse",
        category: "nettoyants",
        tags: ["eclat", "nettoyage", "apaisant"],
        why: "Désencombre la surface : c'est elle qui renvoie — ou non — la lumière.",
        whyEn: "Clears the surface: it is what does — or does not — catch the light.",
      },
      {
        label: "Traiter",
        labelEn: "Treat",
        category: "traitements",
        tags: ["eclat", "taches", "traitement"],
        why: "L'actif d'éclat, là où il agit le mieux : sur peau nue, avant la crème.",
        whyEn: "The brightening active, where it works best: on bare skin, before the cream.",
      },
      {
        label: "Hydrater",
        labelEn: "Hydrate",
        category: "hydratants",
        tags: ["eclat", "hydratation", "apaisant"],
        why: "Une peau bien hydratée réfléchit la lumière ; une peau sèche la boit.",
        whyEn: "Well-hydrated skin reflects light; dry skin drinks it.",
      },
    ],
  },
  {
    slug: "routine-anti-age-fermete",
    name: "Routine Anti-âge & Fermeté",
    nameEn: "Anti-Ageing & Firmness Routine",
    claim: "Soutenir la peau dans la durée",
    claimEn: "Support the skin over time",
    description:
      "Une routine de fond, qui se juge sur des mois et non sur des jours. Nettoyage doux pour préserver la barrière, actif de fermeté le soir, protection solaire le matin — la première mesure anti-âge, et de loin.",
    descriptionEn:
      "A long-game routine, judged over months rather than days. Gentle cleansing to preserve the barrier, a firming active at night, sunscreen in the morning — the first anti-ageing measure, by far.",
    besoinTag: "anti_age",
    tint: "age",
    gestes: [
      {
        label: "Nettoyer",
        labelEn: "Cleanse",
        category: "nettoyants",
        tags: ["apaisant", "peau_seche", "anti_age", "nettoyage"],
        why: "Doux par nécessité : une barrière cutanée fragilisée vieillit plus vite.",
        whyEn: "Gentle out of necessity: a weakened skin barrier ages faster.",
      },
      {
        label: "Traiter",
        labelEn: "Treat",
        category: "traitements",
        tags: ["anti_age", "eclat", "traitement"],
        why: "L'actif de fond. Il demande de la régularité — les résultats se comptent en mois.",
        whyEn: "The long-game active. It asks for consistency — results are counted in months.",
      },
      {
        label: "Protéger",
        labelEn: "Protect",
        category: "solaires",
        tags: ["solaire", "anti_age", "apaisant"],
        why: "La mesure anti-âge la mieux démontrée, avant tout sérum.",
        whyEn: "The best-evidenced anti-ageing measure there is, ahead of any serum.",
      },
    ],
  },
  {
    slug: "routine-hydratation-intense",
    name: "Routine Hydratation Intense",
    nameEn: "Intense Hydration Routine",
    claim: "Pour les peaux qui tirent",
    claimEn: "For skin that feels tight",
    description:
      "Peau qui tire, qui pèle, inconfortable après le nettoyage. Trois couches d'eau successives, de la plus fluide à la plus riche : c'est l'ordre qui fait tenir l'hydratation, pas la quantité de produit.",
    descriptionEn:
      "Tight, flaking skin, uncomfortable after cleansing. Three successive layers of water, from the most fluid to the richest: it is the order that makes hydration last, not the amount of product.",
    besoinTag: "hydratation",
    tint: "hydratation",
    gestes: [
      {
        label: "Nettoyer",
        labelEn: "Cleanse",
        category: "nettoyants",
        tags: ["peau_seche", "apaisant", "hydratation", "nettoyage"],
        // Le choix automatique retenait un lait démaquillant à 24 900 F parce
        // qu'il portait une étiquette de plus. Ce nettoyant-ci est doux,
        // hydratant, et coûte 10 400 F de moins — sur une routine d'entrée,
        // l'écart change qui peut se l'offrir.
        prefer: ["beauty-of-joseon-nettoyant-prune-verte"],
        why: "Sans tensioactif décapant : le tiraillement après nettoyage vient de là.",
        whyEn: "No stripping surfactant: that tight feeling after cleansing comes from there.",
      },
      {
        label: "Préparer",
        labelEn: "Prep",
        category: "toniques",
        tags: ["hydratation", "toner", "apaisant", "peau_seche"],
        // Un tonique « correcteur de taches pigmentaires » gagnait au score : il
        // est bien hydratant, mais son nom raconte une autre routine que
        // celle-ci. Le Heartleaf est apaisant et pensé pour les peaux
        // sensibles — ce que cherche une peau qui tire.
        prefer: ["anua-lotion-tonique-heartleaf-77"],
        why: "Première couche d'eau, sur peau encore humide : c'est ce qui permet à la suivante de tenir.",
        whyEn: "The first layer of water, on still-damp skin: it is what lets the next one hold.",
      },
      {
        label: "Hydrater",
        labelEn: "Hydrate",
        category: "hydratants",
        tags: ["hydratation", "peau_seche", "apaisant"],
        why: "La couche qui scelle. Sans elle, tout ce qui précède s'évapore.",
        whyEn: "The sealing layer. Without it, everything before it evaporates.",
      },
    ],
  },
];

/** Score d'un produit pour un geste : les premières étiquettes pèsent plus. */
function score(tags: string[], voulus: string[]): number {
  return voulus.reduce((total, tag, rang) => (tags.includes(tag) ? total + (voulus.length - rang) : total), 0);
}

function parseTags(value: string): string[] {
  try {
    const v: unknown = JSON.parse(value);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function main() {
  const produits = await prisma.product.findMany({
    where: { active: true },
    include: { category: true },
  });

  if (produits.length === 0) {
    console.error("Catalogue vide : lancez d'abord `tsx prisma/seed-kk.ts`.");
    process.exitCode = 1;
    return;
  }

  let posee = 0;
  let ignorees = 0;

  for (const [position, def] of ROUTINES.entries()) {
    // Un produit ne peut pas tenir deux gestes de la même routine : la
    // contrainte d'unicité de RoutineStep le refuserait, et ce serait de toute
    // façon un mauvais conseil.
    const deja = new Set<string>();
    const choisis: { geste: Geste; productId: string }[] = [];

    for (const geste of def.gestes) {
      const disponibles = produits.filter(
        (p) => p.category.slug === geste.category && !deja.has(p.id),
      );

      // Épinglage : il prime sur le score. Si le produit a quitté le catalogue,
      // on retombe silencieusement sur le choix automatique plutôt que de
      // laisser un trou dans la routine.
      const epingle = geste.prefer
        ?.map((slug) => disponibles.find((p) => p.slug === slug))
        .find((p) => p !== undefined);

      if (epingle) {
        deja.add(epingle.id);
        choisis.push({ geste, productId: epingle.id });
        continue;
      }

      const candidats = disponibles.map((p) => ({ p, s: score(parseTags(p.tags), geste.tags) }));

      if (candidats.length === 0) {
        console.warn(`  ⚠ ${def.slug} — aucun produit en « ${geste.category} » pour le geste « ${geste.label} »`);
        continue;
      }

      // LA PERTINENCE FILTRE, LE PRIX CHOISIT — et non l'inverse.
      //
      // Trier par score puis départager par le prix laissait gagner un produit
      // quatre fois plus cher pour une étiquette de plus : la routine « Éclat »
      // sortait à 112 500 FCFA parce qu'une crème à 78 500 portait un tag
      // supplémentaire. Sous un libellé « à partir de », c'est un mensonge.
      //
      // On retient donc la bande haute de pertinence — le meilleur score et
      // celui juste en dessous — et on prend le moins cher de cette bande. La
      // routine reste juste sur le fond et atteignable sur le prix, ce que la
      // charte demande explicitement : « premium = luxe ACCESSIBLE ».
      const meilleur = Math.max(...candidats.map((c) => c.s));
      const pertinents = meilleur > 0 ? candidats.filter((c) => c.s >= meilleur - 1) : candidats;

      const gagnant = pertinents.sort((a, b) => a.p.priceCents - b.p.priceCents)[0];
      deja.add(gagnant.p.id);
      choisis.push({ geste, productId: gagnant.p.id });
    }

    // Une routine à un seul geste n'est pas une routine : mieux vaut ne pas la
    // publier que d'afficher une promesse creuse.
    if (choisis.length < 2) {
      console.warn(`  ✗ ${def.slug} ignorée : ${choisis.length} geste(s) trouvé(s) sur ${def.gestes.length}`);
      ignorees += 1;
      continue;
    }

    const routine = await prisma.routine.upsert({
      where: { slug: def.slug },
      create: {
        slug: def.slug,
        name: def.name,
        nameEn: def.nameEn,
        claim: def.claim,
        claimEn: def.claimEn,
        description: def.description,
        descriptionEn: def.descriptionEn,
        besoinTag: def.besoinTag,
        tint: def.tint,
        position,
        active: true,
      },
      update: {
        name: def.name,
        nameEn: def.nameEn,
        claim: def.claim,
        claimEn: def.claimEn,
        description: def.description,
        descriptionEn: def.descriptionEn,
        besoinTag: def.besoinTag,
        tint: def.tint,
        position,
      },
    });

    // Les gestes sont remplacés, jamais fusionnés : le catalogue ayant pu
    // changer, l'ancienne composition n'a plus de valeur.
    await prisma.routineStep.deleteMany({ where: { routineId: routine.id } });
    await prisma.routineStep.createMany({
      data: choisis.map(({ geste, productId }, i) => ({
        routineId: routine.id,
        productId,
        label: geste.label,
        labelEn: geste.labelEn,
        why: geste.why,
        whyEn: geste.whyEn,
        position: i,
      })),
    });

    console.log(`  ✓ ${def.name} — ${choisis.length} gestes`);
    posee += 1;
  }

  console.log(`Routines : ${posee} publiée(s)${ignorees ? `, ${ignorees} ignorée(s)` : ""}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
