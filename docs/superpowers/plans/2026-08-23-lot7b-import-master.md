# Lot 7B — L'import du master du client — Plan

> **SOUS-COMPÉTENCE REQUISE :** superpowers:subagent-driven-development.

**But :** faire entrer dans la base les 71 fiches enrichies, les 14 routines et les
50 liaisons du master, de façon relançable et vérifiable.

**Source :** `assets/corrections/KOSSKOSS_CATALOGUE_ROUTINES_V1_2.xlsx`,
onglets `FICHES_PRODUITS`, `ROUTINES`, `PRODUITS_ROUTINES`.

## Contraintes globales

1. **L'import est idempotent.** Relancé, il ne crée aucun doublon et ne réécrit que
   ce qui a changé. C'est ce qui permet au client de corriger son fichier et de
   relancer sans nous.
2. **Il rend un compte rendu NOMMÉ**, pas un compte : ce qui a été créé, ce qui a
   été mis à jour, ce qui a été ignoré et pourquoi. Un import muet ne se vérifie
   pas, et celui-ci écrit dans tout le catalogue.
3. **Les clés de rapprochement sont le SKU pour les produits et le code pour les
   routines.** Ni le nom ni le slug : le client peut les changer, le SKU et le code
   ne bougent pas.
4. **Un SKU inconnu est signalé, jamais créé en silence.** Un produit qui apparaît
   sans qu'on l'ait voulu est plus dangereux qu'un produit manquant.
5. **Aucune écriture ne touche les prix sans le dire.** Le prix est une donnée
   commerciale : le compte rendu liste chaque prix modifié, avec l'ancien et le
   nouveau.
6. **Le FCFA n'a pas de sous-unité** : les entiers sont des francs.
7. Français partout. Aucun nom de personne.
8. **Avant chaque commit :** `tsc --noEmit`, `eslint`, `npm test`. Au premier plan,
   `timeout` 600000. Rien en arrière-plan.
9. **Tout essai en base : créer, éprouver, supprimer, PUIS RELIRE pour confirmer.**
   Jamais d'écriture dans la table des comptes administrateurs.

---

### Tâche 1 : Le lecteur du classeur

**Fichiers :** créer `src/server/kk/master.ts` et son test.

- [ ] Lire les trois onglets et rendre des structures typées : une fiche, une
      routine, une liaison. Le classeur est lu avec la bibliothèque déjà présente
      dans le dépôt si elle existe ; sinon, ajoute la dépendance et dis-le.
- [ ] **Valider avant d'écrire.** Une ligne sans SKU, sans code de routine, ou dont
      le prix n'est pas un entier positif est écartée et **nommée** dans le compte
      rendu. Le fichier vient d'un tableur : il portera des lignes vides et des
      cellules mal typées.
- [ ] Les colonnes `Statut_Publication` et `Donnees_A_Confirmer` sont reprises
      telles quelles : elles disent au commerçant ce qu'il lui reste à vérifier.
- [ ] Tests sur des données construites, pas sur le vrai fichier : ligne complète,
      ligne sans SKU, prix illisible, cellule vide, colonne absente.

---

### Tâche 2 : L'import des fiches produits

**Fichiers :** compléter `src/server/kk/master.ts`.

- [ ] Rapprocher par SKU. Pour chaque fiche trouvée, mettre à jour les huit champs
      de contenu créés au lot 7A, plus `shortDescription`, `bullets` et `gtin`.
- [ ] **Le prix ne se met à jour que s'il a changé**, et chaque changement est
      listé dans le compte rendu avec l'ancienne et la nouvelle valeur.
- [ ] Un SKU du master absent de la base est signalé, pas créé.
- [ ] Un produit en base absent du master est signalé, pas supprimé.
- [ ] **Ne touche pas au coût d'achat.** Il vient des bons de commande, pas du
      master : l'écraser fausserait les marges.

---

### Tâche 3 : L'import des routines et de leurs gestes

**Fichiers :** compléter `src/server/kk/master.ts`.

- [ ] Rapprocher par code. Créer les routines absentes, mettre à jour les autres.
- [ ] Les gestes sont remplacés en bloc pour la routine concernée : le master fait
      foi sur leur composition et leur ordre. **Dis-le dans le compte rendu**,
      surtout quand un geste disparaît.
- [ ] Un geste dont le SKU est introuvable **annule l'import de sa routine**,
      pas seulement du geste : une routine amputée d'une étape est pire qu'une
      routine absente. Signale-la et passe à la suivante.
- [ ] **Les 5 routines déjà en base n'ont pas de code du master.** Ne les supprime
      pas et ne devine pas leur correspondance : signale-les dans le compte rendu
      comme « hors master, à trancher par le client ».

---

### Tâche 4 : Le déclenchement depuis le back-office

**Fichiers :** une route sous `src/app/api/admin/`, un écran ou un bouton.

- [ ] Ajouter la famille à `CAPACITE_PAR_FAMILLE` sous `catalogue` **avant**
      d'écrire la route. Le test d'arborescence exige autant de gardes que de
      fonctions exportées.
- [ ] Le compte rendu s'affiche à l'écran, section par section. Il doit tenir la
      promesse de la contrainte 2 : nommer, pas compter.
- [ ] **Lancer l'import pour de vrai**, recopier le compte rendu intégral dans le
      rapport, puis le relancer et vérifier qu'il ne crée rien la seconde fois.

---

## Vérification finale du lot

- [ ] `npm test` au vert, `npm run build` en succès.
- [ ] L'import a tourné deux fois ; la seconde n'a rien créé.
- [ ] Le compte rendu nomme les prix modifiés, les SKU inconnus et les routines
      hors master.
