import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseBrands,
  parseFacettes,
  parsePage,
  parsePrix,
  parseSort,
  type EntreeVocabulaire,
} from "./catalog-params";
import { FAMILLE_PEAU, FAMILLE_PREOCCUPATION } from "./facettes";

/** Vocabulaire de test : reflète les dix clés réellement administrées
 *  aujourd'hui (cinq types de peau, cinq préoccupations) — dont trois qu'une
 *  ancienne liste figée dans le code ignorait (peau_normale, anti_age,
 *  apaisant), ce qui faisait disparaître le filtre en silence. */
const VOCABULAIRE_TEST: EntreeVocabulaire[] = [
  { key: "peau_seche", family: FAMILLE_PEAU },
  { key: "peau_grasse", family: FAMILLE_PEAU },
  { key: "peau_mixte", family: FAMILLE_PEAU },
  { key: "peau_sensible", family: FAMILLE_PEAU },
  { key: "peau_normale", family: FAMILLE_PEAU },
  { key: "imperfections", family: FAMILLE_PREOCCUPATION },
  { key: "eclat", family: FAMILLE_PREOCCUPATION },
  { key: "hydratation", family: FAMILLE_PREOCCUPATION },
  { key: "anti_age", family: FAMILLE_PREOCCUPATION },
  { key: "apaisant", family: FAMILLE_PREOCCUPATION },
  { key: "taches", family: FAMILLE_PREOCCUPATION },
];

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
    assert.deepEqual(parseFacettes({}, VOCABULAIRE_TEST), { peau: [], preoccupation: [] });
  });

  it("lit les deux familles séparément — pas une liste mélangée", () => {
    const selection = parseFacettes({ peau: "grasse,mixte", preoccupation: "taches" }, VOCABULAIRE_TEST);
    assert.deepEqual(selection, { peau: ["grasse", "mixte"], preoccupation: ["taches"] });
  });

  it("déduplique une clé répétée dans une même famille", () => {
    const selection = parseFacettes({ peau: "grasse,grasse,mixte" }, VOCABULAIRE_TEST);
    assert.deepEqual(selection.peau, ["grasse", "mixte"]);
  });

  it("ignore les entrées vides sans lever d'erreur", () => {
    const selection = parseFacettes({ peau: "grasse,,  ,mixte" }, VOCABULAIRE_TEST);
    assert.deepEqual(selection.peau, ["grasse", "mixte"]);
  });

  it("une clé inconnue n'est jamais une erreur — elle reste simplement dans la liste", () => {
    // Aucune validation contre un vocabulaire connu (voir la doctrine de
    // `parseBrands`) : une clé absurde ne fait correspondre aucun produit en
    // aval, ce qui affiche un rayon vide plutôt qu'un 500.
    assert.doesNotThrow(() => parseFacettes({ peau: "clé-qui-n-existe-pas" }, VOCABULAIRE_TEST));
    const selection = parseFacettes({ peau: "clé-qui-n-existe-pas" }, VOCABULAIRE_TEST);
    assert.deepEqual(selection.peau, ["clé-qui-n-existe-pas"]);
  });

  describe("compatibilité ?besoin= — routé depuis le VOCABULAIRE RÉEL, pas une liste figée", () => {
    it("traduit un besoin de type de peau dans la famille peau", () => {
      const selection = parseFacettes({ besoin: "peau_grasse" }, VOCABULAIRE_TEST);
      assert.deepEqual(selection, { peau: ["peau_grasse"], preoccupation: [] });
    });

    it("traduit un besoin de préoccupation dans la famille préoccupation", () => {
      const selection = parseFacettes({ besoin: "taches" }, VOCABULAIRE_TEST);
      assert.deepEqual(selection, { peau: [], preoccupation: ["taches"] });
    });

    it("un besoin inconnu (lien de diagnostic périmé) est ignoré, pas une erreur", () => {
      const selection = parseFacettes({ besoin: "ancien-tag-retire" }, VOCABULAIRE_TEST);
      assert.deepEqual(selection, { peau: [], preoccupation: [] });
    });

    it("se combine avec des facettes déjà présentes dans l'URL sans les dupliquer", () => {
      const selection = parseFacettes({ peau: "peau_grasse", besoin: "peau_grasse" }, VOCABULAIRE_TEST);
      assert.deepEqual(selection.peau, ["peau_grasse"]);
    });

    it("ajoute le besoin à côté d'une facette déjà cochée de la même famille", () => {
      const selection = parseFacettes({ peau: "peau_mixte", besoin: "peau_grasse" }, VOCABULAIRE_TEST);
      assert.deepEqual(selection.peau.sort(), ["peau_grasse", "peau_mixte"]);
    });

    // Ce sont précisément les trois clés qu'une ancienne liste figée
    // (src/lib/kk/besoins.ts, huit clés) ne connaissait pas alors qu'elles
    // sont administrées et cochables en facette (dix clés) : un `?besoin=`
    // vers l'une d'elles disparaissait en silence, le rayon rendait tout.
    it("route « peau_normale » — absente de l'ancienne liste figée — dans la famille peau", () => {
      const selection = parseFacettes({ besoin: "peau_normale" }, VOCABULAIRE_TEST);
      assert.deepEqual(selection, { peau: ["peau_normale"], preoccupation: [] });
    });

    it("route « anti_age » — absente de l'ancienne liste figée — dans la famille préoccupation", () => {
      const selection = parseFacettes({ besoin: "anti_age" }, VOCABULAIRE_TEST);
      assert.deepEqual(selection, { peau: [], preoccupation: ["anti_age"] });
    });

    it("route « apaisant » — absente de l'ancienne liste figée — dans la famille préoccupation", () => {
      const selection = parseFacettes({ besoin: "apaisant" }, VOCABULAIRE_TEST);
      assert.deepEqual(selection, { peau: [], preoccupation: ["apaisant"] });
    });

    it("une clé retirée du vocabulaire administrable redevient un besoin inconnu, ignoré", () => {
      const vocabulaireSansPeauGrasse = VOCABULAIRE_TEST.filter((v) => v.key !== "peau_grasse");
      const selection = parseFacettes({ besoin: "peau_grasse" }, vocabulaireSansPeauGrasse);
      assert.deepEqual(selection, { peau: [], preoccupation: [] });
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

  describe("plafond — la faute critique relevée en revue", () => {
    // `priceCents` est une colonne Postgres `Int` (32 bits signés). Sans
    // plafond, une borne au-delà de 2 147 483 647 part telle quelle dans le
    // `gte`/`lte` de getCatalog : Prisma lève, et la PAGE DE RAYON ENTIÈRE
    // rend zéro produit — atteignable depuis l'écran, le champ n'avait pas de
    // `max` HTML (voir catalog-filters.tsx, corrigé dans le même lot).
    const INT32_MAX = 2_147_483_647;

    it("plafonne une borne au-delà de l'entier 32 bits signé", () => {
      assert.deepEqual(parsePrix({ prixMax: "9999999999" }), { min: undefined, max: INT32_MAX });
    });

    it("plafonne aussi la borne basse — un prixMin absurde ne doit pas non plus faire lever Prisma", () => {
      assert.deepEqual(parsePrix({ prixMin: "99999999999999" }), { min: INT32_MAX, max: undefined });
    });

    it("ne dépasse jamais le plafond, quelle que soit l'écriture — cas « 1e21 »", () => {
      // `parseInt("1e21", 10)` s'arrête au premier caractère non décimal :
      // le résultat vaut 1, déjà minuscule. Le test verrouille la propriété
      // qui compte, plutôt qu'un détail d'implémentation : quoi qu'il arrive,
      // la borne rendue tient dans un entier 32 bits signé.
      const { max } = parsePrix({ prixMax: "1e21" });
      assert.ok(max === undefined || (Number.isFinite(max) && max <= INT32_MAX));
    });

    it("une borne tout juste au plafond passe sans être altérée", () => {
      assert.deepEqual(parsePrix({ prixMax: String(INT32_MAX) }), { min: undefined, max: INT32_MAX });
    });
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
