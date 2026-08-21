import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  identifiantGa4Valide,
  identifiantPixelValide,
  lienEvaluationValide,
  normaliserParametres,
  numeroWhatsappValide,
  PARAMETRES_PAR_DEFAUT,
} from "./parametres";

describe("numeroWhatsappValide", () => {
  it("accepte un numéro international en chiffres", () => {
    assert.equal(numeroWhatsappValide("237658013646"), true);
  });

  it("accepte le vide : le réglage est facultatif", () => {
    assert.equal(numeroWhatsappValide(""), true);
  });

  it("refuse ce qui n'est pas un numéro", () => {
    // wa.me n'accepte que des chiffres : une lettre produirait un lien mort,
    // et rien ne le signalerait avant qu'un client clique.
    assert.equal(numeroWhatsappValide("appelez-moi"), false);
  });
});

describe("lienEvaluationValide", () => {
  it("accepte une adresse https", () => {
    assert.equal(lienEvaluationValide("https://forms.gle/abc123"), true);
  });

  it("accepte le vide", () => {
    assert.equal(lienEvaluationValide(""), true);
  });

  it("refuse http en clair", () => {
    // Ce lien part au client par WhatsApp : il ne doit pas l'emmener sur une
    // page non chiffrée.
    assert.equal(lienEvaluationValide("http://forms.gle/abc123"), false);
  });

  it("refuse ce qui n'est pas une adresse", () => {
    assert.equal(lienEvaluationValide("forms.gle/abc123"), false);
  });
});

describe("identifiantGa4Valide", () => {
  it("accepte un identifiant de mesure", () => {
    assert.equal(identifiantGa4Valide("G-ABCDE12345"), true);
  });

  it("accepte le vide", () => {
    assert.equal(identifiantGa4Valide(""), true);
  });

  it("refuse un identifiant sans le préfixe", () => {
    // Une mesure qui ne remonte pas ne se signale jamais d'elle-même : c'est
    // la faute de frappe qu'il faut attraper ici, pas l'existence du compte.
    assert.equal(identifiantGa4Valide("ABCDE12345"), false);
  });
});

describe("identifiantPixelValide", () => {
  it("accepte une suite de chiffres", () => {
    assert.equal(identifiantPixelValide("123456789012345"), true);
  });

  it("accepte le vide", () => {
    assert.equal(identifiantPixelValide(""), true);
  });

  it("refuse une valeur non numérique", () => {
    assert.equal(identifiantPixelValide("pixel-1"), false);
  });
});

describe("normaliserParametres", () => {
  it("relit ce qui a été écrit", () => {
    const source = {
      whatsapp: "237658013646",
      formulaireEvaluation: "https://forms.gle/abc123",
      ga4: "G-ABCDE12345",
      metaPixel: "123456789012345",
    };
    assert.deepEqual(normaliserParametres(source), source);
  });

  it("rogne les valeurs", () => {
    // Un identifiant stocké avec une espace ne correspondrait à rien, sans la
    // moindre erreur nulle part.
    const rendu = normaliserParametres({ ga4: "  G-ABCDE12345  " });
    assert.equal(rendu.ga4, "G-ABCDE12345");
  });

  it("ne garde que les chiffres du numéro", () => {
    assert.equal(normaliserParametres({ whatsapp: "+237 658 01 36 46" }).whatsapp, "237658013646");
  });

  it("rend les valeurs par défaut sur une entrée absente", () => {
    assert.deepEqual(normaliserParametres(null), PARAMETRES_PAR_DEFAUT);
    assert.deepEqual(normaliserParametres(undefined), PARAMETRES_PAR_DEFAUT);
  });

  it("rend les valeurs par défaut sur une entrée qui n'est pas un objet", () => {
    // Une colonne abîmée ne doit pas faire tomber une page.
    assert.deepEqual(normaliserParametres("cassé"), PARAMETRES_PAR_DEFAUT);
    assert.deepEqual(normaliserParametres(42), PARAMETRES_PAR_DEFAUT);
  });

  it("écarte les champs qui ne sont pas des chaînes", () => {
    assert.deepEqual(normaliserParametres({ ga4: 42, metaPixel: null }), PARAMETRES_PAR_DEFAUT);
  });

  it("complète les champs manquants sans perdre les autres", () => {
    const rendu = normaliserParametres({ whatsapp: "237658013646" });
    assert.equal(rendu.whatsapp, "237658013646");
    assert.equal(rendu.ga4, "");
  });
});
