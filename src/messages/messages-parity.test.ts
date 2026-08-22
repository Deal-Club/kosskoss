import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * Le seul garde-fou qui protège la parité entre `fr.json` et `en.json`.
 *
 * Le site sert next-intl : une clé absente d'un des deux fichiers ne casse
 * rien à la compilation — elle casse le RENDU, à l'exécution, sur la seule
 * locale où elle manque. Rien d'autre dans la chaîne (`tsc`, `eslint`, la
 * revue humaine d'un diff de plusieurs centaines de lignes) ne le détecte de
 * façon fiable. C'est ce test, et lui seul, qui doit tomber si une traduction
 * est faite à moitié.
 *
 * Relu à la lumière de trois garde-fous du projet qui se sont révélés plus
 * faibles qu'annoncé (voir traductions.test.ts, § « registre face au
 * schéma ») :
 *   — ne pas se fier à un nom de fichier ou de dossier : ce test lit le
 *     contenu réel des deux fichiers, clé par clé ;
 *   — ne pas s'arrêter à un seul point de contrôle : les TROIS conditions
 *     (aucune clé manquante d'un côté, aucune manquante de l'autre, aucune
 *     valeur vide) sont vérifiées indépendamment, avec un message qui nomme
 *     la clé fautive ;
 *   — ne pas couper au premier caractère structurel rencontré : la lecture
 *     passe par `JSON.parse`, pas par une regex qui s'arrêterait à la
 *     première accolade venue (un commentaire n'existe pas en JSON, mais le
 *     principe — parser le format réel plutôt que le deviner au regex — est
 *     le même que celui qui a fait tomber le garde-fou de traductions.ts).
 *
 * Éprouvé par mutation (voir le rapport de la tâche 5) : une clé ajoutée dans
 * un seul des deux fichiers, ou une valeur vidée d'un seul côté, fait tomber
 * ce test.
 */

const MESSAGES_DIR = __dirname;

function chargerMessages(nom: "fr" | "en"): Record<string, unknown> {
  const brut = readFileSync(path.join(MESSAGES_DIR, `${nom}.json`), "utf8");
  return JSON.parse(brut) as Record<string, unknown>;
}

/**
 * Aplatit l'arbre de messages en couples `chemin.pointé -> valeur`.
 *
 * Une valeur qui n'est ni un objet ni une chaîne (nombre, booléen, tableau…)
 * est un format que ce module de messages n'utilise nulle part aujourd'hui
 * (vérifié : voir la note ci-dessous) ; la faire échouer plutôt que
 * l'ignorer évite qu'une clé de ce genre échappe silencieusement à la
 * vérification de parité.
 */
function aplatir(o: Record<string, unknown>, prefixe = ""): Map<string, string> {
  const sortie = new Map<string, string>();
  for (const cle of Object.keys(o)) {
    const valeur = o[cle];
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    if (valeur !== null && typeof valeur === "object" && !Array.isArray(valeur)) {
      for (const [c, v] of aplatir(valeur as Record<string, unknown>, chemin)) sortie.set(c, v);
    } else if (typeof valeur === "string") {
      sortie.set(chemin, valeur);
    } else {
      throw new Error(`${chemin} : valeur d'un type inattendu (${typeof valeur}), ni objet ni chaîne`);
    }
  }
  return sortie;
}

describe("parité des messages fr.json / en.json", () => {
  const fr = aplatir(chargerMessages("fr"));
  const en = aplatir(chargerMessages("en"));

  it("aucune clé n'est présente dans fr.json et absente d'en.json", () => {
    const manquantes = [...fr.keys()].filter((c) => !en.has(c)).sort();
    assert.deepEqual(manquantes, [], `clés manquantes dans en.json : ${manquantes.join(", ")}`);
  });

  it("aucune clé n'est présente dans en.json et absente de fr.json", () => {
    const manquantes = [...en.keys()].filter((c) => !fr.has(c)).sort();
    assert.deepEqual(manquantes, [], `clés manquantes dans fr.json : ${manquantes.join(", ")}`);
  });

  it("fr.json ne contient aucune valeur vide (ni faite d'espaces)", () => {
    const vides = [...fr.entries()].filter(([, v]) => v.trim() === "").map(([c]) => c).sort();
    assert.deepEqual(vides, [], `valeurs vides dans fr.json : ${vides.join(", ")}`);
  });

  it("en.json ne contient aucune valeur vide (ni faite d'espaces)", () => {
    const vides = [...en.entries()].filter(([, v]) => v.trim() === "").map(([c]) => c).sort();
    assert.deepEqual(vides, [], `valeurs vides dans en.json : ${vides.join(", ")}`);
  });

  it("les deux fichiers comptent exactement le même nombre de clés", () => {
    // Redondant avec les deux premiers tests si l'ensemble des clés est
    // identique ; gardé quand même comme filet séparé — un décompte qui
    // diverge alors que les deux `deepEqual` ci-dessus passent signalerait un
    // bug dans `aplatir` elle-même (une collision de chemin, par exemple).
    assert.equal(fr.size, en.size);
  });
});
