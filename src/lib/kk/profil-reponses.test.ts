import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ecrireReponses, lireReponses } from "./profil-reponses";

describe("lireReponses", () => {
  it("relit ce qui a été écrit", () => {
    const ids = ["clx1", "clx2", "clx3"];
    assert.deepEqual(lireReponses(ecrireReponses(ids)), ids);
  });

  it("rend un tableau vide sur une valeur absente", () => {
    assert.deepEqual(lireReponses(null), []);
    assert.deepEqual(lireReponses(""), []);
  });

  it("rend un tableau vide sur du JSON illisible", () => {
    // Une colonne corrompue ne doit pas faire tomber la page du diagnostic.
    assert.deepEqual(lireReponses("{pas du json"), []);
  });

  it("rend un tableau vide si la valeur n'est pas un tableau", () => {
    assert.deepEqual(lireReponses('{"clx1":true}'), []);
  });

  it("écarte les entrées qui ne sont pas des chaînes", () => {
    assert.deepEqual(lireReponses('["clx1",42,null,"clx2"]'), ["clx1", "clx2"]);
  });

  it("préserve l'ordre des réponses", () => {
    // L'ordre porte du sens : c'est celui des questions du QCM.
    assert.deepEqual(lireReponses('["c","a","b"]'), ["c", "a", "b"]);
  });
});
