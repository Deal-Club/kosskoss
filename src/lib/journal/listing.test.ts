/**
 * Tests du filtrage et du tri de la liste du back-office.
 *
 * Même parti pris que `productListing.ts` : le découpage se fait en mémoire,
 * les volumes concernés ne justifient pas encore un LIMIT/OFFSET. Ce qui est
 * verrouillé ici, c'est la recherche insensible aux accents — « hydratation »
 * doit trouver « Hydratation », et « ete » doit trouver « été ».
 *
 * Lancer avec : npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterAndSortArticles, isJournalSort, type FilterableArticle } from "./listing";
import type { ArticleStatus } from "@/types/journal";

function article(
  slug: string,
  overrides: Partial<FilterableArticle> = {},
): FilterableArticle {
  return {
    slug,
    title: slug,
    status: "published" as ArticleStatus,
    categoryId: "soin",
    authorId: "aline",
    viewCount: 0,
    featured: false,
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

const CORPUS: FilterableArticle[] = [
  article("hydratation-ete", {
    title: "Hydratation en été",
    viewCount: 300,
    publishedAt: new Date("2026-06-01T00:00:00Z"),
  }),
  article("routine-brouillon", {
    title: "Routine du soir",
    status: "draft",
    publishedAt: null,
    // Modifié tout récemment : c'est l'article sur lequel on travaille, il doit
    // remonter en tête malgré l'absence de date de publication.
    updatedAt: new Date("2026-08-10T00:00:00Z"),
    viewCount: 0,
  }),
  article("acne-adulte", {
    title: "Acné adulte",
    categoryId: "problemes",
    authorId: "nadia",
    viewCount: 120,
    publishedAt: new Date("2026-03-01T00:00:00Z"),
  }),
];

describe("isJournalSort", () => {
  it("reconnaît un tri connu", () => {
    assert.equal(isJournalSort("views"), true);
  });

  it("rejette un tri inventé", () => {
    assert.equal(isJournalSort("popularite"), false);
  });
});

describe("filterAndSortArticles — recherche", () => {
  it("rend tout le corpus sans critère", () => {
    assert.equal(filterAndSortArticles(CORPUS, {}).length, 3);
  });

  it("trouve par titre", () => {
    const found = filterAndSortArticles(CORPUS, { query: "Acné" });
    assert.deepEqual(found.map((a) => a.slug), ["acne-adulte"]);
  });

  it("ignore les accents de la requête", () => {
    const found = filterAndSortArticles(CORPUS, { query: "acne" });
    assert.deepEqual(found.map((a) => a.slug), ["acne-adulte"]);
  });

  it("ignore les accents du contenu", () => {
    const found = filterAndSortArticles(CORPUS, { query: "ete" });
    assert.deepEqual(found.map((a) => a.slug), ["hydratation-ete"]);
  });

  it("cherche aussi dans le slug", () => {
    const found = filterAndSortArticles(CORPUS, { query: "routine-brouillon" });
    assert.equal(found.length, 1);
  });

  it("exige que tous les mots soient présents", () => {
    assert.equal(filterAndSortArticles(CORPUS, { query: "hydratation acné" }).length, 0);
  });
});

describe("filterAndSortArticles — filtres", () => {
  it("filtre par statut", () => {
    const found = filterAndSortArticles(CORPUS, { status: "draft" });
    assert.deepEqual(found.map((a) => a.slug), ["routine-brouillon"]);
  });

  it("filtre par catégorie", () => {
    const found = filterAndSortArticles(CORPUS, { categoryId: "problemes" });
    assert.deepEqual(found.map((a) => a.slug), ["acne-adulte"]);
  });

  it("filtre par auteur", () => {
    const found = filterAndSortArticles(CORPUS, { authorId: "nadia" });
    assert.deepEqual(found.map((a) => a.slug), ["acne-adulte"]);
  });

  it("combine les filtres", () => {
    assert.equal(filterAndSortArticles(CORPUS, { status: "draft", authorId: "nadia" }).length, 0);
  });
});

describe("filterAndSortArticles — tri", () => {
  it("classe du plus récent au plus ancien par défaut", () => {
    const sorted = filterAndSortArticles(CORPUS, {});
    assert.deepEqual(sorted.map((a) => a.slug), [
      "routine-brouillon",
      "hydratation-ete",
      "acne-adulte",
    ]);
  });

  it("classe par nombre de vues", () => {
    const sorted = filterAndSortArticles(CORPUS, { sort: "views" });
    assert.deepEqual(sorted.map((a) => a.slug), [
      "hydratation-ete",
      "acne-adulte",
      "routine-brouillon",
    ]);
  });

  it("classe par titre en respectant l'alphabet français", () => {
    const sorted = filterAndSortArticles(CORPUS, { sort: "title" });
    assert.deepEqual(sorted.map((a) => a.slug), [
      "acne-adulte",
      "hydratation-ete",
      "routine-brouillon",
    ]);
  });

  it("ne modifie pas le tableau reçu", () => {
    const copy = [...CORPUS];
    filterAndSortArticles(CORPUS, { sort: "views" });
    assert.deepEqual(CORPUS, copy);
  });
});
