import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { paypalApprovalLink, paypalOrderNumber } from "./paypalEvents";

describe("paypalApprovalLink", () => {
  it("préfère payer-action, la forme renvoyée avec payment_source.paypal", () => {
    const link = paypalApprovalLink({
      links: [
        { rel: "self", href: "https://api-m.paypal.com/v2/checkout/orders/5O1" },
        { rel: "payer-action", href: "https://www.paypal.com/checkoutnow?token=5O1" },
      ],
    });
    assert.equal(link, "https://www.paypal.com/checkoutnow?token=5O1");
  });

  it("accepte approve, la forme historique", () => {
    const link = paypalApprovalLink({
      links: [{ rel: "approve", href: "https://www.paypal.com/checkoutnow?token=5O1" }],
    });
    assert.equal(link, "https://www.paypal.com/checkoutnow?token=5O1");
  });

  it("rend null quand aucun lien d'approbation n'est présent", () => {
    assert.equal(paypalApprovalLink({ links: [{ rel: "self", href: "https://x" }] }), null);
    assert.equal(paypalApprovalLink({}), null);
  });
});

describe("paypalOrderNumber", () => {
  it("lit custom_id à la racine, comme sur un événement de capture", () => {
    const event = {
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: "cap_1", custom_id: "MLC-2026-000123" },
    };
    assert.equal(paypalOrderNumber(event), "MLC-2026-000123");
  });

  it("lit purchase_units, comme sur un événement de commande approuvée", () => {
    const event = {
      event_type: "CHECKOUT.ORDER.APPROVED",
      resource: { id: "5O1", purchase_units: [{ custom_id: "MLC-2026-000456" }] },
    };
    assert.equal(paypalOrderNumber(event), "MLC-2026-000456");
  });

  it("retombe sur invoice_id quand custom_id manque", () => {
    assert.equal(
      paypalOrderNumber({ resource: { id: "cap_1", invoice_id: "MLC-2026-000789" } }),
      "MLC-2026-000789",
    );
    assert.equal(
      paypalOrderNumber({ resource: { purchase_units: [{ invoice_id: "MLC-2026-000999" }] } }),
      "MLC-2026-000999",
    );
  });

  it("rend null quand la commande n'est rattachable à rien", () => {
    assert.equal(paypalOrderNumber({ resource: { id: "cap_1" } }), null);
    assert.equal(paypalOrderNumber({}), null);
  });
});
