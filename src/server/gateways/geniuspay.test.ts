import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
  estEchoue,
  estEncaisse,
  horodatageAcceptable,
  TOLERANCE_HORODATAGE_SECONDES,
  verifierSignature,
} from "./geniuspay";

const SECRET = "whsec_sandbox_exemple";
const CORPS = JSON.stringify({ event: "payment.success", data: { reference: "MTX-A1B2C3" } });
const HORODATAGE = "1735587600";

function signer(donnees: string): string {
  return createHmac("sha256", SECRET).update(donnees, "utf8").digest("hex");
}

describe("Signature des webhooks GeniusPay", () => {
  it("accepte la formule du guide d'intégration : timestamp + point + corps", () => {
    const signature = signer(`${HORODATAGE}.${CORPS}`);
    assert.equal(verifierSignature(CORPS, signature, HORODATAGE, SECRET), true);
  });

  it("accepte aussi la formule de l'API_Documentation : le corps seul", () => {
    // Les deux documentations du prestataire se contredisent ; on doit tolérer
    // les deux, sinon un changement de leur côté rejette tout le trafic.
    const signature = signer(CORPS);
    assert.equal(verifierSignature(CORPS, signature, HORODATAGE, SECRET), true);
  });

  it("refuse une signature calculée avec un autre secret", () => {
    const signature = createHmac("sha256", "whsec_autre").update(`${HORODATAGE}.${CORPS}`).digest("hex");
    assert.equal(verifierSignature(CORPS, signature, HORODATAGE, SECRET), false);
  });

  it("refuse si le corps a été modifié après signature", () => {
    const signature = signer(`${HORODATAGE}.${CORPS}`);
    const falsifie = CORPS.replace("MTX-A1B2C3", "MTX-PIRATE");
    assert.equal(verifierSignature(falsifie, signature, HORODATAGE, SECRET), false);
  });

  it("refuse une signature tronquée sans lever d'exception", () => {
    // `timingSafeEqual` lève quand les tampons diffèrent de taille : c'est le
    // piège de l'exemple Node de leur documentation.
    const signature = signer(`${HORODATAGE}.${CORPS}`).slice(0, 20);
    assert.equal(verifierSignature(CORPS, signature, HORODATAGE, SECRET), false);
  });

  it("refuse quand la signature ou le secret manque", () => {
    assert.equal(verifierSignature(CORPS, "", HORODATAGE, SECRET), false);
    assert.equal(verifierSignature(CORPS, signer(CORPS), HORODATAGE, ""), false);
  });
});

describe("Protection contre le rejeu", () => {
  const maintenant = 1_735_587_600_000;

  it("accepte un horodatage du moment", () => {
    assert.equal(horodatageAcceptable("1735587600", maintenant), true);
  });

  it("accepte à la limite de la tolérance", () => {
    const limite = String(1_735_587_600 - TOLERANCE_HORODATAGE_SECONDES);
    assert.equal(horodatageAcceptable(limite, maintenant), true);
  });

  it("refuse au-delà de la tolérance", () => {
    const tropVieux = String(1_735_587_600 - TOLERANCE_HORODATAGE_SECONDES - 1);
    assert.equal(horodatageAcceptable(tropVieux, maintenant), false);
  });

  it("refuse un horodatage illisible", () => {
    assert.equal(horodatageAcceptable("", maintenant), false);
    assert.equal(horodatageAcceptable("hier", maintenant), false);
  });

  it("refuse aussi un horodatage trop dans le futur", () => {
    // Une horloge déréglée chez l'émetteur ne doit pas ouvrir une fenêtre de
    // rejeu : l'écart est pris en valeur absolue.
    const futur = String(1_735_587_600 + TOLERANCE_HORODATAGE_SECONDES + 1);
    assert.equal(horodatageAcceptable(futur, maintenant), false);
  });
});

describe("Lecture des statuts", () => {
  it("ne reconnaît « encaissé » que sur completed", () => {
    assert.equal(estEncaisse("completed"), true);
    for (const statut of ["pending", "processing", "failed", "refunded", ""]) {
      assert.equal(estEncaisse(statut), false, `« ${statut} » ne doit pas valoir encaissement`);
    }
  });

  it("reconnaît les échecs définitifs", () => {
    for (const statut of ["failed", "cancelled", "expired"]) {
      assert.equal(estEchoue(statut), true);
    }
    // « processing » n'est pas un échec : le client est peut-être en train de
    // valider sur son téléphone.
    assert.equal(estEchoue("processing"), false);
    assert.equal(estEchoue("pending"), false);
  });
});
