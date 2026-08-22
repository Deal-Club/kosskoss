import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { produitCorrespond, produitCorrespondFacettes } from "./facettes";

describe("produitCorrespond", () => {
  it("laisse tout passer quand aucune facette n'est cochée", () => {
    assert.equal(produitCorrespond(["peau_grasse"], []), true);
    assert.equal(produitCorrespond([], []), true);
  });

  it("retient un produit portant l'une des clés cochées", () => {
    // Union et non intersection : cocher « peau grasse » ET « peau mixte » doit
    // élargir la sélection, pas la vider. C'est ainsi que se comportent déjà
    // les facettes de marque.
    assert.equal(produitCorrespond(["peau_grasse", "hydratation"], ["peau_grasse"]), true);
    assert.equal(produitCorrespond(["peau_mixte"], ["peau_grasse", "peau_mixte"]), true);
  });

  it("écarte un produit ne portant aucune clé cochée", () => {
    assert.equal(produitCorrespond(["peau_seche"], ["peau_grasse"]), false);
  });

  it("écarte un produit sans aucun tag dès qu'une facette est cochée", () => {
    assert.equal(produitCorrespond([], ["peau_grasse"]), false);
  });
});

describe("produitCorrespondFacettes", () => {
  it("laisse tout passer quand aucune famille n'est cochée", () => {
    assert.equal(
      produitCorrespondFacettes(["peau_grasse"], { peau: [], preoccupation: [] }),
      true,
    );
  });

  it("UNION dans une famille : cocher deux types de peau élargit", () => {
    // Un produit qui ne porte que « peau_mixte » doit rester retenu quand on
    // coche AUSSI « peau_grasse » — cocher une deuxième valeur d'une même
    // famille ne doit jamais faire disparaître un produit déjà retenu.
    const selection = { peau: ["peau_grasse", "peau_mixte"], preoccupation: [] };
    assert.equal(produitCorrespondFacettes(["peau_mixte"], selection), true);
    assert.equal(produitCorrespondFacettes(["peau_grasse"], selection), true);
  });

  it("INTERSECTION entre familles : cocher un type de peau ET une préoccupation restreint", () => {
    const selection = { peau: ["peau_grasse"], preoccupation: ["taches"] };
    // Porte les deux : retenu.
    assert.equal(produitCorrespondFacettes(["peau_grasse", "taches"], selection), true);
    // Porte seulement le type de peau : écarté, la préoccupation cochée exclut.
    assert.equal(produitCorrespondFacettes(["peau_grasse", "hydratation"], selection), false);
    // Porte seulement la préoccupation : écarté de la même façon.
    assert.equal(produitCorrespondFacettes(["peau_seche", "taches"], selection), false);
  });

  it("une famille cochée seule ne contraint pas l'autre", () => {
    const selection = { peau: ["peau_grasse"], preoccupation: [] };
    assert.equal(produitCorrespondFacettes(["peau_grasse"], selection), true);
  });

  it("écarte un produit hors sélection dans une seule famille cochée", () => {
    const selection = { peau: [], preoccupation: ["taches"] };
    assert.equal(produitCorrespondFacettes(["peau_grasse"], selection), false);
  });
});
