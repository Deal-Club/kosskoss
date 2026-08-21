import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classerParProduit, totaliserVentes, ventesParJour, type LigneVente } from "./ventes";

function ligne(partiel: Partial<LigneVente> = {}): LigneVente {
  return {
    orderId: "cmd1",
    orderNumber: "KK-2026-000001",
    date: new Date(2026, 7, 19, 10, 0),
    brand: "Nivea",
    name: "Crème hydratante",
    variantLabel: "",
    sku: "",
    quantity: 1,
    unitPriceCents: 12000,
    lineTotalCents: 12000,
    unitCostCents: 8000,
    ...partiel,
  };
}

describe("totaliserVentes", () => {
  it("additionne le chiffre d'affaires des lignes", () => {
    const totaux = totaliserVentes([
      ligne({ lineTotalCents: 12000 }),
      ligne({ orderId: "cmd2", lineTotalCents: 7500 }),
    ]);
    assert.equal(totaux.chiffreAffairesCents, 19500);
  });

  it("compte les commandes distinctes, pas les lignes", () => {
    // Deux articles d'un même panier font une commande, et un panier moyen qui
    // les compterait deux fois serait divisé par deux.
    const totaux = totaliserVentes([ligne(), ligne({ name: "Sérum" })]);
    assert.equal(totaux.nombreCommandes, 1);
    assert.equal(totaux.lignesTotal, 2);
  });

  it("calcule le panier moyen sur les commandes", () => {
    const totaux = totaliserVentes([
      ligne({ lineTotalCents: 10000 }),
      ligne({ orderId: "cmd2", lineTotalCents: 20000 }),
    ]);
    assert.equal(totaux.panierMoyenCents, 15000);
  });

  it("divise par le nombre de commandes, jamais par le nombre de lignes", () => {
    // Deux lignes d'une seule commande (cmd1) : CA 30 000.
    // Une ligne d'une autre commande (cmd2) : CA 40 000.
    // Panier moyen = (30 000 + 40 000) / 2 = 35 000.
    // Une fausse division par 3 lignes donnerait (70 000 / 3) = 23 333,
    // qui est très différent et clairement faux.
    const totaux = totaliserVentes([
      ligne({ lineTotalCents: 10000 }),
      ligne({ orderId: "cmd1", name: "Sérum", lineTotalCents: 20000 }),
      ligne({ orderId: "cmd2", lineTotalCents: 40000 }),
    ]);
    assert.equal(totaux.nombreCommandes, 2);
    assert.equal(totaux.lignesTotal, 3);
    assert.equal(totaux.panierMoyenCents, 35000);
  });

  it("rend un panier moyen de zéro sans commande", () => {
    // Diviser par zéro rendrait NaN, qui s'afficherait tel quel.
    assert.equal(totaliserVentes([]).panierMoyenCents, 0);
  });

  it("additionne les quantités, pas les lignes", () => {
    const totaux = totaliserVentes([ligne({ quantity: 3 }), ligne({ quantity: 2 })]);
    assert.equal(totaux.quantite, 5);
  });

  it("calcule la marge et multiplie le coût par la quantité", () => {
    // 36 000 - 3 × 8 000 = 12 000.
    const totaux = totaliserVentes([
      ligne({ quantity: 3, lineTotalCents: 36000, unitCostCents: 8000 }),
    ]);
    assert.equal(totaux.margeCents, 12000);
    assert.equal(totaux.tauxMarge, 33.3);
  });

  it("rapporte le taux au CA des seules lignes qui ont un coût", () => {
    // 12 000 avec coût, 40 000 sans. La marge de 4 000 vaut 33,3 % des 12 000
    // renseignés — pas 7,7 % des 52 000, chiffre qui ne veut rien dire.
    const totaux = totaliserVentes([
      ligne(),
      ligne({ orderId: "cmd2", lineTotalCents: 40000, unitCostCents: null }),
    ]);
    assert.equal(totaux.margeCents, 4000);
    assert.equal(totaux.tauxMarge, 33.3);
    assert.equal(totaux.chiffreAffairesCents, 52000);
  });

  it("dit sur combien de lignes la marge est calculée", () => {
    // Une marge muette sur son incomplétude ment.
    const totaux = totaliserVentes([
      ligne(),
      ligne({ unitCostCents: null }),
      ligne({ unitCostCents: null }),
    ]);
    assert.equal(totaux.lignesAvecCout, 1);
    assert.equal(totaux.lignesTotal, 3);
  });

  it("rend une marge nulle — pas zéro — quand aucune ligne n'a de coût", () => {
    // Zéro se lirait « vendu à prix coûtant » ; il faut lire « on ne sait pas ».
    const totaux = totaliserVentes([ligne({ unitCostCents: null })]);
    assert.equal(totaux.margeCents, null);
    assert.equal(totaux.tauxMarge, null);
  });

  it("accepte un coût réellement nul", () => {
    // Un échantillon reçu gratuitement a un coût de zéro : c'est un
    // renseignement, et la marge vaut alors tout le prix.
    const totaux = totaliserVentes([ligne({ unitCostCents: 0 })]);
    assert.equal(totaux.margeCents, 12000);
    assert.equal(totaux.tauxMarge, 100);
  });

  it("rend une marge négative telle quelle", () => {
    // Vendre à perte doit se voir ; le masquer empêcherait de le repérer.
    const totaux = totaliserVentes([ligne({ lineTotalCents: 6000, unitCostCents: 8000 })]);
    assert.equal(totaux.margeCents, -2000);
  });

  it("rend des totaux à zéro sur une période sans vente", () => {
    const totaux = totaliserVentes([]);
    assert.equal(totaux.chiffreAffairesCents, 0);
    assert.equal(totaux.nombreCommandes, 0);
    assert.equal(totaux.margeCents, null);
    assert.equal(totaux.lignesTotal, 0);
  });
});

describe("classerParProduit", () => {
  it("regroupe les ventes d'un même produit", () => {
    const classement = classerParProduit(
      [ligne({ quantity: 2, lineTotalCents: 24000 }), ligne({ orderId: "cmd2" })],
      10,
    );
    assert.equal(classement.length, 1);
    assert.equal(classement[0].quantite, 3);
    assert.equal(classement[0].chiffreAffairesCents, 36000);
  });

  it("sépare les variantes d'un même produit", () => {
    // « 50 ml » et « 100 ml » n'ont ni le même prix ni le même coût : les
    // fondre masquerait laquelle des deux se vend.
    const classement = classerParProduit(
      [ligne({ variantLabel: "50 ml" }), ligne({ variantLabel: "100 ml" })],
      10,
    );
    assert.equal(classement.length, 2);
  });

  it("classe par chiffre d'affaires décroissant et respecte la limite", () => {
    const lignes = Array.from({ length: 20 }, (_, index) =>
      ligne({ name: `Produit ${index}`, lineTotalCents: 1000 * (index + 1) }),
    );
    const classement = classerParProduit(lignes, 10);
    assert.equal(classement.length, 10);
    assert.equal(classement[0].name, "Produit 19");
  });

  it("compte les lignes sans coût de chaque produit", () => {
    const classement = classerParProduit([ligne(), ligne({ unitCostCents: null })], 10);
    assert.equal(classement[0].lignesSansCout, 1);
    assert.equal(classement[0].margeCents, 4000);
  });

  it("rend une marge nulle pour un produit dont aucune ligne n'a de coût", () => {
    const classement = classerParProduit([ligne({ unitCostCents: null })], 10);
    assert.equal(classement[0].margeCents, null);
  });

  it("ne fond pas ensemble les produits disparus du catalogue", () => {
    // Le regroupement se fait sur les libellés recopiés, jamais sur un
    // identifiant produit qui vaut `null` pour tout ce qui a été supprimé.
    const classement = classerParProduit(
      [ligne({ name: "Disparu A" }), ligne({ name: "Disparu B" })],
      10,
    );
    assert.equal(classement.length, 2);
  });

  it("sépare les produits de marques différentes portant le même nom", () => {
    // « Crème hydratante » chez Nivea et chez Eucerin ne sont pas le même
    // produit : leurs prix et coûts diffèrent. Retirer brand de cleProduit
    // les fondrait mécaniquement.
    const classement = classerParProduit(
      [
        ligne({ brand: "Nivea", lineTotalCents: 12000 }),
        ligne({ brand: "Eucerin", name: "Crème hydratante", lineTotalCents: 15000 }),
      ],
      10,
    );
    assert.equal(classement.length, 2);
  });
});

describe("ventesParJour", () => {
  it("rend un point par jour, jours creux compris", () => {
    // Un histogramme qui saute les jours sans vente ment sur le rythme.
    const points = ventesParJour(
      [ligne({ date: new Date(2026, 7, 19, 10, 0) })],
      new Date(2026, 7, 17),
      new Date(2026, 7, 19, 23, 59, 59),
    );
    assert.deepEqual(
      points.map((point) => point.jour),
      ["2026-08-17", "2026-08-18", "2026-08-19"],
    );
    assert.equal(points[0].chiffreAffairesCents, 0);
    assert.equal(points[2].chiffreAffairesCents, 12000);
  });

  it("compte les commandes distinctes de chaque jour", () => {
    const points = ventesParJour(
      [
        ligne({ date: new Date(2026, 7, 19, 9, 0) }),
        ligne({ date: new Date(2026, 7, 19, 11, 0), name: "Sérum" }),
      ],
      new Date(2026, 7, 19),
      new Date(2026, 7, 19, 23, 59, 59),
    );
    assert.equal(points[0].nombreCommandes, 1);
  });

  it("dédoublonne par orderId : trois lignes de deux commandes donnent 2, pas 3", () => {
    // Test du dédoublonnage : deux lignes de cmd1, une ligne de cmd2, tous le
    // même jour. Compter naïvement les lignes donne 3 ; compter les orderId
    // distincts donne 2. Un Set oublié compterait 3 et échouerait ici.
    const points = ventesParJour(
      [
        ligne({ date: new Date(2026, 7, 19, 9, 0), orderId: "cmd1" }),
        ligne({ date: new Date(2026, 7, 19, 10, 0), orderId: "cmd1", name: "Sérum" }),
        ligne({ date: new Date(2026, 7, 19, 11, 0), orderId: "cmd2" }),
      ],
      new Date(2026, 7, 19),
      new Date(2026, 7, 19, 23, 59, 59),
    );
    assert.equal(points[0].nombreCommandes, 2);
  });

  it("range la vente au jour local, pas au jour UTC", () => {
    // 23 h 30 bascule en UTC le lendemain ; le commerçant compte ses jours.
    const points = ventesParJour(
      [ligne({ date: new Date(2026, 7, 19, 23, 30) })],
      new Date(2026, 7, 19),
      new Date(2026, 7, 20, 23, 59, 59),
    );
    assert.equal(points[0].chiffreAffairesCents, 12000);
    assert.equal(points[1].chiffreAffairesCents, 0);
  });

  it("rend une série vide quand les bornes sont inversées", () => {
    assert.deepEqual(ventesParJour([], new Date(2026, 7, 19), new Date(2026, 7, 17)), []);
  });

  it("rend un point unique sur une période d'un jour", () => {
    const points = ventesParJour([], new Date(2026, 7, 19), new Date(2026, 7, 19, 23, 59, 59));
    assert.equal(points.length, 1);
  });
});
