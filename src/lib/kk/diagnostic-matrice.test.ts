import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MATRICE,
  MESSAGE_SECURITE,
  besoinDuCodeRoutine,
  conseilEnvironnement,
  conseilTypePeau,
  recommander,
  type Besoin,
} from "./diagnostic-matrice";

// Les cinq préoccupations que Q2 peut désigner, avec les codes attendus du
// master (docx, tableau « Q2 – Priorité »).
const PREOCCUPATIONS: { q2: Besoin; essentielle: string; premium: string }[] = [
  { q2: "taches", essentielle: "TAC-ECO", premium: "TAC-PREM" },
  { q2: "imperfections", essentielle: "IMP-ECO", premium: "IMP-PREM" },
  { q2: "eclat", essentielle: "GLO-ECO", premium: "GLO-PREM" },
  { q2: "hydratation", essentielle: "HYD-ECO", premium: "HYD-PREM" },
  { q2: "anti_age", essentielle: "AGE-ECO", premium: "AGE-PREM" },
];

describe("MATRICE", () => {
  it("porte les sept besoins, chacun avec ses deux codes du master", () => {
    assert.deepEqual(Object.keys(MATRICE).sort(), [
      "anti_age",
      "eclat",
      "homme",
      "hydratation",
      "imperfections",
      "sensibilite",
      "taches",
    ]);
    assert.deepEqual(MATRICE.sensibilite, { essentielle: "BAR-ECO", premium: "BAR-PREM" });
    assert.deepEqual(MATRICE.homme, { essentielle: "HOM-ECO", premium: "HOM-PREM" });
  });

  it("n'a pas deux besoins qui partagent un code de routine", () => {
    const codes = Object.values(MATRICE).flatMap((c) => [c.essentielle, c.premium]);
    assert.equal(new Set(codes).size, codes.length);
  });
});

describe("besoinDuCodeRoutine", () => {
  it("retrouve le besoin des 14 codes du master, dans les deux niveaux", () => {
    const attendu: [string, Besoin][] = [
      ["TAC-ECO", "taches"],
      ["TAC-PREM", "taches"],
      ["IMP-ECO", "imperfections"],
      ["IMP-PREM", "imperfections"],
      ["GLO-ECO", "eclat"],
      ["GLO-PREM", "eclat"],
      ["HYD-ECO", "hydratation"],
      ["HYD-PREM", "hydratation"],
      ["AGE-ECO", "anti_age"],
      ["AGE-PREM", "anti_age"],
      ["BAR-ECO", "sensibilite"],
      ["BAR-PREM", "sensibilite"],
      ["HOM-ECO", "homme"],
      ["HOM-PREM", "homme"],
    ];
    for (const [code, besoin] of attendu) {
      assert.equal(besoinDuCodeRoutine(code), besoin, `${code} devrait donner ${besoin}`);
    }
  });

  it("rend null pour un code qui n'appartient à aucun besoin de la matrice", () => {
    assert.equal(besoinDuCodeRoutine("XYZ-ECO"), null);
    assert.equal(besoinDuCodeRoutine(""), null);
  });

  it("ne confond pas deux codes qui partagent un préfixe partiel", () => {
    // TAC-ECO et TAC-PREM existent ; TAC-ECOLE n'est pas TAC-ECO.
    assert.equal(besoinDuCodeRoutine("TAC-ECOLE"), null);
  });
});

describe("recommander — préoccupation déclarée (Q3 non réactive)", () => {
  for (const { q2, essentielle, premium } of PREOCCUPATIONS) {
    it(`retient « ${q2} » avec le motif « préoccupation »`, () => {
      const resultat = recommander({ q2, q3: "tolerante" });
      assert.equal(resultat.besoin, q2);
      assert.equal(resultat.essentielle, essentielle);
      assert.equal(resultat.premium, premium);
      assert.equal(resultat.motif, "preoccupation");
      assert.equal(resultat.preoccupationDeclaree, q2);
    });
  }

  it("retient aussi la préoccupation quand Q3 est absente", () => {
    const resultat = recommander({ q2: "eclat" });
    assert.equal(resultat.besoin, "eclat");
    assert.equal(resultat.motif, "preoccupation");
  });
});

describe("recommander — la bascule de sécurité prime sur la préoccupation déclarée", () => {
  for (const { q2 } of PREOCCUPATIONS) {
    it(`bascule sur « sensibilite » même si Q2 = « ${q2} »`, () => {
      const resultat = recommander({ q2, q3: "reactive" });
      // La bascule : le besoin retenu est TOUJOURS sensibilite, jamais q2.
      assert.equal(resultat.besoin, "sensibilite");
      assert.equal(resultat.essentielle, "BAR-ECO");
      assert.equal(resultat.premium, "BAR-PREM");
      assert.equal(resultat.motif, "securite");
      // La préoccupation déclarée est conservée, pas effacée : c'est elle qui
      // permet à l'écran de dire "nous traitons d'abord la sensibilité,
      // avant votre préoccupation" plutôt que d'avoir l'air de s'être
      // trompé.
      assert.equal(resultat.preoccupationDeclaree, q2);
    });
  }

  it("bascule même quand Q2 est absente", () => {
    const resultat = recommander({ q3: "reactive" });
    assert.equal(resultat.besoin, "sensibilite");
    assert.equal(resultat.motif, "securite");
    assert.equal(resultat.preoccupationDeclaree, null);
  });

  it("bascule même quand Q2 est inconnue", () => {
    const resultat = recommander({ q2: "quelque_chose_d_inconnu", q3: "reactive" });
    assert.equal(resultat.besoin, "sensibilite");
    assert.equal(resultat.motif, "securite");
    assert.equal(resultat.preoccupationDeclaree, null);
  });
});

describe("recommander — réponses manquantes ou inconnues, sans bascule", () => {
  it("ne recommande rien quand tout est absent", () => {
    const resultat = recommander({});
    assert.deepEqual(resultat, {
      besoin: null,
      essentielle: null,
      premium: null,
      motif: null,
      preoccupationDeclaree: null,
    });
  });

  it("ne recommande rien quand Q2 est une réponse inconnue", () => {
    const resultat = recommander({ q2: "ceci_n_existe_pas" });
    assert.equal(resultat.besoin, null);
    assert.equal(resultat.motif, null);
    assert.equal(resultat.preoccupationDeclaree, null);
  });

  it("ne bascule pas sur une réponse Q3 qui n'est ni reactive ni tolerante", () => {
    // Une valeur de Q3 illisible ne doit jamais se faire passer pour la
    // bascule de sécurité qu'elle n'est pas.
    const resultat = recommander({ q2: "taches", q3: "valeur_bizarre" });
    assert.equal(resultat.besoin, "taches");
    assert.equal(resultat.motif, "preoccupation");
  });
});

describe("conseilTypePeau — textes exacts du document du client (Q1)", () => {
  it("rend le texte exact pour chaque type de peau", () => {
    assert.equal(conseilTypePeau("peau_grasse"), "Textures légères, limiter les produits trop riches");
    assert.equal(conseilTypePeau("peau_mixte"), "Équilibrer sébum + hydratation");
    assert.equal(conseilTypePeau("peau_seche"), "Renforcer confort et hydratation");
    assert.equal(
      conseilTypePeau("peau_normale"),
      "Routine équilibrée, pas de correction particulière",
    );
  });

  it("rend une chaîne vide pour une réponse absente ou inconnue", () => {
    assert.equal(conseilTypePeau(undefined), "");
    assert.equal(conseilTypePeau("peau_extraterrestre"), "");
  });
});

describe("conseilEnvironnement — textes exacts du document du client (Q4)", () => {
  it("rend le texte exact pour chacun des trois environnements", () => {
    assert.equal(
      conseilEnvironnement("climatisation"),
      "la climatisation peut accentuer la déshydratation et les tiraillements. Ne négligez pas l'hydratation, même avec une peau mixte ou grasse.",
    );
    assert.equal(
      conseilEnvironnement("chaleur_humidite"),
      "sous climat chaud et humide, privilégiez des textures légères et conservez votre protection solaire chaque matin.",
    );
    assert.equal(
      conseilEnvironnement("mixte"),
      "votre peau alterne chaleur extérieure et climatisation. L'objectif est de maintenir l'hydratation sans surcharger la peau.",
    );
  });

  it("rend une chaîne vide pour une réponse absente ou inconnue", () => {
    assert.equal(conseilEnvironnement(undefined), "");
    assert.equal(conseilEnvironnement("sous_marin"), "");
  });

  it("ne renvoie jamais le même texte pour deux environnements différents", () => {
    const textes = new Set([
      conseilEnvironnement("climatisation"),
      conseilEnvironnement("chaleur_humidite"),
      conseilEnvironnement("mixte"),
    ]);
    assert.equal(textes.size, 3);
  });
});

describe("MESSAGE_SECURITE", () => {
  it("recopie mot pour mot le message du document du client", () => {
    assert.equal(
      MESSAGE_SECURITE,
      "Votre peau semble réactive. Avant d'intensifier le traitement de votre préoccupation, nous vous recommandons de privilégier une routine courte qui apaise et soutient la barrière cutanée",
    );
  });
});
