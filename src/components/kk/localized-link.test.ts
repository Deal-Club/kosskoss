// src/components/kk/localized-link.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localePrefixOf, withLocale } from "./localized-link";

/**
 * Ce test protège le correctif du lot bilingue : un lien interne écrit en dur
 * (`/panier`, `href={product.href}`…) doit repartir vers `/en/panier` quand la
 * page courante est anglaise, sinon le premier clic depuis `/en` ramène le
 * visiteur en français — c'est exactement le défaut que ce composant corrige.
 */

describe("localePrefixOf", () => {
  it("ne préfixe rien depuis une page française (racine)", () => {
    assert.equal(localePrefixOf("/"), "");
  });

  it("ne préfixe rien depuis une page française profonde", () => {
    assert.equal(localePrefixOf("/soins-visage/creme-riz"), "");
  });

  it("détecte la racine anglaise", () => {
    assert.equal(localePrefixOf("/en"), "/en");
  });

  it("détecte une page anglaise profonde", () => {
    assert.equal(localePrefixOf("/en/soins-visage/creme-riz"), "/en");
  });

  it("ne se laisse pas abuser par un segment qui commence pareil", () => {
    // "/encyclopedie" commence par "en" mais n'est pas "/en" : un préfixe mal
    // borné le prendrait à tort pour la racine anglaise.
    assert.equal(localePrefixOf("/encyclopedie"), "");
  });
});

describe("withLocale", () => {
  it("préfixe un chemin interne sous /en", () => {
    assert.equal(withLocale("/en", "/panier"), "/en/panier");
    assert.equal(withLocale("/en/soins-visage", "/soins-visage/creme-riz"), "/en/soins-visage/creme-riz");
  });

  it("laisse intact un chemin interne à la racine française", () => {
    assert.equal(withLocale("/", "/panier"), "/panier");
    assert.equal(withLocale("/soins-visage", "/soins-visage/creme-riz"), "/soins-visage/creme-riz");
  });

  it("préfixe la racine elle-même", () => {
    assert.equal(withLocale("/en/panier", "/"), "/en");
  });

  it("ne double pas un préfixe déjà écrit en dur", () => {
    assert.equal(withLocale("/en", "/en/panier"), "/en/panier");
    assert.equal(withLocale("/en", "/en"), "/en");
  });

  it("ne touche jamais une URL absolue", () => {
    assert.equal(withLocale("/en", "https://example.com/panier"), "https://example.com/panier");
    assert.equal(withLocale("/en", "http://example.com"), "http://example.com");
  });

  it("ne touche jamais une URL protocole-relative", () => {
    assert.equal(withLocale("/en", "//example.com/panier"), "//example.com/panier");
  });

  it("ne touche jamais une ancre", () => {
    assert.equal(withLocale("/en/journal/article", "#sommaire"), "#sommaire");
  });

  it("ne touche jamais un mailto:", () => {
    assert.equal(withLocale("/en", "mailto:contact@mlc-bois.fr"), "mailto:contact@mlc-bois.fr");
  });

  it("ne touche jamais un tel:", () => {
    assert.equal(withLocale("/en", "tel:+33123456789"), "tel:+33123456789");
  });
});
