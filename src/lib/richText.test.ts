/**
 * Tests du formatage restreint des pages légales.
 *
 * Ce qui est couvert n'est pas choisi au hasard : ce parseur reçoit du texte
 * saisi dans le back-office et le transforme en éléments affichés sur des pages
 * publiques. Deux familles de cas comptent vraiment — les marques mal formées
 * (qui ne doivent jamais casser la page) et les adresses de lien hostiles (qui
 * ne doivent jamais devenir cliquables).
 *
 * Lancer avec : npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafeHref, paragraphsOf, parseRichText, stripMarks, type RichTextNode } from "./richText";

/** Représentation compacte d'un arbre, pour des assertions lisibles. */
function shape(nodes: readonly RichTextNode[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case "text":
          return node.value;
        case "strong":
          return `<b>${shape(node.children)}</b>`;
        case "em":
          return `<i>${shape(node.children)}</i>`;
        case "link":
          return `<a href="${node.href}">${shape(node.children)}</a>`;
      }
    })
    .join("");
}

describe("parseRichText — marques bien formées", () => {
  it("reconnaît le gras", () => {
    assert.equal(shape(parseRichText("Valable **aujourd'hui**")), "Valable <b>aujourd'hui</b>");
  });

  it("reconnaît l'italique", () => {
    assert.equal(shape(parseRichText("Valable *aujourd'hui*")), "Valable <i>aujourd'hui</i>");
  });

  it("imbrique l'italique dans le gras", () => {
    assert.equal(shape(parseRichText("**Achtung *sehr* wichtig**")), "<b>Achtung <i>sehr</i> wichtig</b>");
  });

  it("ferme le gras au bon endroit quand l'italique termine le passage", () => {
    // Trois astérisques d'affilée : le gras doit englober l'italique.
    assert.equal(shape(parseRichText("**Achtung *wichtig***")), "<b>Achtung <i>wichtig</i></b>");
  });

  it("enchaîne plusieurs passages en gras", () => {
    assert.equal(shape(parseRichText("**A** und **B**")), "<b>A</b> und <b>B</b>");
  });

  it("conserve les sauts de ligne simples dans le texte", () => {
    assert.equal(shape(parseRichText("Zeile 1\nZeile 2")), "Zeile 1\nZeile 2");
  });
});

describe("parseRichText — marques mal formées", () => {
  it("affiche littéralement une astérisque isolée", () => {
    assert.equal(shape(parseRichText("Preis 349 € *")), "Preis 349 € *");
  });

  it("affiche littéralement un gras non refermé", () => {
    assert.equal(shape(parseRichText("**Achtung")), "**Achtung");
  });

  it("ne crée pas d'italique vide", () => {
    assert.equal(shape(parseRichText("a ** b")), "a ** b");
  });

  it("laisse le HTML collé dans un champ s'afficher comme du texte", () => {
    const source = '<script>alert(1)</script>';
    assert.equal(shape(parseRichText(source)), source);
  });

  it("respecte l'échappement d'une astérisque", () => {
    assert.equal(shape(parseRichText("2 \\* 3 = 6")), "2 * 3 = 6");
  });

  it("n'ouvre pas de lien sur un crochet seul", () => {
    assert.equal(shape(parseRichText("Siehe [Anhang")), "Siehe [Anhang");
  });
});

describe("parseRichText — liens", () => {
  it("accepte un chemin interne", () => {
    assert.equal(
      shape(parseRichText("Voir les [mentions légales](/mentions-legales)")),
      'Voir les <a href="/mentions-legales">mentions légales</a>',
    );
  });

  it("accepte https, mailto et tel", () => {
    assert.ok(isSafeHref("https://mlc-bois.fr"));
    assert.ok(isSafeHref("http://example.org/pfad"));
    assert.ok(isSafeHref("mailto:contact@mlc-bois.fr"));
    assert.ok(isSafeHref("tel:+4930123456"));
  });

  it("refuse javascript:, data: et les adresses protocole-relatives", () => {
    assert.equal(isSafeHref("javascript:alert(1)"), false);
    assert.equal(isSafeHref("JavaScript:alert(1)"), false);
    assert.equal(isSafeHref("data:text/html,<script>"), false);
    assert.equal(isSafeHref("//evil.example"), false);
    assert.equal(isSafeHref(""), false);
    assert.equal(isSafeHref("   "), false);
  });

  it("garde le libellé et jette le lien quand l'adresse est refusée", () => {
    assert.equal(shape(parseRichText("[Klicken](javascript:alert1)")), "Klicken");
    assert.equal(shape(parseRichText("[Klicken](data:text/html,x)")), "Klicken");
  });

  it("ne fabrique pas de lien à partir d'une adresse tronquée par une parenthèse", () => {
    // L'adresse s'arrête à la première parenthèse fermante : le reste retombe
    // en texte. L'essentiel est qu'aucun lien cliquable ne soit produit.
    assert.equal(shape(parseRichText("[Klicken](javascript:alert(1))")), "Klicken)");
  });

  it("formate le libellé d'un lien", () => {
    assert.equal(
      shape(parseRichText("[**CGV**](/cgv)")),
      '<a href="/cgv"><b>CGV</b></a>',
    );
  });
});

describe("stripMarks", () => {
  it("retire les marques et garde le texte", () => {
    assert.equal(
      stripMarks("**Droit de rétractation** : voir les [CGV](/cgv) et les *informations*"),
      "Droit de rétractation : voir les CGV et les informations",
    );
  });

  it("ne touche pas à un texte sans marque", () => {
    assert.equal(stripMarks("12 rue de la Scierie, 93200 Saint-Denis"), "12 rue de la Scierie, 93200 Saint-Denis");
  });
});

describe("paragraphsOf", () => {
  it("découpe sur les lignes vides et ignore les blancs", () => {
    assert.deepEqual(paragraphsOf("Premier paragraphe\n\nDeuxième paragraphe\n\n\n"), [
      "Premier paragraphe",
      "Deuxième paragraphe",
    ]);
  });

  it("ne découpe pas sur un saut de ligne simple", () => {
    assert.deepEqual(paragraphsOf("Zeile 1\nZeile 2"), ["Zeile 1\nZeile 2"]);
  });

  it("tolère une ligne « vide » contenant des espaces", () => {
    assert.deepEqual(paragraphsOf("A\n   \nB"), ["A", "B"]);
  });
});
