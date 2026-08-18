/**
 * Tests du consentement aux traceurs.
 *
 * Ce module décide si un pixel publicitaire se déclenche ou non. Les cas
 * couverts sont donc ceux où une erreur coûte quelque chose : un cookie abîmé
 * ou d'une version inconnue doit faire REDEMANDER le consentement, jamais le
 * supposer acquis. En cas de doute, on ne dépose rien.
 *
 * Lancer avec : npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_VERSION,
  acceptAll,
  allowsCategory,
  customConsent,
  needsDecision,
  parseConsent,
  rejectAll,
  serializeConsent,
} from "./consent";

const MAINTENANT = new Date("2026-08-17T10:00:00Z");

describe("parseConsent — absence et corruption", () => {
  it("rend null quand aucun cookie n'existe", () => {
    assert.equal(parseConsent(undefined), null);
  });

  it("rend null sur une chaîne vide", () => {
    assert.equal(parseConsent(""), null);
  });

  it("rend null sur un cookie illisible", () => {
    assert.equal(parseConsent("oui-merci"), null);
  });

  it("rend null quand il manque un champ", () => {
    assert.equal(parseConsent("1.1.0"), null);
  });

  it("rend null sur un horodatage qui n'est pas un nombre", () => {
    assert.equal(parseConsent("1.1.0.hier"), null);
  });

  it("rend null sur une version inconnue — le consentement est redemandé", () => {
    assert.equal(parseConsent(`${CONSENT_VERSION + 1}.1.1.1755424800`), null);
  });

  it("rend null sur une version antérieure", () => {
    assert.equal(parseConsent("0.1.1.1755424800"), null);
  });
});

describe("parseConsent — lecture", () => {
  it("lit un refus total", () => {
    const consent = parseConsent(`${CONSENT_VERSION}.0.0.1755424800`);
    assert.deepEqual(
      { mesure: consent?.mesure, marketing: consent?.marketing },
      { mesure: false, marketing: false },
    );
  });

  it("lit un accord partiel", () => {
    const consent = parseConsent(`${CONSENT_VERSION}.1.0.1755424800`);
    assert.deepEqual(
      { mesure: consent?.mesure, marketing: consent?.marketing },
      { mesure: true, marketing: false },
    );
  });

  it("restitue la date de décision", () => {
    const consent = parseConsent(`${CONSENT_VERSION}.1.1.1755424800`);
    assert.equal(consent?.decidedAt.getTime(), 1755424800 * 1000);
  });

  it("traite toute valeur autre que « 1 » comme un refus", () => {
    const consent = parseConsent(`${CONSENT_VERSION}.2.x.1755424800`);
    assert.deepEqual(
      { mesure: consent?.mesure, marketing: consent?.marketing },
      { mesure: false, marketing: false },
    );
  });
});

describe("serializeConsent", () => {
  it("produit une valeur relisible par parseConsent", () => {
    const consent = acceptAll(MAINTENANT);
    assert.deepEqual(parseConsent(serializeConsent(consent)), consent);
  });

  it("ne produit aucun caractère interdit dans un cookie", () => {
    const valeur = serializeConsent(customConsent(true, false, MAINTENANT));
    assert.equal(/[;,\s"]/.test(valeur), false, `valeur risquée : ${valeur}`);
  });
});

describe("acceptAll / rejectAll / customConsent", () => {
  it("acceptAll accorde les deux catégories", () => {
    const consent = acceptAll(MAINTENANT);
    assert.deepEqual({ m: consent.mesure, p: consent.marketing }, { m: true, p: true });
  });

  it("rejectAll refuse les deux catégories", () => {
    const consent = rejectAll(MAINTENANT);
    assert.deepEqual({ m: consent.mesure, p: consent.marketing }, { m: false, p: false });
  });

  it("customConsent respecte le détail choisi", () => {
    const consent = customConsent(false, true, MAINTENANT);
    assert.deepEqual({ m: consent.mesure, p: consent.marketing }, { m: false, p: true });
  });
});

describe("allowsCategory", () => {
  it("autorise toujours les cookies nécessaires, même sans décision", () => {
    assert.equal(allowsCategory(null, "necessaire", MAINTENANT), true);
  });

  it("refuse la mesure d'audience tant que rien n'a été décidé", () => {
    assert.equal(allowsCategory(null, "mesure", MAINTENANT), false);
  });

  it("refuse le marketing tant que rien n'a été décidé", () => {
    assert.equal(allowsCategory(null, "marketing", MAINTENANT), false);
  });

  it("autorise la catégorie acceptée", () => {
    assert.equal(allowsCategory(acceptAll(MAINTENANT), "marketing", MAINTENANT), true);
  });

  it("refuse la catégorie non acceptée", () => {
    const consent = customConsent(true, false, MAINTENANT);
    assert.equal(allowsCategory(consent, "marketing", MAINTENANT), false);
  });

  it("refuse tout une fois le consentement périmé", () => {
    const vieux = acceptAll(new Date(MAINTENANT.getTime() - (CONSENT_MAX_AGE_SECONDS + 1) * 1000));
    assert.equal(allowsCategory(vieux, "mesure", MAINTENANT), false);
  });

  it("autorise encore la veille de la péremption", () => {
    const presque = acceptAll(new Date(MAINTENANT.getTime() - (CONSENT_MAX_AGE_SECONDS - 60) * 1000));
    assert.equal(allowsCategory(presque, "mesure", MAINTENANT), true);
  });
});

describe("needsDecision", () => {
  it("demande une décision quand aucun cookie n'existe", () => {
    assert.equal(needsDecision(null, MAINTENANT), true);
  });

  it("ne redemande rien après un refus explicite", () => {
    assert.equal(needsDecision(rejectAll(MAINTENANT), MAINTENANT), false);
  });

  it("redemande une décision après six mois", () => {
    const vieux = acceptAll(new Date(MAINTENANT.getTime() - (CONSENT_MAX_AGE_SECONDS + 1) * 1000));
    assert.equal(needsDecision(vieux, MAINTENANT), true);
  });
});
