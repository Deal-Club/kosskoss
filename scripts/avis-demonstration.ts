/**
 * Avis de démonstration, pour juger du rendu d'un catalogue vivant.
 *
 * ATTENTION — ces avis ne sont pas des avis de clients. Publier de faux avis
 * est déloyal en toutes circonstances au sens de l'annexe au § 3 Abs. 3 UWG
 * (n° 23b et 23c) : ils doivent disparaître avant l'ouverture de la boutique.
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

const PRENOMS = [
  "Thomas", "Andrea", "Michael", "Sabine", "Stefan", "Claudia", "Andreas", "Petra",
  "Markus", "Susanne", "Christian", "Birgit", "Frank", "Nicole", "Jürgen", "Katrin",
  "Matthias", "Anja", "Peter", "Martina", "Wolfgang", "Silke", "Daniel", "Kerstin",
  "Alexander", "Heike", "Sebastian", "Ute", "Tobias", "Monika", "Dirk", "Gabriele",
  "Ralf", "Christine", "Oliver", "Bettina", "Jens", "Manuela", "Holger", "Simone",
  "Uwe", "Angelika", "Bernd", "Doris", "Karsten", "Elke", "Marco", "Ingrid",
  "Lukas", "Julia", "Florian", "Franziska", "Jonas", "Melanie", "Patrick", "Sandra",
];

const INITIALES = "ABCDEFGHKLMNPRSTVWZ".split("");

const VILLES = [
  "Berlin", "Hamburg", "München", "Köln", "Frankfurt", "Stuttgart", "Düsseldorf",
  "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden", "Hannover", "Nürnberg",
  "Duisburg", "Bochum", "Wuppertal", "Bielefeld", "Bonn", "Münster", "Karlsruhe",
  "Mannheim", "Augsburg", "Wiesbaden", "Mönchengladbach", "Kiel", "Chemnitz",
  "Braunschweig", "Halle", "Magdeburg", "Freiburg", "Krefeld", "Mainz", "Erfurt",
  "Rostock", "Kassel", "Potsdam", "Saarbrücken", "Oldenburg", "Heidelberg",
];

// ---------------------------------------------------------------------------
// Textes
//
// Assemblés par morceaux plutôt qu'écrits un par un : quelques milliers d'avis
// tirés d'une liste figée se répéteraient d'une fiche à l'autre, et rien ne
// trahit un catalogue artificiel comme deux fiches au même commentaire.
// ---------------------------------------------------------------------------

/** Familles de produits, reconnues au slug de la catégorie. */
type Famille = "bild" | "mobil" | "waschen" | "kaffee" | "kueche" | "saugen" | "allgemein";

const FAMILLES: Record<string, Famille> = {
  fernseher: "bild",
  smartphones: "mobil",
  smartwatches: "mobil",
  computer: "mobil",
  waschmaschinen: "waschen",
  geschirrspueler: "waschen",
  kaffeemaschinen: "kaffee",
  kuechenmaschinen: "kueche",
  "backoefen-herde": "kueche",
  staubsauger: "saugen",
  klimageraete: "allgemein",
  videospiele: "allgemein",
  drohnen: "allgemein",
};

const OUVERTURES_BONNES = [
  "Nach {dauer} kann ich nur Gutes berichten.",
  "Seit {dauer} im Einsatz und bisher keinerlei Probleme.",
  "Genau das, was ich gesucht habe.",
  "Preis-Leistung stimmt hier wirklich.",
  "Bin nach {dauer} immer noch sehr zufrieden.",
  "Hat meine Erwartungen übertroffen.",
  "Zweites Gerät dieser Marke, wieder eine gute Wahl.",
  "Lieferung war schnell, Aufbau problemlos.",
  "Für den Preis absolut in Ordnung.",
  "Ich würde es jederzeit wieder kaufen.",
];

const OUVERTURES_MOYENNES = [
  "Insgesamt zufrieden, mit kleinen Abstrichen.",
  "Solide, aber kein Überflieger.",
  "Tut, was es soll — mehr aber auch nicht.",
  "Für den Preis in Ordnung, Luft nach oben gibt es trotzdem.",
  "Nach {dauer} ein gemischtes, aber überwiegend positives Bild.",
];

const OUVERTURES_MAUVAISES = [
  "Leider kann ich das Gerät nicht empfehlen.",
  "Nach {dauer} bin ich ziemlich enttäuscht.",
  "Hätte ich mir vorher genauer angesehen.",
  "Schade, die Erwartungen wurden nicht erfüllt.",
];

const CORPS: Record<Famille, { bon: string[]; moyen: string[]; mauvais: string[] }> = {
  bild: {
    bon: [
      "Das Bild ist auch bei Tageslicht kräftig, Farben wirken natürlich.",
      "Schwarzwerte sind für diese Preisklasse erstaunlich gut.",
      "Die Streaming-Apps laufen flüssig, kein Ruckeln beim Umschalten.",
      "Fußball in Zeitlupe bleibt scharf, nichts zieht nach.",
      "Der Ton ist besser als erwartet, eine Soundbar braucht es nicht zwingend.",
      "Die Einrichtung war in zehn Minuten erledigt.",
    ],
    moyen: [
      "Das Bild überzeugt, die Fernbedienung wirkt dagegen billig.",
      "Der Ton ist dünn, mit Soundbar aber völlig ausreichend.",
      "Das Menü könnte übersichtlicher sein, man findet sich mit der Zeit zurecht.",
    ],
    mauvais: [
      "Die Blickwinkelstabilität ist schwach: schon leicht seitlich verblassen die Farben spürbar.",
      "Das Betriebssystem hängt regelmäßig, mehrmals musste ich den Stecker ziehen.",
      "Bei dunklen Szenen sieht man deutliche Lichthöfe an den Rändern.",
    ],
  },
  mobil: {
    bon: [
      "Der Akku hält bei mir gut zwei Tage bei normaler Nutzung.",
      "Die Kamera macht auch bei wenig Licht brauchbare Bilder.",
      "Alles läuft flüssig, selbst mit vielen offenen Apps.",
      "Die Verarbeitung fühlt sich hochwertig an, nichts knarzt.",
      "Die Übernahme der Daten vom alten Gerät ging reibungslos.",
    ],
    moyen: [
      "Leistung gut, aber es wird beim Laden spürbar warm.",
      "Der Akku reicht knapp einen Tag, das hatte ich mir mehr erhofft.",
      "Gutes Gerät, die vorinstallierte Software hätte ich nicht gebraucht.",
    ],
    mauvais: [
      "Nach vier Monaten war der Akku deutlich schwächer, abends musste ich nachladen.",
      "Das Display hat nach kurzer Zeit einen Farbstich bekommen.",
      "Der Empfang bricht bei mir regelmäßig ein, mein altes Gerät war da klar besser.",
    ],
  },
  waschen: {
    bon: [
      "Läuft leise, man hört das Gerät im Nebenraum kaum.",
      "Die Wäsche kommt sauber heraus, auch bei kurzen Programmen.",
      "Der Verbrauch ist merklich niedriger als beim Vorgängergerät.",
      "Die Programme sind selbsterklärend, die Anleitung brauchte ich kaum.",
      "Der Anschluss war in einer halben Stunde erledigt.",
    ],
    moyen: [
      "Reinigt gut, das Schleudern ist allerdings recht laut.",
      "Zuverlässig, die Programmdauer finde ich aber lang.",
      "Solide Maschine, die Bedienung am Display ist etwas fummelig.",
    ],
    mauvais: [
      "Nach acht Monaten kam eine Fehlermeldung, der Service ließ auf sich warten.",
      "Das Gerät wandert beim Schleudern trotz sauberer Ausrichtung.",
      "Es bleibt Wasser in der Dichtung stehen, das riecht nach kurzer Zeit unangenehm.",
    ],
  },
  kaffee: {
    bon: [
      "Der Kaffee ist heiß und aromatisch, genau richtig für den Morgen.",
      "Die Reinigung geht schnell, das nimmt man gern in Kauf.",
      "Kompakt genug, um dauerhaft auf der Arbeitsplatte zu stehen.",
      "Die Bedienung versteht auch Besuch auf Anhieb.",
      "Der Milchschaum gelingt gleichmäßig, ohne großes Üben.",
    ],
    moyen: [
      "Guter Kaffee, das Mahlwerk ist aber lauter als gedacht.",
      "Zufrieden, die Entkalkung könnte einfacher sein.",
      "Macht ihren Job, der Wassertank ist mir zu klein.",
    ],
    mauvais: [
      "Nach einem halben Jahr tropft es unter dem Gerät.",
      "Die Brühgruppe lässt sich nur mit Mühe herausnehmen und reinigen.",
      "Der Kaffee kommt nur lauwarm an, mehrere Einstellungen brachten nichts.",
    ],
  },
  kueche: {
    bon: [
      "Kräftig genug für schweren Teig, nichts bleibt stehen.",
      "Die Reinigung ist unkompliziert, das meiste darf in die Spülmaschine.",
      "Steht sicher auf der Arbeitsplatte, auch bei hoher Stufe.",
      "Das Zubehör ist gut verarbeitet und sitzt fest.",
    ],
    moyen: [
      "Leistung passt, das Gerät ist aber schwer zu verstauen.",
      "Gutes Ergebnis, bei hoher Stufe wird es laut.",
    ],
    mauvais: [
      "Ein Kunststoffteil ist nach wenigen Monaten gebrochen, Ersatz war nicht lieferbar.",
      "Die Rührschüssel sitzt locker und löst sich beim Kneten.",
    ],
  },
  saugen: {
    bon: [
      "Die Saugleistung reicht auf Teppich wie auf Fliesen völlig aus.",
      "Der Akku hält für die ganze Wohnung durch.",
      "Leicht genug, um ihn ohne Mühe die Treppe hochzutragen.",
      "Der Staubbehälter lässt sich ohne Staubwolke entleeren.",
    ],
    moyen: [
      "Saugt gut, an Kanten muss man aber nachhelfen.",
      "Ordentliches Gerät, der Akku könnte länger halten.",
    ],
    mauvais: [
      "Die Bürste verstopft bei langen Haaren ständig.",
      "Nach kurzer Zeit ließ die Saugkraft spürbar nach.",
    ],
  },
  allgemein: {
    bon: [
      "Aufbau und Einrichtung waren schnell erledigt.",
      "Macht genau das, wofür ich es gekauft habe.",
      "Wirkt solide verarbeitet und läuft zuverlässig.",
      "Die Anleitung ist verständlich, auch ohne Vorkenntnisse.",
    ],
    moyen: [
      "Erfüllt seinen Zweck, ein paar Details könnten besser sein.",
      "Für den Preis in Ordnung, herausragend ist es nicht.",
    ],
    mauvais: [
      "Die Verarbeitung wirkt an mehreren Stellen unsauber.",
      "Nach wenigen Wochen traten Aussetzer auf.",
    ],
  },
};

const CLOTURES_BONNES = [
  "Klare Empfehlung.",
  "Würde ich wieder bestellen.",
  "Von mir volle Punktzahl.",
  "Gerne wieder.",
  "Kann ich weiterempfehlen.",
  "",
  "",
];

const CLOTURES_MOYENNES = ["Für den Preis geht das in Ordnung.", "Kaufen würde ich es wieder.", ""];

const CLOTURES_MAUVAISES = [
  "Für mich leider keine Empfehlung.",
  "Ich habe es zurückgeschickt.",
  "Das nächste Mal greife ich zu einem anderen Modell.",
];

const TITRES_BONS = [
  "Sehr zufrieden", "Klare Empfehlung", "Hält, was es verspricht", "Guter Kauf",
  "Top Preis-Leistung", "Genau richtig", "Alles bestens", "Würde ich wieder kaufen",
  "Läuft einwandfrei", "Bin begeistert",
];
const TITRES_MOYENS = [
  "Solide, mit kleinen Abstrichen", "Ganz ordentlich", "Erfüllt seinen Zweck",
  "Gut, aber nicht perfekt", "Zufrieden mit Einschränkungen",
];
const TITRES_MAUVAIS = [
  "Leider enttäuscht", "Nicht zu empfehlen", "Hält nicht lange", "Schade um das Geld",
];

const DUREES = [
  "zwei Wochen", "einem Monat", "sechs Wochen", "zwei Monaten", "drei Monaten",
  "einem halben Jahr", "acht Monaten", "einem Jahr",
];

function redigerTexte(famille: Famille, note: number): { titre: string; corps: string } {
  const registre = note >= 4 ? "bon" : note === 3 ? "moyen" : "mauvais";

  const ouverture = piocher(
    registre === "bon"
      ? OUVERTURES_BONNES
      : registre === "moyen"
        ? OUVERTURES_MOYENNES
        : OUVERTURES_MAUVAISES,
  ).replace("{dauer}", piocher(DUREES));

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

  return {
    titre,
    corps: [ouverture, ...details, cloture].filter(Boolean).join(" "),
  };
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
