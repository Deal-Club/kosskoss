import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { etiquetteProfil } from "./profil-etiquettes";

describe("etiquetteProfil", () => {
  it("transforme la réponse brute en étiquette valorisante (TK-02)", () => {
    // « Briller sur l'ensemble du visage » → « Peau Grasse ».
    assert.equal(etiquetteProfil("peau_grasse", "fr"), "Peau Grasse");
    // « Non » (réactivité) → « Peau Tolérante », « Oui » → « Peau Sensible ».
    assert.equal(etiquetteProfil("tolerante", "fr"), "Peau Tolérante");
    assert.equal(etiquetteProfil("reactive", "fr"), "Peau Sensible");
    // L'environnement entre dans le profil.
    assert.equal(etiquetteProfil("chaleur_humidite", "fr"), "Climat Chaud & Humide");
    assert.equal(etiquetteProfil("climatisation", "fr"), "Espaces Climatisés");
  });

  it("traduit en anglais", () => {
    assert.equal(etiquetteProfil("peau_seche", "en"), "Dry Skin");
    assert.equal(etiquetteProfil("tolerante", "en"), "Resilient Skin");
  });

  it("rend null sur une clé inconnue ou absente - l'appelant garde le libellé brut", () => {
    assert.equal(etiquetteProfil("cle_inconnue", "fr"), null);
    assert.equal(etiquetteProfil(undefined, "fr"), null);
  });
});
