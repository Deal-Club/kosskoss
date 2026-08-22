// Ce test lit le système de fichiers : c'est délibéré. Il est le seul garde-fou
// qui survivra aux lots suivants — sans lui, une route ajoutée sans droit
// déclaré s'ouvrirait en silence.
import assert from "node:assert/strict";
import { readdirSync, existsSync } from "node:fs";
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
