/**
 * Tests du normalisateur de blocs.
 *
 * Ce module est la frontière entre le navigateur et la base : tout ce qui
 * finira dans un article publié passe par lui. Les cas couverts sont donc ceux
 * qui font des dégâts — un `kind` inventé, une adresse hostile dans un lien,
 * une URL libre glissée là où on n'attend qu'un identifiant de vidéo, un
 * copier-coller de plusieurs mégaoctets.
 *
 * Lancer avec : npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BLOCK_LIMITS, normalizeBlocks, parseStoredBlocks, serializeBlocks } from "./blocks";
import type { JournalBlock } from "@/types/journal";

/** Raccourci : normalise et exige le succès, en rapportant l'erreur sinon. */
function accepted(raw: unknown): JournalBlock[] {
  const result = normalizeBlocks(raw);
  assert.equal(result.ok, true, result.ok ? "" : `refusé à tort : ${result.error}`);
  return result.ok ? result.blocks : [];
}

/** Raccourci : normalise et exige le refus. */
function rejected(raw: unknown): string {
  const result = normalizeBlocks(raw);
  assert.equal(result.ok, false, "accepté à tort");
  return result.ok ? "" : result.error;
}

describe("normalizeBlocks — blocs valides", () => {
  it("accepte un paragraphe et conserve son texte", () => {
    const blocks = accepted([{ kind: "paragraph", text: "Un **bon** nettoyant." }]);
    assert.deepEqual(blocks, [{ kind: "paragraph", text: "Un **bon** nettoyant." }]);
  });

  it("ramène un niveau de titre inconnu à 2", () => {
    const blocks = accepted([{ kind: "heading", level: 7, text: "Choisir sa routine" }]);
    assert.deepEqual(blocks, [{ kind: "heading", level: 2, text: "Choisir sa routine" }]);
  });

  it("conserve un titre de niveau 3", () => {
    const blocks = accepted([{ kind: "heading", level: 3, text: "Peau mixte" }]);
    assert.equal(blocks[0].kind === "heading" && blocks[0].level, 3);
  });

  it("nettoie les entrées vides d'une liste", () => {
    const blocks = accepted([{ kind: "list", ordered: true, items: ["Nettoyer", "", "  ", "Hydrater"] }]);
    assert.deepEqual(blocks, [{ kind: "list", ordered: true, items: ["Nettoyer", "Hydrater"] }]);
  });

  it("accepte un séparateur sans propriété", () => {
    assert.deepEqual(accepted([{ kind: "divider" }]), [{ kind: "divider" }]);
  });

  it("accepte un tableau et aligne les lignes sur le nombre de colonnes", () => {
    const blocks = accepted([
      { kind: "table", headers: ["Type de peau", "Texture"], rows: [["Grasse", "Gel", "En trop"], ["Sèche"]] },
    ]);
    assert.deepEqual(blocks, [
      { kind: "table", headers: ["Type de peau", "Texture"], rows: [["Grasse", "Gel"], ["Sèche", ""]] },
    ]);
  });
});

describe("normalizeBlocks — refus", () => {
  it("refuse un tableau de blocs qui n'en est pas un", () => {
    assert.match(rejected({ kind: "paragraph" }), /liste/i);
  });

  it("refuse un kind inconnu", () => {
    assert.match(rejected([{ kind: "iframe", src: "https://exemple.tld" }]), /iframe/);
  });

  it("refuse un paragraphe trop long", () => {
    const text = "a".repeat(BLOCK_LIMITS.text + 1);
    assert.match(rejected([{ kind: "paragraph", text }]), /trop long|dépasse/i);
  });

  it("refuse plus de blocs que la limite", () => {
    const many = Array.from({ length: BLOCK_LIMITS.blocks + 1 }, () => ({ kind: "divider" }));
    assert.match(rejected(many), /blocs/i);
  });

  it("refuse une image sans texte alternatif", () => {
    assert.match(rejected([{ kind: "image", src: "/images/soin.jpg", alt: "", caption: "" }]), /alternatif/i);
  });

  it("refuse une image dont la source n'est ni un chemin interne ni une URL https", () => {
    assert.match(
      rejected([{ kind: "image", src: "javascript:alert(1)", alt: "Soin", caption: "" }]),
      /source|adresse/i,
    );
  });
});

describe("normalizeBlocks — liens", () => {
  it("refuse un appel à l'action pointant vers javascript:", () => {
    assert.match(
      rejected([{ kind: "cta", title: "", text: "", href: "javascript:alert(1)", label: "Voir" }]),
      /adresse|lien/i,
    );
  });

  it("refuse un appel à l'action vers un site externe déguisé", () => {
    assert.match(
      rejected([{ kind: "cta", title: "", text: "", href: "//evil.tld", label: "Voir" }]),
      /adresse|lien/i,
    );
  });

  it("accepte un appel à l'action vers une page interne", () => {
    const blocks = accepted([{ kind: "cta", title: "", text: "", href: "/diagnostic", label: "Faire le diagnostic" }]);
    assert.equal(blocks[0].kind === "cta" && blocks[0].href, "/diagnostic");
  });
});

describe("normalizeBlocks — vidéo", () => {
  it("refuse une URL complète en guise d'identifiant", () => {
    assert.match(
      rejected([{ kind: "video", provider: "youtube", videoId: "https://youtube.com/watch?v=abc", title: "" }]),
      /identifiant/i,
    );
  });

  it("refuse un fournisseur inconnu", () => {
    assert.match(rejected([{ kind: "video", provider: "tiktok", videoId: "abc123", title: "" }]), /fournisseur/i);
  });

  it("accepte un identifiant YouTube", () => {
    const blocks = accepted([{ kind: "video", provider: "youtube", videoId: "dQw4w9WgXcQ", title: "Routine" }]);
    assert.equal(blocks[0].kind === "video" && blocks[0].videoId, "dQw4w9WgXcQ");
  });
});

describe("normalizeBlocks — encadrés et produits", () => {
  it("ramène une tonalité inconnue à « info »", () => {
    const blocks = accepted([{ kind: "callout", tone: "panique", title: "À savoir", text: "Testez le produit." }]);
    assert.equal(blocks[0].kind === "callout" && blocks[0].tone, "info");
  });

  it("assainit les slugs produits et retire les doublons", () => {
    const blocks = accepted([
      { kind: "productCard", title: "Notre sélection", slugs: ["Sérum Éclat", "serum-eclat", ""] },
    ]);
    assert.deepEqual(blocks[0].kind === "productCard" ? blocks[0].slugs : [], ["serum-eclat"]);
  });

  it("refuse un bloc produits sans aucun slug", () => {
    assert.match(rejected([{ kind: "productCard", title: "", slugs: [] }]), /produit/i);
  });
});

describe("parseStoredBlocks — tolérance à la lecture", () => {
  it("rend une liste vide sur un JSON illisible", () => {
    assert.deepEqual(parseStoredBlocks("{pas du json"), []);
  });

  it("rend une liste vide sur une chaîne vide", () => {
    assert.deepEqual(parseStoredBlocks(""), []);
  });

  it("ignore un bloc devenu inconnu sans perdre les autres", () => {
    const stored = JSON.stringify([
      { kind: "paragraph", text: "Avant" },
      { kind: "bloc-retire-en-v3", text: "Perdu" },
      { kind: "paragraph", text: "Après" },
    ]);
    assert.deepEqual(parseStoredBlocks(stored), [
      { kind: "paragraph", text: "Avant" },
      { kind: "paragraph", text: "Après" },
    ]);
  });

  it("relit ce que serializeBlocks a écrit", () => {
    const blocks: JournalBlock[] = [
      { kind: "heading", level: 2, text: "Nettoyer" },
      { kind: "paragraph", text: "Matin et soir." },
    ];
    assert.deepEqual(parseStoredBlocks(serializeBlocks(blocks)), blocks);
  });
});
