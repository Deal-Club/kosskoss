/**
 * Recadre les logos de marque sur leur tracé réel.
 *
 * Les fichiers du jeu d'icônes sont normalisés dans un carré de 24 × 24. Un
 * logo en toutes lettres — Samsung, Siemens, Sony — n'y occupe qu'une bande
 * horizontale au milieu, le reste étant du vide. Affiché en masque contraint
 * par la hauteur, ce vide compte : le lettrage se retrouve trois fois plus
 * petit qu'un logo rond comme celui de Bosch, qui remplit son carré.
 *
 * On calcule donc la boîte englobante du tracé et on réécrit le `viewBox`
 * dessus. Le dessin ne change pas, seul le cadre se resserre.
 *
 * Usage : node scripts/recadrer-logos.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DOSSIER = path.join(process.cwd(), "public", "images", "brands");
/** Marge autour du tracé, en unités du viewBox. Sans elle, le trait est ras bord. */
const MARGE = 0.5;

/**
 * Points d'un tracé SVG.
 *
 * Les points de contrôle des courbes sont comptés comme des points ordinaires :
 * la boîte obtenue est donc au plus légèrement trop large, jamais trop étroite.
 * C'est le bon sens de l'erreur — un logo un peu moins grand vaut mieux qu'un
 * logo rogné.
 */
function pointsDuTrace(d) {
  const points = [];
  let x = 0;
  let y = 0;
  let departX = 0;
  let departY = 0;

  // Découpe « M12.3 4.5c-1 2 3 4 5 6z » en commandes et en nombres.
  const jetons = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  let i = 0;
  let commande = "";

  const nombre = () => Number(jetons[i++]);

  while (i < jetons.length) {
    if (/[MmLlHhVvCcSsQqTtAaZz]/.test(jetons[i])) {
      commande = jetons[i++];
    }

    const relatif = commande === commande.toLowerCase();
    const majuscule = commande.toUpperCase();

    switch (majuscule) {
      case "Z":
        x = departX;
        y = departY;
        break;
      case "H": {
        const v = nombre();
        x = relatif ? x + v : v;
        points.push([x, y]);
        break;
      }
      case "V": {
        const v = nombre();
        y = relatif ? y + v : v;
        points.push([x, y]);
        break;
      }
      case "A": {
        // rx ry rotation grandArc balayage x y : seul le point d'arrivée compte.
        nombre(); nombre(); nombre(); nombre(); nombre();
        const ax = nombre();
        const ay = nombre();
        x = relatif ? x + ax : ax;
        y = relatif ? y + ay : ay;
        points.push([x, y]);
        break;
      }
      default: {
        // M, L, T prennent 1 point ; S et Q en prennent 2 ; C en prend 3.
        const paires = { M: 1, L: 1, T: 1, S: 2, Q: 2, C: 3 }[majuscule] ?? 1;
        for (let p = 0; p < paires; p += 1) {
          const px = nombre();
          const py = nombre();
          const absX = relatif ? x + px : px;
          const absY = relatif ? y + py : py;
          points.push([absX, absY]);
          // Seul le dernier point de la commande déplace le curseur.
          if (p === paires - 1) {
            x = absX;
            y = absY;
          }
        }
        if (majuscule === "M") {
          departX = x;
          departY = y;
          // Un M suivi d'autres paires vaut des L : la commande devient L.
          commande = relatif ? "l" : "L";
        }
        break;
      }
    }
  }

  return points;
}

let recadres = 0;
let ignores = 0;

for (const fichier of readdirSync(DOSSIER).filter((f) => f.endsWith(".svg"))) {
  const chemin = path.join(DOSSIER, fichier);
  const svg = readFileSync(chemin, "utf-8");

  const traces = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
  if (traces.length === 0) {
    // Logotypes composés en <text> : leur cadre est déjà à la bonne mesure.
    ignores += 1;
    continue;
  }

  const points = traces.flatMap(pointsDuTrace).filter(([px, py]) => Number.isFinite(px) && Number.isFinite(py));
  if (points.length === 0) {
    ignores += 1;
    continue;
  }

  const xs = points.map(([px]) => px);
  const ys = points.map(([, py]) => py);
  const minX = Math.min(...xs) - MARGE;
  const minY = Math.min(...ys) - MARGE;
  const largeur = Math.max(...xs) - Math.min(...xs) + MARGE * 2;
  const hauteur = Math.max(...ys) - Math.min(...ys) + MARGE * 2;

  const arrondi = (v) => Math.round(v * 100) / 100;
  const nouveau = `viewBox="${arrondi(minX)} ${arrondi(minY)} ${arrondi(largeur)} ${arrondi(hauteur)}"`;

  writeFileSync(chemin, svg.replace(/viewBox="[^"]*"/, nouveau));
  console.log(
    `  ${fichier.padEnd(18)} ${nouveau.slice(9, -1).padEnd(28)} ratio ${(largeur / hauteur).toFixed(1)}`,
  );
  recadres += 1;
}

console.log(`\n${recadres} logos recadrés, ${ignores} laissés tels quels.`);
