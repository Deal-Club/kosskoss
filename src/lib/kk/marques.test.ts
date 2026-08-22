import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleMarque } from "./marques";
import { slugify } from "@/lib/slugify";

describe("cleMarque", () => {
  it("ignore la casse", () => {
    assert.equal(cleMarque("NIVEA"), cleMarque("Nivea"));
  });

  it("ignore les accents", () => {
    // La faute de frappe la plus courante du catalogue : un accent en trop.
    assert.equal(cleMarque("Nivéa"), cleMarque("Nivea"));
  });

  it("ignore les espaces de bord", () => {
    assert.equal(cleMarque("  Nivea "), cleMarque("Nivea"));
  });

  it("CONSERVE les espaces internes", () => {
    // « La Roche-Posay » et « LaRochePosay » peuvent être deux choses
    // différentes ; les fondre changerait la marque de produits réels.
    assert.notEqual(cleMarque("La Roche Posay"), cleMarque("LaRochePosay"));
  });

  it("CONSERVE la ponctuation", () => {
    assert.notEqual(cleMarque("L'Oréal"), cleMarque("LOreal"));
  });

  it("n'est PAS le slug d'URL", () => {
    // Deux fonctions, deux rôles. `slugify` écrase les espaces en tirets ;
    // `cleMarque` ne le fait pas, et c'est toute la différence.
    assert.notEqual(cleMarque("La Roche Posay"), slugify("La Roche Posay"));
  });

  it("rend une chaîne vide pour une saisie vide", () => {
    assert.equal(cleMarque("   "), "");
  });
});
