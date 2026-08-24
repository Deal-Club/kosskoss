import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BESOINS_ROUTINES,
  grouperParBesoin,
  libelleBesoinRoutine,
  ordonnerParNiveau,
} from "./besoins-routines";

function routine(besoinTag: string, niveau = "eco", nom = "R") {
  return { besoinTag, niveau, nom };
}

describe("BESOINS_ROUTINES", () => {
  it("couvre les sept besoins du master", () => {
    assert.deepEqual(
      BESOINS_ROUTINES.map((b) => b.tag),
      ["taches", "imperfections", "eclat", "hydratation", "anti_age", "sensibilite", "homme"],
    );
  });

  it("donne à chaque besoin un libellé dans les deux langues", () => {
    for (const besoin of BESOINS_ROUTINES) {
      assert.ok(besoin.label.trim().length > 0, besoin.tag);
      assert.ok(besoin.labelEn.trim().length > 0, besoin.tag);
    }
  });
});

describe("libelleBesoinRoutine", () => {
  it("rend l'anglais sous /en", () => {
    assert.equal(libelleBesoinRoutine(BESOINS_ROUTINES[0], "en"), "Dark spots & tone");
  });

  it("rend le français partout ailleurs", () => {
    assert.equal(libelleBesoinRoutine(BESOINS_ROUTINES[0], "fr"), "Taches & teint");
  });

  it("retombe sur le français quand la traduction est vide", () => {
    // Un libellé vide afficherait un intertitre sans titre : le repli est la
    // même règle que partout ailleurs dans la boutique.
    const sansAnglais = { tag: "x", label: "Besoin", labelEn: "   " };
    assert.equal(libelleBesoinRoutine(sansAnglais, "en"), "Besoin");
  });
});

describe("grouperParBesoin", () => {
  it("groupe dans l'ordre du registre, pas dans l'ordre reçu", () => {
    // L'ordre suit le questionnaire du client, pas l'alphabet ni la base.
    const groupes = grouperParBesoin([
      routine("homme"),
      routine("taches"),
      routine("eclat"),
    ]);
    assert.deepEqual(
      groupes.map((g) => g.besoin.tag),
      ["taches", "eclat", "homme"],
    );
  });

  it("réunit les deux niveaux d'un même besoin", () => {
    const groupes = grouperParBesoin([
      routine("taches", "eco"),
      routine("taches", "premium"),
    ]);
    assert.equal(groupes.length, 1);
    assert.equal(groupes[0].routines.length, 2);
  });

  it("n'ouvre aucun groupe pour un besoin sans routine", () => {
    // Un intertitre suivi du vide se lit comme une panne d'affichage.
    const groupes = grouperParBesoin([routine("taches")]);
    assert.equal(groupes.length, 1);
  });

  it("garde une routine dont le besoin est inconnu du registre", () => {
    // Le jour où le client ajoute un huitième besoin, ses routines doivent
    // s'afficher mal nommées plutôt que disparaître sans bruit.
    const groupes = grouperParBesoin([routine("taches"), routine("besoin_futur")]);
    assert.deepEqual(
      groupes.map((g) => g.besoin.tag),
      ["taches", "besoin_futur"],
    );
    assert.equal(groupes[1].besoin.label, "besoin_futur");
  });

  it("place les besoins inconnus APRÈS les sept connus", () => {
    const groupes = grouperParBesoin([routine("besoin_futur"), routine("homme")]);
    assert.deepEqual(
      groupes.map((g) => g.besoin.tag),
      ["homme", "besoin_futur"],
    );
  });

  it("rend une liste vide sans routine", () => {
    assert.deepEqual(grouperParBesoin([]), []);
  });
});

describe("ordonnerParNiveau", () => {
  it("met l'essentielle avant la premium", () => {
    const ranges = ordonnerParNiveau([
      routine("taches", "premium", "P"),
      routine("taches", "eco", "E"),
    ]);
    assert.deepEqual(ranges.map((r) => r.nom), ["E", "P"]);
  });

  it("range après les deux un niveau inattendu, sans l'écarter", () => {
    const ranges = ordonnerParNiveau([
      routine("taches", "decouverte", "D"),
      routine("taches", "premium", "P"),
      routine("taches", "eco", "E"),
    ]);
    assert.deepEqual(ranges.map((r) => r.nom), ["E", "P", "D"]);
  });

  it("ne modifie pas la liste reçue", () => {
    const source = [routine("taches", "premium", "P"), routine("taches", "eco", "E")];
    ordonnerParNiveau(source);
    assert.deepEqual(source.map((r) => r.nom), ["P", "E"]);
  });
});
