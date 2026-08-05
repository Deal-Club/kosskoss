import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { normalizeCodeSnippet, splitSnippetForHead } from "./codeSnippetInput";

describe("normalizeCodeSnippet", () => {
  const valide = {
    name: "Google Tag Manager",
    placement: "head",
    content: "<script>console.log(1)</script>",
    enabled: true,
    position: 0,
  };

  it("accepte un fragment complet", () => {
    const resultat = normalizeCodeSnippet(valide);
    assert.equal(resultat.ok, true);
    assert.equal(resultat.ok && resultat.snippet.name, "Google Tag Manager");
  });

  it("refuse un nom vide", () => {
    const resultat = normalizeCodeSnippet({ ...valide, name: "   " });
    assert.equal(resultat.ok, false);
  });

  it("refuse un emplacement inconnu", () => {
    const resultat = normalizeCodeSnippet({ ...valide, placement: "sidebar" });
    assert.equal(resultat.ok, false);
  });

  it("refuse un fragment vide", () => {
    const resultat = normalizeCodeSnippet({ ...valide, content: "\n\n  " });
    assert.equal(resultat.ok, false);
  });

  it("refuse un ordre négatif ou fractionnaire", () => {
    assert.equal(normalizeCodeSnippet({ ...valide, position: -1 }).ok, false);
    assert.equal(normalizeCodeSnippet({ ...valide, position: 1.5 }).ok, false);
  });

  it("ne considère activé que le booléen vrai", () => {
    const resultat = normalizeCodeSnippet({ ...valide, enabled: "oui" });
    assert.equal(resultat.ok && resultat.snippet.enabled, false);
  });
});

describe("splitSnippetForHead", () => {
  it("extrait une balise de vérification et vide le HTML restant", () => {
    const { hoisted, html } = splitSnippetForHead(
      '<meta name="google-site-verification" content="abc123" />',
    );
    assert.equal(hoisted.length, 1);
    assert.deepEqual(hoisted[0], {
      tag: "meta",
      attributes: { name: "google-site-verification", content: "abc123" },
    });
    assert.equal(html, "");
  });

  it("traduit les attributs que React renomme", () => {
    const { hoisted } = splitSnippetForHead(
      '<link rel="preconnect" href="https://x.tld" crossorigin="anonymous" />',
    );
    assert.deepEqual(hoisted[0].attributes, {
      rel: "preconnect",
      href: "https://x.tld",
      crossOrigin: "anonymous",
    });
  });

  it("laisse le script en place et n'extrait que la balise", () => {
    const { hoisted, html } = splitSnippetForHead(
      '<meta name="a" content="b">\n<script>gtag()</script>',
    );
    assert.equal(hoisted.length, 1);
    assert.equal(html, "<script>gtag()</script>");
  });

  it("ne touche pas à une balise dont un attribut n'a pas de guillemets", () => {
    const source = "<meta name=a content=b>";
    const { hoisted, html } = splitSnippetForHead(source);
    assert.equal(hoisted.length, 0);
    assert.equal(html, source);
  });

  it("ne touche pas à une balise sans attribut exploitable", () => {
    const source = "<meta>";
    const { hoisted, html } = splitSnippetForHead(source);
    assert.equal(hoisted.length, 0);
    assert.equal(html, source);
  });

  it("laisse intact un fragment sans balise remontable", () => {
    const source = '<script src="https://x.tld/t.js" async></script>';
    const { hoisted, html } = splitSnippetForHead(source);
    assert.equal(hoisted.length, 0);
    assert.equal(html, source);
  });

  it("extrait plusieurs balises d'un même fragment", () => {
    const { hoisted } = splitSnippetForHead(
      '<meta name="a" content="1"><link rel="dns-prefetch" href="https://y.tld">',
    );
    assert.equal(hoisted.length, 2);
    assert.equal(hoisted[0].tag, "meta");
    assert.equal(hoisted[1].tag, "link");
  });

  it("ne laisse pas une balise mal fermée avaler la suite du fragment", () => {
    const source = '<meta name="a" content="1"<script>vol()</script>';
    const { html } = splitSnippetForHead(source);
    assert.ok(html.includes("<script>vol()</script>"));
  });
});
