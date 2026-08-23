# Lot 7D — Les modèles de présentation du client — Plan

> **SOUS-COMPÉTENCE REQUISE :** superpowers:subagent-driven-development.

**But :** donner à la fiche produit et à la fiche routine la présentation que le
client a dessinée, en s'appuyant sur les champs importés du master.

**Sources :** `assets/corrections/Fiche Produit KossKoss Select — Version courte.docx`
et `assets/corrections/MODELE FICHE ROUTINE.docx`.

## Ce que les modèles décrivent

**La fiche produit**, dans cet ordre : titre et format, ligne de préoccupations,
question d'accroche, solution en une phrase, prix et bouton d'achat, mentions de
livraison et de paiement, « pourquoi vous allez l'aimer » avec ses bénéfices et le
« + KossKoss », « est-ce pour ma peau ? » avec l'idéal-pour, « comment l'utiliser »
matin et soir avec le conseil, la routine complète qui contient le produit, un
tableau « en bref », et un rappel du bouton d'achat.

**La fiche routine** : nom, niveau, nombre de produits, type de peau, ligne de
préoccupations, la promesse, le parcours en trois ou quatre gestes numérotés avec
leur rôle, le détail de chaque geste, le matin, le soir, la note KossKoss, la valeur
des produits et le prix de la routine.

## Contraintes globales

1. **Les champs viennent du master**, importés au lot 7B. N'invente aucun texte :
   si un champ est vide, la section ne s'affiche pas. Une fiche à moitié remplie qui
   montre des intertitres vides est pire qu'une fiche courte.
2. **Le prix de la routine se calcule**, il ne se stocke pas. Le master lui-même le
   dit : les valeurs se recalculent depuis les prix des produits. Un prix figé
   diverge au premier changement de tarif.
3. **Le FCFA n'a pas de sous-unité.** Aucune division par 100.
4. **Tout est bilingue** : les champs par leur contrepartie anglaise, les libellés
   fixes par next-intl. Un test compare les deux fichiers de messages.
5. **La typographie du site s'applique** : titres en Playfair Display, texte en
   Manrope, l'échelle décrite au chapitre 1 du document de structure. Ne pose aucune
   taille en dur qui contournerait l'échelle.
6. **Le mobile d'abord.** Le marché visé consulte au téléphone.
7. Français partout dans le code. Aucun nom de personne.
8. **Avant chaque commit :** `tsc --noEmit`, `eslint`, `npm test`, `npm run build`.
   Au premier plan, `timeout` 600000. Rien en arrière-plan.
9. **Une construction verte ne prouve rien pour une page dynamique.** Vérifie par le
   serveur et relève le code HTTP.

---

### Tâche 1 : La fiche produit

**Fichiers :** `src/components/kk/product-detail.tsx` et ce qui l'alimente.

- [ ] Ouvrir le modèle du client et **suivre son ordre**. L'ordre d'une fiche de
      vente n'est pas décoratif : il mène de la question du visiteur à l'achat.
- [ ] Chaque section ne s'affiche que si son champ est renseigné. Les 71 fiches
      importées ne sont pas toutes complètes.
- [ ] La section « complétez votre routine » montre la routine qui contient ce
      produit, avec ses gestes dans l'ordre et un lien vers la routine complète. Un
      produit peut appartenir à plusieurs routines : montre-les toutes, ou la plus
      pertinente en disant laquelle.
- [ ] Le tableau « en bref » reprend besoin, peau, action, utilisation, format,
      prix. Ces valeurs existent déjà : ne les redemande pas au client.
- [ ] **Ne casse pas l'existant** : ajout au panier, favoris, variantes, avis,
      galerie et fil d'Ariane doivent continuer de fonctionner.

---

### Tâche 2 : La fiche routine

**Fichiers :** `src/app/[locale]/routines/[slug]/page.tsx` et ses composants.

- [ ] En-tête : nom, niveau en toutes lettres, nombre de gestes, profil cible,
      ligne de préoccupations.
- [ ] La promesse, puis le parcours numéroté avec le rôle de chaque geste, puis le
      détail de chaque geste avec son produit.
- [ ] Le matin et le soir, tels que le master les décrit.
- [ ] **La valeur des produits et le prix de la routine se calculent** à partir des
      produits liés, jamais depuis une valeur stockée.
- [ ] Un bouton qui ajoute toute la routine au panier, si le panier le permet
      aujourd'hui. Sinon, dis-le dans ton rapport plutôt que de le bricoler.
- [ ] **Le niveau s'affiche par `libelleNiveau`** du module pur, jamais écrit en
      dur : une revue a relevé que ce module n'est appelé nulle part.

---

### Tâche 3 : La liste des routines et le contrôle

**Fichiers :** `src/app/[locale]/routines/page.tsx`.

- [ ] La liste montre les 14 routines groupées par besoin, avec les deux niveaux
      côte à côte. C'est la façon dont le client les a conçues : Essentielle et
      Premium sont deux réponses au même besoin, pas deux routines sans rapport.
- [ ] **Les 5 routines historiques n'ont pas de code du master.** Décide de leur
      sort et dis-le : les afficher à part, ou les masquer. Ne les supprime pas.
- [ ] Contrôle par le serveur, en français puis en anglais : la liste, une fiche de
      routine de chaque niveau, une fiche produit qui appartient à une routine, et
      une fiche produit qui n'appartient à aucune.
- [ ] Rapporte le code HTTP de chaque page contrôlée.

## Vérification finale du lot

- [ ] `npm test` au vert, `npm run build` en succès.
- [ ] Aucune section vide affichée sur une fiche incomplète.
- [ ] Le prix d'une routine correspond à la somme de ses produits.
- [ ] `libelleNiveau` est réellement appelé.
