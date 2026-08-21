# Lot 3A — Réglages dynamiques : plan d'implémentation

> **Pour les agents :** SOUS-COMPÉTENCE REQUISE — utiliser `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans` pour dérouler ce plan tâche par tâche.
> Les étapes utilisent la syntaxe à cases (`- [ ]`) pour le suivi.

**Goal :** rendre le critère d'acceptation 16 satisfait — numéro WhatsApp, lien du
formulaire d'évaluation et identifiants de mesure modifiables en administration, sans
redéploiement.

**Architecture :** une clé `Setting` portant un JSON, sur le motif déjà employé trois fois
dans le projet. Les types, les valeurs par défaut et la normalisation vivent dans
`src/lib/kk` — pur, sans Prisma — parce que le back-office est un composant client et ne
peut pas importer un module serveur. La lecture est mémoïsée par `cache()` de React et
retombe sur la variable d'environnement tant que le réglage est vide, pour qu'aucun
déploiement ne casse.

**Tech Stack :** Next.js 16 (App Router), React 19, TypeScript strict, Prisma 7.9 sur
PostgreSQL (Neon), `node --test` avec `tsx`.

**Spec :** [`docs/superpowers/specs/2026-08-21-lot3a-reglages-dynamiques-design.md`](../specs/2026-08-21-lot3a-reglages-dynamiques-design.md)

---

## Global Constraints

- **Aucune migration.** Le modèle `Setting` existe déjà : `key` en clé primaire, `value` en
  chaîne, `updatedAt`. Ce sous-lot n'en crée aucun autre et ne touche pas au schéma.
- **Ce qui part dans le HTML va dans `Setting`, ce qui reste au serveur va dans
  `Integration`.** Aucun secret dans ce JSON. Le jeton de l'API Conversions appartient au
  lot de mesure d'audience et à `Integration`, qui le chiffre.
- **`NEXT_PUBLIC_WHATSAPP_NUMBER` n'est PAS supprimée** dans ce sous-lot. La retirer pendant
  que la production tourne encore sur l'ancien code casserait le site entre le déploiement
  et la propagation.
- **Frontière serveur/client :** tout ce qu'un composant client doit connaître vit dans
  `src/lib/kk`, sans import de Prisma. Le module `src/server/kk` réexporte, pour que les
  appelants serveur n'aient qu'un import à faire. C'est le motif de
  `src/server/announcements.ts:24-34` ; le suivre, ne pas en inventer un autre.
- **Tests :** fichiers `*.test.ts` à côté du module testé, sous `src/`. Style `node:test`
  + `node:assert/strict`, `describe` / `it`, en français. Aucun accès base dans les tests.
- **Lancer un test :** `node --test --import tsx <chemin>`
- **Lancer la suite :** `npm test`. Point de départ : **434 tests au vert**. Chaque tâche
  annonce le total attendu ; aucune ne doit le faire baisser.
- **Avant chaque commit :** `npx tsc --noEmit` puis `npx eslint`, tous deux sans sortie.
  Les tâches touchant un composant React ajoutent `npx next build`.
- **Le seed prévu par la spec n'est pas réalisé, et c'est délibéré.** La spec proposait
  d'initialiser le réglage avec la valeur de la variable d'environnement. Le repli de
  `numeroWhatsappEffectif` rend ce seed inutile : tant que le réglage est vide, la variable
  sert déjà. Deux mécanismes pour un seul besoin auraient divergé — le seed ne s'exécutant
  qu'une fois, un opérateur qui l'oublie n'aurait aucun filet.
- **Commentaires en français**, expliquant le *pourquoi*, à la densité du code existant.
- **TypeScript strict, aucun `any`.**

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/lib/kk/parametres.ts` | Types, valeurs par défaut, normalisation, validation. Pur. |
| `src/lib/kk/parametres.test.ts` | Tests de la normalisation et de la validation. |
| `src/server/kk/parametres.ts` | Lecture mémoïsée avec repli, écriture. Tire Prisma. |
| `src/app/api/admin/parametres/route.ts` | Écriture, protégée. |
| `src/app/admin/(protected)/parametres/page.tsx` | Écran. |
| `src/components/admin/ParametresAdmin.tsx` | Formulaire. |
| `src/components/kk/chrome.tsx` | *(modifié)* reçoit le numéro au lieu de lire l'env. |
| `src/components/WhatsAppButton.tsx` | *(modifié)* idem. |

---

## Ordre des tâches

**1 → 2 → 3 → 4.** La 2 ne peut pas normaliser sans les fonctions de la 1 ; la 3 écrit par
la 2 ; la 4 branche ce que la 2 lit. Aucune n'est interchangeable.

---

### Task 1 : Types, normalisation et validation

**Files:**
- Create: `src/lib/kk/parametres.ts`
- Create: `src/lib/kk/parametres.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `type ParametresBoutique = { whatsapp: string; formulaireEvaluation: string; ga4: string; metaPixel: string }` ;
  `PARAMETRES_PAR_DEFAUT: ParametresBoutique` ;
  `normaliserParametres(brut: unknown): ParametresBoutique` ;
  `numeroWhatsappValide(v: string): boolean` ; `lienEvaluationValide(v: string): boolean` ;
  `identifiantGa4Valide(v: string): boolean` ; `identifiantPixelValide(v: string): boolean`.

**Pourquoi ce module est pur.** Le formulaire d'administration est un composant client : il
ne peut pas importer un module qui tire Prisma. Le projet a déjà tranché cette question pour
les annonces (`src/server/announcements.ts:24-28`) — types et normalisation dans
`src/lib/kk`, accès base dans `src/server`, réexport par le second.

**Les quatre champs sont facultatifs.** Une boutique sans Pixel doit pouvoir enregistrer les
trois autres. « Vide » est donc toujours valide ; la validation n'attrape que la valeur
présente et mal formée.

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// src/lib/kk/parametres.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  identifiantGa4Valide,
  identifiantPixelValide,
  lienEvaluationValide,
  normaliserParametres,
  numeroWhatsappValide,
  PARAMETRES_PAR_DEFAUT,
} from "./parametres";

describe("numeroWhatsappValide", () => {
  it("accepte un numéro international en chiffres", () => {
    assert.equal(numeroWhatsappValide("237658013646"), true);
  });

  it("accepte le vide : le réglage est facultatif", () => {
    assert.equal(numeroWhatsappValide(""), true);
  });

  it("refuse ce qui n'est pas un numéro", () => {
    // wa.me n'accepte que des chiffres : une lettre produirait un lien mort,
    // et rien ne le signalerait avant qu'un client clique.
    assert.equal(numeroWhatsappValide("appelez-moi"), false);
  });
});

describe("lienEvaluationValide", () => {
  it("accepte une adresse https", () => {
    assert.equal(lienEvaluationValide("https://forms.gle/abc123"), true);
  });

  it("accepte le vide", () => {
    assert.equal(lienEvaluationValide(""), true);
  });

  it("refuse http en clair", () => {
    // Ce lien part au client par WhatsApp : il ne doit pas l'emmener sur une
    // page non chiffrée.
    assert.equal(lienEvaluationValide("http://forms.gle/abc123"), false);
  });

  it("refuse ce qui n'est pas une adresse", () => {
    assert.equal(lienEvaluationValide("forms.gle/abc123"), false);
  });
});

describe("identifiantGa4Valide", () => {
  it("accepte un identifiant de mesure", () => {
    assert.equal(identifiantGa4Valide("G-ABCDE12345"), true);
  });

  it("accepte le vide", () => {
    assert.equal(identifiantGa4Valide(""), true);
  });

  it("refuse un identifiant sans le préfixe", () => {
    // Une mesure qui ne remonte pas ne se signale jamais d'elle-même : c'est
    // la faute de frappe qu'il faut attraper ici, pas l'existence du compte.
    assert.equal(identifiantGa4Valide("ABCDE12345"), false);
  });
});

describe("identifiantPixelValide", () => {
  it("accepte une suite de chiffres", () => {
    assert.equal(identifiantPixelValide("123456789012345"), true);
  });

  it("accepte le vide", () => {
    assert.equal(identifiantPixelValide(""), true);
  });

  it("refuse une valeur non numérique", () => {
    assert.equal(identifiantPixelValide("pixel-1"), false);
  });
});

describe("normaliserParametres", () => {
  it("relit ce qui a été écrit", () => {
    const source = {
      whatsapp: "237658013646",
      formulaireEvaluation: "https://forms.gle/abc123",
      ga4: "G-ABCDE12345",
      metaPixel: "123456789012345",
    };
    assert.deepEqual(normaliserParametres(source), source);
  });

  it("rogne les valeurs", () => {
    // Un identifiant stocké avec une espace ne correspondrait à rien, sans la
    // moindre erreur nulle part.
    const rendu = normaliserParametres({ ga4: "  G-ABCDE12345  " });
    assert.equal(rendu.ga4, "G-ABCDE12345");
  });

  it("ne garde que les chiffres du numéro", () => {
    assert.equal(normaliserParametres({ whatsapp: "+237 658 01 36 46" }).whatsapp, "237658013646");
  });

  it("rend les valeurs par défaut sur une entrée absente", () => {
    assert.deepEqual(normaliserParametres(null), PARAMETRES_PAR_DEFAUT);
    assert.deepEqual(normaliserParametres(undefined), PARAMETRES_PAR_DEFAUT);
  });

  it("rend les valeurs par défaut sur une entrée qui n'est pas un objet", () => {
    // Une colonne abîmée ne doit pas faire tomber une page.
    assert.deepEqual(normaliserParametres("cassé"), PARAMETRES_PAR_DEFAUT);
    assert.deepEqual(normaliserParametres(42), PARAMETRES_PAR_DEFAUT);
  });

  it("écarte les champs qui ne sont pas des chaînes", () => {
    assert.deepEqual(normaliserParametres({ ga4: 42, metaPixel: null }), PARAMETRES_PAR_DEFAUT);
  });

  it("complète les champs manquants sans perdre les autres", () => {
    const rendu = normaliserParametres({ whatsapp: "237658013646" });
    assert.equal(rendu.whatsapp, "237658013646");
    assert.equal(rendu.ga4, "");
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `node --test --import tsx src/lib/kk/parametres.test.ts`
Expected: FAIL — `Cannot find module './parametres'`

- [ ] **Step 3 : Écrire le module**

```ts
// src/lib/kk/parametres.ts

/**
 * Réglages de la boutique modifiables en administration.
 *
 * ── POURQUOI CE MODULE EST PUR ──────────────────────────────────────────────
 *
 * Le formulaire d'administration est un composant client : il ne peut pas
 * importer un module qui tire Prisma. Types, valeurs par défaut et normalisation
 * vivent donc ici, et `src/server/kk/parametres.ts` les réexporte pour que les
 * appelants serveur n'aient qu'un import à faire. C'est exactement ce que fait
 * déjà `src/server/announcements.ts` pour le bandeau d'annonces.
 *
 * ── CE QUI N'A PAS SA PLACE ICI ─────────────────────────────────────────────
 *
 * Aucun secret. Ces valeurs partent dans le HTML ou dans un lien cliquable ;
 * le jeton de l'API Conversions, lui, doit rester au serveur et va dans
 * `Integration`, qui le chiffre.
 */

export interface ParametresBoutique {
  /** Numéro WhatsApp de la boutique, en chiffres seuls. */
  whatsapp: string;
  /** Lien du formulaire d'évaluation, envoyé au client après livraison. */
  formulaireEvaluation: string;
  /** Identifiant de mesure GA4. */
  ga4: string;
  /** Identifiant du Pixel Meta. */
  metaPixel: string;
}

/**
 * Tout est vide par défaut, et c'est voulu : une boutique qui n'a pas encore de
 * Pixel doit pouvoir enregistrer les trois autres réglages.
 */
export const PARAMETRES_PAR_DEFAUT: ParametresBoutique = {
  whatsapp: "",
  formulaireEvaluation: "",
  ga4: "",
  metaPixel: "",
};

/** `wa.me` n'accepte que des chiffres : une lettre produirait un lien mort. */
export function numeroWhatsappValide(valeur: string): boolean {
  return valeur === "" || /^\d{6,20}$/.test(valeur);
}

/**
 * Ce lien part au client par WhatsApp. `https` est exigé : on ne l'emmène pas
 * sur une page non chiffrée.
 */
export function lienEvaluationValide(valeur: string): boolean {
  return valeur === "" || /^https:\/\/\S+$/.test(valeur);
}

/**
 * Identifiant de mesure GA4, de la forme « G-XXXXXXXXXX ».
 *
 * Le motif n'atteste pas que le compte existe — rien ne le peut depuis un
 * formulaire. Il attrape la faute de frappe, qui est le cas réel : une mesure
 * qui ne remonte pas ne se signale jamais d'elle-même.
 */
export function identifiantGa4Valide(valeur: string): boolean {
  return valeur === "" || /^G-[A-Z0-9]{6,12}$/.test(valeur);
}

/** Identifiant du Pixel Meta : une suite de chiffres. */
export function identifiantPixelValide(valeur: string): boolean {
  return valeur === "" || /^\d{8,20}$/.test(valeur);
}

/** Lit un champ texte, rogné, ou rend la chaîne vide. */
function texte(source: Record<string, unknown>, cle: string): string {
  const valeur = source[cle];
  return typeof valeur === "string" ? valeur.trim() : "";
}

/**
 * Rend un réglage complet à partir d'une entrée quelconque.
 *
 * Ne lève jamais : une colonne abîmée rend les valeurs par défaut plutôt que de
 * faire tomber toutes les pages du site, puisque le numéro WhatsApp est lu par
 * l'en-tête et le pied de page de chacune.
 */
export function normaliserParametres(brut: unknown): ParametresBoutique {
  if (!brut || typeof brut !== "object") return { ...PARAMETRES_PAR_DEFAUT };
  const source = brut as Record<string, unknown>;

  return {
    // Le numéro est réduit à ses chiffres : la saisie humaine y met des espaces,
    // des points et un « + » que `wa.me` refuse.
    whatsapp: texte(source, "whatsapp").replace(/\D/g, ""),
    formulaireEvaluation: texte(source, "formulaireEvaluation"),
    ga4: texte(source, "ga4"),
    metaPixel: texte(source, "metaPixel"),
  };
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `node --test --import tsx src/lib/kk/parametres.test.ts`
Expected: PASS — 18 tests

- [ ] **Step 5 : Vérifier**

Run: `npx tsc --noEmit && npx eslint && npm test`
Expected: aucune erreur, **452 tests au vert** (434 + 18)

- [ ] **Step 6 : Commit**

```bash
git add src/lib/kk/parametres.ts src/lib/kk/parametres.test.ts
git commit -m "Réglages de la boutique : types, normalisation et validation

Module pur, sans Prisma : le formulaire d'administration est un composant client
et ne peut pas importer un module serveur. C'est le découpage que le projet a
déjà retenu pour le bandeau d'annonces.

Les quatre champs sont facultatifs — une boutique sans Pixel doit pouvoir
enregistrer les trois autres. La validation n'attrape donc que la valeur
présente et mal formée, en particulier la faute de frappe sur un identifiant de
mesure : une mesure qui ne remonte pas ne se signale jamais d'elle-même.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2 : Lecture mémoïsée et écriture

**Files:**
- Create: `src/server/kk/parametres.ts`

**Interfaces:**
- Consumes: tout ce que la tâche 1 exporte.
- Produces: `getParametres(): Promise<ParametresBoutique>` ;
  `saveParametres(partiel: Partial<ParametresBoutique>): Promise<ParametresBoutique>` ;
  `numeroWhatsappEffectif(p: ParametresBoutique): string`.
  Réexporte les types et fonctions pures de la tâche 1.

**Le repli est le cœur de cette tâche.** Le numéro WhatsApp vient aujourd'hui de
`NEXT_PUBLIC_WHATSAPP_NUMBER`. Entre le déploiement de ce sous-lot et la première saisie en
administration, le réglage sera vide — et sans repli, le bouton WhatsApp disparaîtrait du
site en production.

- [ ] **Step 1 : Écrire le module**

```ts
// src/server/kk/parametres.ts
import { cache } from "react";
import { prisma } from "@/server/prisma";
import { normaliserParametres, PARAMETRES_PAR_DEFAUT, type ParametresBoutique } from "@/lib/kk/parametres";

/**
 * Réglages de la boutique, côté serveur.
 *
 * Les types, les valeurs par défaut et la normalisation vivent dans
 * `@/lib/kk/parametres`, que le back-office — composant client — peut importer.
 * On les réexporte ici pour que les appelants serveur n'aient qu'un import.
 */
export type { ParametresBoutique } from "@/lib/kk/parametres";
export {
  PARAMETRES_PAR_DEFAUT,
  normaliserParametres,
  numeroWhatsappValide,
  lienEvaluationValide,
  identifiantGa4Valide,
  identifiantPixelValide,
} from "@/lib/kk/parametres";

const CLE_REGLAGES = "boutique.parametres";

/**
 * Réglages en base.
 *
 * Mémoïsé par requête : le numéro WhatsApp est lu par l'en-tête, le pied de page
 * ET le bouton flottant. Sans `cache()`, ce serait trois requêtes par page.
 */
export const getParametres = cache(async (): Promise<ParametresBoutique> => {
  try {
    const ligne = await prisma.setting.findUnique({ where: { key: CLE_REGLAGES } });
    if (!ligne) return { ...PARAMETRES_PAR_DEFAUT };
    return normaliserParametres(JSON.parse(ligne.value));
  } catch {
    // Ligne absente, JSON abîmé, base injoignable : le site garde ses valeurs
    // par défaut plutôt que de tomber. Le numéro WhatsApp est lu sur CHAQUE
    // page ; lever ici les ferait toutes échouer.
    return { ...PARAMETRES_PAR_DEFAUT };
  }
});

/** Enregistre une modification partielle et rend l'état complet résultant. */
export async function saveParametres(
  partiel: Partial<ParametresBoutique>,
): Promise<ParametresBoutique> {
  const actuels = await getParametres();
  const fusion = normaliserParametres({ ...actuels, ...partiel });

  await prisma.setting.upsert({
    where: { key: CLE_REGLAGES },
    create: { key: CLE_REGLAGES, value: JSON.stringify(fusion) },
    update: { value: JSON.stringify(fusion) },
  });
  return fusion;
}

/**
 * Numéro effectivement utilisable, en chiffres.
 *
 * REPLI SUR LA VARIABLE D'ENVIRONNEMENT tant que le réglage est vide. Entre le
 * déploiement de ce sous-lot et la première saisie en administration, le bouton
 * WhatsApp disparaîtrait sinon du site en production.
 *
 * `NEXT_PUBLIC_WHATSAPP_NUMBER` devient morte une fois le réglage saisi, mais
 * elle n'est pas supprimée ici : la retirer pendant que la production tourne
 * encore sur l'ancien code casserait le site entre le déploiement et la
 * propagation.
 */
export function numeroWhatsappEffectif(p: ParametresBoutique): string {
  if (p.whatsapp) return p.whatsapp;
  return (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
}
```

- [ ] **Step 2 : Tester le repli**

`getParametres` et `saveParametres` demandent une base, qu'aucun harnais de test ne fournit
ici. Mais `numeroWhatsappEffectif` est une fonction pure de son argument et de
l'environnement : c'est **le** comportement dont un échec ferait disparaître le bouton
WhatsApp de la production, et il se teste.

Importer ce module dans un test est sûr : `prisma` est un `Proxy` paresseux qui n'ouvre une
connexion qu'au premier accès de propriété, écrit ainsi précisément pour que les tests
puissent importer sans base. Le test ne doit donc appeler **que** `numeroWhatsappEffectif`.

```ts
// src/server/kk/parametres.test.ts
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { numeroWhatsappEffectif, PARAMETRES_PAR_DEFAUT } from "./parametres";

const ORIGINE = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
afterEach(() => {
  if (ORIGINE === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = ORIGINE;
});

describe("numeroWhatsappEffectif", () => {
  it("préfère le réglage à la variable d'environnement", () => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "237000000000";
    assert.equal(
      numeroWhatsappEffectif({ ...PARAMETRES_PAR_DEFAUT, whatsapp: "237658013646" }),
      "237658013646",
    );
  });

  it("retombe sur la variable quand le réglage est vide", () => {
    // C'est l'état exact entre le déploiement de ce sous-lot et la première
    // saisie en administration. Sans ce repli, le bouton WhatsApp disparaîtrait
    // du site en production.
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "+237 658 01 36 46";
    assert.equal(numeroWhatsappEffectif(PARAMETRES_PAR_DEFAUT), "237658013646");
  });

  it("rend une chaîne vide quand ni l'un ni l'autre n'est renseigné", () => {
    // L'appelant décide alors de masquer le bouton : mieux vaut pas de bouton
    // qu'un lien wa.me sans numéro.
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    assert.equal(numeroWhatsappEffectif(PARAMETRES_PAR_DEFAUT), "");
  });
});
```

Run: `node --test --import tsx src/server/kk/parametres.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 3 : Vérifier**

Run: `npx tsc --noEmit && npx eslint && npm test`
Expected: aucune erreur, **455 tests au vert** (452 + 3)

- [ ] **Step 4 : Commit**

```bash
git add src/server/kk/parametres.ts
git commit -m "Lecture et écriture des réglages, avec repli

Mémoïsé par cache() : le numéro WhatsApp est lu par l'en-tête, le pied de page
et le bouton flottant, soit trois requêtes par page sans cela.

Le repli sur NEXT_PUBLIC_WHATSAPP_NUMBER n'est pas une précaution de principe :
entre le déploiement et la première saisie en administration, le réglage est
vide, et sans lui le bouton WhatsApp disparaîtrait du site en production.

Une base injoignable rend les valeurs par défaut plutôt que de lever — ce numéro
est lu sur CHAQUE page, une exception les ferait toutes échouer.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3 : Écran d'administration

**Files:**
- Create: `src/app/api/admin/parametres/route.ts`
- Create: `src/app/admin/(protected)/parametres/page.tsx`
- Create: `src/components/admin/ParametresAdmin.tsx`
- Modify: la navigation du back-office (entrée « Paramètres »)

**Interfaces:**
- Consumes: `getParametres`, `saveParametres` et les quatre fonctions de validation
  (tâche 2).
- Produces: rien pour la tâche 4.

**Ce plan pointe un patron au lieu de reproduire du code, et c'est délibéré.** Deux écrans
livrés aux lots précédents font exactement ce travail :
`src/app/admin/(protected)/products/tags/` avec `src/components/admin/TagVocabularyAdmin.tsx`
et `src/app/api/admin/vocabulaire-tags/route.ts`, puis
`src/app/admin/(protected)/diagnostic/gestes/`. Inventer un balisage produirait un écran qui
ne ressemble pas au reste du back-office.

- [ ] **Step 1 : Lire le patron de référence**

```bash
cat "src/app/admin/(protected)/diagnostic/gestes/page.tsx"
cat src/components/admin/DiagStepsAdmin.tsx
cat src/app/api/admin/diagnostic-steps/route.ts
```

Noter comment la page est protégée, comment le composant reçoit ses données du serveur, et
comment la route appelle `requireAdminApi()` **en première instruction**, valide **chaque**
champ avant **toute** écriture, et répond.

Si le patron contredit ce plan, **suivre le patron** et le signaler dans le rapport.

- [ ] **Step 2 : Vérifier que le chemin de route est libre**

```bash
ls src/app/api/admin/ | grep -i param
```

Expected: aucune sortie. Un lot précédent a buté sur un chemin déjà pris par une autre
fonction ; si quelque chose occupe celui-ci, choisir un nom qui n'entre pas en collision et
le signaler dans le rapport.

- [ ] **Step 3 : Écrire la route**

Sur le patron de `diagnostic-steps/route.ts` : `requireAdminApi()` en première instruction ;
`try/catch` sur `request.json()` → 400 ; validation des quatre champs **avant** tout appel à
`saveParametres`, par les fonctions de la tâche 1 ; message d'erreur nommant le champ fautif
et le format attendu, jamais un « données invalides » qui laisse l'administrateur deviner.

Le corps attendu est un objet aux quatre clés, toutes facultatives.

- [ ] **Step 4 : Écrire l'écran**

Quatre champs, avec pour chacun une aide sous le champ disant **où trouver la valeur** :
- Numéro WhatsApp — « en chiffres, indicatif compris : 237658013646 »
- Lien du formulaire d'évaluation — « adresse https du Google Form envoyé au client après livraison »
- Identifiant GA4 — « de la forme G-XXXXXXXXXX, dans Google Analytics › Administration › Flux de données »
- Identifiant du Pixel Meta — « suite de chiffres, dans le Gestionnaire d'événements Meta »

Sous le formulaire, une phrase indiquant que les deux identifiants de mesure sont
**enregistrés mais pas encore posés** : les balises appartiennent au lot de mesure
d'audience. Sans cela, le client croira la mesure active.

- [ ] **Step 5 : Ajouter l'entrée de navigation**

Ajouter « Paramètres » à la navigation du back-office, à côté des entrées existantes.

- [ ] **Step 6 : Vérifier**

Run: `npx tsc --noEmit && npx eslint && npm test && npx next build`
Expected: aucune erreur, **455 tests au vert**, construction en succès

- [ ] **Step 7 : Vérification manuelle**

Lancer `./node_modules/.bin/next dev -p 3001` **au premier plan**, puis :

1. `/admin/parametres` — enregistrer un numéro, vérifier qu'il est relu après rechargement.
2. Saisir `ABCDE12345` en GA4 — refusé, avec un message nommant le format.
3. Saisir `http://exemple.fr` en lien — refusé.
4. Tout vider et enregistrer — accepté, les quatre champs sont facultatifs.

Arrêter le serveur ensuite. Si une vérification est impossible pour une raison
d'environnement — pas de compte administrateur, pas de boîte mail pour le code à usage
unique — le dire franchement dans le rapport plutôt que de la déclarer réussie.

- [ ] **Step 8 : Commit**

```bash
git add "src/app/admin/(protected)/parametres" src/app/api/admin/parametres src/components/admin/ParametresAdmin.tsx
git commit -m "Écran des paramètres de la boutique

Numéro WhatsApp, lien du formulaire d'évaluation et identifiants de mesure,
modifiables sans redéploiement — c'est ce que le critère 16 exige.

Chaque champ porte une aide disant où trouver la valeur, et une phrase sous le
formulaire précise que les identifiants de mesure sont enregistrés mais pas
encore posés : sans elle, le client croirait la mesure active.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4 : Le numéro WhatsApp vient de la base

**Files:**
- Modify: `src/components/kk/chrome.tsx:101`
- Modify: `src/components/WhatsAppButton.tsx:11`
- Modify: `src/app/[locale]/confirmation/[orderNumber]/page.tsx:24`

**Interfaces:**
- Consumes: `getParametres`, `numeroWhatsappEffectif` (tâche 2).
- Produces: rien.

**C'est ici que la frontière serveur/client se déplace.** `NEXT_PUBLIC_WHATSAPP_NUMBER` est
une variable **publique** : `WhatsAppButton` la lit directement dans son propre code, parce
qu'il est un composant client. Une valeur en base ne peut pas l'atteindre ainsi — elle doit
**descendre en propriété** depuis un composant serveur.

C'est le seul endroit de ce sous-lot où la migration change autre chose qu'une source de
données, et c'est pourquoi cette tâche est séparée.

- [ ] **Step 1 : Établir qui est client et qui est serveur**

```bash
head -3 src/components/kk/chrome.tsx src/components/WhatsAppButton.tsx
grep -rn "WhatsAppButton\|SiteHeader\|SiteFooter" src/app --include=*.tsx | head -8
```

Noter lesquels portent `"use client"` et depuis quels composants serveur ils sont rendus.
**C'est ce relevé qui décide de la forme du branchement** — si un composant est déjà
serveur, il lit directement ; s'il est client, il reçoit une propriété.

- [ ] **Step 2 : Faire descendre le numéro**

Pour chaque consommateur, selon le relevé de l'étape 1 :
- **Composant serveur** — appeler `numeroWhatsappEffectif(await getParametres())`.
- **Composant client** — ajouter une propriété `numeroWhatsapp: string` et la faire passer
  par le composant serveur qui le rend.

Ne pas introduire de nouveau contexte React ni de nouvel appel de données : le numéro est
déjà lu une fois par requête grâce à `cache()`.

- [ ] **Step 3 : Retirer la lecture directe de la variable**

Dans `chrome.tsx` et `WhatsAppButton.tsx`, `process.env.NEXT_PUBLIC_WHATSAPP_NUMBER`
disparaît. Elle ne subsiste que dans `numeroWhatsappEffectif`, où elle sert de repli, et
dans `src/config/brand.ts` — **qu'on ne touche pas** : `CONTACT.whatsapp` sert d'autres
appelants, et le nettoyage complet de la variable est une tâche à part, après vérification
en production.

- [ ] **Step 4 : Vérifier**

Run: `npx tsc --noEmit && npx eslint && npm test && npx next build`
Expected: aucune erreur, **455 tests au vert**, construction en succès

- [ ] **Step 5 : Vérification manuelle**

Serveur de développement au premier plan.

1. Réglage vide — le bouton WhatsApp affiche toujours le numéro de la variable
   d'environnement. **C'est le repli, et c'est le point le plus important de cette tâche :
   il garantit qu'aucun déploiement ne fait disparaître le bouton.**
2. Saisir un autre numéro en administration, recharger une page de la boutique — le lien
   `wa.me` porte le nouveau numéro, **sans redéploiement**. C'est la démonstration du
   critère 16.
3. Ouvrir la page de confirmation d'une commande — même numéro.

Dire franchement dans le rapport toute vérification impossible.

- [ ] **Step 6 : Commit**

```bash
git add src/components/kk/chrome.tsx src/components/WhatsAppButton.tsx "src/app/[locale]/confirmation/[orderNumber]/page.tsx"
git commit -m "Le numéro WhatsApp vient de la base, plus de la construction

Il était lu dans NEXT_PUBLIC_WHATSAPP_NUMBER, une variable figée à la
construction : le changer imposait un redéploiement, ce que le critère 16
interdit précisément.

La variable étant publique, le bouton flottant la lisait dans son propre code de
composant client. Une valeur en base ne peut pas l'atteindre ainsi : elle
descend désormais en propriété depuis un composant serveur.

La variable reste le repli tant que le réglage est vide, et n'est pas supprimée :
la retirer pendant que la production tourne sur l'ancien code casserait le site
entre le déploiement et la propagation.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Vérification de fin de sous-lot

| Contrôle | Attendu |
|---|---|
| **Critère 16** | Changer le numéro en administration, recharger la boutique : le lien `wa.me` a changé, sans redéploiement |
| **Repli** | Réglage vide → le numéro de la variable d'environnement s'affiche encore |
| **Robustesse** | Écrire un JSON abîmé dans la clé `boutique.parametres` : le site rend les valeurs par défaut, aucune page ne tombe |
| **Facultatif** | Enregistrer avec les quatre champs vides : accepté |
| **Validation** | `ABCDE12345` en GA4, `http://` en lien : refusés, avec un message nommant le format |
| **Honnêteté de l'écran** | La phrase disant que les identifiants de mesure ne sont pas encore posés est visible |
