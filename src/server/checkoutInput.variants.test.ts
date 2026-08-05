import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCheckoutPayload } from "./checkoutInput";

const base = {
  email: "jean@exemple.fr", phone: "0612345678",
  billing: { firstName: "Jean", lastName: "Dupont", street: "1 rue des Bois", postalCode: "75001", city: "Paris", country: "FR" },
  shippingSameAsBilling: true, paymentMethodKey: "virement",
  termsAccepted: true, withdrawalAcknowledged: true,
};

test("deux variations d'un même produit font deux lignes", () => {
  const { input, errors } = parseCheckoutPayload({
    ...base,
    items: [
      { productId: "p1", variantId: "v1", quantity: 1 },
      { productId: "p1", variantId: "v2", quantity: 2 },
    ],
  });
  assert.deepEqual(errors, []);
  assert.equal(input?.items.length, 2);
  assert.equal(input?.items[1].variantId, "v2");
});

test("la même variation deux fois est dédupliquée", () => {
  const { input } = parseCheckoutPayload({
    ...base,
    items: [
      { productId: "p1", variantId: "v1", quantity: 1 },
      { productId: "p1", variantId: "v1", quantity: 3 },
    ],
  });
  assert.equal(input?.items.length, 1);
});
