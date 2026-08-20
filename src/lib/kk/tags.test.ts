import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTags } from "./tags";

describe("parseTags", () => {
  it("lit un tableau de clés", () => {
    assert.deepEqual(parseTags('["peau_grasse","hydratation"]'), ["peau_grasse", "hydratation"]);
  });

  it("rend un tableau vide sur une valeur absente", () => {
    assert.deepEqual(parseTags(null), []);
    assert.deepEqual(parseTags(""), []);
  });

  it("rend un tableau vide sur du JSON illisible", () => {
    // Un champ corrompu ne doit pas faire tomber une page catalogue.
    assert.deepEqual(parseTags("{pas du json"), []);
  });

  it("rend un tableau vide si la valeur n'est pas un tableau", () => {
    assert.deepEqual(parseTags('{"peau_grasse":2}'), []);
  });

  it("écarte les entrées qui ne sont pas des chaînes", () => {
    assert.deepEqual(parseTags('["peau_grasse",42,null,"hydratation"]'), [
      "peau_grasse",
      "hydratation",
    ]);
  });
});
