/**
 * Tests du contrôle des pages légales soumises par l'administration.
 *
 * L'enjeu : ce contrôle est la dernière barrière avant que du contenu saisi
 * dans un navigateur ne devienne une page juridique publique. On vérifie donc
 * ce qui est refusé autant que ce qui est accepté.
 *
 * Lancer avec : npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { frLegalPages } from "@/content/legal/fr";
import {
  isIsoDate,
  normalizeLegalPage,
  parseStoredLegalPage,
  toLegalPageInput,
  type LegalPageInput,
} from "./legalPageInput";

function validInput(overrides: Partial<LegalPageInput> = {}): LegalPageInput {
  return {
    title: "Mentions légales",
    intro: "Informations sur l'éditeur prévues à l'article 6 III de la LCEN.",
    sections: [
      {
        heading: "Éditeur du site",
        body: "Cette boutique en ligne est éditée par :",
        list: ["MLC Bois SAS", "12 rue de la Scierie"],
      },
    ],
    updatedAt: "2026-07-28",
    ...overrides,
  };
}

describe("normalizeLegalPage — contenu accepté", () => {
  it("accepte une page complète et lui rend son slug", () => {
    const result = normalizeLegalPage(validInput(), "mentions-legales");
    assert.ok(result.ok);
    assert.equal(result.page.slug, "mentions-legales");
    assert.equal(result.page.title, "Mentions légales");
    assert.deepEqual(result.page.sections[0].list, ["MLC Bois SAS", "12 rue de la Scierie"]);
  });

  it("omet le chapeau quand il est vide plutôt que d'afficher un encadré vide", () => {
    const result = normalizeLegalPage(validInput({ intro: "   " }), "contact");
    assert.ok(result.ok);
    assert.equal(result.page.intro, undefined);
  });

  it("omet la liste quand elle ne contient que des entrées vides", () => {
    const result = normalizeLegalPage(
      validInput({ sections: [{ heading: "Titre", body: "Texte", list: ["", "  "] }] }),
      "cgv",
    );
    assert.ok(result.ok);
    assert.equal(result.page.sections[0].list, undefined);
  });

  it("accepte une section qui ne porte qu'une liste", () => {
    const result = normalizeLegalPage(
      validInput({ sections: [{ heading: "Contact", body: "", list: ["Téléphone : 01 23 45 67 89"] }] }),
      "contact",
    );
    assert.ok(result.ok);
    assert.equal(result.page.sections[0].body, "");
  });

  it("retire une section entièrement vide au lieu de refuser l'enregistrement", () => {
    const result = normalizeLegalPage(
      validInput({
        sections: [
          { heading: "Titre", body: "Texte", list: [] },
          { heading: "", body: "", list: [] },
        ],
      }),
      "cgv",
    );
    assert.ok(result.ok);
    assert.equal(result.page.sections.length, 1);
  });

  it("normalise les fins de ligne Windows", () => {
    const result = normalizeLegalPage(
      validInput({ sections: [{ heading: "Titel", body: "Zeile 1\r\nZeile 2", list: [] }] }),
      "cgv",
    );
    assert.ok(result.ok);
    assert.equal(result.page.sections[0].body, "Zeile 1\nZeile 2");
  });

  it("conserve les marques de formatage sans y toucher", () => {
    const body = "Valable **aujourd'hui** seulement, voir les [CGV](/cgv).";
    const result = normalizeLegalPage(
      validInput({ sections: [{ heading: "Offre", body, list: [] }] }),
      "promo" as never,
    );
    assert.ok(result.ok);
    assert.equal(result.page.sections[0].body, body);
  });
});

describe("normalizeLegalPage — contenu refusé", () => {
  const cases: [string, unknown][] = [
    ["un objet absent", null],
    ["une chaîne", "Mentions légales"],
  ];

  for (const [label, raw] of cases) {
    it(`refuse ${label}`, () => {
      const result = normalizeLegalPage(raw, "mentions-legales");
      assert.equal(result.ok, false);
    });
  }

  it("refuse un titre vide", () => {
    const result = normalizeLegalPage(validInput({ title: "  " }), "mentions-legales");
    assert.equal(result.ok, false);
  });

  it("refuse une page sans aucune section", () => {
    const result = normalizeLegalPage(validInput({ sections: [] }), "mentions-legales");
    assert.equal(result.ok, false);
  });

  it("refuse une section sans titre mais avec du texte", () => {
    const result = normalizeLegalPage(
      validInput({ sections: [{ heading: "", body: "Texte", list: [] }] }),
      "mentions-legales",
    );
    assert.equal(result.ok, false);
  });

  it("refuse une date mal formée ou inexistante", () => {
    assert.equal(normalizeLegalPage(validInput({ updatedAt: "28.07.2026" }), "cgv").ok, false);
    assert.equal(normalizeLegalPage(validInput({ updatedAt: "2026-02-31" }), "cgv").ok, false);
    assert.equal(normalizeLegalPage(validInput({ updatedAt: "" }), "cgv").ok, false);
  });

  it("refuse un titre démesuré", () => {
    const result = normalizeLegalPage(validInput({ title: "x".repeat(201) }), "cgv");
    assert.equal(result.ok, false);
  });
});

describe("isIsoDate", () => {
  it("accepte une date réelle", () => {
    assert.ok(isIsoDate("2026-07-28"));
    assert.ok(isIsoDate("2024-02-29"));
  });

  it("refuse une date impossible", () => {
    assert.equal(isIsoDate("2026-13-01"), false);
    assert.equal(isIsoDate("2025-02-29"), false);
    assert.equal(isIsoDate("2026-7-8"), false);
  });
});

describe("aller-retour formulaire ↔ page", () => {
  it("ne modifie pas le contenu d'origine français", () => {
    for (const page of Object.values(frLegalPages)) {
      const result = normalizeLegalPage(toLegalPageInput(page), page.slug);
      assert.ok(result.ok, `${page.slug} devrait rester valide`);
      assert.deepEqual(result.page, page, `${page.slug} a été altéré par l'aller-retour`);
    }
  });
});

describe("parseStoredLegalPage", () => {
  it("relit un contenu stocké", () => {
    const stored = JSON.stringify(frLegalPages["mentions-legales"]);
    assert.deepEqual(parseStoredLegalPage(stored, "mentions-legales"), frLegalPages["mentions-legales"]);
  });

  it("rend null sur un JSON cassé plutôt que de lever", () => {
    assert.equal(parseStoredLegalPage("{ pas du json", "mentions-legales"), null);
  });

  it("rend null sur un contenu qui ne passe plus le contrôle", () => {
    assert.equal(parseStoredLegalPage(JSON.stringify({ title: "" }), "mentions-legales"), null);
  });
});
