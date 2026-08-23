import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it, mock } from "node:test";
import { donneesUtilisateur, envoyerAchatCapi, hacherSha256 } from "./capi";

describe("hacherSha256", () => {
  it("produit exactement le SHA-256 attendu", () => {
    assert.equal(
      hacherSha256("anne@example.fr"),
      createHash("sha256").update("anne@example.fr").digest("hex"),
    );
  });

  it("est déterministe : deux appels sur la même valeur rendent le même hachage", () => {
    assert.equal(hacherSha256("237658013646"), hacherSha256("237658013646"));
  });
});

describe("donneesUtilisateur", () => {
  it("hache l'e-mail normalisé (minuscules, sans espaces) — pas la saisie brute", () => {
    const attendu = hacherSha256("anne@example.fr");
    assert.deepEqual(donneesUtilisateur(" Anne@Example.FR ", ""), { em: [attendu] });
  });

  it("réduit le téléphone à ses chiffres avant de le hacher", () => {
    const attendu = hacherSha256("237658013646");
    assert.deepEqual(donneesUtilisateur("", "+237 65 80 13 646"), { ph: [attendu] });
  });

  it("omet un champ vide plutôt que de hacher une chaîne vide", () => {
    assert.deepEqual(donneesUtilisateur("", ""), {});
  });

  it("ne transmet ni nom ni adresse : seuls `em` et `ph` existent sur le résultat", () => {
    const donnees = donneesUtilisateur("anne@example.fr", "237658013646");
    assert.deepEqual(Object.keys(donnees).sort(), ["em", "ph"]);
  });
});

describe("envoyerAchatCapi sans consentement marketing", () => {
  it("n'appelle jamais `fetch` — rien ne part sans consentement, y compris la CAPI", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("fetch n'aurait jamais dû être appelé sans consentement");
    });
    try {
      await envoyerAchatCapi({
        orderNumber: "KOSS-2026-000999",
        email: "anne@example.fr",
        phone: "237658013646",
        totalCents: 19000,
        marketingConsent: false,
        articles: [{ reference: "SKU-1", nom: "Bûches", prixCents: 9500, quantite: 2 }],
      });
      assert.equal(fetchMock.mock.callCount(), 0);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it("ne lève jamais, même en l'absence de consentement", async () => {
    await assert.doesNotReject(() =>
      envoyerAchatCapi({
        orderNumber: "KOSS-2026-000999",
        email: "",
        phone: "",
        totalCents: 0,
        marketingConsent: false,
        articles: [],
      }),
    );
  });
});
