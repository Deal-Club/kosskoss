import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { messageDErreur, signalerIncident } from "./incident";

/** Remplace `console.error` le temps d'un appel, et rend ce qui y a été écrit. */
function capturer(fn: () => void): string[] {
  const lignes: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lignes.push(args.map(String).join(" "));
  };
  try {
    fn();
  } finally {
    console.error = original;
  }
  return lignes;
}

describe("messageDErreur", () => {
  it("rend le message d'une Error", () => {
    assert.equal(messageDErreur(new Error("base injoignable")), "base injoignable");
  });

  it("rend le nom quand l'Error n'a pas de message", () => {
    // Une erreur sans message laisserait une ligne de journal vide, donc
    // inutile : le nom du type est le dernier renseignement disponible.
    assert.equal(messageDErreur(new TypeError()), "TypeError");
  });

  it("accepte une chaîne rejetée telle quelle", () => {
    // Une promesse peut être rejetée avec autre chose qu'une Error.
    assert.equal(messageDErreur("délai dépassé"), "délai dépassé");
  });

  it("ne rend jamais une chaîne vide pour une valeur inattendue", () => {
    for (const valeur of [undefined, null, 42, {}, []]) {
      assert.ok(messageDErreur(valeur).length > 0, String(valeur));
    }
  });
});

describe("signalerIncident", () => {
  it("journalise le contexte et le message", () => {
    const lignes = capturer(() =>
      signalerIncident({ contexte: "fiche produit", message: "base injoignable" }),
    );
    assert.equal(lignes.length, 1);
    assert.match(lignes[0], /fiche produit/);
    assert.match(lignes[0], /base injoignable/);
  });

  it("ajoute le chemin et l'empreinte quand ils existent", () => {
    const lignes = capturer(() =>
      signalerIncident({
        contexte: "tunnel",
        message: "échec",
        chemin: "/commande",
        empreinte: "a1b2c3",
      }),
    );
    assert.match(lignes[0], /chemin=\/commande/);
    assert.match(lignes[0], /empreinte=a1b2c3/);
  });

  it("n'écrit ni chemin ni empreinte quand ils manquent", () => {
    // Une ligne parsemée de « chemin=undefined » se relit mal, et un journal
    // qu'on ne relit pas ne sert à rien.
    const lignes = capturer(() => signalerIncident({ contexte: "accueil", message: "échec" }));
    assert.doesNotMatch(lignes[0], /undefined/);
  });

  it("ne lève jamais, même si la journalisation échoue", () => {
    // Le visiteur voit déjà une page en défaut : une exception ici
    // remplacerait un message lisible par un écran blanc.
    const original = console.error;
    console.error = () => {
      throw new Error("journal indisponible");
    };
    try {
      assert.doesNotThrow(() => signalerIncident({ contexte: "x", message: "y" }));
    } finally {
      console.error = original;
    }
  });
});
