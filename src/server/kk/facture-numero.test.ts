import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { numeroFactureSuivant, PREFIXE_FACTURE } from "./facture-numero";

describe("numeroFactureSuivant", () => {
  it("part à 000001 quand aucune facture n'existe pour l'année", () => {
    assert.equal(numeroFactureSuivant(null, 2026), "FAC-2026-000001");
  });

  it("incrémente le dernier numéro de l'année", () => {
    assert.equal(numeroFactureSuivant("FAC-2026-000009", 2026), "FAC-2026-000010");
  });

  it("passe correctement la centaine et garde six chiffres", () => {
    assert.equal(numeroFactureSuivant("FAC-2026-000099", 2026), "FAC-2026-000100");
  });

  it("repart à 000001 au changement d'année", () => {
    // Le dernier numéro connu appartient à l'année précédente : la séquence
    // est annuelle, elle ne poursuit pas le compteur de 2026 en 2027.
    assert.equal(numeroFactureSuivant("FAC-2026-000042", 2027), "FAC-2027-000001");
  });

  it("repart à 000001 si le dernier numéro est illisible", () => {
    // Une ligne corrompue ne doit pas produire « FAC-2026-NaN ».
    assert.equal(numeroFactureSuivant("FAC-2026-abcdef", 2026), "FAC-2026-000001");
  });

  it("expose un préfixe distinct de celui des commandes", () => {
    // Les commandes du tunnel KossKoss sont en « KOSS- » (server/kk/checkout.ts) :
    // confondre les deux numéros dans un échange avec le service client coûte cher.
    assert.equal(PREFIXE_FACTURE, "FAC-");
  });
});
