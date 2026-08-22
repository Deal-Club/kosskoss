import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseBesoin,
  parseBrands,
  parseFacettes,
  parsePage,
  parsePrix,
  parseSort,
} from "./catalog-params";

describe("parseSort", () => {
  it("rend « pertinence » par défaut", () => {
    assert.equal(parseSort(undefined), "pertinence");
    assert.equal(parseSort("inconnu"), "pertinence");
  });

  it("reconnaît une valeur valide", () => {
    assert.equal(parseSort("prix-asc"), "prix-asc");
  });
});

describe("parseBrands", () => {
  it("découpe une liste séparée par des virgules", () => {
    assert.deepEqual(parseBrands("A,B"), ["A", "B"]);
  });

  it("rend un tableau vide sans valeur", () => {
    assert.deepEqual(parseBrands(undefined), []);
  });
});

describe("parseFacettes", () => {
  it("rend une sélection vide sans paramètre", () => {
    assert.deepEqual(parseFacettes({}), { peau: [], preoccupation: [] });
  });

  it("lit les deux familles séparément — pas une liste mélangée", () => {
    const selection = parseFacettes({ peau: "grasse,mixte", preoccupation: "taches" });
    assert.deepEqual(selection, { peau: ["grasse", "mixte"], preoccupation: ["taches"] });
  });

  it("déduplique une clé répétée dans une même famille", () => {
    const selection = parseFacettes({ peau: "grasse,grasse,mixte" });
    assert.deepEqual(selection.peau, ["grasse", "mixte"]);
  });

  it("ignore les entrées vides sans lever d'erreur", () => {
    const selection = parseFacettes({ peau: "grasse,,  ,mixte" });
    assert.deepEqual(selection.peau, ["grasse", "mixte"]);
  });

  it("une clé inconnue n'est jamais une erreur — elle reste simplement dans la liste", () => {
    // Aucune validation contre un vocabulaire connu (voir la doctrine de
    // `parseBrands`) : une clé absurde ne fait correspondre aucun produit en
    // aval, ce qui affiche un rayon vide plutôt qu'un 500.
    assert.doesNotThrow(() => parseFacettes({ peau: "clé-qui-n-existe-pas" }));
    const selection = parseFacettes({ peau: "clé-qui-n-existe-pas" });
    assert.deepEqual(selection.peau, ["clé-qui-n-existe-pas"]);
  });

  describe("compatibilité ?besoin=", () => {
    it("traduit un besoin de type de peau dans la famille peau", () => {
      const selection = parseFacettes({ besoin: "peau_grasse" });
      assert.deepEqual(selection, { peau: ["peau_grasse"], preoccupation: [] });
    });

    it("traduit un besoin de préoccupation dans la famille préoccupation", () => {
      const selection = parseFacettes({ besoin: "taches" });
      assert.deepEqual(selection, { peau: [], preoccupation: ["taches"] });
    });

    it("un besoin inconnu (lien de diagnostic périmé) est ignoré, pas une erreur", () => {
      const selection = parseFacettes({ besoin: "ancien-tag-retire" });
      assert.deepEqual(selection, { peau: [], preoccupation: [] });
    });

    it("se combine avec des facettes déjà présentes dans l'URL sans les dupliquer", () => {
      const selection = parseFacettes({ peau: "peau_grasse", besoin: "peau_grasse" });
      assert.deepEqual(selection.peau, ["peau_grasse"]);
    });

    it("ajoute le besoin à côté d'une facette déjà cochée de la même famille", () => {
      const selection = parseFacettes({ peau: "peau_mixte", besoin: "peau_grasse" });
      assert.deepEqual(selection.peau.sort(), ["peau_grasse", "peau_mixte"]);
    });
  });
});

describe("parsePrix", () => {
  it("rend des bornes indéfinies sans paramètre", () => {
    assert.deepEqual(parsePrix({}), { min: undefined, max: undefined });
  });

  it("lit des bornes en francs entiers, sans division par 100", () => {
    // Le FCFA n'a pas de sous-unité : 15000 doit rester 15000, jamais 150.
    assert.deepEqual(parsePrix({ prixMin: "15000", prixMax: "45000" }), { min: 15000, max: 45000 });
  });

  it("accepte une seule borne", () => {
    assert.deepEqual(parsePrix({ prixMin: "10000" }), { min: 10000, max: undefined });
    assert.deepEqual(parsePrix({ prixMax: "10000" }), { min: undefined, max: 10000 });
  });

  it("échange des bornes inversées plutôt que de rendre une liste vide", () => {
    assert.deepEqual(parsePrix({ prixMin: "50000", prixMax: "10000" }), { min: 10000, max: 50000 });
  });

  it("ignore une valeur absurde plutôt que de la propager", () => {
    assert.deepEqual(parsePrix({ prixMin: "abc", prixMax: "-500" }), { min: undefined, max: undefined });
  });
});

describe("parseBesoin", () => {
  it("ignore une valeur inconnue", () => {
    assert.equal(parseBesoin("inconnu"), undefined);
  });

  it("reconnaît un besoin valide", () => {
    assert.equal(parseBesoin("taches"), "taches");
  });
});

describe("parsePage", () => {
  it("ramène à la page 1 sur une valeur absurde", () => {
    assert.equal(parsePage("0"), 1);
    assert.equal(parsePage("abc"), 1);
    assert.equal(parsePage("-3"), 1);
  });

  it("lit une page valide", () => {
    assert.equal(parsePage("2"), 2);
  });
});
