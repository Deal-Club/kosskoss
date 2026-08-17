/**
 * Tests des dérivés du contenu : texte brut, chapeau automatique, temps de
 * lecture, sommaire.
 *
 * Le point sensible est le chapeau. Le réflexe est de couper le contenu à
 * N caractères ; sur un contenu qui porte des marques de formatage, cela
 * produit des « Un **bon net… » et des liens à moitié coupés. Ces tests
 * verrouillent le comportement attendu : on retire les marques d'abord, on
 * coupe sur un mot ensuite.
 *
 * Lancer avec : npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { autoExcerpt, blocksToPlainText, readingMinutes, tableOfContents } from "./content";
import type { JournalBlock } from "@/types/journal";

const ROUTINE: JournalBlock[] = [
  { kind: "heading", level: 2, text: "Nettoyer" },
  { kind: "paragraph", text: "Un **gel moussant** matin et soir." },
  { kind: "heading", level: 3, text: "Peau grasse" },
  { kind: "list", ordered: false, items: ["Argile", "Acide salicylique"] },
  { kind: "heading", level: 2, text: "Hydrater" },
  { kind: "divider" },
];

describe("blocksToPlainText", () => {
  it("retire les marques de formatage", () => {
    const text = blocksToPlainText([{ kind: "paragraph", text: "Un **gel** *doux*." }]);
    assert.equal(text, "Un gel doux.");
  });

  it("garde le libellé d'un lien, pas son adresse", () => {
    const text = blocksToPlainText([{ kind: "paragraph", text: "Voir le [diagnostic](/diagnostic)." }]);
    assert.equal(text, "Voir le diagnostic.");
  });

  it("ignore les blocs sans texte lisible", () => {
    assert.equal(blocksToPlainText([{ kind: "divider" }]), "");
  });

  it("n'inclut pas l'adresse d'une image, mais son texte alternatif", () => {
    const text = blocksToPlainText([
      { kind: "image", src: "/images/serum.jpg", alt: "Sérum posé sur un linge", caption: "" },
    ]);
    assert.equal(text.includes("/images/serum.jpg"), false);
    assert.equal(text.includes("Sérum posé sur un linge"), true);
  });
});

describe("autoExcerpt", () => {
  it("part du premier paragraphe, pas du premier titre", () => {
    const excerpt = autoExcerpt(ROUTINE, 200);
    assert.equal(excerpt.startsWith("Un gel moussant"), true);
  });

  it("coupe sur un mot entier et termine par une ellipse", () => {
    const long: JournalBlock[] = [
      { kind: "paragraph", text: "Nettoyer hydrater protéger ".repeat(20) },
    ];
    const excerpt = autoExcerpt(long, 40);
    assert.ok(excerpt.length <= 41, `chapeau trop long : ${excerpt.length}`);
    assert.equal(excerpt.endsWith("…"), true);
    assert.equal(/\s…$/.test(excerpt), false, "pas d'espace avant l'ellipse");
  });

  it("ne coupe pas un texte plus court que la limite", () => {
    const excerpt = autoExcerpt([{ kind: "paragraph", text: "Court." }], 200);
    assert.equal(excerpt, "Court.");
  });

  it("rend une chaîne vide sans contenu", () => {
    assert.equal(autoExcerpt([], 200), "");
  });
});

describe("readingMinutes", () => {
  it("rend au moins une minute pour un article très court", () => {
    assert.equal(readingMinutes([{ kind: "paragraph", text: "Trois mots ici." }]), 1);
  });

  it("compte environ deux cents mots par minute", () => {
    const blocks: JournalBlock[] = [{ kind: "paragraph", text: "mot ".repeat(600) }];
    assert.equal(readingMinutes(blocks, 200), 3);
  });

  it("respecte une vitesse de lecture personnalisée", () => {
    const blocks: JournalBlock[] = [{ kind: "paragraph", text: "mot ".repeat(300) }];
    assert.equal(readingMinutes(blocks, 100), 3);
  });
});

describe("tableOfContents", () => {
  it("ne retient que les titres, dans l'ordre", () => {
    assert.deepEqual(
      tableOfContents(ROUTINE).map((entry) => entry.text),
      ["Nettoyer", "Peau grasse", "Hydrater"],
    );
  });

  it("conserve le niveau de chaque titre", () => {
    assert.deepEqual(
      tableOfContents(ROUTINE).map((entry) => entry.level),
      [2, 3, 2],
    );
  });

  it("produit des ancres lisibles", () => {
    assert.equal(tableOfContents(ROUTINE)[1].id, "peau-grasse");
  });

  it("rend les ancres uniques quand deux titres se répètent", () => {
    const blocks: JournalBlock[] = [
      { kind: "heading", level: 2, text: "Conseil" },
      { kind: "heading", level: 2, text: "Conseil" },
      { kind: "heading", level: 2, text: "Conseil" },
    ];
    assert.deepEqual(
      tableOfContents(blocks).map((entry) => entry.id),
      ["conseil", "conseil-2", "conseil-3"],
    );
  });

  it("donne une ancre de repli à un titre sans caractère exploitable", () => {
    const entries = tableOfContents([{ kind: "heading", level: 2, text: "!!!" }]);
    assert.equal(entries[0].id.length > 0, true);
  });
});
