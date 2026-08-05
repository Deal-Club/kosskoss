import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readSquareEvent, squarePaymentStatus } from "./squareEvents";

/** Événement Square minimal, à la forme réelle (snake_case, imbriqué). */
function event(type: string, payment: Record<string, unknown>): string {
  return JSON.stringify({ type, data: { type: "payment", object: { payment } } });
}

describe("squarePaymentStatus", () => {
  it("ne considère payée qu'une capture réellement terminée", () => {
    assert.equal(squarePaymentStatus("COMPLETED"), "bezahlt");
  });

  it("laisse la commande en attente sur une autorisation non capturée", () => {
    // APPROVED = carte autorisée, argent pas encore encaissé.
    assert.equal(squarePaymentStatus("APPROVED"), null);
    assert.equal(squarePaymentStatus("PENDING"), null);
  });

  it("marque l'échec sur un paiement refusé ou annulé", () => {
    assert.equal(squarePaymentStatus("FAILED"), "fehlgeschlagen");
    assert.equal(squarePaymentStatus("CANCELED"), "fehlgeschlagen");
  });

  it("ignore un statut inconnu plutôt que de deviner", () => {
    assert.equal(squarePaymentStatus("QUELQUE_CHOSE_DE_NOUVEAU"), null);
    assert.equal(squarePaymentStatus(undefined), null);
  });
});

describe("readSquareEvent", () => {
  it("retient un paiement encaissé avec sa référence", () => {
    const result = readSquareEvent(
      event("payment.updated", {
        id: "pay_1",
        order_id: "sq_order_1",
        status: "COMPLETED",
        reference_id: "MLC-2026-000123",
      }),
    );

    assert.equal(result?.paymentStatus, "bezahlt");
    assert.equal(result?.payment.reference_id, "MLC-2026-000123");
    assert.equal(result?.payment.id, "pay_1");
  });

  it("ignore les types d'événements qui ne portent pas sur le paiement", () => {
    assert.equal(readSquareEvent(event("refund.updated", { status: "COMPLETED" })), null);
    assert.equal(readSquareEvent(event("order.updated", { status: "COMPLETED" })), null);
  });

  it("ignore un événement de paiement au statut sans effet", () => {
    assert.equal(readSquareEvent(event("payment.updated", { status: "APPROVED" })), null);
  });

  it("ignore un corps illisible ou incomplet plutôt que de lever", () => {
    assert.equal(readSquareEvent("pas du json"), null);
    assert.equal(readSquareEvent("{}"), null);
    assert.equal(readSquareEvent(JSON.stringify({ type: "payment.updated" })), null);
  });
});
