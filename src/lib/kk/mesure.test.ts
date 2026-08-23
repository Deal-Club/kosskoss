import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EVENEMENTS_MESURE,
  estEvenementMesure,
  identifiantEvenement,
  montantXaf,
  versGa4,
  versPixel,
  type ArticleMesure,
  type EvenementDetail,
} from "./mesure";

function article(partiel: Partial<ArticleMesure> = {}): ArticleMesure {
  return {
    reference: "BUCHE-CHENE-STERE",
    nom: "Bûches de chêne, 1 stère",
    prixCents: 9500,
    quantite: 2,
    ...partiel,
  };
}

function evenement(partiel: Partial<EvenementDetail> = {}): EvenementDetail {
  return {
    type: "purchase",
    reference: "KK-2026-000123",
    articles: [article()],
    totalCents: 19000,
    ...partiel,
  };
}

describe("identifiantEvenement", () => {
  it("est stable pour une même commande", () => {
    const a = identifiantEvenement("purchase", "KK-2026-000123");
    const b = identifiantEvenement("purchase", "KK-2026-000123");
    assert.equal(a, b);
  });

  it("diffère pour deux commandes différentes", () => {
    const a = identifiantEvenement("purchase", "KK-2026-000123");
    const b = identifiantEvenement("purchase", "KK-2026-000124");
    assert.notEqual(a, b);
  });

  it("diffère pour deux types d'événement sur la même référence", () => {
    const achat = identifiantEvenement("purchase", "KK-2026-000123");
    const debutTunnel = identifiantEvenement("begin_checkout", "KK-2026-000123");
    assert.notEqual(achat, debutTunnel);
  });

  it("ne confond jamais un couple (type, référence) avec un autre, même avec un séparateur dans la référence", () => {
    // Le séparateur ":" est interne à identifiantEvenement : une référence qui
    // en contient un ne doit pas pouvoir usurper un autre couple.
    const a = identifiantEvenement("purchase", "add_to_cart:X");
    const b = identifiantEvenement("add_to_cart", "X");
    assert.notEqual(a, b);
  });

  it("distingue les quatre types d'événement pour la même référence", () => {
    const ids = new Set(EVENEMENTS_MESURE.map((type) => identifiantEvenement(type, "REF-1")));
    assert.equal(ids.size, EVENEMENTS_MESURE.length);
  });
});

describe("estEvenementMesure", () => {
  it("reconnaît les quatre littéraux", () => {
    for (const type of EVENEMENTS_MESURE) {
      assert.equal(estEvenementMesure(type), true);
    }
  });

  it("refuse tout le reste", () => {
    assert.equal(estEvenementMesure("achat"), false);
    assert.equal(estEvenementMesure(""), false);
    assert.equal(estEvenementMesure(42), false);
    assert.equal(estEvenementMesure(null), false);
    assert.equal(estEvenementMesure(undefined), false);
  });
});

describe("montantXaf", () => {
  it("rend les francs entiers sans diviser par 100", () => {
    assert.equal(montantXaf(19000), 19000);
  });

  it("ne transforme pas 15 000 FCFA en 150", () => {
    assert.equal(montantXaf(15000), 15000);
  });

  it("arrondit une valeur non entière plutôt que de la tronquer au hasard", () => {
    assert.equal(montantXaf(19000.4), 19000);
    assert.equal(montantXaf(19000.6), 19001);
  });

  it("laisse zéro inchangé", () => {
    assert.equal(montantXaf(0), 0);
  });
});

describe("versGa4", () => {
  it("porte le même identifiant que identifiantEvenement", () => {
    const e = evenement();
    assert.equal(versGa4(e).event_id, identifiantEvenement(e.type, e.reference));
  });

  it("reporte value et currency depuis totalCents, en francs entiers", () => {
    const e = evenement({ totalCents: 42000 });
    const ga4 = versGa4(e);
    assert.equal(ga4.value, 42000);
    assert.equal(ga4.currency, "XAF");
  });

  it("traduit chaque article en item GA4, champ par champ", () => {
    const e = evenement({
      articles: [
        article({ reference: "SKU-1", nom: "Chêne", prixCents: 9500, quantite: 2 }),
        article({ reference: "SKU-2", nom: "Hêtre", prixCents: 8000, quantite: 1 }),
      ],
    });
    const ga4 = versGa4(e);
    assert.deepEqual(ga4.items, [
      { item_id: "SKU-1", item_name: "Chêne", price: 9500, quantity: 2 },
      { item_id: "SKU-2", item_name: "Hêtre", price: 8000, quantity: 1 },
    ]);
  });

  it("rend un panier vide sans lever, avec des items vides", () => {
    const e = evenement({ articles: [], totalCents: 0 });
    const ga4 = versGa4(e);
    assert.deepEqual(ga4.items, []);
    assert.equal(ga4.value, 0);
  });
});

describe("versPixel", () => {
  it("porte le même identifiant que identifiantEvenement", () => {
    const e = evenement();
    assert.equal(versPixel(e).event_id, identifiantEvenement(e.type, e.reference));
  });

  it("reporte value et currency depuis totalCents, en francs entiers", () => {
    const e = evenement({ totalCents: 42000 });
    const pixel = versPixel(e);
    assert.equal(pixel.value, 42000);
    assert.equal(pixel.currency, "XAF");
  });

  it("traduit chaque article en content_ids et contents Meta", () => {
    const e = evenement({
      articles: [
        article({ reference: "SKU-1", prixCents: 9500, quantite: 2 }),
        article({ reference: "SKU-2", prixCents: 8000, quantite: 1 }),
      ],
    });
    const pixel = versPixel(e);
    assert.deepEqual(pixel.content_ids, ["SKU-1", "SKU-2"]);
    assert.deepEqual(pixel.contents, [
      { id: "SKU-1", quantity: 2, item_price: 9500 },
      { id: "SKU-2", quantity: 1, item_price: 8000 },
    ]);
  });

  it("rend un panier vide sans lever, avec des contenus vides", () => {
    const e = evenement({ articles: [], totalCents: 0 });
    const pixel = versPixel(e);
    assert.deepEqual(pixel.content_ids, []);
    assert.deepEqual(pixel.contents, []);
    assert.equal(pixel.value, 0);
  });
});

describe("déduplication GA4 / Pixel", () => {
  it("les deux formes du même événement portent EXACTEMENT le même event_id — c'est ce que Meta et GA4 utilisent pour ne compter la vente qu'une fois", () => {
    const e = evenement();
    assert.equal(versGa4(e).event_id, versPixel(e).event_id);
  });

  it("deux commandes distinctes ne partagent jamais leur event_id", () => {
    const commande1 = evenement({ reference: "KK-2026-000123" });
    const commande2 = evenement({ reference: "KK-2026-000124" });
    assert.notEqual(versGa4(commande1).event_id, versGa4(commande2).event_id);
    assert.notEqual(versPixel(commande1).event_id, versPixel(commande2).event_id);
  });
});
