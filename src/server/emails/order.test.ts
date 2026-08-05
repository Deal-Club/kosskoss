/**
 * Tests des e-mails de commande.
 *
 * L'enjeu : ces deux messages sont la seule preuve que le client et le vendeur
 * reçoivent de la commande. On vérifie donc qu'ils contiennent réellement les
 * montants, les adresses et les liens attendus — un gabarit qui « compile »
 * mais oublie le total serait une confirmation sans valeur —, que la langue
 * suit celle de la commande, et qu'aucun texte saisi par le client ne peut
 * injecter de HTML.
 *
 * Lancer avec : npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OrderRecord } from "@/server/orders";
import { buildOrderConfirmationEmail, buildOrderNotificationEmail } from "./order";

const SITE = "https://mlc-bois.fr";
process.env.NEXT_PUBLIC_SITE_URL = SITE;

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "ord_42",
    orderNumber: "MLC-2026-000042",
    accessToken: "9f2c1ab34de5",
    locale: "fr",
    email: "anne.exemple@example.fr",
    phone: "+33 1 23 45 67 89",
    billing: {
      salutation: "frau",
      firstName: "Anne",
      lastName: "Exemple",
      company: "",
      street: "12 rue des Tilleuls",
      postalCode: "94300",
      city: "Vincennes",
      country: "FR",
    },
    shippingSameAsBilling: true,
    shipping: {
      salutation: "frau",
      firstName: "Anne",
      lastName: "Exemple",
      company: "",
      street: "12 rue des Tilleuls",
      postalCode: "94300",
      city: "Vincennes",
      country: "FR",
    },
    paymentMethodKey: "vorkasse",
    paymentMethodLabel: "Virement bancaire préalable",
    paymentMethodFee: "",
    shippingMethodKey: "standard",
    shippingMethodLabel: "Livraison standard",
    status: "eingegangen",
    paymentStatus: "offen",
    subtotalCents: 89900,
    shippingCents: 495,
    taxCents: 8218,
    totalCents: 90395,
    taxRatePercent: 10,
    currency: "EUR",
    customerNote: "",
    adminNote: "",
    createdAt: "2026-07-30T09:24:00.000Z",
    updatedAt: "2026-07-30T09:24:00.000Z",
    items: [
      {
        id: "item_1",
        brand: "MLC Bois",
        name: "Hêtre 33 cm — palette 2 MAP",
        variantLabel: "",
        sku: "HET-33-P2",
        slug: "hetre-33-palette-2map",
        image: "",
        path: "buches/hetre/hetre-33-palette-2map",
        unitPriceCents: 89900,
        quantity: 1,
        lineTotalCents: 89900,
      },
    ],
    events: [],
    ...overrides,
  };
}

describe("Confirmation à l'acheteur", () => {
  it("récapitule le numéro, les articles et les montants", () => {
    const mail = buildOrderConfirmationEmail(order());

    assert.match(mail.subject, /MLC-2026-000042/);
    for (const part of [mail.html, mail.text]) {
      assert.match(part, /MLC-2026-000042/);
      assert.match(part, /Hêtre 33 cm/);
      // Total, sous-total et port : le décompte exigé par l'article L221-13 du
      // Code de la consommation, au format français. La TVA a été retirée du
      // système, elle n'apparaît donc plus.
      assert.match(part, /903,95 €/);
      assert.match(part, /899,00 €/);
      assert.match(part, /4,95 €/);
      assert.match(part, /12 rue des Tilleuls/);
      assert.match(part, /Virement bancaire préalable/);
    }
  });

  it("porte le lien de suivi avec son jeton", () => {
    const mail = buildOrderConfirmationEmail(order());
    const expected = `${SITE}/confirmation/MLC-2026-000042?token=9f2c1ab34de5`;
    assert.ok(mail.html.includes(expected), "lien de suivi absent du HTML");
    assert.ok(mail.text.includes(expected), "lien de suivi absent du texte");
  });

  it("écrit en français par défaut et en anglais sous /en", () => {
    const fr = buildOrderConfirmationEmail(order());
    assert.match(fr.subject, /Confirmation de commande/);
    assert.match(fr.html, /lang="fr"/);
    assert.match(fr.html, /Madame Exemple/);

    const en = buildOrderConfirmationEmail(order({ locale: "en" }));
    assert.match(en.subject, /Order confirmation/);
    assert.match(en.html, /lang="en"/);
    assert.match(en.html, /Dear Ms Exemple/);
    assert.ok(en.html.includes(`${SITE}/en/confirmation/MLC-2026-000042`));
  });

  it("ne présume rien du prénom sans civilité renseignée", () => {
    const anonymous = order();
    anonymous.billing.salutation = "";
    const mail = buildOrderConfirmationEmail(anonymous);
    assert.match(mail.html, /Bonjour Anne Exemple/);
    assert.doesNotMatch(mail.html, /Madame|Monsieur/);
  });

  it("annonce le port offert plutôt qu'un montant nul", () => {
    const mail = buildOrderConfirmationEmail(order({ shippingCents: 0 }));
    assert.match(mail.html, /offerte/);
    assert.doesNotMatch(mail.text, /Livraison : 0,00 €/);
  });

  it("n'affiche l'adresse de facturation que si elle diffère", () => {
    assert.doesNotMatch(buildOrderConfirmationEmail(order()).html, /Adresse de facturation/);

    const distinct = order({ shippingSameAsBilling: false });
    distinct.shipping.street = "3 chemin du Dépôt";
    const mail = buildOrderConfirmationEmail(distinct);
    assert.match(mail.html, /Adresse de facturation/);
    assert.match(mail.html, /3 chemin du Dépôt/);
    assert.match(mail.html, /12 rue des Tilleuls/);
  });

  it("nomme le mode de livraison retenu, dans la langue du message", () => {
    const fr = buildOrderConfirmationEmail(order());
    assert.match(fr.html, /Livraison standard \(3 à 5 jours ouvrés\)/);
    assert.match(fr.text, /Livraison standard \(3 à 5 jours ouvrés\)/);

    const express = order({
      shippingMethodKey: "express",
      shippingMethodLabel: "Livraison express",
      shippingCents: 7_000,
      totalCents: 96_900,
      locale: "en",
    });
    const en = buildOrderConfirmationEmail(express);
    assert.match(en.html, /Express delivery \(24–48 hours\)/);
    // Le supplément doit apparaître comme un montant, jamais comme « free ».
    assert.match(en.html, /70,00 €/);
    assert.doesNotMatch(en.text, /Shipping — Express delivery \(24–48 hours\) : free/);
  });

  it("échappe la remarque saisie par le client", () => {
    const mail = buildOrderConfirmationEmail(
      order({ customerNote: '<img src=x onerror="alert(1)">' }),
    );
    assert.doesNotMatch(mail.html, /<img src=x/);
    assert.match(mail.html, /&lt;img src=x/);
  });
});

describe("Notification au vendeur", () => {
  it("annonce le numéro et le montant dès l'objet", () => {
    const mail = buildOrderNotificationEmail(order());
    assert.match(mail.subject, /Nouvelle commande MLC-2026-000042/);
    assert.match(mail.subject, /903,95 €/);
  });

  it("donne les coordonnées du client et le lien back-office", () => {
    const mail = buildOrderNotificationEmail(order());
    for (const part of [mail.html, mail.text]) {
      assert.match(part, /anne\.exemple@example\.fr/);
      assert.match(part, /\+33 1 23 45 67 89/);
      assert.match(part, /Hêtre 33 cm/);
      assert.match(part, /903,95 €/);
    }
    // Le lien pointe la fiche interne par identifiant, pas la page publique :
    // le vendeur doit atterrir là où il peut agir sur la commande.
    assert.ok(mail.html.includes(`${SITE}/admin/orders/ord_42`));
    assert.ok(mail.text.includes(`${SITE}/admin/orders/ord_42`));
    // Le jeton d'accès du client n'a rien à faire dans un message interne.
    assert.doesNotMatch(mail.html, /9f2c1ab34de5/);
  });

  it("reste en français, quelle que soit la langue de la commande", () => {
    const mail = buildOrderNotificationEmail(order({ locale: "en" }));
    assert.match(mail.html, /lang="fr"/);
    assert.match(mail.html, /Nouvelle commande/);
    assert.match(mail.html, /Langue de la commande : anglais/);
  });

  it("signale l'express en priorité de préparation", () => {
    const standard = buildOrderNotificationEmail(order());
    assert.match(standard.html, /Livraison standard \(3 à 5 jours ouvrés\)/);
    assert.doesNotMatch(standard.html, /priorité/);

    const express = buildOrderNotificationEmail(
      order({ shippingMethodKey: "express", shippingCents: 7_000 }),
    );
    assert.match(express.html, /Livraison express \(24 à 48 heures\)/);
    assert.match(express.html, /à préparer en priorité/);
    assert.match(express.text, /Livraison : Livraison express/);
  });

  it("remonte la remarque du client quand il en a laissé une", () => {
    const mail = buildOrderNotificationEmail(
      order({ customerNote: "Merci de livrer le matin." }),
    );
    assert.match(mail.html, /Remarque du client/);
    assert.match(mail.text, /Merci de livrer le matin\./);
  });
});
