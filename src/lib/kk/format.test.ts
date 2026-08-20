import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatFcfa } from "./format";

/**
 * Règle de devise, verrouillée par un test.
 *
 * Le franc CFA n'a PAS de sous-unité : les entiers stockés dans les colonnes
 * `*Cents` sont des francs entiers, jamais des centimes. Une version antérieure,
 * héritée de l'activité européenne précédente, divisait par 100 et suffixait
 * « € » : une commande de 31 000 F sortait imprimée « 310,00 € » sur la facture
 * du client. C'est la seule règle métier que la facture ne peut pas se
 * permettre de perdre en silence — le filtre WinAnsi de server/invoice.ts efface
 * un « € » sans rien dire, il ne servira pas d'alerte.
 *
 * Le test porte sur `formatFcfa` plutôt que sur `montant()` de server/invoice.ts :
 * `montant()` n'est qu'un alias privé d'une ligne qui délègue ici, et l'importer
 * chargerait pdf-lib et la chaîne Prisma dans le harnais de test pour ne rien
 * vérifier de plus. C'est bien ce module qui possède le formatage.
 */
describe("formatFcfa", () => {
  it("imprime des francs entiers, sans jamais diviser par 100", () => {
    const rendu = formatFcfa(31000);
    // 31 000 reste 31 000 : les deux groupes de chiffres sont là, dans l'ordre.
    assert.match(rendu, /31.?000/);
    assert.ok(rendu.includes("31"), `« 31 » attendu dans ${rendu}`);
    assert.ok(rendu.includes("000"), `« 000 » attendu dans ${rendu}`);
    // Une division par 100 aurait donné « 310 » et perdu les trois zéros.
    assert.ok(!/\b310\b/.test(rendu), `montant divisé par 100 dans ${rendu}`);
  });

  it("suffixe FCFA et jamais l'euro", () => {
    const rendu = formatFcfa(31000);
    assert.ok(rendu.includes("FCFA"), `« FCFA » attendu dans ${rendu}`);
    assert.doesNotMatch(rendu, /€/);
    assert.doesNotMatch(rendu, /EUR/);
  });

  it("n'introduit aucune décimale", () => {
    // « 310,00 » ou « 310.00 » : la forme même d'un montant à sous-unité.
    for (const montant of [31000, 1845, 999999, 5]) {
      const rendu = formatFcfa(montant);
      assert.doesNotMatch(rendu, /\d,\d/, `séparateur décimal dans ${rendu}`);
      assert.doesNotMatch(rendu, /\d\.\d/, `séparateur décimal dans ${rendu}`);
    }
  });

  it("garde la gratuité à zéro et non à « 0,00 »", () => {
    assert.doesNotMatch(formatFcfa(0), /\d[.,]\d/);
    assert.ok(formatFcfa(0).includes("0"));
  });
});
