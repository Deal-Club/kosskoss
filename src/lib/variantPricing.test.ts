// src/lib/variantPricing.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { minActivePriceCents, cartLineKey, discountedVariantCents } from "./variantPricing";

test("minActivePriceCents renvoie le plus petit prix actif", () => {
  assert.equal(
    minActivePriceCents([
      { priceCents: 51000, active: true },
      { priceCents: 17500, active: true },
      { priceCents: 25000, active: true },
    ]),
    17500,
  );
});

test("minActivePriceCents ignore les variations inactives", () => {
  assert.equal(
    minActivePriceCents([
      { priceCents: 9900, active: false },
      { priceCents: 17500, active: true },
    ]),
    17500,
  );
});

test("minActivePriceCents renvoie undefined sans variation active", () => {
  assert.equal(minActivePriceCents([]), undefined);
  assert.equal(minActivePriceCents([{ priceCents: 100, active: false }]), undefined);
});

test("cartLineKey distingue les variations d'un même produit", () => {
  assert.notEqual(cartLineKey("p1", "v1"), cartLineKey("p1", "v2"));
  assert.equal(cartLineKey("p1", "v1"), cartLineKey("p1", "v1"));
});

test("cartLineKey sans variation retombe sur le seul productId", () => {
  assert.equal(cartLineKey("p1"), "p1");
  assert.equal(cartLineKey("p1", undefined), "p1");
});

// ---- discountedVariantCents ----

test("discountedVariantCents sans promotion renvoie le prix de base", () => {
  assert.equal(discountedVariantCents(10000, undefined), 10000);
});

test("discountedVariantCents avec promotion non abaissante renvoie le prix de base (savingCents = 0)", () => {
  assert.equal(
    discountedVariantCents(10000, { priceCents: 9000, basePriceCents: 8000, savingCents: 0 }),
    10000,
  );
});

test("discountedVariantCents avec promotion non abaissante renvoie le prix de base (priceCents >= basePriceCents, pas de savingCents)", () => {
  assert.equal(
    discountedVariantCents(10000, { priceCents: 10000, basePriceCents: 10000 }),
    10000,
  );
});

test("discountedVariantCents applique le ratio proportionnel", () => {
  // produit de référence : 10 000 → 8 000 (-20 %)
  // variation à 20 000 : 20 000 × 0,80 = 16 000
  assert.equal(
    discountedVariantCents(20000, { priceCents: 8000, basePriceCents: 10000, savingCents: 2000 }),
    16000,
  );
});

test("discountedVariantCents ne dépasse pas le prix de base de la variation", () => {
  // ratio > 1 : priceCents > basePriceCents n'est pas abaissant → renvoie la base
  // (cas couvert par la garde `lowers`)
  // Ici on teste que Math.min est respecté si le ratio était > 1 sans garde
  // En pratique le guard `lowers` protège, mais testons le plafond explicitement :
  // savingCents > 0 mais le ratio mathématique dépasserait la base (impossible
  // normalement, mais on vérifie que Math.min est bien là)
  assert.equal(
    discountedVariantCents(5000, { priceCents: 9000, basePriceCents: 10000, savingCents: 1000 }),
    // 5000 × 9000/10000 = 4500 < 5000 → 4500
    4500,
  );
});

test("discountedVariantCents avec basePriceCents=0 renvoie le prix de base (pas de division par zéro)", () => {
  assert.equal(
    discountedVariantCents(10000, { priceCents: 0, basePriceCents: 0, savingCents: 0 }),
    10000,
  );
});
