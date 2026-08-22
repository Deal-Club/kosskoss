import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickText, pickList } from "./localizedContent";

/**
 * `pickText`/`pickList` portent la seule règle de repli de tout le catalogue
 * bilingue : traduction manquante ou vide → français. Rien d'autre dans la
 * boutique ne doit lire un champ `*En` directement (voir l'en-tête de
 * localizedContent.ts) — ces deux fonctions sont donc le seul endroit qui
 * mérite d'être éprouvé ligne à ligne.
 */

describe("pickText", () => {
  it("renvoie la traduction quand elle est renseignée", () => {
    assert.equal(pickText("Bonjour", "Hello"), "Hello");
  });

  it("retombe sur le français quand la traduction est absente", () => {
    assert.equal(pickText("Bonjour", undefined), "Bonjour");
  });

  it("retombe sur le français quand la traduction vaut null", () => {
    // `*En` vient de Prisma en `string | null` sur certains modèles ; le
    // type de la fonction dit `| null | undefined` pour cette raison précise.
    assert.equal(pickText("Bonjour", null), "Bonjour");
  });

  it("retombe sur le français quand la traduction est une chaîne vide", () => {
    assert.equal(pickText("Bonjour", ""), "Bonjour");
  });

  it("retombe sur le français quand la traduction est faite d'espaces", () => {
    // Une case remplie d'espaces a l'air remplie dans l'écran de traduction et
    // ne traduit rien : elle doit être traitée exactement comme une case vide.
    assert.equal(pickText("Bonjour", "   "), "Bonjour");
    assert.equal(pickText("Bonjour", "\t\n "), "Bonjour");
  });

  it("rogne les espaces qui encadrent une traduction valide", () => {
    assert.equal(pickText("Bonjour", "  Hello  "), "Hello");
  });

  it("accepte un fallback vide", () => {
    assert.equal(pickText("", undefined), "");
    assert.equal(pickText("", "Hello"), "Hello");
  });
});

describe("pickList", () => {
  it("renvoie la traduction complète quand chaque puce est renseignée", () => {
    assert.deepEqual(
      pickList(["Une", "Deux", "Trois"], ["One", "Two", "Three"]),
      ["One", "Two", "Three"],
    );
  });

  it("retombe sur le français quand la traduction est absente", () => {
    assert.deepEqual(pickList(["Une", "Deux"], undefined), ["Une", "Deux"]);
  });

  it("ne perd aucune puce quand une seule traduction sur trois est renseignée", () => {
    // Le défaut corrigé par ce lot : une traduction incomplète ne doit jamais
    // retrancher du contenu sur une fiche qui vend.
    assert.deepEqual(
      pickList(["Une", "Deux", "Trois"], ["", "B", ""]),
      ["Une", "B", "Trois"],
    );
  });

  it("retombe puce par puce sur une entrée faite d'espaces", () => {
    assert.deepEqual(
      pickList(["Une", "Deux", "Trois"], ["Un", "   ", "Trois traduit"]),
      ["Un", "Deux", "Trois traduit"],
    );
  });

  it("complète avec le français quand la traduction est plus courte", () => {
    assert.deepEqual(
      pickList(["Une", "Deux", "Trois"], ["Only one"]),
      ["Only one", "Deux", "Trois"],
    );
  });

  it("ignore les puces en trop quand la traduction est plus longue", () => {
    // La liste française donne la longueur de référence : elle seule décide
    // combien de puces la fiche affiche.
    assert.deepEqual(
      pickList(["Une", "Deux"], ["One", "Two", "Three", "Four"]),
      ["One", "Two"],
    );
  });

  it("comble un trou au milieu de la traduction", () => {
    assert.deepEqual(
      pickList(["Une", "Deux", "Trois", "Quatre"], ["Un", "", "Trois", "Quatre"]),
      ["Un", "Deux", "Trois", "Quatre"],
    );
  });

  it("renvoie une liste vide quand le français n'a rien à traduire", () => {
    assert.deepEqual(pickList([], ["One", "Two"]), []);
    assert.deepEqual(pickList([], undefined), []);
  });

  it("garde toujours la longueur de la liste française", () => {
    const fallback = ["Une", "Deux", "Trois"];
    assert.equal(pickList(fallback, undefined).length, fallback.length);
    assert.equal(pickList(fallback, ["Un"]).length, fallback.length);
    assert.equal(pickList(fallback, ["Un", "Deux", "Trois", "Quatre"]).length, fallback.length);
  });
});
