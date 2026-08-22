import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toProductView, type ProductViewRow } from "./product-view";

/** Ligne minimale, complétée au cas par cas par les tests. */
function ligne(partial: Partial<ProductViewRow> = {}): ProductViewRow {
  return {
    id: "prod-1",
    slug: "creme-hydratante",
    brand: "Nivea",
    name: "Crème hydratante",
    priceCents: 5000,
    oldPriceCents: null,
    badge: null,
    image: null,
    stock: 10,
    category: { slug: "visage", group: { slug: "soins-visage" } },
    ...partial,
  };
}

describe("toProductView", () => {
  it("garde le nom français sur la boutique française", () => {
    const vue = toProductView(ligne({ name: "Crème hydratante", nameEn: "Moisturizing cream" }), "fr");
    assert.equal(vue.name, "Crème hydratante");
  });

  it("traduit le nom sur la boutique anglaise", () => {
    const vue = toProductView(ligne({ name: "Crème hydratante", nameEn: "Moisturizing cream" }), "en");
    assert.equal(vue.name, "Moisturizing cream");
  });

  it("retombe sur le nom français quand la traduction est absente", () => {
    const vue = toProductView(ligne({ name: "Crème hydratante", nameEn: "" }), "en");
    assert.equal(vue.name, "Crème hydratante");
  });

  it("retombe sur le nom français quand la traduction n'est faite que d'espaces", () => {
    const vue = toProductView(ligne({ name: "Crème hydratante", nameEn: "   " }), "en");
    assert.equal(vue.name, "Crème hydratante");
  });

  it("traduit la description courte quand elle est renseignée", () => {
    const vue = toProductView(
      ligne({ shortDescription: "Pour peau sèche", shortDescriptionEn: "For dry skin" }),
      "en",
    );
    assert.equal(vue.shortDescription, "For dry skin");
  });

  it("retombe sur la description française si l'anglaise est vide", () => {
    const vue = toProductView(
      ligne({ shortDescription: "Pour peau sèche", shortDescriptionEn: "" }),
      "en",
    );
    assert.equal(vue.shortDescription, "Pour peau sèche");
  });

  it("traduit un produit partiellement traduit champ par champ", () => {
    // Le nom porte une traduction, la description courte non : chaque champ
    // applique son propre repli, indépendamment des autres.
    const vue = toProductView(
      ligne({
        name: "Crème hydratante",
        nameEn: "Moisturizing cream",
        shortDescription: "Pour peau sèche",
        shortDescriptionEn: "",
      }),
      "en",
    );
    assert.equal(vue.name, "Moisturizing cream");
    assert.equal(vue.shortDescription, "Pour peau sèche");
  });

  it("ne traduit jamais la marque, même sur la boutique anglaise", () => {
    // « Nivea » est un nom propre : le traduire produirait un nom inventé.
    const vue = toProductView(ligne({ brand: "Nivea" }), "en");
    assert.equal(vue.brand, "Nivea");
  });

  it("laisse la description courte absente quand aucune des deux langues ne la renseigne", () => {
    const vue = toProductView(ligne({ shortDescription: undefined, shortDescriptionEn: undefined }), "en");
    assert.equal(vue.shortDescription, undefined);
  });
});
