import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bornesRaccourci, estRaccourci, formatJourIso, periodeDepuisUrl } from "./periode";

// Un mercredi, en milieu de journée : les bornes doivent s'étendre au jour
// entier, pas s'arrêter à l'heure de consultation.
const MAINTENANT = new Date(2026, 7, 19, 14, 30, 0);

describe("formatJourIso", () => {
  it("rend le jour local, pas le jour UTC", () => {
    // 23 h 30 heure locale bascule en UTC le lendemain ; l'écran affiche des
    // jours locaux, et un décalage d'un jour ferait mentir l'histogramme.
    assert.equal(formatJourIso(new Date(2026, 7, 19, 23, 30)), "2026-08-19");
  });

  it("complète le mois et le jour à deux chiffres", () => {
    assert.equal(formatJourIso(new Date(2026, 0, 5)), "2026-01-05");
  });
});

describe("bornesRaccourci", () => {
  it("« 7j » couvre sept jours, aujourd'hui compris", () => {
    const { du, au } = bornesRaccourci("7j", MAINTENANT);
    assert.equal(formatJourIso(du), "2026-08-13");
    assert.equal(formatJourIso(au), "2026-08-19");
  });

  it("« 30j » couvre trente jours, aujourd'hui compris", () => {
    const { du } = bornesRaccourci("30j", MAINTENANT);
    assert.equal(formatJourIso(du), "2026-07-21");
  });

  it("« mois » part du premier du mois en cours", () => {
    const { du, au } = bornesRaccourci("mois", MAINTENANT);
    assert.equal(formatJourIso(du), "2026-08-01");
    assert.equal(formatJourIso(au), "2026-08-19");
  });

  it("« annee » part du premier janvier", () => {
    const { du } = bornesRaccourci("annee", MAINTENANT);
    assert.equal(formatJourIso(du), "2026-01-01");
  });

  it("ouvre la borne basse à minuit et ferme la haute à la fin du jour", () => {
    // Sans la fin de journée, une période « du 1er au 31 » perdrait toutes les
    // ventes du 31 après minuit — c'est-à-dire toutes.
    const { du, au } = bornesRaccourci("7j", MAINTENANT);
    assert.equal(du.getHours(), 0);
    assert.equal(du.getMinutes(), 0);
    assert.equal(au.getHours(), 23);
    assert.equal(au.getMinutes(), 59);
    assert.equal(au.getSeconds(), 59);
  });
});

describe("estRaccourci", () => {
  it("reconnaît les quatre raccourcis", () => {
    for (const valeur of ["7j", "30j", "mois", "annee"]) {
      assert.equal(estRaccourci(valeur), true);
    }
  });

  it("refuse tout le reste", () => {
    assert.equal(estRaccourci("semaine"), false);
    assert.equal(estRaccourci(""), false);
    assert.equal(estRaccourci(undefined), false);
  });
});

describe("periodeDepuisUrl", () => {
  it("ouvre sur trente jours quand l'URL ne dit rien", () => {
    const periode = periodeDepuisUrl({}, MAINTENANT);
    assert.equal(formatJourIso(periode.du), "2026-07-21");
    assert.equal(formatJourIso(periode.au), "2026-08-19");
    assert.equal(periode.raccourci, "30j");
  });

  it("suit le raccourci demandé", () => {
    const periode = periodeDepuisUrl({ p: "mois" }, MAINTENANT);
    assert.equal(formatJourIso(periode.du), "2026-08-01");
    assert.equal(periode.raccourci, "mois");
  });

  it("accepte deux dates explicites", () => {
    const periode = periodeDepuisUrl({ du: "2026-03-01", au: "2026-03-31" }, MAINTENANT);
    assert.equal(formatJourIso(periode.du), "2026-03-01");
    assert.equal(formatJourIso(periode.au), "2026-03-31");
    assert.equal(periode.raccourci, null);
  });

  it("fait primer le raccourci sur les dates", () => {
    // Les boutons réécrivent l'URL ; laisser traîner d'anciennes dates ferait
    // afficher une période que plus aucun bouton ne montre comme actif.
    const periode = periodeDepuisUrl({ p: "7j", du: "2026-03-01", au: "2026-03-31" }, MAINTENANT);
    assert.equal(formatJourIso(periode.du), "2026-08-13");
    assert.equal(periode.raccourci, "7j");
  });

  it("retombe sur le défaut quand une date est illisible", () => {
    const periode = periodeDepuisUrl({ du: "hier", au: "2026-03-31" }, MAINTENANT);
    assert.equal(periode.raccourci, "30j");
  });

  it("retombe sur le défaut quand les dates sont inversées", () => {
    // Un écran vide sans explication laisserait croire à une absence de ventes.
    const periode = periodeDepuisUrl({ du: "2026-03-31", au: "2026-03-01" }, MAINTENANT);
    assert.equal(periode.raccourci, "30j");
  });

  it("accepte une période d'un seul jour", () => {
    const periode = periodeDepuisUrl({ du: "2026-03-15", au: "2026-03-15" }, MAINTENANT);
    assert.equal(formatJourIso(periode.du), "2026-03-15");
    assert.equal(formatJourIso(periode.au), "2026-03-15");
    assert.equal(periode.au.getHours(), 23);
  });

  it("ignore une seule des deux dates", () => {
    // Une borne sans l'autre n'est pas une période ; le champ à moitié rempli
    // ne doit pas produire un intervalle inventé.
    assert.equal(periodeDepuisUrl({ du: "2026-03-01" }, MAINTENANT).raccourci, "30j");
    assert.equal(periodeDepuisUrl({ au: "2026-03-31" }, MAINTENANT).raccourci, "30j");
  });
});
