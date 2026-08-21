// src/server/productInput.cost.test.ts
//
// Le coût d'achat est le seul champ monétaire où zéro et « vide » veulent dire
// deux choses différentes : un échantillon reçu gratuitement coûte zéro, un
// produit dont personne n'a encore saisi le coût ne coûte rien de connu. Toute
// la colonne nullable existe pour tenir cette distinction — ces tests la
// verrouillent, du formulaire jusqu'à l'écriture en base.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProductInput } from "./productInput";
import { coutCentsAEnregistrer, formatPrice } from "./pricingUtils";

test("parseProductInput retient un coût d'achat renseigné", () => {
  const { values, errors } = parseProductInput({ cost: "12 000 FCFA" }, "update");
  assert.deepEqual(errors, []);
  assert.equal(values.cost, "12 000 FCFA");
});

test("parseProductInput accepte un coût de zéro", () => {
  // Le refuser obligerait à vider le champ pour un produit gratuit, donc à
  // écrire « pas encore renseigné » là où l'on sait.
  const { values, errors } = parseProductInput({ cost: "0" }, "update");
  assert.deepEqual(errors, []);
  assert.equal(values.cost, "0");
});

test("parseProductInput accepte une saisie vide, qui efface le coût", () => {
  const { values, errors } = parseProductInput({ cost: "" }, "update");
  assert.deepEqual(errors, []);
  assert.equal(values.cost, "");
});

test("parseProductInput refuse une saisie sans chiffre", () => {
  // « abc » et « 0 » donnent tous deux 0 après conversion : contrôler le
  // résultat au lieu de la saisie laissait passer la faute de frappe.
  for (const saisie of ["abc", "—", "-"]) {
    const { errors } = parseProductInput({ cost: saisie }, "update");
    assert.equal(errors.length, 1, `« ${saisie} » aurait dû être refusé`);
    assert.match(errors[0], /Coût d'achat invalide/);
  }
});

test("parseProductInput ne touche pas au coût quand le champ n'est pas transmis", () => {
  // Une mise à jour partielle — changer le stock depuis la liste — ne doit pas
  // effacer un coût qu'elle n'a jamais vu.
  const { values, errors } = parseProductInput({ stock: 4 }, "update");
  assert.deepEqual(errors, []);
  assert.equal(values.cost, undefined);
});

test("parseProductInput n'exige pas de coût à la création", () => {
  const { errors } = parseProductInput(
    { categoryId: "soin/visage", brand: "Nivea", name: "Crème", price: "18 500 FCFA" },
    "create",
  );
  assert.deepEqual(errors, []);
});

// ── Ce que la base enregistre ───────────────────────────────────────────────
//
// `store.ts` délègue ses deux chemins d'écriture à `coutCentsAEnregistrer`,
// que ces tests appellent directement — asserter contre une copie de la règle
// n'aurait rien prouvé du code qui tourne.

test("un coût de zéro s'enregistre en 0, pas en NULL", () => {
  assert.equal(coutCentsAEnregistrer("0"), 0);
});

test("un coût effacé s'enregistre en NULL", () => {
  assert.equal(coutCentsAEnregistrer(""), null);
});

test("un coût de zéro déjà en base reste modifiable", () => {
  // Régression : tant que le parseur refusait zéro, un produit dont le coût
  // valait 0 — par import ou par SQL — voyait chacune de ses sauvegardes
  // suivantes échouer, et devenait donc impossible à modifier.
  const relu = formatPrice(0);
  const { errors, values } = parseProductInput({ cost: relu }, "update");
  assert.deepEqual(errors, []);
  assert.equal(coutCentsAEnregistrer(values.cost ?? ""), 0);
});
