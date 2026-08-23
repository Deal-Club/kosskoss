import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  indexerEntetes,
  analyserLigneFiche,
  analyserLigneRoutine,
  analyserLigneLiaison,
  champsContenuDifferents,
  CATEGORIE_MASTER_VERS_SLUG,
  type FicheMaster,
} from "./master";
import type { Row } from "read-excel-file/node";

/**
 * Tests sur des données construites, pas sur le vrai fichier (voir le brief
 * de la tâche 1) : ligne complète, ligne sans SKU, prix illisible, cellule
 * vide, colonne absente. Le vrai classeur n'est exercé qu'à l'import réel
 * (tâche 4), contre la base.
 */

const ENTETES_FICHES = [
  "SKU",
  "EAN_UPC",
  "Marque",
  "Nom_Produit",
  "Prix_FCFA",
  "Categorie",
  "Solution_Courte",
  "Benefice_1",
  "Benefice_2",
  "Benefice_3",
  "Probleme_Accroche",
  "Ideal_Pour",
  "Usage_Matin",
  "Usage_Soir",
  "Frequence",
  "Conseil_KossKoss",
  "Precautions",
  "Actifs_Cles",
  "Statut_Publication",
  "Donnees_A_Confirmer",
];
const INDEX_FICHES = indexerEntetes(ENTETES_FICHES as Row);

function ligneFiche(patch: Record<string, unknown> = {}): Row {
  const base: Record<string, unknown> = {
    SKU: "ANU-HEA-TON-150",
    EAN_UPC: "8800307370859",
    Marque: "Anua",
    Nom_Produit: "Lotion tonique apaisante Heartleaf 77%",
    Prix_FCFA: 18000,
    Categorie: "Toner",
    Solution_Courte: "Tonique apaisant",
    Benefice_1: "Apaise",
    Benefice_2: "Hydrate",
    Benefice_3: "",
    Probleme_Accroche: "Rougeurs ?",
    Ideal_Pour: "Peaux sensibles",
    Usage_Matin: "Au coton",
    Usage_Soir: "Au coton",
    Frequence: "Quotidien",
    Conseil_KossKoss: "Complète le nettoyage",
    Precautions: "Aucune",
    Actifs_Cles: "Heartleaf 77%",
    Statut_Publication: "READY",
    Donnees_A_Confirmer: "",
    ...patch,
  };
  return ENTETES_FICHES.map((colonne) => base[colonne] ?? null) as Row;
}

describe("analyserLigneFiche", () => {
  it("accepte une ligne complète", () => {
    const resultat = analyserLigneFiche(INDEX_FICHES, ligneFiche(), 2);
    assert.ok("fiche" in resultat);
    if ("fiche" in resultat) {
      assert.equal(resultat.fiche.sku, "ANU-HEA-TON-150");
      assert.equal(resultat.fiche.prixFcfa, 18000);
      assert.deepEqual(resultat.fiche.benefices, ["Apaise", "Hydrate"]);
      assert.equal(resultat.fiche.ligne, 2);
    }
  });

  it("écarte une ligne sans SKU, nommée", () => {
    const resultat = analyserLigneFiche(INDEX_FICHES, ligneFiche({ SKU: "" }), 5);
    assert.ok("ignoree" in resultat);
    if ("ignoree" in resultat) {
      assert.equal(resultat.ignoree.ligne, 5);
      assert.match(resultat.ignoree.raison, /SKU/);
    }
  });

  it("écarte un prix illisible (texte non numérique)", () => {
    const resultat = analyserLigneFiche(INDEX_FICHES, ligneFiche({ Prix_FCFA: "à confirmer" }), 6);
    assert.ok("ignoree" in resultat);
    if ("ignoree" in resultat) assert.match(resultat.ignoree.raison, /prix/);
  });

  it("écarte un prix négatif ou nul", () => {
    const negatif = analyserLigneFiche(INDEX_FICHES, ligneFiche({ Prix_FCFA: -100 }), 7);
    assert.ok("ignoree" in negatif);
    const nul = analyserLigneFiche(INDEX_FICHES, ligneFiche({ Prix_FCFA: 0 }), 8);
    assert.ok("ignoree" in nul);
  });

  it("accepte un prix saisi en texte avec espaces et suffixe FCFA", () => {
    const resultat = analyserLigneFiche(INDEX_FICHES, ligneFiche({ Prix_FCFA: "18 000 FCFA" }), 9);
    assert.ok("fiche" in resultat);
    if ("fiche" in resultat) assert.equal(resultat.fiche.prixFcfa, 18000);
  });

  it("écarte une ligne entièrement vide", () => {
    const vide: Row = ENTETES_FICHES.map(() => null);
    const resultat = analyserLigneFiche(INDEX_FICHES, vide, 10);
    assert.ok("ignoree" in resultat);
    if ("ignoree" in resultat) assert.equal(resultat.ignoree.raison, "ligne vide");
  });

  it("traite une cellule vide comme une chaîne vide, pas une erreur", () => {
    const resultat = analyserLigneFiche(INDEX_FICHES, ligneFiche({ Precautions: null }), 11);
    assert.ok("fiche" in resultat);
    if ("fiche" in resultat) assert.equal(resultat.fiche.precautions, "");
  });

  it("reprend Statut_Publication et Donnees_A_Confirmer tels quels", () => {
    const resultat = analyserLigneFiche(
      INDEX_FICHES,
      ligneFiche({ Statut_Publication: "READY_WITH_CAUTION", Donnees_A_Confirmer: "Format à vérifier" }),
      12,
    );
    assert.ok("fiche" in resultat);
    if ("fiche" in resultat) {
      assert.equal(resultat.fiche.statutPublication, "READY_WITH_CAUTION");
      assert.equal(resultat.fiche.donneesAConfirmer, "Format à vérifier");
    }
  });

  it("tolère une colonne absente de l'en-tête (classeur remanié)", () => {
    const entetesSansCategorie = ENTETES_FICHES.filter((c) => c !== "Categorie");
    const index = indexerEntetes(entetesSansCategorie);
    const ligne = entetesSansCategorie.map((colonne) => {
      if (colonne === "SKU") return "ABC-123";
      if (colonne === "Prix_FCFA") return 5000;
      return "";
    });
    const resultat = analyserLigneFiche(index, ligne, 13);
    assert.ok("fiche" in resultat);
    if ("fiche" in resultat) assert.equal(resultat.fiche.categorie, "");
  });
});

const ENTETES_ROUTINES = [
  "Routine_ID",
  "Besoin",
  "Niveau",
  "Nom_Routine",
  "Promesse",
  "Profil_Cible",
  "Usage_Matin",
  "Usage_Soir",
  "Badge",
  "Note_KossKoss",
];
const INDEX_ROUTINES = indexerEntetes(ENTETES_ROUTINES as Row);

function ligneRoutine(patch: Record<string, unknown> = {}): Row {
  const base: Record<string, unknown> = {
    Routine_ID: "TAC-ECO",
    Besoin: "Taches / Teint",
    Niveau: "Eco",
    Nom_Routine: "Teint Net Essential",
    Promesse: "Atténue les taches.",
    Profil_Cible: "Teint irrégulier",
    Usage_Matin: "Nettoyant → Sérum → SPF",
    Usage_Soir: "Nettoyant → Sérum",
    Badge: "Meilleur rapport",
    Note_KossKoss: "Le SPF est indispensable.",
    ...patch,
  };
  return ENTETES_ROUTINES.map((colonne) => base[colonne] ?? null) as Row;
}

describe("analyserLigneRoutine", () => {
  it("accepte une ligne complète et normalise le niveau en minuscules", () => {
    const resultat = analyserLigneRoutine(INDEX_ROUTINES, ligneRoutine(), 2);
    assert.ok("routine" in resultat);
    if ("routine" in resultat) {
      assert.equal(resultat.routine.code, "TAC-ECO");
      assert.equal(resultat.routine.niveau, "eco");
    }
  });

  it("écarte une ligne sans code de routine, nommée", () => {
    const resultat = analyserLigneRoutine(INDEX_ROUTINES, ligneRoutine({ Routine_ID: "" }), 3);
    assert.ok("ignoree" in resultat);
    if ("ignoree" in resultat) assert.match(resultat.ignoree.raison, /code de routine/);
  });

  it("écarte un niveau non reconnu", () => {
    const resultat = analyserLigneRoutine(INDEX_ROUTINES, ligneRoutine({ Niveau: "Intense" }), 4);
    assert.ok("ignoree" in resultat);
    if ("ignoree" in resultat) assert.match(resultat.ignoree.raison, /niveau/);
  });
});

const ENTETES_LIAISONS = ["Routine_ID", "Etape", "Role", "SKU", "Moment"];
const INDEX_LIAISONS = indexerEntetes(ENTETES_LIAISONS as Row);

function ligneLiaison(patch: Record<string, unknown> = {}): Row {
  const base: Record<string, unknown> = {
    Routine_ID: "TAC-ECO",
    Etape: 1,
    Role: "Nettoyer",
    SKU: "BOJ-PRU-CLE-100",
    Moment: "AM/PM",
    ...patch,
  };
  return ENTETES_LIAISONS.map((colonne) => base[colonne] ?? null) as Row;
}

describe("analyserLigneLiaison", () => {
  it("accepte une ligne complète", () => {
    const resultat = analyserLigneLiaison(INDEX_LIAISONS, ligneLiaison(), 2);
    assert.ok("liaison" in resultat);
    if ("liaison" in resultat) {
      assert.equal(resultat.liaison.routineCode, "TAC-ECO");
      assert.equal(resultat.liaison.etape, 1);
      assert.equal(resultat.liaison.sku, "BOJ-PRU-CLE-100");
    }
  });

  it("écarte une ligne sans SKU, nommée avec le code de routine", () => {
    const resultat = analyserLigneLiaison(INDEX_LIAISONS, ligneLiaison({ SKU: "" }), 3);
    assert.ok("ignoree" in resultat);
    if ("ignoree" in resultat) assert.match(resultat.ignoree.raison, /SKU/);
  });

  it("écarte une étape non entière", () => {
    const resultat = analyserLigneLiaison(INDEX_LIAISONS, ligneLiaison({ Etape: "première" }), 4);
    assert.ok("ignoree" in resultat);
    if ("ignoree" in resultat) assert.match(resultat.ignoree.raison, /étape/);
  });
});

// ---- Tâche 2 : diff de contenu et correspondance des catégories -------------

function ficheDeTest(patch: Partial<FicheMaster> = {}): FicheMaster {
  return {
    ligne: 2,
    sku: "ANU-HEA-TON-150",
    ean: "",
    marque: "Anua",
    nom: "Lotion tonique",
    prixFcfa: 18000,
    categorie: "Toner",
    shortDescription: "Tonique apaisant",
    benefices: ["Apaise", "Hydrate"],
    problemeAccroche: "Rougeurs ?",
    idealPour: "Peaux sensibles",
    usageMatin: "Au coton",
    usageSoir: "Au coton",
    frequence: "Quotidien",
    conseilKossKoss: "Complète le nettoyage",
    precautions: "Aucune",
    actifsCles: "Heartleaf 77%",
    statutPublication: "READY",
    donneesAConfirmer: "",
    ...patch,
  };
}

function produitDeTest(patch: Record<string, unknown> = {}) {
  return {
    id: "prod-1",
    sku: "ANU-HEA-TON-150",
    name: "Lotion tonique",
    priceCents: 18000,
    gtin: null,
    category: { slug: "toniques" },
    shortDescription: "Tonique apaisant",
    bullets: JSON.stringify(["Apaise", "Hydrate"]),
    problemeAccroche: "Rougeurs ?",
    idealPour: "Peaux sensibles",
    usageMatin: "Au coton",
    usageSoir: "Au coton",
    frequence: "Quotidien",
    conseilKossKoss: "Complète le nettoyage",
    precautions: "Aucune",
    actifsCles: "Heartleaf 77%",
    statutPublication: "READY",
    donneesAConfirmer: "",
    ...patch,
  };
}

describe("champsContenuDifferents", () => {
  it("ne rend aucun champ quand la fiche et le produit sont déjà alignés", () => {
    const patch = champsContenuDifferents(produitDeTest(), ficheDeTest());
    assert.deepEqual(patch, {});
  });

  it("ne rend que les champs réellement différents", () => {
    const patch = champsContenuDifferents(
      produitDeTest({ precautions: "Ancien texte" }),
      ficheDeTest({ precautions: "Nouveau texte" }),
    );
    assert.deepEqual(patch, { precautions: "Nouveau texte" });
  });

  it("compare les bullets comme le JSON des bénéfices non vides", () => {
    const patch = champsContenuDifferents(
      produitDeTest({ bullets: JSON.stringify(["Apaise"]) }),
      ficheDeTest({ benefices: ["Apaise", "Hydrate", "Éclaircit"] }),
    );
    assert.deepEqual(patch, { bullets: JSON.stringify(["Apaise", "Hydrate", "Éclaircit"]) });
  });

  it("ignore costCents : ce champ n'entre jamais dans la comparaison", () => {
    // Le type même de `champsContenuDifferents` n'accepte pas `costCents` en
    // entrée : ce test documente l'absence de tout chemin qui l'écrirait,
    // pas seulement l'absence de différence détectée.
    const patch = champsContenuDifferents(produitDeTest(), ficheDeTest());
    assert.ok(!("costCents" in patch));
  });
});

describe("CATEGORIE_MASTER_VERS_SLUG", () => {
  it("couvre exactement les sept catégories du master", () => {
    assert.deepEqual(Object.keys(CATEGORIE_MASTER_VERS_SLUG).sort(), [
      "Corps",
      "Hydratant",
      "Hygiène",
      "Nettoyant",
      "Protection",
      "Toner",
      "Traitement",
    ]);
  });

  it("associe chaque libellé du master au slug réel de la catégorie du site", () => {
    assert.equal(CATEGORIE_MASTER_VERS_SLUG["Nettoyant"], "nettoyants");
    assert.equal(CATEGORIE_MASTER_VERS_SLUG["Toner"], "toniques");
    assert.equal(CATEGORIE_MASTER_VERS_SLUG["Traitement"], "traitements");
    assert.equal(CATEGORIE_MASTER_VERS_SLUG["Hydratant"], "hydratants");
    assert.equal(CATEGORIE_MASTER_VERS_SLUG["Protection"], "solaires");
    assert.equal(CATEGORIE_MASTER_VERS_SLUG["Corps"], "corps");
    assert.equal(CATEGORIE_MASTER_VERS_SLUG["Hygiène"], "hygiene");
  });
});
