import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { numeroSuivant } from "./numerotation";

describe("numeroSuivant", () => {
  it("commence à 1 quand il n'y a pas de précédent", () => {
    assert.equal(numeroSuivant("BC-", null, 2026), "BC-2026-000001");
  });

  it("poursuit la séquence de la même année", () => {
    assert.equal(numeroSuivant("BC-", "BC-2026-000041", 2026), "BC-2026-000042");
  });

  it("repart à 1 au changement d'année", () => {
    // La séquence est annuelle : poursuivre le compteur de l'an dernier
    // ferait commencer 2027 à 000042, ce qu'aucun comptable n'attend.
    assert.equal(numeroSuivant("BC-", "BC-2026-000041", 2027), "BC-2027-000001");
  });

  it("repart à 1 quand le dernier numéro est illisible", () => {
    // Une ligne corrompue rendrait NaN : mieux vaut un doublon détectable
    // qu'un « BC-2026-NaN » écrit en base.
    assert.equal(numeroSuivant("BC-", "BC-2026-abcdef", 2026), "BC-2026-000001");
  });

  it("ne confond pas deux préfixes", () => {
    // Une facture et un bon de commande ne partagent pas leur compteur : leur
    // confusion dans un échange avec le fournisseur coûterait cher.
    assert.equal(numeroSuivant("BC-", "FAC-2026-000041", 2026), "BC-2026-000001");
  });

  it("garde six chiffres au-delà de mille", () => {
    assert.equal(numeroSuivant("BC-", "BC-2026-001000", 2026), "BC-2026-001001");
  });
});
