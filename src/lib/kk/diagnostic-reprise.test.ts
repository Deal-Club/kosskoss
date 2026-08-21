import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { questionnaireEntame } from "./diagnostic-reprise";

describe("questionnaireEntame", () => {
  it("ne voit aucun progrès dans l'état écrit au premier rendu", () => {
    // Le cas qui comptait : le parcours enregistre `{qIndex:0, answers:{}}` dès
    // le montage. La clé existe, mais rien n'a été répondu — un client connecté
    // doit se voir proposer sa routine, pas la question 1.
    assert.equal(questionnaireEntame('{"qIndex":0,"answers":{}}'), false);
  });

  it("reconnaît un questionnaire entamé par la question courante", () => {
    assert.equal(questionnaireEntame('{"qIndex":2,"answers":{}}'), true);
  });

  it("reconnaît un questionnaire entamé par une réponse déjà donnée", () => {
    // Répondre à la question 1 sans avoir encore cliqué « Suivant » laisse
    // `qIndex` à 0 : c'est `answers` qui porte le progrès.
    assert.equal(questionnaireEntame('{"qIndex":0,"answers":{"q1":"a2"}}'), true);
  });

  it("traite l'absence de valeur comme un questionnaire non entamé", () => {
    assert.equal(questionnaireEntame(null), false);
    assert.equal(questionnaireEntame(undefined), false);
    assert.equal(questionnaireEntame(""), false);
  });

  it("ne lève jamais sur une valeur corrompue", () => {
    // Stockage abîmé, format d'une version antérieure, valeur posée par un
    // autre script : rien de tout cela ne doit faire tomber l'écran d'entrée.
    assert.equal(questionnaireEntame("{ceci n'est pas du JSON"), false);
    assert.equal(questionnaireEntame("null"), false);
    assert.equal(questionnaireEntame('"une chaîne"'), false);
    assert.equal(questionnaireEntame("[1,2,3]"), false);
    assert.equal(questionnaireEntame('{"qIndex":"3"}'), false);
  });
});
