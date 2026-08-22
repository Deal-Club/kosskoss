import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { statutApresReception, totauxBon, type LigneBon } from "./approvisionnement";

function ligne(commandee: number, recue: number, cout = 8000): LigneBon {
  return { quantiteCommandee: commandee, quantiteRecue: recue, coutUnitaireCents: cout };
}

describe("statutApresReception", () => {
  it("passe à « recu » quand tout est arrivé", () => {
    assert.equal(statutApresReception("envoye", [ligne(10, 10), ligne(5, 5)]), "recu");
  });

  it("passe à « recu_partiel » quand une partie est arrivée", () => {
    assert.equal(statutApresReception("envoye", [ligne(10, 10), ligne(5, 0)]), "recu_partiel");
  });

  it("laisse le statut inchangé quand rien n'est arrivé", () => {
    assert.equal(statutApresReception("envoye", [ligne(10, 0)]), "envoye");
  });

  it("considère « reçu » un bon sur-livré", () => {
    // Un fournisseur qui livre treize au lieu de douze, cela arrive. Le bon est
    // soldé : laisser « partiel » ferait attendre une livraison qui ne viendra
    // jamais.
    assert.equal(statutApresReception("envoye", [ligne(12, 13)]), "recu");
  });

  it("ne ressuscite pas un bon annulé", () => {
    // Ce qui avait été reçu reste reçu, mais un bon annulé le reste : le
    // rouvrir par une réception effacerait la décision de l'annuler.
    assert.equal(statutApresReception("annule", [ligne(10, 10)]), "annule");
  });

  it("ne fait pas d'un brouillon un bon reçu", () => {
    // On ne reçoit pas ce qu'on n'a pas commandé. Si cela arrive, c'est le
    // brouillon qu'il faut envoyer d'abord.
    assert.equal(statutApresReception("brouillon", [ligne(10, 10)]), "brouillon");
  });

  it("rend « envoye » pour un bon sans ligne", () => {
    // Zéro ligne toutes reçues serait vrai au sens strict, et absurde.
    assert.equal(statutApresReception("envoye", []), "envoye");
  });
});

describe("totauxBon", () => {
  it("calcule l'engagé, le reçu et le restant", () => {
    const totaux = totauxBon([ligne(10, 4, 8000), ligne(5, 5, 12000)]);
    assert.equal(totaux.engageCents, 10 * 8000 + 5 * 12000);
    assert.equal(totaux.recuCents, 4 * 8000 + 5 * 12000);
    assert.equal(totaux.restantCents, 6 * 8000);
  });

  it("ne rend jamais un restant négatif sur une sur-livraison", () => {
    // Treize reçus pour douze commandés ne veut pas dire qu'il reste −1 à
    // recevoir.
    assert.equal(totauxBon([ligne(12, 13)]).restantCents, 0);
  });

  it("rend des totaux à zéro pour un bon vide", () => {
    const totaux = totauxBon([]);
    assert.equal(totaux.engageCents, 0);
    assert.equal(totaux.toutRecu, false);
  });
});
