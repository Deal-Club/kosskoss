import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adresseEmailValide, LONGUEUR_MAX_EMAIL } from "./email-valide";

describe("adresseEmailValide", () => {
  it("accepte une adresse ordinaire", () => {
    assert.equal(adresseEmailValide("client@exemple.fr"), true);
  });

  it("refuse une chaîne sans @", () => {
    assert.equal(adresseEmailValide("client-exemple.fr"), false);
  });

  it("refuse une chaîne sans domaine", () => {
    assert.equal(adresseEmailValide("client@"), false);
  });

  it("refuse un domaine sans point", () => {
    assert.equal(adresseEmailValide("client@exemplefr"), false);
  });

  it("refuse une adresse contenant une espace", () => {
    assert.equal(adresseEmailValide("client @exemple.fr"), false);
  });

  it("accepte une adresse à la longueur maximale", () => {
    // 254 caractères pile : la limite est inclusive, pas stricte.
    const local = "a".repeat(LONGUEUR_MAX_EMAIL - "@exemple.fr".length);
    const adresse = `${local}@exemple.fr`;
    assert.equal(adresse.length, LONGUEUR_MAX_EMAIL);
    assert.equal(adresseEmailValide(adresse), true);
  });

  it("refuse une adresse au-delà de la longueur maximale", () => {
    const local = "a".repeat(LONGUEUR_MAX_EMAIL - "@exemple.fr".length + 1);
    const adresse = `${local}@exemple.fr`;
    assert.equal(adresse.length, LONGUEUR_MAX_EMAIL + 1);
    assert.equal(adresseEmailValide(adresse), false);
  });
});
