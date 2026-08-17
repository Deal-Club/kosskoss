/**
 * Tests de la résolution des slugs.
 *
 * La règle métier qui compte est le GEL : tant qu'un article n'a jamais été
 * publié, son slug suit son titre ; une fois publié, il se fige, et une
 * modification volontaire laisse derrière elle une redirection. Renommer un
 * titre ne doit jamais casser une URL indexée en silence.
 *
 * Lancer avec : npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RESERVED_ARTICLE_SLUGS, articleSlug, resolveSlug, uniqueSlug } from "./slug";

describe("articleSlug", () => {
  it("translittère les accents et les ligatures", () => {
    assert.equal(articleSlug("Cœur de beurre de karité"), "coeur-de-beurre-de-karite");
  });

  it("supprime la ponctuation", () => {
    assert.equal(articleSlug("Peau grasse : que faire ?"), "peau-grasse-que-faire");
  });

  it("rend une chaîne vide pour un titre sans lettre", () => {
    assert.equal(articleSlug("!!!"), "");
  });
});

describe("uniqueSlug", () => {
  it("laisse un slug libre intact", () => {
    assert.equal(uniqueSlug("routine-peau-mixte", []), "routine-peau-mixte");
  });

  it("suffixe un slug déjà pris", () => {
    assert.equal(uniqueSlug("routine", ["routine"]), "routine-2");
  });

  it("continue de suffixer jusqu'au premier libre", () => {
    assert.equal(uniqueSlug("routine", ["routine", "routine-2", "routine-3"]), "routine-4");
  });

  it("écarte les slugs réservés au routage", () => {
    for (const reserved of RESERVED_ARTICLE_SLUGS) {
      assert.equal(uniqueSlug(reserved, []), `${reserved}-2`, `« ${reserved} » doit être écarté`);
    }
  });

  it("donne un slug de repli quand la base est vide", () => {
    assert.equal(uniqueSlug("", []).length > 0, true);
  });
});

describe("resolveSlug — article jamais publié", () => {
  it("suit le titre", () => {
    const result = resolveSlug({
      title: "Choisir son nettoyant",
      manualSlug: "",
      currentSlug: "ancien-titre",
      everPublished: false,
      taken: [],
    });
    assert.equal(result.slug, "choisir-son-nettoyant");
  });

  it("ne laisse aucune redirection derrière lui", () => {
    const result = resolveSlug({
      title: "Choisir son nettoyant",
      manualSlug: "",
      currentSlug: "ancien-titre",
      everPublished: false,
      taken: [],
    });
    assert.equal(result.redirectFrom, null);
  });

  it("respecte un slug saisi à la main", () => {
    const result = resolveSlug({
      title: "Choisir son nettoyant",
      manualSlug: "Nettoyant Idéal",
      currentSlug: "",
      everPublished: false,
      taken: [],
    });
    assert.equal(result.slug, "nettoyant-ideal");
  });
});

describe("resolveSlug — article déjà publié", () => {
  it("gèle le slug quand seul le titre change", () => {
    const result = resolveSlug({
      title: "Choisir son nettoyant en 2026",
      manualSlug: "",
      currentSlug: "choisir-son-nettoyant",
      everPublished: true,
      taken: [],
    });
    assert.equal(result.slug, "choisir-son-nettoyant");
    assert.equal(result.redirectFrom, null);
  });

  it("accepte un changement explicite et prépare la redirection", () => {
    const result = resolveSlug({
      title: "Choisir son nettoyant",
      manualSlug: "bien-choisir-son-nettoyant",
      currentSlug: "choisir-son-nettoyant",
      everPublished: true,
      taken: [],
    });
    assert.equal(result.slug, "bien-choisir-son-nettoyant");
    assert.equal(result.redirectFrom, "choisir-son-nettoyant");
  });

  it("ne crée pas de redirection vers soi-même", () => {
    const result = resolveSlug({
      title: "Choisir son nettoyant",
      manualSlug: "choisir-son-nettoyant",
      currentSlug: "choisir-son-nettoyant",
      everPublished: true,
      taken: [],
    });
    assert.equal(result.redirectFrom, null);
  });
});

describe("resolveSlug — collisions", () => {
  it("ne se heurte pas à son propre slug actuel", () => {
    const result = resolveSlug({
      title: "Routine",
      manualSlug: "",
      currentSlug: "routine",
      everPublished: false,
      taken: ["routine"],
    });
    assert.equal(result.slug, "routine");
  });

  it("s'écarte du slug d'un autre article", () => {
    const result = resolveSlug({
      title: "Routine",
      manualSlug: "",
      currentSlug: "",
      everPublished: false,
      taken: ["routine"],
    });
    assert.equal(result.slug, "routine-2");
  });
});
