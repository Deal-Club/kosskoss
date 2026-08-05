/**
 * Décline le logo MLC Bois en tous les fichiers dont le site a besoin.
 *
 * Le logo source est un PNG à fond transparent : sigle noir (deux bûches
 * dressées, une flamme orange entre elles) suivi du lettrage « MLC Bois » en
 * noir et du descripteur « BOIS DE CHAUFFAGE » en orange.
 *
 * Un lettrage noir ne tient que sur fond clair. Le pied de page et le menu du
 * back-office sont sombres : il leur faut une variante claire. Plutôt que de
 * demander un second fichier au graphiste, on remplace ici le noir par le
 * crème du pied de page — l'orange, lui, ne bouge pas, c'est la couleur de la
 * marque et elle contraste des deux côtés.
 *
 * Le favicon vient d'un fichier distinct — le sigle seul, cadré carré sur fond
 * blanc. Un fond opaque plutôt que transparent : l'onglet du navigateur peut
 * être clair ou sombre selon le thème, et un sigle noir sur transparent
 * disparaîtrait dans le second cas.
 *
 * Fichiers produits :
 *   public/images/logo-full.png        lettrage sombre — en-tête, e-mails, SEO
 *   public/images/logo-full-light.png  lettrage clair  — pied de page, back-office
 *   public/images/logo-icon.png        sigle seul, carré
 *   src/app/icon.png                   favicon (Next.js lit ce nom de fichier)
 *
 * Usage : node scripts/generer-logos.mjs [logo-complet.png] [sigle-carre.png]
 */

import sharp from "sharp";
import path from "node:path";

// Les originaux vivent hors de « public » : ce dossier est servi tel quel, et
// rien n'oblige à exposer les fichiers de travail de la marque.
const SOURCE = process.argv[2] ?? "assets/marque/logo-source.png";

/** Sigle seul, déjà cadré carré, pour le favicon. */
const SOURCE_SIGLE = process.argv[3] ?? "assets/marque/sigle-source.png";

/** Part du côté laissée en marge autour du sigle dans le favicon. */
const MARGE_FAVICON = 0.06;

/** Crème du pied de page (--footer-foreground dans globals.css). */
const CLAIR = [247, 242, 234];

/** En deçà de ce niveau sur les trois canaux, le pixel est du noir de lettrage. */
const SEUIL_NOIR = 110;

/**
 * Largeur du sigle dans le logo rogné, mesurée sur la colonne vide qui le
 * sépare du lettrage. Recalculée à chaque exécution : un logo redessiné
 * n'aurait pas les mêmes proportions.
 */
function largeurDuSigle(data, info) {
  let debutDuVide = null;
  for (let x = 0; x < info.width; x += 1) {
    let occupe = false;
    for (let y = 0; y < info.height; y += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 12) {
        occupe = true;
        break;
      }
    }
    if (!occupe) {
      if (debutDuVide === null) debutDuVide = x;
      // Une gouttière d'au moins 12 px sépare le sigle du lettrage ; les
      // espaces entre lettres sont plus étroits.
      if (x - debutDuVide >= 12) return debutDuVide;
    } else {
      debutDuVide = null;
    }
  }
  throw new Error("Sigle et lettrage ne sont pas séparables : vérifier le logo source.");
}

/** Remplace le noir du lettrage par le crème, sans toucher à l'orange. */
function eclaircir(data) {
  const sortie = Buffer.from(data);
  for (let i = 0; i < sortie.length; i += 4) {
    if (sortie[i + 3] === 0) continue;
    if (sortie[i] < SEUIL_NOIR && sortie[i + 1] < SEUIL_NOIR && sortie[i + 2] < SEUIL_NOIR) {
      [sortie[i], sortie[i + 1], sortie[i + 2]] = CLAIR;
    }
  }
  return sortie;
}

async function main() {
  const { data, info } = await sharp(SOURCE)
    .trim()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log(`Source rognée : ${info.width} × ${info.height}`);

  const brut = { raw: { width: info.width, height: info.height, channels: 4 } };

  // --- Logo complet, lettrage sombre
  await sharp(data, brut).png().toFile("public/images/logo-full.png");

  // --- Logo complet, lettrage clair
  await sharp(eclaircir(data), brut).png().toFile("public/images/logo-full-light.png");

  // Contrôle de cohérence : le sigle doit rester détachable du lettrage, sinon
  // c'est que le logo source a changé de structure et le reste est à revoir.
  const largeur = largeurDuSigle(data, info);
  console.log(`Sigle repéré dans le logo complet : ${largeur} × ${info.height}.`);

  // --- Favicon, à partir du sigle carré fourni à part
  const { data: sigle, info: infoSigle } = await sharp(SOURCE_SIGLE)
    .trim()
    .toBuffer({ resolveWithObject: true });
  const { width: lSigle, height: hSigle } = infoSigle;
  const cote = Math.max(lSigle, hSigle);
  const cadre = Math.round(cote * (1 + MARGE_FAVICON * 2));

  // La composition est menée jusqu'à un fichier avant toute réduction : dans
  // sharp, `resize()` porte sur le fond et s'applique AVANT le composite, si
  // bien qu'enchaîner les deux reviendrait à coller le sigle en pleine taille
  // sur un fond déjà rétréci.
  const carre = await sharp({
    create: {
      width: cadre,
      height: cadre,
      channels: 3,
      // Blanc opaque : le sigle est noir et orange, il lui faut un fond clair
      // quel que soit le thème du navigateur.
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: sigle, gravity: "center" }])
    .png()
    .toBuffer();

  await sharp(carre).toFile("public/images/logo-icon.png");
  await sharp(carre).resize(180, 180).png().toFile(path.join("src", "app", "icon.png"));

  console.log(`Favicon : sigle ${lSigle} × ${hSigle} recadré en ${cadre} carré.`);
  console.log("Écrits : logo-full.png, logo-full-light.png, logo-icon.png, src/app/icon.png");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
