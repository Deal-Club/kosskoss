/**
 * Tests des replis SEO.
 *
 * Un rédacteur ne remplit presque jamais les douze champs SEO d'un article.
 * Ce qui compte n'est donc pas de les stocker mais de décider proprement ce
 * qui est servi quand ils sont vides — une seule fois, dans une fonction pure,
 * plutôt que dispersé dans chaque composant.
 *
 * Lancer avec : npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveArticleSeo, type ArticleSeoSource } from "./seo";

const BASE: ArticleSeoSource = {
  title: "Choisir son nettoyant",
  excerpt: "Trois critères suffisent pour ne plus se tromper de nettoyant.",
  coverImage: "https://res.cloudinary.com/demo/couverture.jpg",
  metaTitle: "",
  metaDescription: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: "",
  canonicalUrl: "",
  robotsNoindex: false,
};

const OPTIONS = { brandName: "KossKoss Select", canonical: "https://kosskoss.example/journal/choisir-son-nettoyant" };

describe("resolveArticleSeo — replis", () => {
  it("compose le titre à partir du titre de l'article et de la marque", () => {
    assert.equal(resolveArticleSeo(BASE, OPTIONS).title, "Choisir son nettoyant — KossKoss Select");
  });

  it("préfère le meta title quand il est renseigné", () => {
    const seo = resolveArticleSeo({ ...BASE, metaTitle: "Nettoyant : le guide" }, OPTIONS);
    assert.equal(seo.title, "Nettoyant : le guide");
  });

  it("retombe sur le chapeau pour la description", () => {
    assert.equal(resolveArticleSeo(BASE, OPTIONS).description, BASE.excerpt);
  });

  it("retombe sur le meta title pour Open Graph", () => {
    assert.equal(resolveArticleSeo(BASE, OPTIONS).ogTitle, "Choisir son nettoyant — KossKoss Select");
  });

  it("retombe sur l'image de couverture pour Open Graph", () => {
    assert.equal(resolveArticleSeo(BASE, OPTIONS).ogImage, BASE.coverImage);
  });

  it("retombe sur Open Graph pour Twitter", () => {
    const seo = resolveArticleSeo({ ...BASE, ogTitle: "Titre social" }, OPTIONS);
    assert.equal(seo.twitterTitle, "Titre social");
  });

  it("respecte une image Twitter propre", () => {
    const seo = resolveArticleSeo({ ...BASE, twitterImage: "https://res.cloudinary.com/demo/x.jpg" }, OPTIONS);
    assert.equal(seo.twitterImage, "https://res.cloudinary.com/demo/x.jpg");
  });
});

describe("resolveArticleSeo — canonique et robots", () => {
  it("utilise l'URL canonique calculée par défaut", () => {
    assert.equal(resolveArticleSeo(BASE, OPTIONS).canonical, OPTIONS.canonical);
  });

  it("respecte une canonique saisie à la main", () => {
    const seo = resolveArticleSeo({ ...BASE, canonicalUrl: "https://ailleurs.tld/article" }, OPTIONS);
    assert.equal(seo.canonical, "https://ailleurs.tld/article");
  });

  it("ignore une canonique qui n'est pas une adresse http", () => {
    const seo = resolveArticleSeo({ ...BASE, canonicalUrl: "javascript:alert(1)" }, OPTIONS);
    assert.equal(seo.canonical, OPTIONS.canonical);
  });

  it("laisse l'article indexable par défaut", () => {
    assert.equal(resolveArticleSeo(BASE, OPTIONS).noindex, false);
  });

  it("respecte la case « ne pas indexer »", () => {
    assert.equal(resolveArticleSeo({ ...BASE, robotsNoindex: true }, OPTIONS).noindex, true);
  });
});

describe("resolveArticleSeo — hygiène", () => {
  it("ne double pas la marque quand le titre la contient déjà", () => {
    const seo = resolveArticleSeo({ ...BASE, title: "Le guide KossKoss Select" }, OPTIONS);
    assert.equal(seo.title, "Le guide KossKoss Select");
  });

  it("rend une description vide plutôt qu'un texte inventé", () => {
    const seo = resolveArticleSeo({ ...BASE, excerpt: "" }, OPTIONS);
    assert.equal(seo.description, "");
  });
});
