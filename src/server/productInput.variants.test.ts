// src/server/productInput.variants.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProductInput } from "./productInput";

test("parseProductInput accepte une liste de variations valides", () => {
  const { values, errors } = parseProductInput(
    { variants: [{ label: "1 stère", price: "175,00 €" }, { label: "2 stères", price: "250,00 €" }] },
    "update",
  );
  assert.deepEqual(errors, []);
  assert.equal(values.variants?.length, 2);
  assert.equal(values.variants?.[0].priceCents, 17500);
  assert.equal(values.variants?.[0].label, "1 stère");
});

test("parseProductInput rejette une variation sans libellé", () => {
  const { errors } = parseProductInput({ variants: [{ label: "", price: "10 €" }] }, "update");
  assert.ok(errors.length > 0);
});

test("parseProductInput rejette un prix de variation invalide", () => {
  const { errors } = parseProductInput({ variants: [{ label: "1 stère", price: "0" }] }, "update");
  assert.ok(errors.length > 0);
});

test("parseProductInput accepte une liste de variations vide (efface)", () => {
  const { values, errors } = parseProductInput({ variants: [] }, "update");
  assert.deepEqual(errors, []);
  assert.deepEqual(values.variants, []);
});
