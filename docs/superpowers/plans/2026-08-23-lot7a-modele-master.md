# Lot 7A — Le modèle accueille le master du client — Plan

> **SOUS-COMPÉTENCE REQUISE :** superpowers:subagent-driven-development.

**But :** faire entrer dans le modèle de données ce que le nouveau master du client
décrit et que le site ne sait pas encore stocker.

**Sources du client**, dans `assets/corrections/` :
`KOSSKOSS_CATALOGUE_ROUTINES_V1_2.xlsx` (fiches produits, routines, liaisons),
`Quiz Diagnostic Peau KossKoss Select_complète.docx`, les deux modèles de
présentation, et `ASSORTIMENT PRODUITS_1&2.xlsx`.

## Ce qui manque, relevé fichier par fichier

Les 71 SKU du master correspondent aux 71 produits en base, et les 25 SKU utilisés
par les routines existent tous. Le master enrichit le catalogue, il ne le remplace
pas. Ce qui manque est structurel.

| Le client décrit | Le modèle a | Verdict |
|---|---|---|
| 14 routines, 7 besoins x 2 niveaux | 5 routines, aucun niveau | champ à créer |
| Routine : promesse, profil cible, usage matin, usage soir, badge, note | `claim`, `description` seulement | 5 champs à créer |
| Geste : rôle et moment | ni l'un ni l'autre | 2 champs à créer |
| Fiche : problème, idéal pour, usage AM/PM, fréquence, conseil, précautions, actifs | absents | 8 champs à créer |
| Question conditionnelle | aucun mécanisme | à créer |

## Ce qui se mappe sur l'existant, et ne doit PAS être dupliqué

Avant d'ajouter une colonne, vérifier qu'elle n'existe pas déjà sous un autre nom.
Dupliquer un champ crée deux vérités qui divergent au premier changement.

| Colonne du master | Champ existant |
|---|---|
| `Solution_Courte` | `Product.shortDescription` |
| `Benefice_1/2/3` | `Product.bullets` |
| `Prix_FCFA` | `Product.priceCents` |
| `EAN_UPC` | `Product.gtin` |
| `Slug`, `Nom_Produit`, `Marque` | `slug`, `name`, `brand` / `brandId` |
| `Tags` | `Product.tags` |
| `Promesse` (routine) | `Routine.claim` |

## Contraintes globales

1. **Migration strictement additive.** La base de développement EST la base de
   production. `prisma migrate dev` se bloque ici : `migrate diff` pour lire le SQL,
   écrire le dossier de migration à la main, `migrate deploy`, `generate`.
2. **Tout champ visible par un visiteur reçoit sa contrepartie anglaise `*En`**, et
   doit être déclaré au registre des traductions. Un test compare le registre au
   schéma dans les deux sens et tombera sinon.
3. **Les champs internes ne reçoivent PAS de `*En`** et sont exclus du registre,
   avec leur justification écrite. Le statut de publication et les données à
   confirmer sont des informations de production, jamais affichées.
4. **Le rôle d'un geste et la fréquence sont du texte libre**, pas des listes
   fermées : le master porte vingt rôles distincts et dix-neuf formulations de
   fréquence. Les enfermer dans une énumération rejetterait la moitié du fichier.
5. Le FCFA n'a pas de sous-unité. Français partout. Aucun nom de personne.
6. **Avant chaque commit :** `tsc --noEmit`, `eslint`, `npm test` ; `npm run build`
   aux tâches qui touchent une page. **Au premier plan**, `timeout` 600000. Rien en
   arrière-plan.

---

### Tâche 1 : Les champs de la fiche produit

**Fichiers :** `prisma/schema.prisma`, une migration, `src/lib/kk/traductions.ts`.

- [ ] Ajouter à `Product`, tous `String @default("")` :

| Champ | Contrepartie anglaise | Rôle |
|---|---|---|
| `problemeAccroche` | oui | la question qui ouvre la fiche |
| `idealPour` | oui | à qui le produit s'adresse |
| `usageMatin` | oui | le geste du matin |
| `usageSoir` | oui | le geste du soir |
| `frequence` | oui | à quelle cadence |
| `conseilKossKoss` | oui | le conseil de la maison |
| `precautions` | oui | les précautions d'emploi |
| `actifsCles` | oui | les actifs mis en avant |
| `statutPublication` | **non** | READY ou READY_WITH_CAUTION |
| `donneesAConfirmer` | **non** | ce que le client doit encore vérifier |

- [ ] Déclarer les huit premiers au registre des traductions. Exclure les deux
      derniers **en écrivant pourquoi** : ce sont des informations de production, qui
      ne sortent jamais vers un visiteur.
- [ ] Lire le SQL par `migrate diff`, vérifier qu'il ne contient que des
      `ADD COLUMN`, écrire la migration à la main, `migrate deploy`, `generate`,
      puis relancer le `diff` pour vérifier qu'il est vide.
- [ ] Vérifier et commiter.

---

### Tâche 2 : Le niveau de routine et ses champs

**Fichiers :** `prisma/schema.prisma`, une migration, le registre.

- [ ] Ajouter à `Routine` :

| Champ | Type | Rôle |
|---|---|---|
| `code` | `String @unique` | l'identifiant du master, par exemple `TAC-ECO` |
| `niveau` | `String @default("eco")` | `eco` ou `premium` |
| `profilCible` (+`En`) | `String @default("")` | à qui la routine s'adresse |
| `usageMatin` (+`En`) | `String @default("")` | le parcours du matin |
| `usageSoir` (+`En`) | `String @default("")` | le parcours du soir |
| `badge` (+`En`) | `String @default("")` | la pastille affichée |
| `noteKossKoss` (+`En`) | `String @default("")` | la note de la maison |

- [ ] Ajouter à `RoutineStep` :

| Champ | Type | Rôle |
|---|---|---|
| `role` (+`En`) | `String @default("")` | Nettoyer, Corriger, Protéger, et dix-sept autres |
| `moment` | `String @default("")` | `AM/PM`, `AM`, `PM`, ou une formulation libre |

**Le `code` est unique et sert de clé d'import.** C'est lui qui permettra de
relancer l'import sans créer de doublon : le slug peut changer si le client renomme
une routine, le code du master ne bouge pas.

**`niveau` n'est pas une énumération Prisma.** Le schéma du projet n'en utilise
aucune, par choix de portabilité : suis cette convention et valide la valeur dans un
module pur.

- [ ] Créer `src/lib/kk/routines-niveau.ts`, pur, avec `NIVEAUX`, `estNiveau` et
      `LIBELLES_NIVEAUX` (« Essentielle » pour `eco`, « Premium » pour `premium`),
      plus ses tests. Le libellé affiché ne doit pas être écrit en dur dans un écran.
- [ ] Déclarer au registre les champs traduisibles.
- [ ] Même procédure de migration qu'à la tâche 1.
- [ ] Vérifier et commiter.

---

### Tâche 3 : La question conditionnelle du diagnostic

**Fichiers :** `prisma/schema.prisma`, une migration, le moteur du diagnostic.

Le quiz du client comporte une question qui **ne s'affiche que si** une réponse
précise a été donnée à une question précédente : la question sur les pores
n'apparaît que si la priorité déclarée est « Boutons / Imperfections » ou
« Glow / Éclat ».

- [ ] Ajouter à `DiagQuestion` :

| Champ | Type | Rôle |
|---|---|---|
| `conditionQuestion` | `String @default("")` | la clé de la question dont dépend l'affichage |
| `conditionReponses` | `String @default("[]")` | les clés de réponses qui déclenchent l'affichage, en JSON |

Une condition vide veut dire « toujours affichée ». C'est le cas de toutes les
questions existantes, et la migration n'a donc rien à rattraper.

- [ ] Créer `src/lib/kk/diagnostic-conditions.ts`, pur : `questionVisible(question,
      reponsesDonnees)` rend vrai quand la condition est vide, ou quand l'une des
      réponses attendues figure parmi celles déjà données.
- [ ] Tests, éprouvés par mutation : condition vide, condition satisfaite, condition
      non satisfaite, plusieurs réponses attendues dont une seule donnée, condition
      portant sur une question à laquelle on n'a pas encore répondu, liste de
      réponses illisible en base.
- [ ] **Une question invisible ne doit pas bloquer la progression** du questionnaire
      ni compter dans le total affiché au visiteur. Vérifie où ce total est calculé.
- [ ] Vérifier et commiter.

---

## Vérification finale du lot

- [ ] `npm test` au vert, `npm run build` en succès.
- [ ] `migrate diff` rend une migration vide.
- [ ] Le test registre/schéma passe : tout champ `*En` ajouté est déclaré, et les
      deux champs internes sont exclus avec leur justification.
- [ ] Aucun champ ajouté ne duplique un champ existant : vérifier la table de
      correspondance ci-dessus avant de conclure.
