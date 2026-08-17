/**
 * Tests du cycle de vie d'un article.
 *
 * Deux mécanismes protègent la publication programmée, et ils sont testés
 * séparément : la tâche planifiée qui bascule les articles à l'heure dite, et
 * le filtre de lecture qui, lui, ne sert jamais un article dont l'heure n'est
 * pas venue — même si la tâche n'a pas tourné.
 *
 * Lancer avec : npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dueForPublication, isPubliclyVisible, resolvePublication } from "./status";

const NOW = new Date("2026-08-17T10:00:00Z");
const HIER = new Date("2026-08-16T10:00:00Z");
const DEMAIN = new Date("2026-08-18T10:00:00Z");

describe("isPubliclyVisible", () => {
  it("sert un article publié dans le passé", () => {
    assert.equal(
      isPubliclyVisible({ status: "published", publishedAt: HIER, deletedAt: null }, NOW),
      true,
    );
  });

  it("ne sert pas un brouillon", () => {
    assert.equal(isPubliclyVisible({ status: "draft", publishedAt: HIER, deletedAt: null }, NOW), false);
  });

  it("ne sert pas un article archivé", () => {
    assert.equal(
      isPubliclyVisible({ status: "archived", publishedAt: HIER, deletedAt: null }, NOW),
      false,
    );
  });

  it("ne sert pas un article à la corbeille", () => {
    assert.equal(
      isPubliclyVisible({ status: "published", publishedAt: HIER, deletedAt: HIER }, NOW),
      false,
    );
  });

  it("ne sert pas un article publié dont la date est dans le futur", () => {
    assert.equal(
      isPubliclyVisible({ status: "published", publishedAt: DEMAIN, deletedAt: null }, NOW),
      false,
    );
  });

  it("ne sert pas un article publié sans date", () => {
    assert.equal(
      isPubliclyVisible({ status: "published", publishedAt: null, deletedAt: null }, NOW),
      false,
    );
  });
});

describe("dueForPublication", () => {
  it("retient un article programmé dont l'heure est passée", () => {
    assert.equal(dueForPublication({ status: "scheduled", scheduledAt: HIER }, NOW), true);
  });

  it("ignore un article programmé pour plus tard", () => {
    assert.equal(dueForPublication({ status: "scheduled", scheduledAt: DEMAIN }, NOW), false);
  });

  it("ignore un brouillon, même daté dans le passé", () => {
    assert.equal(dueForPublication({ status: "draft", scheduledAt: HIER }, NOW), false);
  });

  it("ignore un article programmé sans date", () => {
    assert.equal(dueForPublication({ status: "scheduled", scheduledAt: null }, NOW), false);
  });
});

describe("resolvePublication — passage en publié", () => {
  it("date la publication de maintenant si aucune date n'est fournie", () => {
    const result = resolvePublication(
      { status: "published", scheduledAt: null, publishedAt: null },
      NOW,
    );
    assert.deepEqual(result, { status: "published", publishedAt: NOW, scheduledAt: null });
  });

  it("conserve une date de publication déjà posée", () => {
    const result = resolvePublication(
      { status: "published", scheduledAt: null, publishedAt: HIER },
      NOW,
    );
    assert.equal(result.publishedAt?.toISOString(), HIER.toISOString());
  });

  it("efface la date de programmation devenue inutile", () => {
    const result = resolvePublication(
      { status: "published", scheduledAt: DEMAIN, publishedAt: HIER },
      NOW,
    );
    assert.equal(result.scheduledAt, null);
  });
});

describe("resolvePublication — programmation", () => {
  it("garde le statut programmé pour une date future", () => {
    const result = resolvePublication(
      { status: "scheduled", scheduledAt: DEMAIN, publishedAt: null },
      NOW,
    );
    assert.equal(result.status, "scheduled");
    assert.equal(result.publishedAt, null);
  });

  it("publie immédiatement une programmation dans le passé", () => {
    const result = resolvePublication(
      { status: "scheduled", scheduledAt: HIER, publishedAt: null },
      NOW,
    );
    assert.equal(result.status, "published");
    assert.equal(result.publishedAt?.toISOString(), HIER.toISOString());
    assert.equal(result.scheduledAt, null);
  });

  it("retombe en brouillon si aucune date n'est donnée", () => {
    const result = resolvePublication(
      { status: "scheduled", scheduledAt: null, publishedAt: null },
      NOW,
    );
    assert.equal(result.status, "draft");
  });
});

describe("resolvePublication — retour en arrière", () => {
  it("efface la date de publication quand on repasse en brouillon", () => {
    const result = resolvePublication(
      { status: "draft", scheduledAt: null, publishedAt: HIER },
      NOW,
    );
    assert.equal(result.publishedAt, null);
  });

  it("conserve la date de publication d'un article archivé", () => {
    const result = resolvePublication(
      { status: "archived", scheduledAt: null, publishedAt: HIER },
      NOW,
    );
    assert.equal(result.publishedAt?.toISOString(), HIER.toISOString());
  });
});
