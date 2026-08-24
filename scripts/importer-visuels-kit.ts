/**
 * Rattache les visuels du kit client aux fiches produits.
 *
 * ── CE QUE CE SCRIPT FAIT, ET CE QU'IL NE FAIT PAS ──────────────────────────
 *
 * Le kit livré par le client contient un visuel par produit, et parfois une
 * seconde vue (fichiers suffixés « (1) »). Les 71 produits actifs ont déjà une
 * vignette ; aucun n'a de galerie. Ce script remplit la galerie — le champ
 * `images` — et ne touche JAMAIS à `image`, la vignette de référence qui sert
 * les listes, le panier et le flux Google.
 *
 * Il n'efface rien : un produit dont la galerie est déjà remplie est laissé
 * tel quel et compté comme « déjà pourvu ». Relancer le script deux fois de
 * suite ne produit donc pas de doublon.
 *
 * ── POURQUOI L'APPARIEMENT SE FAIT SUR LE NOM, PAS SUR UN IDENTIFIANT ───────
 *
 * Les fichiers du client portent des noms lisibles (« ANUA – Sérum pêche 70 %
 * niacinamide – 30 ml »), pas les références internes. L'appariement compare
 * donc la marque et les mots du nom, après avoir retiré accents, ponctuation
 * et contenance. Un rapprochement douteux n'est PAS écrit : il est signalé,
 * pour être tranché à l'œil plutôt que deviné.
 *
 * ── POURQUOI IL FAUT LUI DIRE QUELS FICHIERS APPORTENT VRAIMENT UNE VUE ─────
 *
 * Mesuré : sur les 84 visuels appariés, 73 sont EXACTEMENT la vignette déjà
 * en place. Les verser en galerie afficherait deux fois la même photo sur la
 * fiche. Seuls 11 montrent autre chose — un étui à côté d'un pot, un dos de
 * flacon, un second angle.
 *
 * La comparaison est perceptuelle (empreinte d'image), donc hors de portée de
 * ce script, qui ne sait pas décoder une image. Elle est faite à part et son
 * résultat lui est passé par `--nouvelles <fichier.json>`. Sans cette liste,
 * le script refuse d'écrire plutôt que de remplir des galeries de doublons.
 *
 * Sans argument, le script ne fait que RENDRE COMPTE. Il n'écrit qu'avec
 * `--ecrire`, et affiche l'état avant/après dans les deux cas.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join } from "node:path";
import { prisma } from "@/server/prisma";

const SOURCE =
  process.env.KIT_PICTURES ??
  "C:/Users/FRATERNEL PLOMBERIE/Downloads/KIT_SITE WEB_KKS-20260824T084623Z-1-001/KIT_SITE WEB_KKS/PICTURES";

const DESTINATION = "public/images/products";
const ECRIRE = process.argv.includes("--ecrire");

/** Mots qui ne distinguent aucun produit : les comparer ajoute du bruit. */
const MOTS_VIDES = new Set([
  "de", "du", "des", "la", "le", "les", "au", "aux", "a", "l", "d", "et", "en",
  "ml", "g", "pour", "the", "of",
]);

/**
 * Réduit un libellé à ses mots distinctifs.
 *
 * Retire les accents (le client écrit « Sérum », la référence « serum »), la
 * ponctuation décorative des noms de fichiers (tirets longs, underscores que
 * Windows substitue aux « % » et « / »), et la contenance, qui se répète d'un
 * produit à l'autre et fait donc de faux rapprochements.
 */
function mots(libelle: string): string[] {
  return libelle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\d+\s*(ml|g)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((m) => m.length > 1 && !MOTS_VIDES.has(m));
}

/**
 * Contenance portée par un libellé, en millilitres ou grammes.
 *
 * ── POURQUOI ELLE EST TRAITÉE À PART ────────────────────────────────────────
 *
 * `mots()` retire la contenance, parce qu'elle se répète d'un produit à
 * l'autre et fait de faux rapprochements. Mais pour certains produits, elle
 * est le SEUL élément distinctif : « Gel Hydratant 50 ml » et « Gel Hydratant
 * 125 ml » ont exactement les mêmes mots. Sans ce garde-fou, les deux fiches
 * obtenaient le même score et recevaient chacune la photo de l'autre — ce
 * qu'une vérification perceptuelle a effectivement mis au jour.
 *
 * La contenance du produit se lit sur sa référence interne, dont c'est le
 * dernier segment (`CLI-DRA-GEL-125`). Quand les deux libellés en portent une
 * et qu'elles diffèrent, le rapprochement est refusé, quel que soit le score.
 */
function contenance(libelle: string): number | null {
  const m = libelle.match(/(\d+)\s*(?:ml|g)\b/i);
  return m ? Number(m[1]) : null;
}

function contenanceDuSku(sku: string): number | null {
  const dernier = sku.split("-").pop() ?? "";
  return /^\d+$/.test(dernier) ? Number(dernier) : null;
}

/** Part des mots de la référence retrouvés dans le candidat. */
function recouvrement(reference: string[], candidat: string[]): number {
  if (reference.length === 0) return 0;
  const presents = new Set(candidat);
  return reference.filter((m) => presents.has(m)).length / reference.length;
}

/**
 * Rapprochements que la comparaison de mots ne fait pas, et qui sautent aux yeux.
 *
 * Le catalogue abrège là où le client détaille : « Déodorant roll-on » contre
 * « Clinique For Men - Déodorant anti-transpirant roll-on 75 ml ». Il reste
 * trop peu de mots communs pour franchir le seuil.
 *
 * Abaisser ce seuil serait la mauvaise réponse : il tomberait alors sur des
 * rapprochements FAUX, et en silence — une photo de nettoyant sur une fiche de
 * sérum ne déclenche aucune erreur, elle se contente d'être fausse en
 * vitrine. Ces six paires ont donc été vérifiées à l'œil, une par une, et
 * sont écrites ici pour être relisibles.
 *
 * Clé : « marque — nom » tel qu'en base. Valeur : nom du fichier, sans
 * extension ni suffixe « (1) » — les deux vues sont reprises ensemble.
 */
const APPARIEMENTS_MANUELS: Record<string, string> = {
  "Axis-Y — Spot The Difference":
    "AXIS-Y – Spot The Difference Soin local anti-imperfections – 15 ml",
  "Biotherm — Aquapower 72h":
    "Biotherm Homme - Aquapower 72h concentré hydratant 50 ml",
  "Lancaster — Sun Beauty Lait Corps SPF50":
    "Lancaster Sun Beauty - Lait Corps protection solaire SPF 50 100 ml",
  "Clinique — Moisture Surge 100H":
    "Clinique Moisture Surge - Soin auto-réhydratant 100H 50 ml",
  "Clinique — Déodorant roll-on":
    "Clinique For Men - Déodorant anti-transpirant roll-on 75 ml",
  "Clinique — Crème régulatrice de sébum":
    "Clinique For Men - Crème hydratante régulatrice de sébum 100 ml",
};

type Fichier = { nom: string; motsFichier: string[]; alternative: boolean };

function lireVisuels(): Fichier[] {
  return readdirSync(SOURCE)
    .filter((n) => /\.(png|jpe?g|webp)$/i.test(n))
    // Les vues « Family » montrent une gamme entière, pas un produit : elles
    // n'ont rien à faire dans la galerie d'une fiche.
    .filter((n) => !/family/i.test(n))
    .map((nom) => ({
      nom,
      motsFichier: mots(basename(nom, extname(nom))),
      alternative: /\(1\)/.test(nom),
    }));
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`Dossier introuvable : ${SOURCE}`);
    console.error("Passez le chemin par la variable KIT_PICTURES.");
    process.exit(1);
  }

  const produits = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, sku: true, name: true, brand: true, image: true, images: true },
  });

  const visuels = lireVisuels();
  console.log(`${produits.length} produits actifs — ${visuels.length} visuels (hors ambiances de marque)\n`);

  const apparies: { produit: (typeof produits)[number]; fichiers: string[] }[] = [];
  const douteux: string[] = [];
  const utilises = new Set<string>();

  for (const produit of produits) {
    const manuel = APPARIEMENTS_MANUELS[`${produit.brand} — ${produit.name}`];
    if (manuel) {
      const retenus = visuels
        .filter((v) => basename(v.nom, extname(v.nom)).replace(/\(1\)$/, "") === manuel)
        .sort((a, b) => Number(a.alternative) - Number(b.alternative));
      if (retenus.length === 0) {
        douteux.push(`${produit.brand} — ${produit.name} (appariement manuel sans fichier : ${manuel})`);
        continue;
      }
      retenus.forEach((r) => utilises.add(r.nom));
      apparies.push({ produit, fichiers: retenus.map((r) => r.nom) });
      continue;
    }

    const reference = mots(`${produit.brand} ${produit.name}`);
    const volumeProduit = contenanceDuSku(produit.sku);
    const notes = visuels
      // Deux contenances connues et différentes : ce n'est pas le même produit.
      .filter((v) => {
        const volumeFichier = contenance(v.nom);
        if (volumeProduit === null || volumeFichier === null) return true;
        return volumeProduit === volumeFichier;
      })
      .map((v) => ({
      v,
      // Deux sens : les mots de la fiche retrouvés dans le fichier, et
      // l'inverse. Un fichier très bavard ne doit pas gagner par sa longueur.
      note: Math.min(recouvrement(reference, v.motsFichier), recouvrement(v.motsFichier, reference)),
    }));
    notes.sort((a, b) => b.note - a.note);

    const meilleure = notes[0]?.note ?? 0;
    if (meilleure < 0.6) {
      douteux.push(`${produit.brand} — ${produit.name} (meilleur score ${meilleure.toFixed(2)})`);
      continue;
    }

    // Toutes les vues qui atteignent le meilleur score : la vue principale et
    // sa variante « (1) » portent le même nom, elles arrivent donc ensemble.
    const retenus = notes
      .filter((n) => n.note >= meilleure - 0.001)
      .map((n) => n.v)
      .sort((a, b) => Number(a.alternative) - Number(b.alternative));

    retenus.forEach((r) => utilises.add(r.nom));
    apparies.push({ produit, fichiers: retenus.map((r) => r.nom) });
  }

  const dejaPourvus = apparies.filter((a) => (a.produit.images ?? "[]") !== "[]");
  const aRemplir = apparies.filter((a) => (a.produit.images ?? "[]") === "[]");
  const orphelins = visuels.filter((v) => !utilises.has(v.nom));

  console.log(`appariés      : ${apparies.length}`);
  console.log(`  à remplir   : ${aRemplir.length}`);
  console.log(`  déjà pourvus: ${dejaPourvus.length} (laissés tels quels)`);
  console.log(`non appariés  : ${douteux.length}`);
  console.log(`visuels orphelins : ${orphelins.length}`);

  if (douteux.length) {
    console.log("\nProduits sans visuel sûr — à trancher à l'œil :");
    for (const d of douteux) console.log(`  ${d}`);
  }
  if (orphelins.length) {
    console.log("\nVisuels rattachés à aucun produit :");
    for (const o of orphelins) console.log(`  ${o.nom}`);
  }

  const journal = process.argv.indexOf("--journal");
  if (journal !== -1 && process.argv[journal + 1]) {
    writeFileSync(
      process.argv[journal + 1],
      JSON.stringify(
        apparies.map((a) => ({
          sku: a.produit.sku,
          vignette: a.produit.image,
          fichiers: a.fichiers,
        })),
        null,
        2,
      ),
      "utf8",
    );
    console.log(`\nAppariement écrit dans ${process.argv[journal + 1]}`);
  }

  if (!ECRIRE) {
    console.log("\nSimulation. Rien n'a été écrit — relancez avec --ecrire.");
    return;
  }

  const drapeau = process.argv.indexOf("--nouvelles");
  if (drapeau === -1 || !process.argv[drapeau + 1]) {
    console.error(
      "\nRefus d'écrire : la liste des vues réellement nouvelles manque.\n" +
        "Sans elle, 73 galeries sur 84 recevraient une copie de leur propre vignette.\n" +
        "Passez --nouvelles <fichier.json> (voir l'en-tête de ce script).",
    );
    process.exitCode = 1;
    return;
  }
  const nouvelles: Set<string> = new Set(
    JSON.parse(readFileSync(process.argv[drapeau + 1], "utf8")) as string[],
  );

  mkdirSync(DESTINATION, { recursive: true });
  let ecrits = 0;
  let ignores = 0;
  for (const { produit, fichiers } of aRemplir) {
    const retenus = fichiers.filter((f) => nouvelles.has(f));
    ignores += fichiers.length - retenus.length;
    if (retenus.length === 0) continue;

    const chemins: string[] = [];
    retenus.forEach((fichier, index) => {
      const extension = extname(fichier).toLowerCase();
      const cible = `${produit.sku}-vue${index + 1}${extension}`;
      copyFileSync(join(SOURCE, fichier), join(DESTINATION, cible));
      chemins.push(`/images/products/${cible}`);
    });

    await prisma.product.update({
      where: { id: produit.id },
      data: { images: JSON.stringify(chemins) },
    });
    ecrits += 1;
  }
  console.log(`\n${ecrits} galeries écrites. Les vignettes n'ont pas été touchées.`);
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
