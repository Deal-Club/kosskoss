/**
 * Tests de la normalisation d'un article soumis par le back-office.
 *
 * C'est l'unique porte d'entrée en écriture : tout ce qui finit dans la table
 * `Article` passe par `parseArticleInput`. Les cas couverts sont ceux qui
 * abîment quelque chose — un titre absent, une date illisible, une couverture
 * hostile, un statut inventé, un chapeau qu'on croyait automatique et qui ne
 * l'était pas.
 *
 * Lancer avec : npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseArticleInput } from "./input";

const NOW = new Date("2026-08-17T10:00:00Z");

/** Charge utile minimale acceptable. */
const MINIMAL = {
  title: "Choisir son nettoyant",
  blocks: [{ kind: "paragraph", text: "Trois critères suffisent." }],
};

function accepted(raw: Record<string, unknown>) {
  const result = parseArticleInput({ ...MINIMAL, ...raw }, NOW);
  if (!result.ok) assert.fail(`refusé à tort : ${result.error}`);
  return result.values;
}

function rejected(raw: Record<string, unknown>): string {
  const result = parseArticleInput(raw, NOW);
  if (result.ok) assert.fail("accepté à tort");
  return result.error;
}

describe("parseArticleInput — champs obligatoires", () => {
  it("refuse un corps qui n'est pas un objet", () => {
    assert.match(rejected(null as unknown as Record<string, unknown>), /illisible/i);
  });

  it("refuse un article sans titre", () => {
    assert.match(rejected({ ...MINIMAL, title: "   " }), /titre/i);
  });

  it("refuse un contenu qui n'est pas une liste de blocs", () => {
    assert.match(rejected({ ...MINIMAL, blocks: "du texte" }), /liste/i);
  });

  it("remonte l'erreur du bloc fautif", () => {
    const error = rejected({ ...MINIMAL, blocks: [{ kind: "iframe" }] });
    assert.match(error, /Bloc 1/);
    assert.match(error, /iframe/);
  });
});

describe("parseArticleInput — dérivés", () => {
  it("génère le chapeau quand il est laissé vide", () => {
    const values = accepted({ excerpt: "" });
    assert.equal(values.excerpt, "Trois critères suffisent.");
  });

  it("respecte un chapeau saisi à la main", () => {
    const values = accepted({ excerpt: "Un chapeau écrit par la rédaction." });
    assert.equal(values.excerpt, "Un chapeau écrit par la rédaction.");
  });

  it("calcule le temps de lecture", () => {
    const values = accepted({ blocks: [{ kind: "paragraph", text: "mot ".repeat(400) }] });
    assert.equal(values.readingMinutes, 2);
  });

  it("sérialise les blocs en JSON relisible", () => {
    const values = accepted({});
    assert.deepEqual(JSON.parse(values.blocks), [{ kind: "paragraph", text: "Trois critères suffisent." }]);
  });

  it("laisse les blocs anglais vides quand rien n'est traduit", () => {
    assert.equal(accepted({}).blocksEn, "[]");
  });
});

describe("parseArticleInput — statut et dates", () => {
  it("retient le brouillon par défaut", () => {
    assert.equal(accepted({}).status, "draft");
  });

  it("refuse un statut inventé", () => {
    assert.match(rejected({ ...MINIMAL, status: "en-cours" }), /statut/i);
  });

  it("date la publication à maintenant", () => {
    const values = accepted({ status: "published" });
    assert.equal(values.publishedAt?.toISOString(), NOW.toISOString());
  });

  it("accepte une date de programmation future", () => {
    const values = accepted({ status: "scheduled", scheduledAt: "2026-09-01T09:00:00.000Z" });
    assert.equal(values.status, "scheduled");
    assert.equal(values.scheduledAt?.toISOString(), "2026-09-01T09:00:00.000Z");
  });

  it("publie immédiatement une programmation déjà passée", () => {
    const values = accepted({ status: "scheduled", scheduledAt: "2026-01-01T09:00:00.000Z" });
    assert.equal(values.status, "published");
  });

  it("refuse une date illisible", () => {
    assert.match(rejected({ ...MINIMAL, status: "scheduled", scheduledAt: "bientôt" }), /date/i);
  });
});

describe("parseArticleInput — média et liens", () => {
  it("accepte une couverture hébergée sur Cloudinary", () => {
    const values = accepted({ coverImage: "https://res.cloudinary.com/demo/a.jpg", coverAlt: "Flacon" });
    assert.equal(values.coverImage, "https://res.cloudinary.com/demo/a.jpg");
  });

  it("refuse une couverture avec un protocole hostile", () => {
    assert.match(rejected({ ...MINIMAL, coverImage: "javascript:alert(1)" }), /couverture|adresse/i);
  });

  it("refuse une couverture sans texte alternatif", () => {
    assert.match(
      rejected({ ...MINIMAL, coverImage: "/images/a.jpg", coverAlt: "" }),
      /alternatif/i,
    );
  });

  it("accepte l'absence totale de couverture", () => {
    assert.equal(accepted({ coverImage: "", coverAlt: "" }).coverImage, "");
  });
});

describe("parseArticleInput — organisation", () => {
  it("rend null pour une catégorie non choisie", () => {
    assert.equal(accepted({ categoryId: "" }).categoryId, null);
  });

  it("dédoublonne les tags", () => {
    assert.deepEqual(accepted({ tagIds: ["t1", "t2", "t1"] }).tagIds, ["t1", "t2"]);
  });

  it("ignore les tags vides", () => {
    assert.deepEqual(accepted({ tagIds: ["t1", "", "  "] }).tagIds, ["t1"]);
  });

  it("interprète « à la une » comme un booléen strict", () => {
    assert.equal(accepted({ featured: "oui" }).featured, false);
    assert.equal(accepted({ featured: true }).featured, true);
  });
});

describe("parseArticleInput — SEO", () => {
  it("conserve les champs SEO renseignés", () => {
    const values = accepted({ metaTitle: "Nettoyant : le guide", robotsNoindex: true });
    assert.equal(values.metaTitle, "Nettoyant : le guide");
    assert.equal(values.robotsNoindex, true);
  });

  it("refuse une canonique qui n'est pas une adresse http", () => {
    assert.match(rejected({ ...MINIMAL, canonicalUrl: "javascript:alert(1)" }), /canonique/i);
  });

  it("accepte une canonique vide", () => {
    assert.equal(accepted({ canonicalUrl: "" }).canonicalUrl, "");
  });

  it("refuse un meta title démesuré", () => {
    assert.match(rejected({ ...MINIMAL, metaTitle: "a".repeat(500) }), /dépasse/i);
  });
});
