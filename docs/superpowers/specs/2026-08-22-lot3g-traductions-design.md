# Lot 3G — L'écran des traductions

**Critère visé :** 13 (back-office complet — volet traductions FR/EN dédiées).

---

## 1. Le problème

Le contenu traduisible est partout et nulle part. **Dix-sept modèles portent
quarante champs `*En`** — catégories, marques, produits, routines, questions du
diagnostic, articles, campagnes — et chacun ne se remplit que depuis l'écran de
l'entité concernée.

Pour savoir ce qui manque en anglais, il faut donc ouvrir chaque produit, chaque
catégorie, chaque article, un par un. Personne ne le fait. Le résultat est celui
qu'on observe : la boutique anglaise se replie sur le français à des endroits qu'on
ne découvre qu'en la parcourant.

Un repli est un filet, pas une traduction.

## 2. Ce que ce lot établit

### 2.1 Un inventaire déclaré

Un registre nomme, pour chaque modèle, ses paires de champs traduisibles et leur
libellé français. Il est **la seule source** : l'écran, le décompte et le
formulaire en dérivent tous.

Un test compare ce registre au schéma Prisma et **échoue si un champ `*En` du
schéma n'y figure pas**. C'est le même principe que le garde-fou des capacités du
lot 3D : sans lui, le prochain champ traduisible ajouté sera invisible à cet écran,
et personne ne le saura.

### 2.2 Un écran qui montre ce qui manque

`/admin/traductions`, sous la capacité `contenu` :

- **Une vue d'ensemble** : par modèle, combien d'enregistrements sont traduits,
  combien ne le sont pas, et le pourcentage. C'est le chiffre qu'on veut voir en
  arrivant.
- **Une liste filtrable**, par modèle et par état — « tout », « à traduire »,
  « traduit ». Le défaut est **« à traduire »** : on ouvre cet écran pour combler,
  pas pour admirer.
- **Un éditeur côte à côte** : le français à gauche, non modifiable, l'anglais à
  droite. On traduit en regardant l'original ; le retaper de mémoire produit des
  contresens.

### 2.3 Ce qui compte comme « traduit »

Un enregistrement est traduit quand **tous** ses champs traduisibles non vides en
français ont une contrepartie anglaise non vide.

Deux précisions qui évitent des faux positifs :

- **un champ vide en français n'attend aucune traduction** — compter un champ
  facultatif jamais rempli comme « à traduire » noierait le vrai travail sous du
  bruit ;
- **un champ dont la traduction est identique au français** compte comme traduit :
  certains noms propres ne se traduisent pas, et forcer une différence produirait
  des traductions inventées.

### 2.4 Les champs qui ne sont pas du texte simple

Trois champs ne sont pas des chaînes libres et demandent un traitement propre :

| Champ | Ce qu'il contient |
|---|---|
| `Product.bulletsEn` | un tableau JSON de puces |
| `Article.blocksEn` | la structure de blocs de l'article |
| `Campaign.bodyTextEn` | le corps d'un courriel |

**Décision : `Article.blocksEn` est exclu de cet écran.** Traduire une structure de
blocs dans un champ de texte reviendrait à éditer du JSON à la main, et une erreur
de syntaxe casserait l'article. L'écran le signale explicitement et renvoie vers
l'éditeur d'article, qui sait le faire. **Le taire serait pire que l'exclure** : on
croirait l'article traduit.

`bulletsEn` est édité comme une ligne par puce, avec le nombre de puces françaises
rappelé à côté — une traduction qui perd une puce se voit alors immédiatement.

### 2.5 Ce que l'écran ne fait pas

- **Il ne traduit pas.** Aucun appel à un service de traduction automatique : ce
  serait un autre lot, avec ses questions de coût, de qualité et de confidentialité.
- **Il ne touche pas aux fichiers de messages** (`src/messages/fr.json` et
  `en.json`). Ce sont des chaînes d'interface versionnées avec le code, déployées
  avec lui. Les rendre modifiables en base ferait diverger le déployé et
  l'enregistré, et une clé manquante casse le rendu. Hors périmètre, et dit comme
  tel dans l'écran.

## 3. Architecture

```
src/lib/kk/traductions.ts       pur — registre des champs, état d'un enregistrement
src/lib/kk/traductions.test.ts  pur — l'état, cas par cas
src/server/kk/traductions.ts    lecture des enregistrements, décomptes, écriture
src/app/admin/(protected)/traductions/  l'écran
src/app/api/admin/traductions/          les routes, capacité `contenu`
src/lib/kk/routesAdmin.ts       `traductions` sous `contenu`
```

**Aucune migration.** Les quarante champs existent déjà.

## 4. Le point délicat : lire dix-sept modèles

Prisma ne se parcourt pas dynamiquement sans perdre le typage. Deux voies :

- **une carte de fonctions typées, une par modèle** — verbeuse, mais chaque accès
  est vérifié à la compilation et se retrouve par une recherche de texte ;
- **un accès indexé sur le client Prisma** — court, et qui échoue à l'exécution le
  jour où un modèle est renommé.

**La première est retenue.** Cet écran écrit dans dix-sept tables : la sécurité de
typage y vaut plus que la concision. La répétition est ici une garantie, pas un
défaut.

## 5. Tests

Purs, sans base :

- **l'état d'un enregistrement** — tout traduit ; rien traduit ; partiellement ;
  champ français vide ignoré ; traduction identique au français comptée comme
  traduite ; enregistrement sans aucun champ traduisible ;
- **le registre** — chaque champ `*En` du schéma Prisma y figure, et chaque entrée
  du registre correspond à un champ réel.

L'écriture est vérifiée à la main : le dépôt n'a pas d'infrastructure de test avec
base.

## 6. Le risque, nommé

**Cet écran écrit dans dix-sept tables.** Une confusion de modèle ou de champ y
écrirait une traduction dans le mauvais enregistrement — visible seulement par
quelqu'un qui lit l'anglais. D'où la carte typée plutôt que l'accès dynamique, et
d'où le test qui relie le registre au schéma.
