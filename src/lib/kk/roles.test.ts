import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CAPACITES, ROLES, capacitesDe, estRoleConnu, peut } from "./roles";

describe("peut", () => {
  it("ouvre tout au superadmin et au propriétaire", () => {
    for (const capacite of CAPACITES) {
      assert.equal(peut("superadmin", capacite), true, `superadmin / ${capacite}`);
      assert.equal(peut("owner", capacite), true, `owner / ${capacite}`);
    }
  });

  it("ouvre tout à l'administrateur SAUF la gestion des comptes", () => {
    // La séparation qui compte : un administrateur ne se donne pas de droits.
    assert.equal(peut("admin", "acces"), false);
    for (const capacite of CAPACITES.filter((c) => c !== "acces")) {
      assert.equal(peut("admin", capacite), true, `admin / ${capacite}`);
    }
  });

  it("n'ouvre au gestionnaire que les commandes", () => {
    assert.equal(peut("gestionnaire", "commandes"), true);
    for (const capacite of CAPACITES.filter((c) => c !== "commandes")) {
      assert.equal(peut("gestionnaire", capacite), false, `gestionnaire / ${capacite}`);
    }
  });

  it("refuse tout à un rôle inconnu", () => {
    // Une valeur inattendue en base — faute de frappe, rôle d'une version
    // future — ne doit pas ouvrir les portes. Le refus est la position sûre.
    for (const capacite of CAPACITES) {
      assert.equal(peut("directeur" as never, capacite), false, capacite);
      assert.equal(peut("" as never, capacite), false, capacite);
    }
  });
});

describe("estRoleConnu", () => {
  it("reconnaît les quatre rôles", () => {
    for (const role of ROLES) assert.equal(estRoleConnu(role), true, role);
  });

  it("refuse tout le reste", () => {
    assert.equal(estRoleConnu("directeur"), false);
    assert.equal(estRoleConnu("ADMIN"), false);
    assert.equal(estRoleConnu(""), false);
    assert.equal(estRoleConnu(undefined), false);
  });
});

describe("capacitesDe", () => {
  it("rend les capacités du rôle", () => {
    assert.deepEqual(capacitesDe("gestionnaire"), ["commandes"]);
  });

  it("rend une liste vide pour un rôle inconnu", () => {
    assert.deepEqual(capacitesDe("directeur" as never), []);
  });

  it("s'accorde avec peut() pour chaque rôle", () => {
    // Deux façons de lire la même matrice : si elles divergent, le menu
    // montrerait des entrées qui mènent à un refus.
    for (const role of ROLES) {
      for (const capacite of CAPACITES) {
        assert.equal(
          capacitesDe(role).includes(capacite),
          peut(role, capacite),
          `${role} / ${capacite}`,
        );
      }
    }
  });
});
