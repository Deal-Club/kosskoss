import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { numeroWhatsappEffectif, PARAMETRES_PAR_DEFAUT } from "./parametres";

const ORIGINE = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
afterEach(() => {
  if (ORIGINE === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = ORIGINE;
});

describe("numeroWhatsappEffectif", () => {
  it("préfère le réglage à la variable d'environnement", () => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "237000000000";
    assert.equal(
      numeroWhatsappEffectif({ ...PARAMETRES_PAR_DEFAUT, whatsapp: "237658013646" }),
      "237658013646",
    );
  });

  it("retombe sur la variable quand le réglage est vide", () => {
    // C'est l'état exact entre le déploiement de ce sous-lot et la première
    // saisie en administration. Sans ce repli, le bouton WhatsApp disparaîtrait
    // du site en production.
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "+237 658 01 36 46";
    assert.equal(numeroWhatsappEffectif(PARAMETRES_PAR_DEFAUT), "237658013646");
  });

  it("rend une chaîne vide quand ni l'un ni l'autre n'est renseigné", () => {
    // L'appelant décide alors de masquer le bouton : mieux vaut pas de bouton
    // qu'un lien wa.me sans numéro.
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    assert.equal(numeroWhatsappEffectif(PARAMETRES_PAR_DEFAUT), "");
  });
});
