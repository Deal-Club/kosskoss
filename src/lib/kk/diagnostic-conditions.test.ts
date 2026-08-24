import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { questionVisible } from "./diagnostic-conditions";

describe("questionVisible", () => {
  it("est toujours visible quand la condition est vide", () => {
    const question = { conditionQuestion: "", conditionReponses: "[]" };
    assert.equal(questionVisible(question, []), true);
    assert.equal(questionVisible(question, ["nimporte_quoi"]), true);
  });

  it("est toujours visible quand la condition est vide, même avec des espaces", () => {
    const question = { conditionQuestion: "   ", conditionReponses: "[]" };
    assert.equal(questionVisible(question, []), true);
  });

  it("est visible quand la réponse attendue a été donnée", () => {
    const question = {
      conditionQuestion: "priorite",
      conditionReponses: JSON.stringify(["boutons_imperfections"]),
    };
    assert.equal(questionVisible(question, ["boutons_imperfections"]), true);
  });

  it("n'est pas visible quand la réponse donnée n'est pas celle attendue", () => {
    const question = {
      conditionQuestion: "priorite",
      conditionReponses: JSON.stringify(["boutons_imperfections"]),
    };
    assert.equal(questionVisible(question, ["hydratation"]), false);
  });

  it("est visible dès qu'une seule des plusieurs réponses attendues a été donnée", () => {
    // Cas exact du quiz client : Q5 se déclenche sur « Boutons / Imperfections »
    // OU « Glow / Éclat ».
    const question = {
      conditionQuestion: "priorite",
      conditionReponses: JSON.stringify(["boutons_imperfections", "glow_eclat"]),
    };
    assert.equal(questionVisible(question, ["glow_eclat"]), true);
    assert.equal(questionVisible(question, ["autre_chose", "glow_eclat"]), true);
  });

  it("n'est pas visible quand aucune des plusieurs réponses attendues n'a été donnée", () => {
    const question = {
      conditionQuestion: "priorite",
      conditionReponses: JSON.stringify(["boutons_imperfections", "glow_eclat"]),
    };
    assert.equal(questionVisible(question, ["hydratation", "anti_age"]), false);
  });

  it("n'est pas visible quand la question dont elle dépend n'a pas encore de réponse", () => {
    const question = {
      conditionQuestion: "priorite",
      conditionReponses: JSON.stringify(["boutons_imperfections"]),
    };
    assert.equal(questionVisible(question, []), false);
    assert.equal(questionVisible(question, new Set<string>()), false);
  });

  it("n'est pas visible quand conditionReponses est illisible en base (JSON invalide)", () => {
    const question = { conditionQuestion: "priorite", conditionReponses: "pas du json" };
    assert.equal(questionVisible(question, ["boutons_imperfections"]), false);
  });

  it("n'est pas visible quand conditionReponses est un JSON valide mais pas un tableau", () => {
    const question = { conditionQuestion: "priorite", conditionReponses: '{"cle":"valeur"}' };
    assert.equal(questionVisible(question, ["boutons_imperfections"]), false);
  });

  it("n'est pas visible quand conditionReponses est un tableau vide", () => {
    const question = { conditionQuestion: "priorite", conditionReponses: "[]" };
    assert.equal(questionVisible(question, ["boutons_imperfections"]), false);
  });

  it("ignore les entrées non-chaîne d'un conditionReponses partiellement corrompu", () => {
    const question = {
      conditionQuestion: "priorite",
      conditionReponses: JSON.stringify(["boutons_imperfections", 42, null]),
    };
    assert.equal(questionVisible(question, ["boutons_imperfections"]), true);
    assert.equal(questionVisible(question, ["42"]), false);
  });

  it("accepte un tableau de réponses données comme un Set", () => {
    const question = {
      conditionQuestion: "priorite",
      conditionReponses: JSON.stringify(["boutons_imperfections"]),
    };
    assert.equal(questionVisible(question, new Set(["boutons_imperfections"])), true);
  });
});
