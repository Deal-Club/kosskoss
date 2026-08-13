/**
 * Avis de démonstration, pour juger du rendu d'un catalogue vivant.
 *
 * ATTENTION — ces avis ne sont pas des avis de clients. Publier de faux avis,
 * ou présenter comme authentiques des avis qui ne le sont pas, est une
 * pratique commerciale trompeuse réputée telle en toutes circonstances
 * (article L121-4, 21° et 22° du Code de la consommation) : ils doivent
 * disparaître avant l'ouverture de la boutique.
 *
 * La référence était auparavant le § 3 Abs. 3 UWG allemand, comme tout le
 * corpus de ce fichier — un reste du clone quelle.de dont ce projet est parti.
 * L'allemand a été retiré du projet (voir TARGET.md) et la boutique vend au
 * Cameroun : le droit applicable et les textes sont français.
 *
 * Chaque avis porte pour cela une note de modération reconnaissable, visible
 * dans le back-office et qui sert de prise pour tout effacer :
 *
 *   npx tsx --env-file=.env.local scripts/avis-demonstration.ts --purger
 *
 * Génération :
 *   npx tsx --env-file=.env.local scripts/avis-demonstration.ts
 */

import { prisma } from "../src/server/prisma";

/** Marque de reconnaissance. Ne jamais la changer sans adapter la purge. */
const MARQUE = "[DEMO] Avis de démonstration — à supprimer avant l'ouverture";

/** Part des produits qui reçoivent des avis : un catalogue neuf en a rarement partout. */
const PART_AVEC_AVIS = 0.62;
const AVIS_MIN = 10;
const AVIS_MAX = 60;
/** Ancienneté maximale d'un avis, en jours. */
const PROFONDEUR_JOURS = 540;

// ---------------------------------------------------------------------------
// Tirage reproductible
// ---------------------------------------------------------------------------

/**
 * Générateur déterministe : deux exécutions produisent le même catalogue
 * d'avis. Sans cela, purger puis régénérer donnerait un site différent à
 * chaque fois, et une capture d'écran ne vaudrait plus rien.
 */
function creerAleatoire(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 0x100000000;
  };
}

const alea = creerAleatoire(20260729);
const entre = (min: number, max: number) => min + Math.floor(alea() * (max - min + 1));
const piocher = <T>(liste: readonly T[]): T => liste[Math.floor(alea() * liste.length)];

// ---------------------------------------------------------------------------
// Identités
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Identités
//
// Prénoms et villes du Cameroun et de la diaspora francophone : la boutique
// livre « partout au Cameroun » et règle en Mobile Money. Le corpus précédent
// était allemand — Thomas, Sabine, Düsseldorf, Saarbrücken — hérité du clone
// quelle.de dont ce projet est parti, et l'allemand a depuis été retiré du
// projet entier (voir TARGET.md).
// ---------------------------------------------------------------------------

const PRENOMS = [
  "Aminata", "Nadège", "Christelle", "Mireille", "Sandrine", "Laure", "Estelle",
  "Carine", "Yannick", "Brenda", "Josiane", "Armelle", "Danielle", "Rachelle",
  "Sylvie", "Patricia", "Ornella", "Bertrande", "Cynthia", "Marlyse", "Grâce",
  "Larissa", "Nathalie", "Solange", "Viviane", "Chantal", "Prisca", "Léonie",
  "Michelle", "Bénédicte", "Reine", "Aurélie", "Édith", "Nadia", "Clarisse",
  "Serge", "Hervé", "Landry", "Boris", "Cédric", "Franck", "Ulrich", "Rodrigue",
  "Achille", "Guy", "Arnaud", "Willy", "Steve", "Thierry", "Éric", "Joël",
  "Fadimatou", "Hawa", "Salamatou", "Ngo Bell", "Manuela",
];

const INITIALES = "ABCDEFGHKLMNPRSTVWZ".split("");

const VILLES = [
  "Douala", "Yaoundé", "Bafoussam", "Garoua", "Bamenda", "Maroua", "Ngaoundéré",
  "Bertoua", "Buea", "Kribi", "Limbé", "Edéa", "Kumba", "Dschang", "Foumban",
  "Ebolowa", "Nkongsamba", "Sangmélima", "Mbalmayo", "Bafang", "Melong",
  "Loum", "Tiko", "Guider", "Kousséri", "Meiganga", "Batouri", "Mbouda",
  "Bandjoun", "Obala", "Akonolinga", "Yagoua", "Wum", "Kumbo", "Mora",
  "Douala — Bonapriso", "Douala — Akwa", "Yaoundé — Bastos", "Yaoundé — Mvog-Ada",
  "Paris", "Bruxelles",
];

// ---------------------------------------------------------------------------
// Textes
//
// Assemblés par morceaux plutôt qu'écrits un par un : quelques milliers d'avis
// tirés d'une liste figée se répéteraient d'une fiche à l'autre, et rien ne
// trahit un catalogue artificiel comme deux fiches au même commentaire.
//
// Le vocabulaire est celui du soin, pas celui de l'électroménager. Les
// familles précédentes — téléviseurs, lave-linge, aspirateurs, machines à
// café — faisaient dire à un sérum visage que « le montage a été rapide ».
// ---------------------------------------------------------------------------

/** Familles de produits, reconnues au slug de la catégorie. */
type Famille =
  | "nettoyant"
  | "hydratant"
  | "serum"
  | "solaire"
  | "corps"
  | "cheveux"
  | "general";

const FAMILLES: Record<string, Famille> = {
  nettoyants: "nettoyant",
  demaquillants: "nettoyant",
  toniques: "nettoyant",
  masques: "nettoyant",
  hydratants: "hydratant",
  cremes: "hydratant",
  serums: "serum",
  traitements: "serum",
  "serums-traitements": "serum",
  "anti-taches": "serum",
  solaires: "solaire",
  corps: "corps",
  "soins-du-corps": "corps",
  hygiene: "corps",
  cheveux: "cheveux",
  homme: "general",
};

const OUVERTURES_BONNES = [
  "Après {duree} d'utilisation, je ne peux qu'en dire du bien.",
  "Utilisé depuis {duree}, aucun souci pour l'instant.",
  "Exactement ce que je cherchais pour ma peau.",
  "Le rapport qualité-prix est vraiment là.",
  "Toujours très satisfaite après {duree}.",
  "Le produit a dépassé mes attentes.",
  "Deuxième flacon, je ne change plus.",
  "Livraison rapide sur Douala, produit bien emballé.",
  "Pour ce prix, c'est largement au niveau.",
  "Je le rachèterai sans hésiter.",
];

const OUVERTURES_MOYENNES = [
  "Globalement satisfaite, avec quelques réserves.",
  "Correct, sans être renversant.",
  "Il fait le travail, mais rien de plus.",
  "Pour le prix c'est honnête, il y a tout de même mieux.",
  "Après {duree}, un bilan mitigé mais plutôt positif.",
];

const OUVERTURES_MAUVAISES = [
  "Je ne peux malheureusement pas le recommander.",
  "Après {duree}, je suis assez déçue.",
  "J'aurais dû me renseigner davantage avant.",
  "Dommage, mes attentes n'ont pas été comblées.",
];

const CORPS: Record<Famille, { bon: string[]; moyen: string[]; mauvais: string[] }> = {
  nettoyant: {
    bon: [
      "La peau est nette sans tirailler, ce qui est rare chez moi.",
      "Il retire bien la protection solaire, même en fin de journée.",
      "La mousse est légère et l'odeur reste discrète.",
      "Aucune sensation de film gras après le rinçage.",
      "Mon teint est visiblement plus net au bout de trois semaines.",
    ],
    moyen: [
      "Il nettoie correctement mais je dois passer deux fois le soir.",
      "L'odeur est un peu forte à mon goût.",
      "Le flacon se vide vite si on l'utilise matin et soir.",
    ],
    mauvais: [
      "Il assèche ma peau, j'ai des tiraillements dès le rinçage.",
      "J'ai eu des petits boutons au bout d'une semaine.",
    ],
  },
  hydratant: {
    bon: [
      "La texture pénètre vite et ne laisse aucun film collant.",
      "Ma peau reste confortable toute la journée, même en saison sèche.",
      "Il se superpose bien sous le maquillage, sans faire de peluches.",
      "Les zones sèches autour du nez ont disparu en quelques jours.",
      "Un petit peu suffit, le pot dure longtemps.",
    ],
    moyen: [
      "Hydratant correct, mais insuffisant pour ma peau très sèche.",
      "La texture est un peu riche pour la chaleur d'ici.",
      "Le résultat est bon, le prix un peu élevé pour la contenance.",
    ],
    mauvais: [
      "Il fait briller ma peau mixte au bout de deux heures.",
      "J'ai ressenti des picotements dès la première application.",
    ],
  },
  serum: {
    bon: [
      "Mes taches se sont estompées après environ deux mois de cure.",
      "Le grain de peau est plus régulier, c'est net sur les photos.",
      "La texture est fluide et sèche vite, sans coller.",
      "Aucune réaction sur ma peau réactive, ce que je craignais.",
      "Le compte-gouttes dose bien, on ne gaspille pas.",
    ],
    moyen: [
      "Des résultats visibles, mais il faut être très patiente.",
      "Efficace sur l'éclat, moins sur les taches anciennes.",
      "Bon produit, le format reste petit pour le prix.",
    ],
    mauvais: [
      "Aucun changement visible après deux mois d'utilisation régulière.",
      "Ma peau a réagi, avec des rougeurs sur les joues.",
    ],
  },
  solaire: {
    bon: [
      "Aucun voile blanc sur ma carnation, c'est le point décisif.",
      "Le fini est mat et tient bien malgré la chaleur.",
      "Il ne pique pas les yeux, même en transpirant.",
      "Se porte très bien sous le maquillage au quotidien.",
      "Je l'utilise tous les jours depuis {duree}, aucune réaction.",
    ],
    moyen: [
      "Protection efficace mais le fini brille un peu trop.",
      "Il laisse un léger voile gris qu'il faut bien estomper.",
      "Correct, à condition de le réappliquer en journée.",
    ],
    mauvais: [
      "Le voile blanc est très visible sur peau foncée.",
      "Il colle et attrape la poussière au bout d'une heure.",
    ],
  },
  corps: {
    bon: [
      "La peau reste souple toute la journée, même après la douche froide.",
      "L'odeur est agréable sans être entêtante.",
      "Les coudes et les genoux sont nettement moins secs.",
      "La texture s'étale bien et pénètre sans attendre.",
      "Le format dure longtemps pour un usage quotidien.",
    ],
    moyen: [
      "Hydratation correcte, mais qui ne tient pas la journée entière.",
      "Le parfum est un peu trop présent à mon goût.",
      "Bon produit, le flacon-pompe se bloque parfois.",
    ],
    mauvais: [
      "Il reste collant longtemps après l'application.",
      "Aucun effet sur mes zones vraiment sèches.",
    ],
  },
  cheveux: {
    bon: [
      "Mes longueurs sont beaucoup plus souples au démêlage.",
      "Le cuir chevelu ne gratte plus depuis que je l'utilise.",
      "Les boucles sont mieux définies, sans effet carton.",
      "Une petite quantité suffit sur cheveux épais.",
      "Résultat visible dès la deuxième utilisation.",
    ],
    moyen: [
      "Il hydrate bien mais alourdit un peu mes racines.",
      "Correct, sans remplacer un vrai masque profond.",
      "Le résultat dépend beaucoup de la quantité utilisée.",
    ],
    mauvais: [
      "Mes cheveux sont restés secs malgré plusieurs applications.",
      "L'odeur persiste trop longtemps après le rinçage.",
    ],
  },
  general: {
    bon: [
      "Le produit correspond exactement à la description.",
      "Emballage soigné et flacon bien protégé à la livraison.",
      "Je retrouve la même qualité que sur mon achat précédent.",
      "Aucune mauvaise surprise, c'est bien l'authentique.",
    ],
    moyen: [
      "Produit correct, sans rien de remarquable.",
      "Il fait ce qu'il annonce, le prix reste un peu haut.",
    ],
    mauvais: [
      "La qualité n'est pas à la hauteur de ce que j'attendais.",
      "Le flacon fuyait légèrement à la réception.",
    ],
  },
};

const CLOTURES_BONNES = [
  "Je recommande sans réserve.",
  "Je recommanderai la boutique.",
  "Note maximale de ma part.",
  "Avec plaisir à nouveau.",
  "À conseiller autour de soi.",
  "",
  "",
];

const CLOTURES_MOYENNES = [
  "Pour le prix, cela reste acceptable.",
  "Je le rachèterais malgré tout.",
  "",
];

const CLOTURES_MAUVAISES = [
  "Ce n'est pas une recommandation de ma part.",
  "Je l'ai renvoyé.",
  "La prochaine fois, je prendrai une autre référence.",
];

const TITRES_BONS = [
  "Très satisfaite", "Je recommande", "Tient ses promesses", "Bon achat",
  "Excellent rapport qualité-prix", "Exactement ce qu'il me fallait", "Parfait",
  "Je rachèterai", "Rien à redire", "Conquise",
];
const TITRES_MOYENS = [
  "Correct, avec des réserves", "Plutôt bien", "Fait le travail",
  "Bien sans être parfait", "Satisfaite en partie",
];
const TITRES_MAUVAIS = [
  "Déçue", "Je ne recommande pas", "Sans effet sur ma peau", "Dommage",
];

const DUREES = [
  "deux semaines", "un mois", "six semaines", "deux mois", "trois mois",
  "six mois", "huit mois", "un an",
];

function redigerTexte(famille: Famille, note: number): { titre: string; corps: string } {
  const registre = note >= 4 ? "bon" : note === 3 ? "moyen" : "mauvais";

  const ouverture = piocher(
    registre === "bon"
      ? OUVERTURES_BONNES
      : registre === "moyen"
        ? OUVERTURES_MOYENNES
        : OUVERTURES_MAUVAISES,
  );

  const corpsFamille = CORPS[famille][registre];
  // Deux détails sur trois avis : des textes de longueur identique se
  // reconnaîtraient au premier coup d'œil.
  const details = [piocher(corpsFamille)];
  if (alea() < 0.55) {
    const autre = piocher(corpsFamille);
    if (autre !== details[0]) details.push(autre);
  }

  const cloture = piocher(
    registre === "bon"
      ? CLOTURES_BONNES
      : registre === "moyen"
        ? CLOTURES_MOYENNES
        : CLOTURES_MAUVAISES,
  );

  const titre = piocher(
    registre === "bon" ? TITRES_BONS : registre === "moyen" ? TITRES_MOYENS : TITRES_MAUVAIS,
  );

  // La durée est substituée sur le texte ASSEMBLÉ, et non sur la seule
  // ouverture : le marqueur apparaît aussi dans certains détails de famille.
  // Un tirage par occurrence, sans quoi « depuis deux mois … après deux mois »
  // reviendrait deux fois dans la même phrase.
  const corps = [ouverture, ...details, cloture]
    .filter(Boolean)
    .join(" ")
    .replace(/\{duree\}/g, () => piocher(DUREES));

  return { titre, corps };
}

// ---------------------------------------------------------------------------
// Notes et dates
// ---------------------------------------------------------------------------

/**
 * Notes d'une fiche : une large majorité de bonnes, quelques moyennes, et deux
 * à trois mauvaises — jamais plus, jamais zéro dès que la fiche est un peu
 * fournie. Une fiche qui n'aurait que des cinq étoiles se lit comme un faux.
 */
function tirerNotes(total: number): number[] {
  const mauvais = total >= 25 ? 3 : total >= 15 ? 2 : total >= 12 ? 1 : 0;
  const moyens = Math.max(1, Math.round(total * 0.12));
  const bons = total - mauvais - moyens;

  const notes: number[] = [];
  for (let i = 0; i < bons; i += 1) notes.push(alea() < 0.68 ? 5 : 4);
  for (let i = 0; i < moyens; i += 1) notes.push(3);
  for (let i = 0; i < mauvais; i += 1) notes.push(alea() < 0.6 ? 2 : 1);
  return notes;
}

/**
 * Dates des avis, du plus ancien au plus récent.
 *
 * Les mauvaises notes sont placées dans la partie médiane. La fiche affiche les
 * avis du plus récent au plus ancien : une mauvaise note datée d'hier ouvrirait
 * la liste, une très ancienne la fermerait. Au milieu, elle se lit comme un
 * incident isolé au fil du temps, ce qui est aussi la réalité d'un catalogue.
 */
function repartir(notes: number[]): { rating: number; createdAt: Date }[] {
  const total = notes.length;
  const mauvaises = notes.filter((n) => n < 3);

  // Les notes sont tirées par groupes — les cinq et quatre d'abord, les trois
  // ensuite. Consommées dans cet ordre, toutes les notes moyennes se
  // retrouveraient en fin de liste chronologique, donc en tête d'affichage :
  // une fiche qui s'ouvre sur sept avis à trois étoiles se voit immédiatement.
  const bonnes = notes.filter((n) => n >= 3);
  for (let i = bonnes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(alea() * (i + 1));
    [bonnes[i], bonnes[j]] = [bonnes[j], bonnes[i]];
  }

  // On répartit les mauvaises entre 35 % et 70 % de la liste chronologique.
  const positions = new Set<number>();
  for (let i = 0; i < mauvaises.length; i += 1) {
    const bas = Math.floor(total * 0.35);
    const haut = Math.max(bas + 1, Math.floor(total * 0.7));
    let position = entre(bas, haut);
    while (positions.has(position)) position = entre(bas, haut);
    positions.add(position);
  }

  const ordonnees: number[] = [];
  let curseurBon = 0;
  let curseurMauvais = 0;
  for (let i = 0; i < total; i += 1) {
    if (positions.has(i) && curseurMauvais < mauvaises.length) {
      ordonnees.push(mauvaises[curseurMauvais++]);
    } else {
      ordonnees.push(bonnes[curseurBon++] ?? 5);
    }
  }

  const maintenant = Date.now();
  const pas = PROFONDEUR_JOURS / total;
  return ordonnees.map((rating, index) => {
    // Un pas régulier donnerait des avis à intervalle parfait : on le bruite.
    const jours = PROFONDEUR_JOURS - index * pas - alea() * pas * 0.8;
    return {
      rating,
      createdAt: new Date(maintenant - jours * 86_400_000),
    };
  });
}

// ---------------------------------------------------------------------------

async function purger(): Promise<void> {
  const { count } = await prisma.review.deleteMany({ where: { moderatorNote: MARQUE } });
  console.log(`${count} avis de démonstration supprimés.`);
}

async function generer(): Promise<void> {
  const dejaPresents = await prisma.review.count({ where: { moderatorNote: MARQUE } });
  if (dejaPresents > 0) {
    throw new Error(
      `${dejaPresents} avis de démonstration sont déjà en base. Lancer d'abord --purger.`,
    );
  }

  const produits = await prisma.product.findMany({
    select: { id: true, category: { select: { slug: true } } },
    orderBy: { id: "asc" },
  });

  const lignes: {
    productId: string;
    authorName: string;
    city: string;
    rating: number;
    title: string;
    body: string;
    status: string;
    moderatorNote: string;
    moderatedAt: Date;
    createdAt: Date;
  }[] = [];

  let servis = 0;

  for (const produit of produits) {
    if (alea() > PART_AVEC_AVIS) continue;
    servis += 1;

    const famille = FAMILLES[produit.category?.slug ?? ""] ?? "allgemein";
    const total = entre(AVIS_MIN, AVIS_MAX);

    for (const { rating, createdAt } of repartir(tirerNotes(total))) {
      const { titre, corps } = redigerTexte(famille, rating);
      lignes.push({
        productId: produit.id,
        authorName: `${piocher(PRENOMS)} ${piocher(INITIALES)}.`,
        city: piocher(VILLES),
        rating,
        title: titre,
        body: corps,
        // Publiés d'emblée : un avis en attente ne s'afficherait pas, et c'est
        // justement le rendu de la fiche que ces avis servent à juger.
        status: "approved",
        moderatorNote: MARQUE,
        moderatedAt: createdAt,
        createdAt,
      });
    }
  }

  console.log(`${servis} produits servis sur ${produits.length}, ${lignes.length} avis à écrire.`);

  // Par paquets : une seule requête de plusieurs milliers de lignes dépasse ce
  // que le pooler accepte.
  const PAQUET = 500;
  for (let i = 0; i < lignes.length; i += PAQUET) {
    await prisma.review.createMany({ data: lignes.slice(i, i + PAQUET) });
    process.stdout.write(`\r  ${Math.min(i + PAQUET, lignes.length)}/${lignes.length}`);
  }
  console.log();

  const notes = lignes.reduce((somme, l) => somme + l.rating, 0) / lignes.length;
  console.log(`Note moyenne du catalogue : ${notes.toFixed(2)} / 5`);
  console.log(`Avis négatifs (1–2 étoiles) : ${lignes.filter((l) => l.rating < 3).length}`);
}

async function main(): Promise<void> {
  if (process.argv.includes("--purger")) {
    await purger();
  } else {
    await generer();
  }
  await prisma.$disconnect();
}

main().catch(async (erreur) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  await prisma.$disconnect();
  process.exit(1);
});
