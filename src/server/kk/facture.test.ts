import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { doitEmettreFacture } from "./facture";

describe("doitEmettreFacture", () => {
  it("émet quand le paiement bascule vers payée", () => {
    assert.equal(doitEmettreFacture("en_attente", "payee"), true);
  });

  it("n'émet pas quand la commande était déjà payée", () => {
    // Un webhook rejoué ou un administrateur qui reclique ne doit pas produire
    // une seconde facture.
    assert.equal(doitEmettreFacture("payee", "payee"), false);
  });

  it("n'émet pas sur un échec de paiement", () => {
    assert.equal(doitEmettreFacture("en_attente", "echouee"), false);
  });

  it("n'émet pas sur un remboursement", () => {
    // Un remboursement appelle un avoir, prévu au lot 3 — pas une facture.
    assert.equal(doitEmettreFacture("payee", "remboursee"), false);
  });
});
