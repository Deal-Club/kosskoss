import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { MODELES_TRADUISIBLES, etatTraduction, type ChampTraduisible } from "./traductions";

const champs: ChampTraduisible[] = [
  { fr: "name", en: "nameEn", libelle: "Nom", format: "texte" },
  { fr: "description", en: "descriptionEn", libelle: "Description", format: "texte-long" },
];

describe("etatTraduction", () => {
  it("compte un enregistrement entièrement traduit", () => {
    const etat = etatTraduction(
      { name: "Crème", nameEn: "Cream", description: "Douce", descriptionEn: "Gentle" },
      champs,
    );
    assert.equal(etat.traduits, 2);
    assert.equal(etat.aTraduire, 0);
    assert.equal(etat.complet, true);
  });

  it("compte un enregistrement partiellement traduit", () => {
    const etat = etatTraduction(
      { name: "Crème", nameEn: "Cream", description: "Douce", descriptionEn: "" },
      champs,
    );
    assert.equal(etat.traduits, 1);
    assert.equal(etat.aTraduire, 1);
    assert.equal(etat.complet, false);
  });

  it("ignore un champ vide en français", () => {
    // Un champ facultatif jamais rempli n'attend aucune traduction. Le compter
    // noierait le vrai travail sous du bruit.
    const etat = etatTraduction(
      { name: "Crème", nameEn: "Cream", description: "", descriptionEn: "" },
      champs,
    );
    assert.equal(etat.total, 1);
    assert.equal(etat.complet, true);
  });

  it("compte comme traduite une traduction identique au français", () => {
    // « Nivea » ne se traduit pas. Exiger une différence produirait des
    // traductions inventées.
    const etat = etatTraduction({ name: "Nivea", nameEn: "Nivea" }, [champs[0]]);
    assert.equal(etat.complet, true);
  });

  it("ne compte pas une traduction faite d'espaces", () => {
    // Une case remplie d'espaces a l'air remplie et ne traduit rien.
    const etat = etatTraduction({ name: "Crème", nameEn: "   " }, [champs[0]]);
    assert.equal(etat.complet, false);
  });

  it("rend un état complet pour un enregistrement sans champ à traduire", () => {
    assert.equal(etatTraduction({}, []).complet, true);
    assert.equal(etatTraduction({}, []).total, 0);
  });
});

describe("MODELES_TRADUISIBLES", () => {
  it("nomme chaque modèle une seule fois", () => {
    const cles = MODELES_TRADUISIBLES.map((m) => m.cle);
    assert.equal(new Set(cles).size, cles.length);
  });

  it("donne à chaque champ un nom anglais dérivé du français", () => {
    // La convention du schéma : `name` ↔ `nameEn`. Une entrée qui s'en écarte
    // est une faute de frappe, et une faute de frappe écrit dans le vide.
    //
    // Exception connue et volontaire : `DiagStep.labelFr` et
    // `ProductTag.labelFr` portent déjà, dans le schéma, un suffixe `Fr`
    // explicite (à la différence de `DiagAnswer.label`, qui n'en porte pas).
    // Leur seule paire réellement présente en base est `labelFr` → `labelEn`,
    // pas `labelFr` → `labelFrEn`, qui n'existe pas.
    for (const modele of MODELES_TRADUISIBLES) {
      for (const champ of modele.champs) {
        const attendu = champ.fr.endsWith("Fr")
          ? `${champ.fr.slice(0, -"Fr".length)}En`
          : `${champ.fr}En`;
        assert.equal(champ.en, attendu, `${modele.cle}.${champ.fr}`);
        assert.ok(champ.libelle.length > 0, `${modele.cle}.${champ.fr} sans libellé`);
      }
    }
  });

  it("n'inclut PAS les blocs d'article", () => {
    // Traduire une structure de blocs dans un champ de texte reviendrait à
    // éditer du JSON à la main, et une erreur de syntaxe casserait l'article.
    const article = MODELES_TRADUISIBLES.find((m) => m.cle === "Article");
    assert.ok(article);
    assert.equal(article.champs.some((c) => c.fr === "blocks"), false);
  });
});

// ---- Le registre face au schéma réel ----
//
// Ce test lit le système de fichiers (prisma/schema.prisma), comme celui des
// capacités (src/lib/kk/routesAdmin.test.ts) : c'est délibéré. Le registre
// ci-dessus est écrit à la main ; seule une lecture du schéma peut garantir
// qu'aucun champ `*En` n'y est invisible, et qu'aucune entrée du registre ne
// pointe vers un champ qui n'existe pas (ou plus).
describe("registre face au schéma", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  // Champs `*En` présents en base mais volontairement absents du registre,
  // avec leur justification. Toute entrée ici DOIT être commentée : c'est ce
  // qui empêche une exclusion silencieuse de faire croire un modèle traduit.
  const EXCLUSIONS: Record<string, string[]> = {
    // Tableau de blocs éditoriaux sérialisé en JSON, pas un champ de texte :
    // l'éditer depuis une case de traduction reviendrait à modifier du JSON à
    // la main. Voir le commentaire d'en-tête de traductions.ts.
    Article: ["blocksEn"],
  };

  /** Modèles du schéma Prisma et leurs champs `*En`, dans l'ordre du fichier. */
  function champsEnParModele(): Map<string, string[]> {
    const resultat = new Map<string, string[]>();
    for (const [nom, corps] of corpsParModele()) {
      const champsEn: string[] = [];
      const ligneRegex = /^\s*(\w+En)\s+String\b/gm;
      let ligneMatch: RegExpExecArray | null;
      while ((ligneMatch = ligneRegex.exec(corps))) {
        champsEn.push(ligneMatch[1]);
      }
      if (champsEn.length > 0) resultat.set(nom, champsEn);
    }
    return resultat;
  }

  /** Tous les noms de champ scalaires d'un modèle, quel que soit leur type. */
  function tousLesChampsParModele(): Map<string, Set<string>> {
    const resultat = new Map<string, Set<string>>();
    for (const [nom, corps] of corpsParModele()) {
      const champs = new Set<string>();
      const ligneRegex = /^\s*(\w+)\s+(String|Int|Boolean|DateTime|Float)\b/gm;
      let ligneMatch: RegExpExecArray | null;
      while ((ligneMatch = ligneRegex.exec(corps))) {
        champs.add(ligneMatch[1]);
      }
      resultat.set(nom, champs);
    }
    return resultat;
  }

  /**
   * Isole le corps de chaque `model` par comptage d'accolades, pas par un
   * `[^}]*` qui s'arrête à la première accolade fermante rencontrée — y
   * compris celle d'un commentaire (ex. `// JSON : { "a": 1 }` dans
   * `DiagAnswer` ou `ArticleAuthor`). Un `[^}]*` tronqué là ferait passer
   * inaperçu tout champ `*En` ajouté après ce commentaire : c'est exactement
   * ce que ce test doit détecter.
   */
  function corpsParModele(): Map<string, string> {
    const resultat = new Map<string, string>();
    const debutRegex = /model\s+(\w+)\s*\{/g;
    let debutMatch: RegExpExecArray | null;
    while ((debutMatch = debutRegex.exec(schema))) {
      const nom = debutMatch[1];
      const debutCorps = debutRegex.lastIndex;
      let profondeur = 1;
      let i = debutCorps;
      for (; i < schema.length && profondeur > 0; i++) {
        if (schema[i] === "{") profondeur += 1;
        else if (schema[i] === "}") profondeur -= 1;
      }
      resultat.set(nom, schema.slice(debutCorps, i - 1));
      debutRegex.lastIndex = i;
    }
    return resultat;
  }

  it("chaque champ *En du schéma figure au registre, sauf exclusion nommée", () => {
    const duSchema = champsEnParModele();
    for (const [modele, champsEn] of duSchema) {
      const entree = MODELES_TRADUISIBLES.find((m) => m.cle === modele);
      const exclus = EXCLUSIONS[modele] ?? [];
      for (const champEn of champsEn) {
        if (exclus.includes(champEn)) continue;
        assert.ok(
          entree,
          `${modele} porte ${champEn} en base mais n'a aucune entrée au registre`,
        );
        const present = entree!.champs.some((c) => c.en === champEn);
        assert.ok(present, `${modele}.${champEn} existe en base mais pas au registre`);
      }
    }
  });

  it("chaque entrée du registre correspond à un champ réellement présent au schéma", () => {
    const champsEnDuSchema = champsEnParModele();
    const tousLesChamps = tousLesChampsParModele();
    for (const modele of MODELES_TRADUISIBLES) {
      const champsEn = champsEnDuSchema.get(modele.cle) ?? [];
      const champsDuModele = tousLesChamps.get(modele.cle);
      assert.ok(champsDuModele, `${modele.cle} du registre n'existe pas dans le schéma`);
      for (const champ of modele.champs) {
        assert.ok(
          champsEn.includes(champ.en),
          `${modele.cle}.${champ.en} figure au registre mais pas au schéma`,
        );
        // Le champ français lui-même doit exister tel quel : c'est ce qui
        // aurait détecté à l'écriture un `label` inventé là où le schéma
        // porte en réalité `labelFr` (DiagStep, ProductTag).
        assert.ok(
          champsDuModele!.has(champ.fr),
          `${modele.cle}.${champ.fr} figure au registre mais pas au schéma`,
        );
      }
    }
  });
});
