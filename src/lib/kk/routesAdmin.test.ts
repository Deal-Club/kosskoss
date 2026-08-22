// Ce test lit le système de fichiers : c'est délibéré. Il est le seul garde-fou
// qui survivra aux lots suivants — sans lui, une route ajoutée sans droit
// déclaré s'ouvrirait en silence.
//
// Il ne s'arrête pas au premier niveau de dossier : la majorité des routes
// existantes sont déjà des sous-chemins (products/export, journal/bulk,
// campaigns/[id]/launch…), donc un garde-fou qui ne regarde que le dossier de
// tête laisse passer le cas le plus courant. Il descend donc dans chaque
// dossier, ouvre chaque route.ts et chaque page.tsx, et vérifie deux choses :
// que le fichier appelle bien le garde attendu, et que la capacité qu'il
// réclame est celle que la carte donne à sa famille.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, it } from "node:test";
import { CAPACITE_PAR_FAMILLE, FAMILLES_SANS_SESSION, capaciteDeFamille } from "./routesAdmin";
import { CAPACITES } from "./roles";

function familles(racine: string): string[] {
  if (!existsSync(racine)) return [];
  return readdirSync(racine, { withFileTypes: true })
    .filter((entree) => entree.isDirectory())
    .map((entree) => entree.name)
    .filter((nom) => !nom.startsWith("(") && !nom.startsWith("["));
}

/** Chemins, relatifs à `racine` et en slashs, de chaque fichier nommé `nomFichier`. */
function fichiers(racine: string, nomFichier: string, dossier: string = racine): string[] {
  if (!existsSync(dossier)) return [];
  let trouves: string[] = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) {
      trouves = trouves.concat(fichiers(racine, nomFichier, chemin));
    } else if (entree.isFile() && entree.name === nomFichier) {
      trouves.push(relative(racine, chemin).split(sep).join("/"));
    }
  }
  return trouves;
}

/** Premier segment d'un chemin relatif — la famille, au sens de cette carte. */
function familleDe(cheminRelatif: string): string {
  return cheminRelatif.split("/")[0];
}

describe("carte des capacités", () => {
  it("classe toutes les familles de routes d'API", () => {
    const manquantes = familles("src/app/api/admin").filter(
      (nom) =>
        !capaciteDeFamille(nom) && !(FAMILLES_SANS_SESSION as readonly string[]).includes(nom),
    );
    assert.deepEqual(
      manquantes,
      [],
      `Familles de routes sans capacité déclarée : ${manquantes.join(", ")}. ` +
        "Une route sans droit déclaré est une route ouverte.",
    );
  });

  it("classe toutes les familles d'écrans protégés", () => {
    const manquantes = familles("src/app/admin/(protected)").filter(
      (nom) =>
        !capaciteDeFamille(nom) && !(FAMILLES_SANS_SESSION as readonly string[]).includes(nom),
    );
    assert.deepEqual(
      manquantes,
      [],
      `Écrans sans capacité déclarée : ${manquantes.join(", ")}.`,
    );
  });

  it("ne classe aucune famille sous une capacité inexistante", () => {
    for (const [famille, capacite] of Object.entries(CAPACITE_PAR_FAMILLE)) {
      assert.ok(
        (CAPACITES as readonly string[]).includes(capacite),
        `${famille} réclame une capacité inconnue : ${capacite}`,
      );
    }
  });

  it("ne classe pas de famille qui n'existe plus", () => {
    // Une entrée orpheline laisse croire qu'un écran est protégé alors qu'il a
    // disparu — et masque le jour où un écran du même nom réapparaît.
    const reelles = new Set([
      ...familles("src/app/api/admin"),
      ...familles("src/app/admin/(protected)"),
    ]);
    const orphelines = Object.keys(CAPACITE_PAR_FAMILLE).filter((nom) => !reelles.has(nom));
    assert.deepEqual(orphelines, [], `Entrées sans écran ni route : ${orphelines.join(", ")}`);
  });
});

describe("chaque fichier applique — et applique correctement — le garde de sa famille", () => {
  const RACINE_API = "src/app/api/admin";
  const RACINE_PAGES = "src/app/admin/(protected)";

  /**
   * Écrans qui n'appellent délibérément pas `requireCapacitePage`, nommés
   * explicitement plutôt que devinés par convention :
   *  - `page.tsx` (la racine) est le tableau de bord ; il ne se protège pas
   *    par une capacité unique, il redirige lui-même selon celle du compte
   *    (voir AdminDashboardPage) ;
   *  - `refuse/page.tsx` est l'écran de refus : accessible à toute session,
   *    une capacité n'y aurait pas de sens.
   */
  const PAGES_SANS_CAPACITE_UNIQUE = new Set(["page.tsx", "refuse/page.tsx"]);

  function verifieAppels(
    racine: string,
    cheminsRelatifs: string[],
    fonctionGarde: string,
    exclusions: (famille: string, cheminRelatif: string) => boolean,
  ): string[] {
    const problemes: string[] = [];
    const motif = new RegExp(`${fonctionGarde}\\(\\s*"([a-z]+)"\\s*\\)`, "g");

    for (const cheminRelatif of cheminsRelatifs) {
      const famille = familleDe(cheminRelatif);
      if (exclusions(famille, cheminRelatif)) continue;

      const cheminAbsolu = join(racine, cheminRelatif);
      const contenu = readFileSync(cheminAbsolu, "utf8");
      const attendue = capaciteDeFamille(famille);

      if (!attendue) {
        problemes.push(
          `${racine}/${cheminRelatif} : famille "${famille}" absente de CAPACITE_PAR_FAMILLE.`,
        );
        continue;
      }

      const appels = [...contenu.matchAll(motif)].map((m) => m[1]);
      if (appels.length === 0) {
        problemes.push(
          `${racine}/${cheminRelatif} : n'appelle jamais ${fonctionGarde}(). ` +
            `Attendu : ${fonctionGarde}("${attendue}").`,
        );
        continue;
      }
      for (const capacite of appels) {
        if (capacite !== attendue) {
          problemes.push(
            `${racine}/${cheminRelatif} : ${fonctionGarde}("${capacite}") ne correspond pas à ` +
              `la capacité "${attendue}" que CAPACITE_PAR_FAMILLE donne à la famille "${famille}".`,
          );
        }
      }
    }
    return problemes;
  }

  it("chaque route.ts appelle requireCapaciteApi avec la capacité de sa famille", () => {
    const problemes = verifieAppels(
      RACINE_API,
      fichiers(RACINE_API, "route.ts"),
      "requireCapaciteApi",
      (famille) => (FAMILLES_SANS_SESSION as readonly string[]).includes(famille),
    );
    assert.deepEqual(problemes, [], problemes.join("\n"));
  });

  it("chaque page.tsx protégé appelle requireCapacitePage avec la capacité de sa famille", () => {
    const problemes = verifieAppels(
      RACINE_PAGES,
      fichiers(RACINE_PAGES, "page.tsx"),
      "requireCapacitePage",
      (_famille, cheminRelatif) => PAGES_SANS_CAPACITE_UNIQUE.has(cheminRelatif),
    );
    assert.deepEqual(problemes, [], problemes.join("\n"));
  });
});
