/**
 * Tests du choix des articles similaires.
 *
 * Le classement est explicite plutôt que confié à la base : un « même
 * catégorie, ordre chronologique » remonte toujours les mêmes trois articles
 * en bas de tous les articles d'une catégorie. Les tags communs pèsent donc
 * plus lourd que la catégorie, et la récence ne sert qu'à départager.
 *
 * Lancer avec : npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickRelated, type RelatedCandidate } from "./related";

const JANVIER = new Date("2026-01-01T00:00:00Z");
const JUIN = new Date("2026-06-01T00:00:00Z");
const AOUT = new Date("2026-08-01T00:00:00Z");

const COURANT = { id: "a1", categoryId: "soin", tagIds: ["hydratation", "peau-seche"] };

function candidate(
  id: string,
  categoryId: string,
  tagIds: string[],
  publishedAt: Date,
): RelatedCandidate {
  return { id, categoryId, tagIds, publishedAt };
}

describe("pickRelated", () => {
  it("n'inclut jamais l'article consulté", () => {
    const result = pickRelated(COURANT, [candidate("a1", "soin", ["hydratation"], AOUT)], 3);
    assert.deepEqual(result, []);
  });

  it("préfère deux tags communs à un seul", () => {
    const result = pickRelated(
      COURANT,
      [
        candidate("un-tag", "autre", ["hydratation"], AOUT),
        candidate("deux-tags", "autre", ["hydratation", "peau-seche"], JANVIER),
      ],
      1,
    );
    assert.deepEqual(
      result.map((entry) => entry.id),
      ["deux-tags"],
    );
  });

  it("préfère un tag commun à la seule catégorie commune", () => {
    const result = pickRelated(
      COURANT,
      [
        candidate("meme-categorie", "soin", [], AOUT),
        candidate("meme-tag", "autre", ["hydratation"], JANVIER),
      ],
      1,
    );
    assert.deepEqual(
      result.map((entry) => entry.id),
      ["meme-tag"],
    );
  });

  it("départage deux scores égaux par la récence", () => {
    const result = pickRelated(
      COURANT,
      [
        candidate("ancien", "soin", ["hydratation"], JANVIER),
        candidate("recent", "soin", ["hydratation"], AOUT),
        candidate("median", "soin", ["hydratation"], JUIN),
      ],
      3,
    );
    assert.deepEqual(
      result.map((entry) => entry.id),
      ["recent", "median", "ancien"],
    );
  });

  it("respecte la limite demandée", () => {
    const result = pickRelated(
      COURANT,
      [
        candidate("b", "soin", ["hydratation"], AOUT),
        candidate("c", "soin", ["hydratation"], JUIN),
        candidate("d", "soin", ["hydratation"], JANVIER),
      ],
      2,
    );
    assert.equal(result.length, 2);
  });

  it("complète avec les articles récents quand rien ne correspond", () => {
    const result = pickRelated(
      COURANT,
      [
        candidate("sans-rapport-ancien", "maquillage", ["rouge-a-levres"], JANVIER),
        candidate("sans-rapport-recent", "maquillage", ["vernis"], AOUT),
      ],
      2,
    );
    assert.deepEqual(
      result.map((entry) => entry.id),
      ["sans-rapport-recent", "sans-rapport-ancien"],
    );
  });

  it("rend une liste vide sans candidat", () => {
    assert.deepEqual(pickRelated(COURANT, [], 3), []);
  });
});
