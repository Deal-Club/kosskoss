/**
 * Décline l'identité KossKoss Select en tous les fichiers dont le site a besoin.
 *
 * Les sources sont les planches de la charte, livrées en aplats opaques :
 *   assets/marque/kk-monogramme.png      double K blanc, carré bleu, double filet
 *   assets/marque/kk-lettrage-fonce.png  « KOSSKOSS SELECT » bleu sur blanc
 *   assets/marque/kk-lettrage-clair.png  le même en blanc sur anthracite
 *
 * Deux traitements y sont appliqués.
 *
 * 1. **Détourage par luminance.** Les planches n'ont pas de couche alpha : le
 *    lettrage est posé sur un aplat. Plutôt que de seuiller — ce qui hacherait
 *    les empattements du Cinzel — on convertit la luminance en opacité. Le
 *    tracé garde son anticrénelage et se pose proprement sur n'importe quel
 *    fond.
 *
 * 2. **Recadrage du favicon sur le carré plein.** Le monogramme porte un filet
 *    extérieur fin, puis une marge, puis le carré plein. À 16 px dans un
 *    onglet, ce filet se réduit à une bavure grise. Le favicon est donc cadré
 *    sur le carré plein seul : un bloc bleu net, le double K blanc dessus.
 *
 * Fichiers produits :
 *   src/app/icon.png                   favicon (Next.js lit ce nom de fichier)
 *   src/app/apple-icon.png             icône d'écran d'accueil iOS
 *   public/images/logo-icon.png        monogramme complet, fond transparent
 *   public/images/logo-full.png        lettrage foncé — facture PDF, SEO, e-mails
 *   public/images/logo-full-light.png  lettrage clair — pied de page, back-office
 *
 * Usage : node scripts/generer-logos.mjs
 */

import sharp from "sharp";

const MONOGRAMME = "assets/marque/kk-monogramme.png";
const LETTRAGE_FONCE = "assets/marque/kk-lettrage-fonce.png";
const LETTRAGE_CLAIR = "assets/marque/kk-lettrage-clair.png";

/** Bleu de la charte, tel qu'il figure sur les planches fournies. */
const BLEU = [0x24, 0x56, 0x61];

/**
 * Part du côté à rogner pour passer du filet extérieur au carré plein.
 * Mesurée sur la planche : le carré plein commence à 37 px d'un logo de 532.
 */
const ROGNAGE_FAVICON = 0.07;

const luminance = (r, v, b) => 0.299 * r + 0.587 * v + 0.114 * b;

/**
 * Remplace un aplat de fond par de la transparence, en convertissant la
 * luminance de chaque pixel en opacité.
 *
 * @param sombreSurClair vrai si le tracé est foncé sur fond clair.
 * @param teinte         couleur à donner au tracé une fois détouré.
 */
async function detourer(source, { sombreSurClair, teinte }) {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Luminance des deux extrêmes : celle du tracé et celle du fond. L'opacité
  // s'interpole entre les deux, ce qui préserve les bords adoucis.
  const lumTrace = sombreSurClair ? luminance(...teinte) : 255;
  const lumFond = sombreSurClair ? 255 : luminance(0x20, 0x20, 0x20);
  const amplitude = Math.abs(lumFond - lumTrace) || 1;

  for (let i = 0; i < data.length; i += 4) {
    const lum = luminance(data[i], data[i + 1], data[i + 2]);
    const opacite = Math.round((Math.abs(lumFond - lum) / amplitude) * 255);
    data[i] = teinte[0];
    data[i + 1] = teinte[1];
    data[i + 2] = teinte[2];
    data[i + 3] = Math.max(0, Math.min(255, opacite));
  }

  // `trim` sur l'alpha : les planches ont de larges marges vides autour du
  // tracé, qui décentreraient le logo partout où il est posé.
  return sharp(data, { raw: info }).png().trim({ threshold: 1 });
}

/** Boîte englobante des pixels proches du bleu de charte. */
async function cadreDuMonogramme() {
  const { data, info } = await sharp(MONOGRAMME).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let xMin = info.width, xMax = -1, yMin = info.height, yMax = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      const proche = BLEU.every((c, k) => Math.abs(data[i + k] - c) < 40);
      if (!proche) continue;
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
  }
  return { left: xMin, top: yMin, width: xMax - xMin + 1, height: yMax - yMin + 1 };
}

async function main() {
  const cadre = await cadreDuMonogramme();
  console.log(`monogramme repéré : ${cadre.width}×${cadre.height} px`);

  // ---- Favicon : le carré plein seul, fond opaque ----
  //
  // Fond opaque et non transparent : l'onglet du navigateur peut être clair ou
  // sombre selon le thème, et un monogramme blanc sur transparent
  // disparaîtrait dans le premier cas.
  const marge = Math.round(cadre.width * ROGNAGE_FAVICON);
  const carrePlein = {
    left: cadre.left + marge,
    top: cadre.top + marge,
    width: cadre.width - marge * 2,
    height: cadre.height - marge * 2,
  };

  for (const [fichier, taille] of [
    ["src/app/icon.png", 512],
    ["src/app/apple-icon.png", 180],
  ]) {
    await sharp(MONOGRAMME)
      .extract(carrePlein)
      .resize(taille, taille, { fit: "cover" })
      .png()
      .toFile(fichier);
    console.log(`${fichier} — ${taille}×${taille}`);
  }

  // ---- Monogramme complet, double filet compris, fond transparent ----
  const { data, info } = await sharp(MONOGRAMME)
    .extract(cadre)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    // Seul le blanc du fond disparaît ; le bleu et le blanc du tracé restent.
    const estFond = data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240;
    const dansLeCarre =
      i / 4 % info.width >= marge &&
      i / 4 % info.width < info.width - marge &&
      Math.floor(i / 4 / info.width) >= marge &&
      Math.floor(i / 4 / info.width) < info.height - marge;
    if (estFond && !dansLeCarre) data[i + 3] = 0;
  }

  await sharp(data, { raw: info })
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile("public/images/logo-icon.png");
  console.log("public/images/logo-icon.png — 512×512");

  // ---- Lettrages détourés ----
  const fonce = await detourer(LETTRAGE_FONCE, { sombreSurClair: true, teinte: BLEU });
  await fonce.resize({ width: 1200, withoutEnlargement: true }).toFile("public/images/logo-full.png");
  console.log("public/images/logo-full.png");

  const clair = await detourer(LETTRAGE_CLAIR, { sombreSurClair: false, teinte: [255, 255, 255] });
  await clair
    .resize({ width: 1200, withoutEnlargement: true })
    .toFile("public/images/logo-full-light.png");
  console.log("public/images/logo-full-light.png");
}

await main();
