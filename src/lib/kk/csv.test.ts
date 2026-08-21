import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCsv, csvCell } from "./csv";

describe("csvCell", () => {
  it("laisse une valeur ordinaire telle quelle", () => {
    assert.equal(csvCell("Crème hydratante"), "Crème hydratante");
  });

  it("entoure de guillemets une valeur contenant le séparateur", () => {
    // Sans cela, « Nivea; Soft » deviendrait deux colonnes.
    assert.equal(csvCell("Nivea; Soft"), '"Nivea; Soft"');
  });

  it("double les guillemets internes", () => {
    assert.equal(csvCell('Crème "riche"'), '"Crème ""riche"""');
  });

  it("remplace les retours à la ligne par une espace", () => {
    // Un retour à la ligne non protégé couperait la ligne du tableur en deux.
    assert.equal(csvCell("Première ligne\nSeconde"), "Première ligne Seconde");
    assert.equal(csvCell("Première ligne\r\nSeconde"), "Première ligne Seconde");
  });

  it("supprime les espaces de bord", () => {
    assert.equal(csvCell("  Nivea  "), "Nivea");
  });

  it("rend une chaîne vide pour une valeur vide", () => {
    // Une case vide dit « on ne sait pas » ; y écrire 0 fausserait un total.
    assert.equal(csvCell(""), "");
  });
});

describe("buildCsv", () => {
  it("écrit l'en-tête puis les lignes, séparés par des points-virgules", () => {
    const csv = buildCsv(["Marque", "Produit"], [["Nivea", "Crème"]]);
    assert.ok(csv.includes("Marque;Produit"));
    assert.ok(csv.includes("Nivea;Crème"));
  });

  it("commence par un BOM", () => {
    // Sans lui, Excel affiche « CrÃ¨me » à l'ouverture.
    assert.equal(buildCsv(["A"], []).charCodeAt(0), 0xfeff);
  });

  it("sépare les lignes par CRLF et termine le fichier par un CRLF", () => {
    const csv = buildCsv(["A"], [["1"], ["2"]]);
    assert.ok(csv.endsWith("\r\n"));
    assert.equal(csv.split("\r\n").filter(Boolean).length, 3);
  });

  it("échappe les cellules des lignes comme celles de l'en-tête", () => {
    const csv = buildCsv(["Note; interne"], [['Il a dit "oui"']]);
    assert.ok(csv.includes('"Note; interne"'));
    assert.ok(csv.includes('"Il a dit ""oui"""'));
  });

  it("écrit un fichier d'en-tête seul quand il n'y a aucune ligne", () => {
    // Une période sans vente doit produire un fichier lisible, pas un fichier
    // vide qu'on prendrait pour un export raté.
    const csv = buildCsv(["Marque", "Produit"], []);
    assert.equal(csv, "﻿Marque;Produit\r\n");
  });
});
