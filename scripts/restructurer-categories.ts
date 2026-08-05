/**
 * Restructure le catalogue autour du conditionnement plutôt que de l'essence.
 *
 * Pourquoi : le client n'arrive pas en cherchant « du frêne », il arrive en
 * cherchant « du bois livré sur palette » ou « des granulés ». L'essence reste
 * lisible dans le nom de chaque produit ; c'est le mode de livraison qui
 * décide de l'achat, donc c'est lui qui structure la boutique.
 *
 * Ce que fait le script :
 *   1. renomme les deux univers existants et leur donne des slugs français ;
 *   2. crée les six catégories cibles ;
 *   3. déplace chaque produit vers sa nouvelle catégorie ;
 *   4. supprime les huit anciennes catégories, une fois vidées.
 *
 * Aucun produit n'est supprimé : ils changent de rattachement, ils conservent
 * leur slug, leurs visuels, leur stock et leurs avis. Les commandes déjà
 * passées ne bougent pas non plus — chaque ligne de commande recopie le
 * libellé du produit au moment de l'achat.
 *
 * Relançable : tout passe par des upserts sur le slug.
 *
 * Lancement : node --env-file=.env --import tsx scripts/restructurer-categories.ts
 */
import { prisma } from "../src/server/prisma";

const IMG = "/images/brennholz";

interface SectionGuide {
  heading: string;
  headingEn: string;
  body: string;
  bodyEn: string;
}

interface CategorieCible {
  slug: string;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  image: string;
  guideIntro: string;
  guideIntroEn: string;
  guideClosing: string;
  guideClosingEn: string;
  sections: SectionGuide[];
}

interface UniversCible {
  /** Slug actuel en base, qui va être renommé. */
  ancienSlug: string;
  slug: string;
  label: string;
  labelEn: string;
  position: number;
  categories: CategorieCible[];
}

const UNIVERS: UniversCible[] = [
  {
    ancienSlug: "brennholz",
    slug: "bois-de-chauffage",
    label: "Bois de chauffage",
    labelEn: "Firewood",
    position: 0,
    categories: [
      {
        slug: "vrac",
        label: "Bois de chauffage en vrac",
        labelEn: "Loose firewood",
        description:
          "Le bois livré en grande caisse de 2,3 MAP, déversé à l'endroit que vous indiquez au livreur. C'est la formule la moins chère au mètre cube apparent, pour qui a la place de stocker et le temps d'empiler.",
        descriptionEn:
          "Firewood delivered in a 2.3 loose cubic metre crate and tipped where you tell the driver. This is the cheapest option per cubic metre, for anyone with the space to store it and the time to stack it.",
        image: `${IMG}/lose-schuettung.jpg`,
        guideIntro:
          "Le vrac est le conditionnement historique du bois de chauffage, et il reste le plus économique. La contrepartie est connue : le bois arrive en tas et c'est à vous de l'empiler. Comptez une bonne heure pour 2 MAP à deux personnes.",
        guideIntroEn:
          "Loose delivery is the traditional way to buy firewood and it remains the cheapest. The trade-off is well known: the wood arrives in a heap and it is up to you to stack it. Allow a good hour for 2 cubic metres with two people.",
        guideClosing:
          "Si vous n'avez ni le temps ni la place de gérer un tas, regardez le bois sur palette : il coûte un peu plus cher au mètre cube, mais il arrive rangé et se stocke tel quel.",
        guideClosingEn:
          "If you have neither the time nor the space to handle a heap, look at palletised firewood: it costs a little more per cubic metre but arrives already stacked and stores as delivered.",
        sections: [
          {
            heading: "Ce que représente une grande caisse",
            headingEn: "What a large crate holds",
            body: "Une caisse contient 2,3 mètres cubes apparents, soit environ 1,6 stère empilé et près de 970 kg à 18 % d'humidité. De quoi tenir un hiver entier dans un appartement bien isolé, ou deux mois de chauffe principale dans une maison.",
            bodyEn: "One crate holds 2.3 loose cubic metres, roughly 1.6 stacked steres and close to 970 kg at 18% moisture. Enough for a full winter in a well-insulated flat, or two months of main heating in a house.",
          },
          {
            heading: "Prévoir l'accès avant la livraison",
            headingEn: "Check access before delivery",
            body: "Le camion a besoin d'une aire de dépose stable et d'un dégagement d'environ trois mètres. Précisez à la commande si l'accès est étroit, en pente ou en gravier : nous adaptons le véhicule plutôt que de repartir avec votre bois.",
            bodyEn: "The lorry needs firm ground and roughly three metres of clearance. Tell us at checkout if access is narrow, sloped or gravelled: we send a suitable vehicle rather than leaving with your wood.",
          },
          {
            heading: "Empiler pour que le bois reste sec",
            headingEn: "Stacking so the wood stays dry",
            body: "Surélevez la pile de quelques centimètres, laissez circuler l'air sur les côtés et couvrez seulement le dessus. Un bois bâché jusqu'au sol reprend l'humidité qu'il a mis des mois à perdre.",
            bodyEn: "Raise the stack a few centimetres off the ground, let air move along the sides and cover the top only. Wood tarped down to the ground takes back the moisture it spent months losing.",
          },
        ],
      },
      {
        slug: "palette",
        label: "Bois de chauffage sur palette",
        labelEn: "Palletised firewood",
        description:
          "Des bûches rangées et cerclées sur palette de 1,8 MAP. La palette est déposée au sol par hayon : rien à empiler dans l'urgence, le bois reste ventilé et se stocke tel quel sous un abri.",
        descriptionEn:
          "Logs stacked and strapped on a 1.8 cubic metre pallet. The pallet is lowered to the ground on a tail lift: nothing to stack in a hurry, the wood stays ventilated and can be stored as delivered under cover.",
        image: `${IMG}/palette-box.jpg`,
        guideIntro:
          "La palette coûte quelques euros de plus au mètre cube que le vrac, et c'est le supplément le mieux investi du catalogue : le bois arrive rangé, il se déplace au transpalette et il peut rester sur sa palette tout l'hiver sans reprendre l'humidité du sol.",
        guideIntroEn:
          "A pallet costs a few euros more per cubic metre than loose delivery, and it is the best-spent premium in the catalogue: the wood arrives stacked, moves on a pallet truck and can stay on its pallet all winter without drawing moisture from the ground.",
        guideClosing:
          "Une palette entamée se referme mal : prévoyez une sangle ou un tasseau si vous puisez dedans progressivement, sinon les bûches du haut finissent par glisser.",
        guideClosingEn:
          "An opened pallet does not close up again easily: keep a strap or a batten handy if you draw from it gradually, otherwise the top logs eventually slide.",
        sections: [
          {
            heading: "Livrée au hayon, posée au sol",
            headingEn: "Tail-lift delivery, set down on the ground",
            body: "Le camion descend la palette au hayon et la dépose devant chez vous, sur une surface plane. Il ne la porte ni dans un jardin en pente, ni dans une cave, ni à l'étage : prévoyez le dernier mètre.",
            bodyEn: "The lorry lowers the pallet on its tail lift and sets it down at your door, on level ground. It does not carry it into a sloped garden, a cellar or upstairs: plan for that last metre.",
          },
          {
            heading: "1,8 MAP, c'est quelle quantité",
            headingEn: "How much is 1.8 cubic metres",
            body: "Une palette porte 1,8 mètre cube apparent, environ 1,26 stère empilé et 760 kg. Pour un poêle utilisé tous les soirs d'hiver, comptez deux à trois palettes sur la saison.",
            bodyEn: "A pallet carries 1.8 loose cubic metres, about 1.26 stacked steres and 760 kg. For a stove used every winter evening, allow two to three pallets per season.",
          },
          {
            heading: "Garder la palette sous la pile",
            headingEn: "Keep the pallet under the stack",
            body: "Ne jetez pas la palette une fois le cerclage coupé. Elle isole le bois du sol, ce qui vaut mieux qu'une pile posée sur une dalle qui remonte l'humidité par capillarité.",
            bodyEn: "Do not throw the pallet away once the strapping is cut. It keeps the wood off the ground, which beats a stack sitting on a slab that wicks moisture upwards.",
          },
        ],
      },
      {
        slug: "granules",
        label: "Granulés de bois",
        labelEn: "Wood pellets",
        description:
          "Certifiés ENplus A1, fabriqués à partir de sciure non traitée. Pour poêles et chaudières à granulés — un taux de cendres sous 0,7 % pour que le brûleur reste propre.",
        descriptionEn:
          "ENplus A1 certified, made from untreated sawdust. For pellet stoves and boilers — an ash content below 0.7% keeps the burner clean.",
        image: `${IMG}/pellets.jpg`,
        guideIntro:
          "La certification ENplus A1 est le seul repère qui compte au moment d'acheter des granulés : elle garantit un taux d'humidité sous 10 %, un taux de cendres sous 0,7 % et une tenue mécanique qui évite que le sac se transforme en sciure pendant le transport.",
        guideIntroEn:
          "ENplus A1 certification is the only benchmark that matters when buying pellets: it guarantees moisture below 10%, ash below 0.7% and the mechanical durability that stops a bag turning to sawdust in transit.",
        guideClosing:
          "Un poêle à granulés encrassé consomme plus pour chauffer autant. Le taux de cendres n'est pas un détail de fiche technique, c'est votre fréquence de nettoyage.",
        guideClosingEn:
          "A clogged pellet stove burns more to deliver the same heat. Ash content is not a spec-sheet detail, it is how often you will be cleaning.",
        sections: [
          {
            heading: "Ce que garantit ENplus A1",
            headingEn: "What ENplus A1 guarantees",
            body: "Humidité sous 10 %, cendres sous 0,7 %, pouvoir calorifique au-dessus de 4,6 kWh/kg et matière première tracée. Sans ce label, rien ne vous dit ce qu'il y a dans le sac.",
            bodyEn: "Moisture below 10%, ash below 0.7%, calorific value above 4.6 kWh/kg and traceable raw material. Without the label, nothing tells you what is in the bag.",
          },
          {
            heading: "Un taux de cendres qui change tout",
            headingEn: "Ash content changes everything",
            body: "Entre 0,5 % et 1,5 % de cendres, la différence se compte en vidages de bac : trois fois plus fréquents avec un granulé bas de gamme, pour la même quantité de chaleur.",
            bodyEn: "Between 0.5% and 1.5% ash, the difference shows up in how often you empty the pan: three times more often with a low-grade pellet, for the same heat output.",
          },
          {
            heading: "Le stockage fait la moitié de la qualité",
            headingEn: "Storage is half the quality",
            body: "Le granulé craint l'humidité plus que tout : un sac ouvert dans un garage humide gonfle et se délite en quelques semaines. Stockez au sec, sur palette, sacs fermés jusqu'à l'usage.",
            bodyEn: "Pellets fear damp above all else: an open bag in a humid garage swells and crumbles within weeks. Store dry, on a pallet, bags sealed until use.",
          },
        ],
      },
      {
        slug: "bois-compresse",
        label: "Bois compressé",
        labelEn: "Compressed logs",
        description:
          "De la sciure compressée sans liant. Les bûches compressées demandent un tiers de la place du bois bûche, tiennent la braise toute la nuit et salissent à peine au rechargement.",
        descriptionEn:
          "Compressed sawdust with no binder. Compressed logs take a third of the space of split logs, hold embers overnight and barely make a mess when reloading.",
        image: `${IMG}/briketts.jpg`,
        guideIntro:
          "Les bûches compressées ne remplacent pas le bois bûche, elles le complètent : moins de place au stockage, une combustion plus longue, et une propreté que le bois fendu n'aura jamais. Beaucoup de clients font l'hiver au bois bûche et gardent le compressé pour les nuits.",
        guideIntroEn:
          "Compressed logs do not replace split firewood, they complement it: less storage space, longer burn, and a cleanliness split logs will never match. Many customers burn split wood by day and keep compressed logs for the night.",
        guideClosing:
          "Attention à la puissance : le bois compressé chauffe fort. Dans un petit poêle, une bûche suffit là où il en faudrait trois en feuillu — surcharger fait monter la température au-delà de ce que l'appareil supporte.",
        guideClosingEn:
          "Mind the output: compressed logs burn hot. In a small stove one log does the work of three split logs — overloading pushes temperatures beyond what the appliance can take.",
        sections: [
          {
            heading: "Un tiers de la place",
            headingEn: "A third of the space",
            body: "À quantité de chaleur égale, le compressé occupe environ trois fois moins de volume que le bois fendu. C'est l'argument décisif en appartement, en cave ou dans un garage déjà plein.",
            bodyEn: "For the same heat, compressed logs take up about three times less volume than split wood. That is the decisive argument in a flat, a cellar or an already-full garage.",
          },
          {
            heading: "La braise tient toute la nuit",
            headingEn: "Embers hold overnight",
            body: "Une bûche compressée chargée à 22 h laisse encore des braises vives au petit matin. De quoi relancer le feu sans rallumer, ce qu'aucun feuillu ne permet aussi régulièrement.",
            bodyEn: "A compressed log loaded at 10 pm still leaves live embers at daybreak. Enough to revive the fire without relighting, which no split hardwood does as reliably.",
          },
          {
            heading: "Sans liant chimique",
            headingEn: "No chemical binder",
            body: "La cohésion vient de la lignine du bois, libérée par la pression, pas d'une colle ajoutée. Rien d'autre que du bois ne part dans le conduit.",
            bodyEn: "Cohesion comes from the wood's own lignin, released under pressure, not from added glue. Nothing but wood goes up the flue.",
          },
        ],
      },
    ],
  },
  {
    ancienSlug: "zubehoer",
    slug: "equipement",
    label: "Poêles",
    labelEn: "Stoves",
    position: 1,
    categories: [
      {
        slug: "poele-a-bois",
        label: "Poêle à bois",
        labelEn: "Wood stoves",
        description:
          "Poêles à bûches et poêles à granulés sélectionnés pour leur rendement et leur disponibilité en pièces détachées. Un appareil se garde vingt ans : mieux vaut un modèle réparable qu'un modèle à la mode.",
        descriptionEn:
          "Log and pellet stoves selected for their efficiency and for the availability of spare parts. An appliance lasts twenty years: a repairable model beats a fashionable one.",
        // « ofen-glut.jpg » porte mal son nom : c'est une pile de bûches, pas
        // un foyer. kaminfeuer.jpg montre un feu dans son âtre, seul visuel du
        // dossier qui évoque un appareil de chauffage.
        image: `${IMG}/kaminfeuer.jpg`,
        guideIntro:
          "Le rendement affiché d'un poêle ne veut rien dire sans le volume qu'il doit chauffer. Un appareil surdimensionné tourne au ralenti, encrasse sa vitre et son conduit ; un appareil sous-dimensionné tourne à fond et s'use. Le bon choix se fait sur le volume, pas sur la puissance maximale.",
        guideIntroEn:
          "A stove's stated efficiency means nothing without the volume it has to heat. An oversized appliance idles, fouling its glass and its flue; an undersized one runs flat out and wears. The right choice is made on volume, not peak output.",
        guideClosing:
          "L'installation par un professionnel qualifié conditionne votre assurance habitation et, le cas échéant, les aides à la rénovation. Faites établir le devis avant de commander l'appareil.",
        guideClosingEn:
          "Installation by a qualified professional conditions your home insurance and, where applicable, any renovation grants. Get the quote before ordering the appliance.",
        sections: [
          {
            heading: "Calculer la puissance qu'il vous faut",
            headingEn: "Working out the output you need",
            body: "Comptez environ 1 kW pour 10 m² dans un logement correctement isolé, davantage dans une maison ancienne. Un 8 kW couvre un séjour de 80 m² ; au-delà, c'est le conduit et la circulation d'air qui limitent, pas l'appareil.",
            bodyEn: "Allow roughly 1 kW per 10 m² in a properly insulated home, more in an older house. An 8 kW unit covers an 80 m² living room; beyond that the flue and air circulation are the limit, not the appliance.",
          },
          {
            heading: "Bûches ou granulés",
            headingEn: "Logs or pellets",
            body: "Le poêle à bûches ne demande aucune électricité et accepte le bois que vous voulez ; le poêle à granulés se programme et se régule seul, mais s'arrête en cas de coupure de courant. Le premier chauffe, le second gère.",
            bodyEn: "A log stove needs no electricity and takes whatever wood you choose; a pellet stove can be programmed and regulates itself, but stops in a power cut. The first heats, the second manages.",
          },
          {
            heading: "Le conduit avant l'appareil",
            headingEn: "The flue before the appliance",
            body: "Un conduit non tubé, sous-dimensionné ou mal ramoné empêche n'importe quel poêle de fonctionner correctement. Faites vérifier l'existant avant de choisir : cela oriente parfois tout l'achat.",
            bodyEn: "An unlined, undersized or poorly swept flue stops any stove working properly. Have the existing one checked before choosing: it sometimes decides the whole purchase.",
          },
        ],
      },
    ],
  },
];

/**
 * Où atterrit chaque produit, selon sa catégorie actuelle.
 *
 * Les cinq catégories d'essence se répartissent sur le conditionnement, lu
 * dans le slug du produit : la même essence existe en caisse et en palette.
 * Les trois autres catégories basculent en bloc.
 */
const CATEGORIES_ESSENCE = new Set(["buche", "eiche", "birke", "esche", "hartholz-mix"]);
const BASCULE_EN_BLOC = new Map([
  ["holzpellets", "granules"],
  ["holzbriketts", "bois-compresse"],
  // « Allumage » n'est plus une catégorie : ses produits — petit bois
  // résineux et allume-feux — rejoignent le bois compressé, le rayon le plus
  // proche par l'usage. Les deux slugs sont listés car la base a pu s'arrêter
  // à l'un ou à l'autre selon qu'elle a déjà connu la première restructuration.
  ["anzuendholz", "bois-compresse"],
  ["allumage", "bois-compresse"],
]);

function cibleProduit(ancienneCategorie: string, slugProduit: string): string | null {
  if (CATEGORIES_ESSENCE.has(ancienneCategorie)) {
    // Le suffixe n'est fiable que dans ces catégories : ailleurs, des produits
    // sans rapport se terminent aussi par « -palette ».
    if (slugProduit.endsWith("-caisse")) return "vrac";
    if (slugProduit.endsWith("-palette")) return "palette";
    return null;
  }
  return BASCULE_EN_BLOC.get(ancienneCategorie) ?? null;
}

async function main() {
  const ancienneStructure = await prisma.category.findMany({
    include: { group: true, products: { select: { id: true, slug: true, name: true } } },
  });

  console.log(`État de départ : ${ancienneStructure.length} catégories.`);

  // --- 1. Univers : renommés, jamais recréés. Les supprimer emporterait leurs
  // catégories et leurs produits en cascade.
  const idParSlugUnivers = new Map<string, string>();
  for (const univers of UNIVERS) {
    const existant =
      (await prisma.group.findUnique({ where: { slug: univers.ancienSlug } })) ??
      (await prisma.group.findUnique({ where: { slug: univers.slug } }));

    const enregistre = existant
      ? await prisma.group.update({
          where: { id: existant.id },
          data: {
            slug: univers.slug,
            label: univers.label,
            labelEn: univers.labelEn,
            position: univers.position,
          },
        })
      : await prisma.group.create({
          data: {
            slug: univers.slug,
            label: univers.label,
            labelEn: univers.labelEn,
            position: univers.position,
          },
        });

    idParSlugUnivers.set(univers.slug, enregistre.id);
    console.log(`Univers « ${univers.label} » (${univers.slug}) prêt.`);
  }

  // --- 2. Catégories cibles
  const idParSlugCategorie = new Map<string, string>();
  for (const univers of UNIVERS) {
    const groupId = idParSlugUnivers.get(univers.slug)!;

    for (const [index, categorie] of univers.categories.entries()) {
      const donnees = {
        label: categorie.label,
        labelEn: categorie.labelEn,
        description: categorie.description,
        descriptionEn: categorie.descriptionEn,
        image: categorie.image,
        guideIntro: categorie.guideIntro,
        guideIntroEn: categorie.guideIntroEn,
        guideClosing: categorie.guideClosing,
        guideClosingEn: categorie.guideClosingEn,
        position: index,
      };

      const enregistree = await prisma.category.upsert({
        where: { groupId_slug: { groupId, slug: categorie.slug } },
        update: donnees,
        create: { ...donnees, groupId, slug: categorie.slug },
      });

      // Les sections de guide n'ont pas de clé naturelle : on les refait.
      await prisma.guideSection.deleteMany({ where: { categoryId: enregistree.id } });
      await prisma.guideSection.createMany({
        data: categorie.sections.map((section, rang) => ({
          categoryId: enregistree.id,
          heading: section.heading,
          headingEn: section.headingEn,
          body: section.body,
          bodyEn: section.bodyEn,
          position: rang,
        })),
      });

      idParSlugCategorie.set(categorie.slug, enregistree.id);
      console.log(`  Catégorie « ${categorie.label} » (${univers.slug}/${categorie.slug}) prête.`);
    }
  }

  // --- 3. Déplacement des produits
  let deplaces = 0;
  const orphelins: string[] = [];

  for (const ancienne of ancienneStructure) {
    // Une catégorie cible qui existait déjà : ses produits sont en place.
    if (idParSlugCategorie.get(ancienne.slug) === ancienne.id) continue;

    for (const produit of ancienne.products) {
      const cible = cibleProduit(ancienne.slug, produit.slug);
      const categoryId = cible ? idParSlugCategorie.get(cible) : undefined;

      if (!categoryId) {
        orphelins.push(`${ancienne.slug}/${produit.slug} (${produit.name})`);
        continue;
      }

      await prisma.product.update({ where: { id: produit.id }, data: { categoryId } });
      deplaces += 1;
    }
  }

  console.log(`\n${deplaces} produits déplacés.`);

  if (orphelins.length > 0) {
    // On s'arrête avant toute suppression : un produit sans destination
    // disparaîtrait avec sa catégorie d'origine.
    console.error("\nProduits sans catégorie cible — RIEN N'A ÉTÉ SUPPRIMÉ :");
    for (const orphelin of orphelins) console.error(`  - ${orphelin}`);
    throw new Error("Reclassement incomplet, la suppression des anciennes catégories est annulée.");
  }

  // --- 4. Suppression des anciennes catégories, désormais vides
  const slugsCibles = new Set(idParSlugCategorie.keys());
  const aSupprimer = ancienneStructure.filter((c) => !slugsCibles.has(c.slug));

  for (const categorie of aSupprimer) {
    const restants = await prisma.product.count({ where: { categoryId: categorie.id } });
    if (restants > 0) {
      throw new Error(
        `La catégorie « ${categorie.label} » contient encore ${restants} produits : suppression annulée.`,
      );
    }
    await prisma.category.delete({ where: { id: categorie.id } });
    console.log(`Ancienne catégorie « ${categorie.label} » supprimée.`);
  }

  // --- Récapitulatif
  const finale = await prisma.group.findMany({
    orderBy: { position: "asc" },
    include: {
      categories: {
        orderBy: { position: "asc" },
        include: { _count: { select: { products: true } } },
      },
    },
  });

  console.log("\n=== Structure finale ===");
  for (const univers of finale) {
    console.log(`\n${univers.label}  (/${univers.slug})`);
    for (const categorie of univers.categories) {
      console.log(
        `  ${categorie.label.padEnd(30)} /${univers.slug}/${categorie.slug}  — ${categorie._count.products} produits`,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
