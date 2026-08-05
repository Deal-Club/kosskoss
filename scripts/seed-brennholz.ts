/**
 * ATTENTION — CE SCRIPT DÉCRIT L'ANCIENNE ORGANISATION DU CATALOGUE.
 *
 * Le catalogue a été réorganisé par conditionnement (vrac, palette, granulés,
 * bois compressé, poêle à bois, allumage) par scripts/restructurer-categories.ts.
 * Relancer ce seed tel quel recréerait les huit catégories d'essence
 * supprimées, en doublon des six actuelles.
 *
 * Il n'est conservé que pour les fiches produits qu'il contient. Avant tout
 * nouvel usage, réécrire ses groupes et catégories d'après la structure
 * actuelle en base.
 *
 * Peuple le catalogue avec l'assortiment bois de chauffage.
 *
 * Le script est ADDITIF : il crée ou met à jour les groupes « brennholz » et
 * « zubehoer » et leurs produits, sans jamais toucher aux autres. Relançable
 * autant de fois que nécessaire — tout passe par des upserts sur le slug.
 * Les fiches guide (intro, sections, conclusion) sont recréées à chaque
 * passage : elles n'ont pas de clé naturelle à upserter dessus.
 *
 * Lancement : node --env-file=.env --import tsx scripts/seed-brennholz.ts
 * (les imports ESM étant hoistés, dotenv chargé dans le fichier arriverait
 * trop tard : le client Prisma lit DATABASE_URL dès son import.)
 */
import { prisma } from "../src/server/prisma";

const IMG = "/images/brennholz";

// Catégorie Google Merchant : la seule feuille de la taxonomie qui couvre à
// la fois bûches, granulés et briquettes (taxonomy-with-ids.fr-FR.txt, id 625).
const GOOGLE_CATEGORY =
  "Maison et jardin > Accessoires pour cheminées et poêles à bois > Combustible et bois de chauffage";

interface GuideSectionSeed {
  heading: string;
  headingEn: string;
  body: string;
  bodyEn: string;
}

interface SeedProduct {
  slug: string;
  brand: string;
  name: string;
  nameEn: string;
  short: string;
  shortEn: string;
  bullets: string[];
  bulletsEn: string[];
  price: number;
  oldPrice?: number;
  badge?: string;
  image: string;
  rating?: number;
  stock: number;
  weightKg: number;
}

interface SeedCategory {
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
  guideSections: GuideSectionSeed[];
  products: SeedProduct[];
}

interface SeedGroup {
  slug: string;
  label: string;
  labelEn: string;
  position: number;
  categories: SeedCategory[];
}

/**
 * Fabrique les déclinaisons d'une essence. Le bois se vend par longueur de
 * bûche et par conditionnement : c'est la seule variation qui compte pour le
 * client, et elle fait le prix. Le reste (essence, séchage) est constant.
 */
function scheite(options: {
  essence: string;
  essenceEn: string;
  slugBase: string;
  brand: string;
  image: string;
  /** Prix du mètre cube apparent en euros, TTC, hors livraison. */
  preisProMap: number;
  eigenschaft: string;
  eigenschaftEn: string;
  heizwert: string;
  /** Étiquette portée par la déclinaison 33 cm / palette. Vide = aucune. */
  badge?: string;
}): SeedProduct[] {
  const {
    essence,
    essenceEn,
    slugBase,
    brand,
    image,
    preisProMap,
    eigenschaft,
    eigenschaftEn,
    heizwert,
    badge,
  } = options;

  // Trois longueurs standard. Plus la bûche est courte, plus le fendage coûte :
  // le supplément se répercute sur le prix au mètre cube apparent.
  const laengen = [
    { cm: 25, aufschlag: 12 },
    { cm: 33, aufschlag: 6 },
    { cm: 50, aufschlag: 0 },
  ];

  // Deux conditionnements : la palette gerbée (livrée telle quelle) et la
  // grande caisse de 2,3 MAP pour les gros consommateurs.
  const gebinde = [
    { map: 1.8, suffix: "palette", label: "Palette", labelEn: "pallet" },
    { map: 2.3, suffix: "caisse", label: "Grande caisse", labelEn: "large crate" },
  ];

  const produits: SeedProduct[] = [];

  for (const laenge of laengen) {
    for (const box of gebinde) {
      const prixMap = preisProMap + laenge.aufschlag;
      // Remise de volume sur la grande caisse : 6 % de moins au MAP.
      const remise = box.map > 2 ? 0.94 : 1;
      const total = Math.round(prixMap * box.map * remise);
      // Prix barré : le tarif hors saison, 12 % au-dessus.
      const ancien = Math.round(total * 1.12);

      produits.push({
        slug: `${slugBase}-${laenge.cm}cm-${box.suffix}`,
        brand,
        name: `${essence} prêt à brûler ${laenge.cm} cm — ${box.label} ${box.map.toLocaleString("fr-FR")} MAP`,
        nameEn: `${essenceEn} kiln-dried ${laenge.cm} cm — ${box.labelEn} ${box.map} loose m³`,
        short: `Bûches de ${essence.toLowerCase()} fendues à ${laenge.cm} cm, séchées en séchoir sous 18 % d'humidité sur brut. ${box.label} de ${box.map.toLocaleString("fr-FR")} mètre cube apparent, prête à brûler dès la livraison.`,
        shortEn: `${essenceEn} logs cut to ${laenge.cm} cm, kiln-dried below 18 % residual moisture. ${box.labelEn} holding ${box.map} loose cubic metres, ready to burn.`,
        bullets: [
          "Humidité sur brut inférieure à 18 %",
          `Longueur de bûche ${laenge.cm} cm, fendue`,
          `${heizwert} kWh par stère`,
          eigenschaft,
        ],
        bulletsEn: [
          "Residual moisture below 18 %",
          `Log length ${laenge.cm} cm, split`,
          `${heizwert} kWh per stacked cubic metre`,
          eigenschaftEn,
        ],
        price: total,
        oldPrice: ancien,
        // Une seule déclinaison porte l'étiquette : si toutes l'affichaient,
        // la grille de la page d'accueil serait un mur de « Meilleure vente ».
        badge: badge && laenge.cm === 33 && box.map === 1.8 ? badge : undefined,
        image: `${IMG}/${image}`,
        rating: 4.4 + ((laenge.cm + box.map) % 5) / 10,
        stock: box.map > 2 ? 24 : 60,
        weightKg: Math.round(box.map * 420),
      });
    }
  }

  return produits;
}

const groups: SeedGroup[] = [
  {
    slug: "brennholz",
    label: "Bois de chauffage",
    labelEn: "Firewood",
    position: 0,
    categories: [
      {
        slug: "buche",
        label: "Hêtre",
        labelEn: "Beech firewood",
        description:
          "Le hêtre est la référence pour les poêles à bois : une flamme calme et longue, très peu d'étincelles, une braise régulière. Nos bûches viennent de forêts françaises et sèchent 72 heures en séchoir jusqu'à moins de 18 % d'humidité sur brut.",
        descriptionEn:
          "Beech is the benchmark for wood stoves: a calm, long flame, almost no sparks and steady embers. Our logs come from French forests and spend 72 hours in the kiln until residual moisture drops below 18 %.",
        image: `${IMG}/buche.jpg`,
        guideIntro:
          "Le hêtre est le bois le plus vendu en France pour une raison simple : il se comporte bien dans tous les appareils, du poêle fermé à l'insert, sans surprise ni entretien particulier.",
        guideIntroEn:
          "Beech is the best-selling firewood in France for a simple reason: it behaves well in every appliance, from closed stoves to inserts, with no surprises or special upkeep.",
        guideClosing:
          "Besoin d'aide pour estimer la quantité ? Le calculateur de la page d'accueil convertit vos mètres cubes apparents en stères et en kilos.",
        guideClosingEn:
          "Need help estimating the quantity? The calculator on our homepage converts loose cubic metres into stacked m³ and kilograms.",
        guideSections: [
          {
            heading: "Pourquoi le hêtre reste la référence",
            headingEn: "Why beech remains the benchmark",
            body: "Bois dense à combustion lente, il tient la braise longtemps et ne projette presque pas d'étincelles — un atout dès qu'un enfant ou un animal partage la pièce.",
            bodyEn:
              "A dense, slow-burning wood, it holds embers for a long time and throws almost no sparks — an advantage whenever a child or a pet shares the room.",
          },
          {
            heading: "Poêle fermé, insert ou masse",
            headingEn: "Closed stove, insert or masonry heater",
            body: "Sa combustion régulière convient à tous les appareils fermés. En foyer ouvert, il reste correct mais moins spectaculaire que le bouleau.",
            bodyEn:
              "Its steady burn suits every closed appliance. In an open fireplace it still performs well, just less dramatic than birch.",
          },
          {
            heading: "Combien de MAP par saison",
            headingEn: "How many loose m³ per season",
            body: "En chauffage d'appoint, comptez environ 1 MAP pour dix soirées. En chauffage principal, doublez cette estimation selon l'isolation du logement.",
            bodyEn:
              "As a secondary heat source, budget roughly 1 loose m³ for ten evenings. As a main heat source, double that estimate depending on how well the home is insulated.",
          },
        ],
        products: scheite({
          essence: "Hêtre",
          essenceEn: "Beech",
          slugBase: "buche",
          brand: "MLC Bois",
          image: "buche.jpg",
          preisProMap: 92,
          eigenschaft: "Flamme calme, peu d'étincelles",
          eigenschaftEn: "Calm flame, few sparks",
          heizwert: "2 100",
          badge: "Meilleure vente",
        }),
      },
      {
        slug: "eiche",
        label: "Chêne",
        labelEn: "Oak firewood",
        description:
          "Le chêne est le bois qui tient la braise le plus longtemps. Dense et riche en tanins, il convient aux poêles de masse et aux longues soirées de chauffe — moins aux foyers ouverts, car sa combustion dégage une odeur plus marquée.",
        descriptionEn:
          "Oak holds embers the longest. The wood is dense and rich in tannins, which suits masonry heaters and long evenings — less so open fireplaces, as it smells stronger while burning.",
        image: `${IMG}/eiche.jpg`,
        guideIntro:
          "Le chêne demande un séchage plus long que les autres essences à cause de sa densité : c'est pour cela que nous le passons systématiquement au séchoir plutôt que de le vendre séché à l'air.",
        guideIntroEn:
          "Because of its density, oak needs longer drying than other species — which is why we always kiln-dry it instead of selling it air-dried.",
        guideClosing:
          "Un doute sur l'humidité d'une bûche ? Un humidimètre à moins de 20 € règle la question en quelques secondes.",
        guideClosingEn:
          "Not sure about a log's moisture? A moisture meter for under €20 settles the question in seconds.",
        guideSections: [
          {
            heading: "La plus longue phase de braise",
            headingEn: "The longest ember phase",
            body: "Sa densité élevée en fait le bois le plus efficace pour tenir une nuit entière sans recharger le poêle.",
            bodyEn: "Its high density makes it the most efficient wood for holding a stove through a whole night without reloading.",
          },
          {
            heading: "Poêle de masse plutôt que foyer ouvert",
            headingEn: "Masonry heater rather than open fireplace",
            body: "Les tanins du chêne dégagent une odeur plus marquée en foyer ouvert. En appareil fermé, cet inconvénient disparaît presque entièrement.",
            bodyEn: "Oak's tannins give off a stronger smell in an open fireplace. In a closed appliance this drawback almost entirely disappears.",
          },
          {
            heading: "Un séchage à surveiller",
            headingEn: "Drying worth checking",
            body: "Plus dense, il sèche plus lentement à l'air libre : vérifiez toujours l'humidité avant d'en stocker beaucoup à l'avance.",
            bodyEn: "Being denser, it air-dries more slowly: always check moisture before stocking a large amount in advance.",
          },
        ],
        products: scheite({
          essence: "Chêne",
          essenceEn: "Oak",
          slugBase: "eiche",
          brand: "MLC Bois",
          image: "eiche.jpg",
          preisProMap: 99,
          eigenschaft: "Phase de braise très longue",
          eigenschaftEn: "Very long ember phase",
          heizwert: "2 100",
        }),
      },
      {
        slug: "birke",
        label: "Bouleau",
        labelEn: "Birch firewood",
        description:
          "Le bouleau brûle avec une flamme claire et vive, s'allume facilement et dégage un parfum caractéristique grâce aux huiles essentielles de son écorce. Le classique du foyer ouvert, quand le feu doit se voir et se sentir.",
        descriptionEn:
          "Birch burns bright, lights easily and carries the scent of the essential oils in its bark. The classic choice for an open fireplace, where the fire is meant to be seen and smelled.",
        image: `${IMG}/birke.jpg`,
        guideIntro:
          "Le bouleau est le bois qu'on choisit pour le plaisir du feu autant que pour la chaleur : flamme visible, parfum reconnaissable, allumage sans effort.",
        guideIntroEn:
          "Birch is chosen as much for the pleasure of the fire as for the heat: a visible flame, a recognisable scent, and effortless lighting.",
        guideClosing:
          "En foyer ouvert, gardez toujours un pare-étincelles à portée : l'écorce du bouleau crépite plus que les autres essences.",
        guideClosingEn:
          "With an open fireplace, always keep a spark guard handy: birch bark crackles more than other species.",
        guideSections: [
          {
            heading: "Une flamme qui se voit",
            headingEn: "A flame you can see",
            body: "Sa combustion vive et lumineuse en fait le bois préféré des foyers ouverts et des soirées où le feu se regarde autant qu'il chauffe.",
            bodyEn: "Its bright, lively burn makes it the preferred wood for open fireplaces and evenings where the fire is watched as much as it heats.",
          },
          {
            heading: "Allumage facile, combustion rapide",
            headingEn: "Easy to light, quick to burn",
            body: "Il prend feu plus vite que le hêtre ou le chêne — pratique en complément d'allumage, moins adapté pour tenir une longue soirée seul.",
            bodyEn: "It catches faster than beech or oak — handy as a kindling booster, less suited on its own for a long evening.",
          },
          {
            heading: "Attention aux étincelles",
            headingEn: "Watch for sparks",
            body: "L'écorce riche en huiles crépite davantage : en foyer ouvert, un pare-feu reste recommandé.",
            bodyEn: "The oil-rich bark crackles more: with an open fireplace, a spark guard is recommended.",
          },
        ],
        products: scheite({
          essence: "Bouleau",
          essenceEn: "Birch",
          slugBase: "birke",
          brand: "MLC Bois",
          image: "birke.jpg",
          preisProMap: 95,
          eigenschaft: "Flamme claire, parfum agréable",
          eigenschaftEn: "Bright flame, pleasant scent",
          heizwert: "1 900",
        }),
      },
      {
        slug: "esche",
        label: "Frêne",
        labelEn: "Ash firewood",
        description:
          "Le frêne se fend proprement, brûle avec beaucoup de calme et laisse peu de cendres. Chez les poêliers, c'est souvent considéré comme le bois de chauffage le plus agréable — ce qui explique qu'il reste rarement longtemps en stock.",
        descriptionEn:
          "Ash splits cleanly, burns very calmly and leaves little residue. Stove builders rate it the most pleasant firewood there is — which is why it rarely stays in stock.",
        image: `${IMG}/scheite-hell.jpg`,
        guideIntro:
          "Le frêne a la réputation, méritée, d'être le bois de chauffage le plus agréable à vivre au quotidien : peu de cendres, peu d'entretien, combustion sans à-coups.",
        guideIntroEn:
          "Ash has a well-earned reputation as the most pleasant firewood to live with day to day: little ash, little upkeep, a smooth burn.",
        guideClosing:
          "Le frêne part vite : si une livraison vous convient, mieux vaut ne pas trop attendre pour la suivante.",
        guideClosingEn:
          "Ash sells fast: if one delivery suits you, it's best not to wait too long before ordering the next.",
        guideSections: [
          {
            heading: "Peu de cendres, peu d'entretien",
            headingEn: "Little ash, little upkeep",
            body: "Sa combustion propre réduit la fréquence de vidage du cendrier — un vrai confort pour un usage quotidien.",
            bodyEn: "Its clean burn reduces how often the ash pan needs emptying — a real comfort for daily use.",
          },
          {
            heading: "Un fendage sans effort",
            headingEn: "Splits with almost no effort",
            body: "Sa fibre rectiligne se fend très proprement, ce qui donne des bûches régulières et faciles à empiler.",
            bodyEn: "Its straight grain splits very cleanly, giving logs that are regular and easy to stack.",
          },
          {
            heading: "Une disponibilité limitée",
            headingEn: "Limited availability",
            body: "Très demandé, le frêne se renouvelle plus lentement que le hêtre dans nos stocks : les ruptures ponctuelles sont possibles en pleine saison.",
            bodyEn: "In high demand, ash restocks more slowly than beech: short-term shortages are possible at the height of the season.",
          },
        ],
        products: scheite({
          essence: "Frêne",
          essenceEn: "Ash",
          slugBase: "esche",
          brand: "MLC Bois",
          image: "scheite-hell.jpg",
          preisProMap: 97,
          eigenschaft: "Peu de cendres, combustion très calme",
          eigenschaftEn: "Little ash, very steady burn",
          heizwert: "2 100",
        }),
      },
      {
        slug: "hartholz-mix",
        label: "Mélange de feuillus",
        labelEn: "Mixed hardwood",
        description:
          "Hêtre, chêne, frêne et charme mélangés, tels qu'ils sortent de la coupe. La voie la plus économique vers le bois dur — le pouvoir calorifique moyen reste à peine en dessous du hêtre pur.",
        descriptionEn:
          "Beech, oak, ash and hornbeam mixed as they come off the saw. The cheapest route to hardwood — average heat output sits only just below pure beech.",
        image: `${IMG}/hartholz-mix.jpg`,
        guideIntro:
          "Le mélange de feuillus n'est pas un choix par défaut : c'est le meilleur rapport qualité-prix du catalogue pour qui ne cherche pas une essence en particulier.",
        guideIntroEn:
          "Mixed hardwood isn't a fallback choice: it's the best value option in the catalogue for anyone not set on a specific species.",
        guideClosing:
          "Toutes les essences du mélange sortent du même séchoir : l'humidité reste garantie sous 18 %, quelle que soit la bûche piochée.",
        guideClosingEn:
          "Every species in the mix comes out of the same kiln: moisture stays guaranteed below 18 %, whichever log you pick up.",
        guideSections: [
          {
            heading: "Le meilleur rapport qualité-prix",
            headingEn: "The best value for money",
            body: "Composé des mêmes essences que nos bûches vendues séparément, le mélange coûte moins cher car il n'est pas trié par espèce.",
            bodyEn: "Made of the same species sold separately elsewhere in the catalogue, the mix costs less because it isn't sorted by species.",
          },
          {
            heading: "Une composition qui varie légèrement",
            headingEn: "A composition that varies slightly",
            body: "Les proportions dépendent de la coupe du moment : une palette peut contenir un peu plus de chêne qu'une autre.",
            bodyEn: "Proportions depend on the current felling batch: one pallet may contain a little more oak than another.",
          },
          {
            heading: "Séchage identique à nos essences seules",
            headingEn: "Dried the same way as our single-species logs",
            body: "Aucune concession sur le séchage : le mélange passe par le même séchoir, au même seuil de 18 % d'humidité.",
            bodyEn: "No compromise on drying: the mix goes through the same kiln, to the same 18 % moisture threshold.",
          },
        ],
        products: scheite({
          essence: "Mélange de feuillus",
          essenceEn: "Mixed hardwood",
          slugBase: "hartholz-mix",
          brand: "MLC Bois",
          image: "hartholz-mix.jpg",
          preisProMap: 79,
          eigenschaft: "Meilleur rapport qualité-prix",
          eigenschaftEn: "Best value for money",
          heizwert: "2 000",
          badge: "Prix le plus bas",
        }),
      },
    ],
  },
  {
    slug: "zubehoer",
    label: "Granulés, bûches compressées & allumage",
    labelEn: "Pellets, compressed logs & firelighters",
    position: 1,
    categories: [
      {
        slug: "holzbriketts",
        label: "Bûches compressées",
        labelEn: "Compressed logs",
        description:
          "De la sciure compressée sans liant. Les bûches compressées demandent un tiers de la place du bois bûche, tiennent la braise toute la nuit et salissent à peine au rechargement.",
        descriptionEn:
          "Pressed sawdust with no binding agents. Compressed logs need a third of the space of split logs, hold embers overnight and barely dust when you refill.",
        image: `${IMG}/briketts.jpg`,
        guideIntro:
          "Les bûches compressées ne remplacent pas le bois bûche, elles le complètent : moins de place au stockage, une combustion plus prévisible, et une braise qui tient jusqu'au matin.",
        guideIntroEn:
          "Compressed logs don't replace split firewood, they complement it: less storage space, a more predictable burn, and embers that last until morning.",
        guideClosing:
          "Stockez-les à l'abri de l'humidité : sans écorce protectrice, elles se délitent plus vite qu'une bûche si elles prennent l'eau.",
        guideClosingEn:
          "Store them away from damp: with no protective bark, they break down faster than a log if they get wet.",
        guideSections: [
          {
            heading: "Un tiers de la place",
            headingEn: "A third of the space",
            body: "À pouvoir calorifique égal, une bûche compressée occupe bien moins de volume qu'une bûche fendue classique — appréciable en cave ou en appartement.",
            bodyEn: "For the same heat output, a compressed log takes up far less volume than a classic split log — a real plus in a cellar or a flat.",
          },
          {
            heading: "La braise tient toute la nuit",
            headingEn: "Embers last through the night",
            body: "Leur densité élevée ralentit la combustion : idéal pour retrouver des braises encore chaudes au réveil.",
            bodyEn: "Their high density slows the burn: ideal for finding still-warm embers in the morning.",
          },
          {
            heading: "Sans liant chimique",
            headingEn: "No chemical binder",
            body: "La sciure est compressée par simple pression, sans colle ni additif : la combustion reste aussi propre que celle du bois bûche.",
            bodyEn: "The sawdust is compressed by pressure alone, with no glue or additive: the burn stays as clean as split firewood.",
          },
        ],
        products: [
          {
            slug: "crepito-buches-compressees-hetre-960-kg",
            brand: "CREPITO",
            name: "CREPITO Bûches compressées Hêtre — Palette 960 kg",
            nameEn: "CREPITO compressed beech logs — 960 kg pallet",
            short:
              "96 paquets de 10 kg, pure sciure de hêtre compressée sans liant. Humidité sous 8 %, pouvoir calorifique 4,9 kWh/kg.",
            shortEn:
              "96 packs of 10 kg, pure beech sawdust pressed without binders. Moisture below 8 %, calorific value 4.9 kWh/kg.",
            bullets: ["Humidité inférieure à 8 %", "4,9 kWh par kilogramme", "96 paquets de 10 kg", "Sans liant chimique"],
            bulletsEn: [
              "Moisture below 8 %",
              "4.9 kWh per kilogram",
              "96 packs of 10 kg",
              "No binding agents",
            ],
            price: 419,
            oldPrice: 469,
            badge: "Meilleure vente",
            image: `${IMG}/briketts.jpg`,
            rating: 4.8,
            stock: 40,
            weightKg: 960,
          },
          {
            slug: "crepito-buches-compressees-hetre-240-kg",
            brand: "CREPITO",
            name: "CREPITO Bûches compressées Hêtre — Quart de palette 240 kg",
            nameEn: "CREPITO compressed beech logs — quarter pallet 240 kg",
            short:
              "24 paquets de 10 kg pour démarrer ou compléter du bois bûche. Même qualité que la palette complète.",
            shortEn:
              "24 packs of 10 kg to start with, or as a top-up alongside split logs. Same quality as the full pallet.",
            bullets: ["Humidité inférieure à 8 %", "4,9 kWh par kilogramme", "24 paquets de 10 kg", "Sans liant chimique"],
            bulletsEn: [
              "Moisture below 8 %",
              "4.9 kWh per kilogram",
              "24 packs of 10 kg",
              "No binding agents",
            ],
            price: 129,
            oldPrice: 145,
            image: `${IMG}/briketts.jpg`,
            rating: 4.6,
            stock: 80,
            weightKg: 240,
          },
          {
            slug: "ma-buchhetre-manubois-ronde-900-kg",
            brand: "Ma Bûch'Hêtre",
            name: "Ma Bûch'Hêtre (Manubois) Bûches rondes à trou — Palette 900 kg",
            nameEn: "Ma Bûch'Hêtre (Manubois) round core-hole logs — 900 kg pallet",
            short:
              "Le trou central laisse l'air circuler à cœur : ces bûches s'enflamment plus vite et brûlent plus régulièrement que les formats pleins.",
            shortEn:
              "The hole through the middle feeds air to the core, so these light through faster and burn more evenly than solid formats.",
            bullets: ["Humidité inférieure à 8 %", "4,8 kWh par kilogramme", "90 paquets de 10 kg", "Allumage plus rapide"],
            bulletsEn: [
              "Moisture below 8 %",
              "4.8 kWh per kilogram",
              "90 packs of 10 kg",
              "Faster burn-through",
            ],
            price: 389,
            image: `${IMG}/briketts.jpg`,
            rating: 4.5,
            stock: 30,
            weightKg: 900,
          },
        ],
      },
      {
        slug: "holzpellets",
        label: "Granulés de bois",
        labelEn: "Wood pellets",
        description:
          "Certifiés ENplus A1, fabriqués à partir de sciure non traitée. Pour poêles et chaudières à granulés — un taux de cendres sous 0,7 % pour que le brûleur reste propre.",
        descriptionEn:
          "ENplus A1 certified, made from untreated sawmill by-products. For pellet stoves and boilers — ash content below 0.7 % keeps the burner clean.",
        image: `${IMG}/pellets.jpg`,
        guideIntro:
          "La certification ENplus A1 est le seul repère qui compte au moment d'acheter des granulés : elle garantit un taux d'humidité, un taux de cendres et une densité constants d'un sac à l'autre.",
        guideIntroEn:
          "ENplus A1 certification is the one thing that matters when buying pellets: it guarantees consistent moisture, ash content and density from one bag to the next.",
        guideClosing:
          "Stockez toujours les granulés au sec : un sac qui prend l'humidité gonfle et se délite avant même d'atteindre le poêle.",
        guideClosingEn:
          "Always store pellets somewhere dry: a bag that takes on moisture swells and crumbles before it even reaches the stove.",
        guideSections: [
          {
            heading: "Ce que garantit ENplus A1",
            headingEn: "What ENplus A1 guarantees",
            body: "Humidité sous 10 %, diamètre constant, très peu de fines : le brûleur du poêle s'encrasse moins vite qu'avec un granulé non certifié.",
            bodyEn: "Moisture below 10 %, a consistent diameter, very little fine dust: the stove's burner clogs up more slowly than with an uncertified pellet.",
          },
          {
            heading: "Un taux de cendres qui change tout",
            headingEn: "An ash content that changes everything",
            body: "Sous 0,7 %, le brûleur demande un nettoyage bien moins fréquent qu'avec des granulés d'entrée de gamme.",
            bodyEn: "Below 0.7 %, the burner needs cleaning far less often than with entry-level pellets.",
          },
          {
            heading: "Le stockage fait la moitié de la qualité",
            headingEn: "Storage is half of the quality",
            body: "Même le meilleur granulé se dégrade s'il prend l'humidité : gardez les sacs sur palette, au sec, à l'écart du sol.",
            bodyEn: "Even the best pellet degrades if it takes on moisture: keep bags on a pallet, dry, off the ground.",
          },
        ],
        products: [
          {
            slug: "piveteau-bois-pellets-enplus-a1-975-kg-palette",
            brand: "Piveteau Bois",
            name: "Piveteau Bois Granulés ENplus A1 — Palette 65 × 15 kg",
            nameEn: "Piveteau Bois ENplus A1 wood pellets — pallet of 65 × 15 kg",
            short:
              "975 kg sur une palette, chaque sac soudé individuellement. Diamètre 6 mm, pouvoir calorifique 4,9 kWh/kg, taux de cendres sous 0,5 %.",
            shortEn:
              "975 kg on one pallet, every bag individually sealed. 6 mm diameter, 4.9 kWh/kg, ash content below 0.5 %.",
            bullets: ["Certifié ENplus A1", "4,9 kWh par kilogramme", "65 sacs de 15 kg", "Taux de cendres sous 0,5 %"],
            bulletsEn: [
              "ENplus A1 certified",
              "4.9 kWh per kilogram",
              "65 bags of 15 kg",
              "Ash content below 0.5 %",
            ],
            price: 349,
            oldPrice: 389,
            badge: "ENplus A1",
            image: `${IMG}/pellets.jpg`,
            rating: 4.7,
            stock: 50,
            weightKg: 975,
          },
          {
            slug: "limouzi-pellets-enplus-a1-15-kg-sac",
            brand: "Limouzi",
            name: "Limouzi Granulés ENplus A1 — Sac 15 kg",
            nameEn: "Limouzi ENplus A1 wood pellets — single 15 kg bag",
            short: "Pour compléter ou essayer avant de commander une palette entière. Même standard de qualité.",
            shortEn: "To top up or to try out before ordering a full pallet. Same quality standard.",
            bullets: ["Certifié ENplus A1", "4,8 kWh par kilogramme", "Sac de 15 kg", "Taux de cendres sous 0,5 %"],
            bulletsEn: ["ENplus A1 certified", "4.8 kWh per kilogram", "15 kg bag", "Ash content below 0.5 %"],
            price: 7,
            image: `${IMG}/pellets.jpg`,
            rating: 4.4,
            stock: 400,
            weightKg: 15,
          },
        ],
      },
      {
        slug: "anzuendholz",
        label: "Allumage",
        labelEn: "Kindling & firelighters",
        description:
          "Petit bois résineux sec et allume-feux naturels. Le résineux prend feu vite car sa résine dégaze tôt — d'où sa place au démarrage du feu, jamais en charge continue.",
        descriptionEn:
          "Dry softwood kindling and natural firelighters. Softwood lights fast because its resin gases off early — which is why it belongs at the start of a fire, not in the sustained load.",
        image: `${IMG}/anzuendholz.jpg`,
        guideIntro:
          "Un feu qui prend du premier coup dépend surtout de ce qu'on met au fond de l'âtre : petit bois résineux bien sec et un allume-feu qui laisse le temps aux flammes de s'installer.",
        guideIntroEn:
          "A fire that catches on the first try mostly comes down to what goes at the bottom of the hearth: dry softwood kindling and a firelighter that gives the flames time to take hold.",
        guideClosing:
          "Essayez l'allumage inversé : petit bois en haut, bûches en bas. Le feu descend au lieu de s'étouffer, et fume nettement moins.",
        guideClosingEn:
          "Try the top-down method: kindling on top, logs at the bottom. The fire burns downward instead of smothering, and smokes noticeably less.",
        guideSections: [
          {
            heading: "Pourquoi du résineux, jamais du feuillu",
            headingEn: "Why softwood, never hardwood",
            body: "La résine du pin et de l'épicéa dégage du gaz combustible dès les premières secondes : c'est ce qui rend l'allumage rapide et fiable.",
            bodyEn: "Pine and spruce resin gives off combustible gas within seconds — that's what makes lighting fast and reliable.",
          },
          {
            heading: "L'allumage inversé",
            headingEn: "The top-down method",
            body: "Petit bois et allume-feu au sommet, grosses bûches en dessous : le feu progresse vers le bas, brûle plus proprement et encrasse moins la vitre.",
            bodyEn: "Kindling and firelighter on top, large logs underneath: the fire moves downward, burns cleaner and leaves the glass less sooty.",
          },
          {
            heading: "Quelle quantité par flambée",
            headingEn: "How much per fire",
            body: "Comptez une poignée de petit bois et un allume-feu par démarrage — un sac de 25 litres couvre environ 25 flambées.",
            bodyEn: "Budget a handful of kindling and one firelighter per start — a 25-litre bag covers roughly 25 fires.",
          },
        ],
        products: [
          {
            slug: "mlc-bois-allumage-resineux-25-litres",
            brand: "MLC Bois",
            name: "MLC Bois Allumage résineux — Sac 25 litres",
            nameEn: "MLC Bois softwood kindling — 25 litre sack",
            short:
              "Pin et épicéa finement fendus, séchés en séchoir sous 12 % d'humidité. De quoi démarrer environ 25 feux.",
            shortEn:
              "Finely split pine and spruce, kiln-dried below 12 %. Enough for roughly 25 fire starts.",
            bullets: ["Humidité inférieure à 12 %", "Sac de 25 litres", "Environ 25 flambées", "Pin et épicéa"],
            bulletsEn: ["Residual moisture below 12 %", "25 litre sack", "About 25 fire starts", "Pine and spruce"],
            price: 12,
            image: `${IMG}/anzuendholz.jpg`,
            rating: 4.6,
            stock: 200,
            weightKg: 8,
          },
          {
            slug: "mlc-bois-allumage-resineux-palette",
            brand: "MLC Bois",
            name: "MLC Bois Allumage résineux — Palette 60 sacs",
            nameEn: "MLC Bois softwood kindling — pallet of 60 sacks",
            short: "Pour toute la saison. 60 sacs de 25 litres, gerbés sur une palette Europe.",
            shortEn: "For a whole season. 60 sacks of 25 litres, stacked on a Euro pallet.",
            bullets: ["Humidité inférieure à 12 %", "60 sacs de 25 litres", "Sur palette Europe", "Pin et épicéa"],
            bulletsEn: [
              "Residual moisture below 12 %",
              "60 sacks of 25 litres",
              "On a Euro pallet",
              "Pine and spruce",
            ],
            price: 579,
            oldPrice: 649,
            image: `${IMG}/anzuendholz.jpg`,
            rating: 4.5,
            stock: 12,
            weightKg: 480,
          },
          {
            slug: "mlc-bois-allume-feu-laine-cire-32-pieces",
            brand: "MLC Bois",
            name: "MLC Bois Allume-feu laine de bois & cire — 32 pièces",
            nameEn: "MLC Bois wood wool and wax firelighters — 32 pieces",
            short:
              "Laine de bois imprégnée de cire végétale, neutre en odeur et sans suie. Combustion de huit minutes — largement de quoi laisser le petit bois prendre le relais.",
            shortEn:
              "Wood wool in plant wax, odourless and soot-free. Burns for eight minutes — long enough for the kindling to take over on its own.",
            bullets: ["32 allume-feux", "Combustion de 8 minutes", "Neutre en odeur", "Cire végétale"],
            bulletsEn: ["32 firelighters", "8 minutes burn time", "Odourless", "Made with plant wax"],
            price: 9,
            image: `${IMG}/kaminfeuer.jpg`,
            rating: 4.8,
            stock: 300,
            weightKg: 1,
          },
        ],
      },
    ],
  },
];

function sku(slug: string): string {
  return slug.replace(/[^a-z0-9]/g, "").slice(0, 12).toUpperCase();
}

async function main() {
  let categoriesTouchees = 0;
  let produitsTouches = 0;

  for (const group of groups) {
    const groupRow = await prisma.group.upsert({
      where: { slug: group.slug },
      create: {
        slug: group.slug,
        label: group.label,
        labelEn: group.labelEn,
        position: group.position,
      },
      update: { label: group.label, labelEn: group.labelEn, position: group.position },
    });

    for (const [index, category] of group.categories.entries()) {
      const categoryRow = await prisma.category.upsert({
        where: { groupId_slug: { groupId: groupRow.id, slug: category.slug } },
        create: {
          groupId: groupRow.id,
          slug: category.slug,
          label: category.label,
          labelEn: category.labelEn,
          description: category.description,
          descriptionEn: category.descriptionEn,
          image: category.image,
          guideIntro: category.guideIntro,
          guideIntroEn: category.guideIntroEn,
          guideClosing: category.guideClosing,
          guideClosingEn: category.guideClosingEn,
          position: index,
        },
        update: {
          label: category.label,
          labelEn: category.labelEn,
          description: category.description,
          descriptionEn: category.descriptionEn,
          image: category.image,
          guideIntro: category.guideIntro,
          guideIntroEn: category.guideIntroEn,
          guideClosing: category.guideClosing,
          guideClosingEn: category.guideClosingEn,
          position: index,
        },
      });
      categoriesTouchees += 1;

      // Pas de clé naturelle sur une section de guide : on repart d'une
      // ardoise propre à chaque passage plutôt que de tenter un appariement.
      await prisma.guideSection.deleteMany({ where: { categoryId: categoryRow.id } });
      if (category.guideSections.length > 0) {
        await prisma.guideSection.createMany({
          data: category.guideSections.map((section, position) => ({
            categoryId: categoryRow.id,
            heading: section.heading,
            headingEn: section.headingEn,
            body: section.body,
            bodyEn: section.bodyEn,
            position,
          })),
        });
      }

      for (const product of category.products) {
        const commun = {
          categoryId: categoryRow.id,
          brand: product.brand,
          name: product.name,
          nameEn: product.nameEn,
          sku: sku(product.slug),
          shortDescription: product.short,
          shortDescriptionEn: product.shortEn,
          description: product.short,
          descriptionEn: product.shortEn,
          bullets: JSON.stringify(product.bullets),
          bulletsEn: JSON.stringify(product.bulletsEn),
          image: product.image,
          images: JSON.stringify([product.image]),
          priceCents: product.price * 100,
          oldPriceCents: product.oldPrice ? product.oldPrice * 100 : null,
          badge: product.badge ?? null,
          editorialRating: product.rating ?? null,
          stock: product.stock,
          shippingWeightGrams: product.weightKg * 1000,
          googleProductCategory: GOOGLE_CATEGORY,
          active: true,
        };

        await prisma.product.upsert({
          where: { slug: product.slug },
          create: { ...commun, slug: product.slug },
          update: commun,
        });
        produitsTouches += 1;
      }
    }
  }

  console.log(`Catalogue bois à jour : ${categoriesTouchees} catégories, ${produitsTouches} produits.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
