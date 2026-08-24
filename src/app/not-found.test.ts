import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Les deux pages 404 doivent interdire l'indexation.
 *
 * ── POURQUOI CE TEST LIT DES FICHIERS ───────────────────────────────────────
 *
 * Ces pages ne sont pas des fonctions qu'on peut appeler : ce sont des
 * composants serveur rendus par Next.js. Ce que ce test protège n'est pas leur
 * rendu, c'est une DÉCISION — et une décision tenue par une seule ligne, facile
 * à emporter dans un nettoyage de balises.
 *
 * Cette ligne est là parce que `notFound()` ne sait pas fixer le code 404 sous
 * le segment dynamique racine `[locale]` (défaut amont, mesuré et documenté
 * dans `docs/ETAT-DES-LIEUX.md`). Les adresses mortes répondent donc 200. Sans
 * `noindex`, les moteurs les indexent : la boutique finit proposée sur des
 * liens qui ne mènent nulle part.
 *
 * Le jour où Next corrigera le défaut, ce test tombera avec le contournement —
 * ce qui est le bon moment pour relire les deux, ensemble.
 */

const PAGES = [
  { nom: "404 de la boutique", chemin: "src/app/[locale]/not-found.tsx" },
  { nom: "404 de dernier recours", chemin: "src/app/not-found.tsx" },
];

describe("pages 404 — interdiction d'indexation", () => {
  for (const { nom, chemin } of PAGES) {
    it(`${nom} porte noindex`, () => {
      const source = readFileSync(chemin, "utf8");
      assert.match(
        source,
        /<meta\s+name="robots"\s+content="noindex/,
        `${chemin} ne porte plus la balise noindex : les adresses mortes ` +
          `répondent 200 et redeviendraient indexables.`,
      );
    });

    it(`${nom} laisse suivre les liens`, () => {
      // `follow` est délibéré : les issues proposées (catalogue, diagnostic,
      // accueil) restent des chemins légitimes à explorer. Un `nofollow` les
      // couperait sans rien gagner.
      const source = readFileSync(chemin, "utf8");
      assert.match(source, /content="noindex,\s*follow"/, chemin);
    });
  }
});
