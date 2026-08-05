// src/server/gateways/amount.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { decimalToCents } from "./amount";

test("convertit un montant décimal en centimes", () => {
  assert.equal(decimalToCents("214.50"), 21450);
  assert.equal(decimalToCents("0.99"), 99);
  assert.equal(decimalToCents("1000.00"), 100000);
});

test("accepte une valeur sans décimales", () => {
  assert.equal(decimalToCents("214"), 21400);
});

test("accepte une seule décimale", () => {
  // « 214.5 » vaut 214,50 € et non 214,05 € : le remplissage se fait à droite.
  assert.equal(decimalToCents("214.5"), 21450);
});

test("accepte la virgule comme séparateur", () => {
  assert.equal(decimalToCents("214,50"), 21450);
});

test("ne perd pas de centime sur les valeurs qui piègent le flottant", () => {
  // Math.round(214.35 * 100) donne 21434 sur ces valeurs : c'est exactement le
  // défaut que la conversion textuelle évite.
  assert.equal(decimalToCents("214.35"), 21435);
  assert.equal(decimalToCents("1.005"), null); // trois décimales : format refusé
  assert.equal(decimalToCents("8.29"), 829);
  assert.equal(decimalToCents("16.08"), 1608);
});

test("gère les montants négatifs", () => {
  assert.equal(decimalToCents("-12.30"), -1230);
});

test("rend null sur une valeur absente ou illisible", () => {
  assert.equal(decimalToCents(undefined), null);
  assert.equal(decimalToCents(null), null);
  assert.equal(decimalToCents(""), null);
  assert.equal(decimalToCents("gratuit"), null);
  assert.equal(decimalToCents("12.34.56"), null);
  assert.equal(decimalToCents("1e3"), null);
});

test("tolère les espaces autour de la valeur", () => {
  assert.equal(decimalToCents("  42.00  "), 4200);
});
