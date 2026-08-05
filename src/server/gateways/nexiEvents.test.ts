import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nexiPaymentStatus, readNexiNotification } from "./nexiEvents";

describe("nexiPaymentStatus", () => {
  it("ne considère payée qu'une opération réellement exécutée", () => {
    assert.equal(nexiPaymentStatus("EXECUTED", "CAPTURE"), "bezahlt");
    assert.equal(nexiPaymentStatus("EXECUTED", "AUTHORIZATION"), "bezahlt");
  });

  it("ne compte une autorisation que si elle porte sur une capture", () => {
    assert.equal(nexiPaymentStatus("AUTHORIZED", "CAPTURE"), "bezahlt");
    // Fonds réservés, pas encore encaissés : la commande reste en attente.
    assert.equal(nexiPaymentStatus("AUTHORIZED", "AUTHORIZATION"), null);
    assert.equal(nexiPaymentStatus("AUTHORIZED", undefined), null);
  });

  it("marque l'échec sur un refus, une annulation ou une invalidation", () => {
    for (const result of ["DECLINED", "DENIED_BY_RISK", "FAILED", "CANCELED", "VOID"]) {
      assert.equal(nexiPaymentStatus(result, "AUTHORIZATION"), "fehlgeschlagen", result);
    }
  });

  it("laisse en attente un résultat inconnu plutôt que de deviner", () => {
    // Le sens exact des résultats Nexi reste à confirmer avec un vrai compte :
    // l'inconnu ne doit jamais valoir « payée ».
    assert.equal(nexiPaymentStatus("PENDING", "AUTHORIZATION"), null);
    assert.equal(nexiPaymentStatus("THREEDS_VALIDATED", "AUTHORIZATION"), null);
    assert.equal(nexiPaymentStatus(undefined, undefined), null);
  });
});

describe("readNexiNotification", () => {
  it("retient le numéro de commande et le jeton d'authentification", () => {
    const read = readNexiNotification(
      JSON.stringify({
        securityToken: "tok_abc",
        operation: {
          orderId: "MLC-2026-000123",
          operationId: "op_1",
          operationType: "CAPTURE",
          operationResult: "EXECUTED",
        },
      }),
    );

    assert.equal(read?.orderNumber, "MLC-2026-000123");
    assert.equal(read?.securityToken, "tok_abc");
    assert.equal(read?.notification.operation?.operationId, "op_1");
  });

  it("refuse une notification sans jeton — rien ne pourrait l'authentifier", () => {
    const body = JSON.stringify({ operation: { orderId: "MLC-2026-000123" } });
    assert.equal(readNexiNotification(body), null);
  });

  it("refuse une notification sans numéro de commande", () => {
    assert.equal(readNexiNotification(JSON.stringify({ securityToken: "tok_abc" })), null);
  });

  it("ignore un corps illisible plutôt que de lever", () => {
    assert.equal(readNexiNotification("pas du json"), null);
    assert.equal(readNexiNotification("{}"), null);
  });
});
