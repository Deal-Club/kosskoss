import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choisirLangue } from "./langue";

describe("choisirLangue", () => {
  it("rend l'anglais pour « en »", () => {
    assert.equal(choisirLangue("en"), "en");
  });

  it("rend le français pour « fr »", () => {
    assert.equal(choisirLangue("fr"), "fr");
  });

  it("se replie sur le français pour une valeur inconnue", () => {
    // Le français est la langue de référence du site : c'est elle qui engage la
    // société. Un code de langue inattendu ne doit pas produire une page vide.
    assert.equal(choisirLangue("de"), "fr");
    assert.equal(choisirLangue(""), "fr");
  });

  it("se replie sur le français en l'absence de valeur", () => {
    assert.equal(choisirLangue(null), "fr");
    assert.equal(choisirLangue(undefined), "fr");
  });

  it("ne se laisse pas tromper par la casse", () => {
    // « EN » vient parfois d'un en-tête HTTP ou d'un import ; il désigne bien
    // l'anglais.
    assert.equal(choisirLangue("EN"), "en");
  });
});
