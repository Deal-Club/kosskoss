# Lot 3G — L'écran des traductions — Plan d'implémentation

> **Pour les exécutants agentiques :** SOUS-COMPÉTENCE REQUISE —
> superpowers:subagent-driven-development.

**But :** un écran unique qui dit ce qui manque en anglais et permet de le combler,
au lieu de dix-sept écrans à ouvrir un par un.

**Spécification :** `docs/superpowers/specs/2026-08-22-lot3g-traductions-design.md`

---

## Contraintes globales

1. **Aucune migration.** Les quarante champs `*En` existent déjà.
2. **Accès typé, jamais dynamique.** Une carte de fonctions, une par modèle. Cet
   écran écrit dans dix-sept tables : un accès indexé sur le client Prisma
   échouerait à l'exécution le jour d'un renommage, et écrirait peut-être dans le
   mauvais champ avant cela.
3. **Un champ français vide n'attend aucune traduction.** Le compter comme
   « à traduire » noierait le vrai travail sous du bruit.
4. **Une traduction identique au français compte comme traduite.** Certains noms
   propres ne se traduisent pas.
5. **`Article.blocksEn` est exclu de l'écran, et l'exclusion est DITE.** Le taire
   ferait croire l'article traduit.
6. **Toute route et tout écran nomment leur capacité** — `contenu` ici — et
   `traductions` doit être ajouté à `CAPACITE_PAR_FAMILLE` **avant** d'écrire les
   routes. Le test exige autant de gardes que de fonctions exportées.
7. **Les modules de `src/lib/kk/` n'importent que des modules purs.**
8. Français partout. Aucun nom de personne ni pseudonyme.
9. **Avant chaque commit :** `npx tsc --noEmit`, `npx eslint src --ext .ts,.tsx`,
   `npm test` ; `npm run build` aux tâches touchant une page ou une route, au
   premier plan avec un `timeout` explicite de 600000 millisecondes. Rien en
   arrière-plan. `./node_modules/.bin/<binaire>` si `npx` ne résout pas.
10. **Tout essai en base : créer, éprouver, supprimer, PUIS RELIRE LA BASE pour
    confirmer.** Ne jamais écrire dans la table des comptes administrateurs.

---

### Tâche 1 : Le registre et l'état de traduction

**Fichiers :** créer `src/lib/kk/traductions.ts` et `src/lib/kk/traductions.test.ts`.

**Interfaces produites :**
```ts
export type FormatChamp = "texte" | "texte-long" | "liste";
export interface ChampTraduisible { fr: string; en: string; libelle: string; format: FormatChamp }
export interface ModeleTraduisible { cle: string; libelle: string; champs: ChampTraduisible[] }
export const MODELES_TRADUISIBLES: ModeleTraduisible[];
export function etatTraduction(valeurs: Record<string, string>, champs: ChampTraduisible[]): EtatTraduction;
export interface EtatTraduction { traduits: number; aTraduire: number; total: number; complet: boolean }
```

**Le registre, à écrire tel quel** — dix-sept modèles, en reprenant exactement les
noms de champs du schéma :

| Modèle | Champs (fr → en) |
|---|---|
| `Group` | label |
| `Category` | label, description, guideIntro, guideClosing |
| `GuideSection` | heading, body |
| `Brand` | name, description |
| `Product` | name, shortDescription, description, bullets (liste) |
| `Routine` | name, claim, description |
| `RoutineStep` | label, why |
| `ProductVariant` | label |
| `DiagQuestion` | title, subtitle |
| `DiagAnswer` | label, description |
| `DiagStep` | label |
| `ProductTag` | label |
| `Campaign` | subject, headline, bodyText, ctaLabel |
| `Article` | title, excerpt, coverAlt, metaTitle, metaDescription — **PAS `blocks`** |
| `ArticleCategory` | label, description |
| `ArticleTag` | label |
| `ArticleAuthor` | role, bio |

- [ ] **Étape 1 : écrire les tests**

```ts
import assert from "node:assert/strict";
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
    for (const modele of MODELES_TRADUISIBLES) {
      for (const champ of modele.champs) {
        assert.equal(champ.en, `${champ.fr}En`, `${modele.cle}.${champ.fr}`);
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
```

- [ ] **Étape 2 : le test qui relie le registre au schéma**

Ajoute, dans le même fichier, un test qui lit `prisma/schema.prisma`, en extrait
tous les champs `*En` par modèle, et vérifie **dans les deux sens** :

- chaque champ `*En` du schéma figure au registre, **sauf** une liste d'exclusions
  nommées et justifiées en commentaire (`Article.blocksEn`, et tout autre champ que
  tu décides d'exclure — dis pourquoi) ;
- chaque entrée du registre correspond à un champ réellement présent au schéma.

Le message d'échec doit nommer le modèle et le champ. C'est ce test qui empêchera
le prochain champ traduisible d'être invisible à cet écran.

Ce test lit le système de fichiers, comme celui des capacités : c'est délibéré, et
il faut l'écrire en commentaire.

- [ ] **Étape 3 : écrire le module, voir les tests passer, commiter**

```bash
node --test --import tsx src/lib/kk/traductions.test.ts
grep -c "^import" src/lib/kk/traductions.ts   # 0 attendu hors le test
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test
git commit src/lib/kk/traductions.ts src/lib/kk/traductions.test.ts -m "Registre des champs traduisibles et état d'un enregistrement"
```

---

### Tâche 2 : La lecture et l'écriture

**Fichiers :** créer `src/server/kk/traductions.ts`.

**Interfaces produites :**
- `compterParModele(): Promise<{ cle: string; libelle: string; total: number; complets: number }[]>`
- `listerEnregistrements(cleModele: string, filtre: "tout" | "a-traduire" | "traduit"): Promise<LigneTraduction[]>`
- `enregistrerTraduction(cleModele: string, id: string, valeurs: Record<string, string>): Promise<void>`

- [ ] **Étape 1 : la carte typée**

Écris **une entrée par modèle**, avec ses trois fonctions : lire la liste, lire un
enregistrement, écrire ses champs anglais. Chaque accès passe par
`prisma.<modele>` nommé en toutes lettres.

**N'écris pas un accès indexé** (`(prisma as never)[cle]`) même si c'est tentant :
cet écran écrit dans dix-sept tables, et un accès dynamique n'échouerait qu'à
l'exécution, après avoir peut-être écrit ailleurs. La répétition est ici une
garantie.

Chaque entrée doit aussi savoir donner un **libellé lisible** de l'enregistrement —
le nom du produit, le titre de l'article — pour que la liste soit navigable. Un
écran qui affiche des identifiants n'est pas utilisable.

- [ ] **Étape 2 : l'écriture**

`enregistrerTraduction` n'écrit **que** les champs anglais du registre pour ce
modèle. Tout champ reçu qui n'y figure pas est ignoré : c'est ce qui empêche cette
route d'écrire n'importe quoi n'importe où.

Le champ de format `liste` (`Product.bulletsEn`) est reçu comme une ligne par puce
et rangé au même format JSON que son homologue français — **regarde comment
`bullets` est écrit aujourd'hui et fais pareil**, ne réinvente pas le format.

- [ ] **Étape 3 : vérifier et commiter**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test
git commit src/server/kk/traductions.ts -m "Lecture et écriture des traductions, par modèle typé"
```

---

### Tâche 3 : L'écran et les routes

**Fichiers :**
- `src/lib/kk/routesAdmin.ts` — `traductions: "contenu"`, **d'abord**
- `src/app/api/admin/traductions/route.ts`
- `src/app/admin/(protected)/traductions/page.tsx`
- `src/components/admin/TraductionsEditeur.tsx`
- `src/components/admin/AdminSidebar.tsx` — entrée « Traductions » dans la section Contenu

- [ ] **Étape 1 : la carte des capacités d'abord.** Le test d'arborescence échouera
      sinon, et c'est son rôle.

- [ ] **Étape 2 : l'écran**

Trois parties, dans cet ordre :

1. **La vue d'ensemble** — un tableau par modèle : total, complets, à traduire, et
   le pourcentage. C'est le chiffre qu'on vient chercher.
2. **Les filtres** — modèle et état. Le filtre d'état vaut **« à traduire » par
   défaut** : on ouvre cet écran pour combler, pas pour admirer.
3. **La liste et l'éditeur** — pour chaque enregistrement, le français à gauche
   **non modifiable**, l'anglais à droite. On traduit en regardant l'original.

**L'exclusion des blocs d'article doit être VISIBLE** : sur la ligne d'un article,
une mention disant que le corps se traduit dans l'éditeur d'article, avec un lien.
Sans elle, un article dont le titre est traduit paraîtrait fait.

Pour les puces : une ligne par puce, et **le nombre de puces françaises rappelé à
côté** — une traduction qui en perd une se voit alors immédiatement.

- [ ] **Étape 3 : les routes**

`GET` pour lister selon le filtre, `PUT` pour enregistrer. Chaque fonction exportée
appelle `requireCapaciteApi("contenu")`. Le corps du `PUT` est validé : modèle
connu du registre, identifiant présent, champs filtrés par le registre.

- [ ] **Étape 4 : vérifier et essayer pour de vrai**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test && npm run build
npm run dev
```

Déroule et rapporte :
1. la vue d'ensemble affiche des chiffres cohérents avec la base ;
2. le filtre « à traduire » ne montre que des enregistrements incomplets ;
3. traduire un champ le fait disparaître de ce filtre ;
4. la traduction est réellement en base, et visible sur `/en/...` pour l'entité
   concernée ;
5. la ligne d'un article dit que son corps se traduit ailleurs ;
6. les puces d'un produit se traduisent, et le compte de puces s'affiche.

**Remets ensuite dans leur état d'origine les enregistrements que tu as modifiés**,
et relis la base pour le confirmer. Écris ce décompte dans ton rapport.

---

## Vérification finale du lot

- [ ] `npm test` au vert, `npm run build` en succès.
- [ ] Le test registre/schéma passe, et échoue si l'on retire une entrée du registre
      — éprouve-le par mutation et rapporte le résultat.
- [ ] Aucune route ni écran sans capacité déclarée.
- [ ] Aucun enregistrement laissé modifié par les essais.
