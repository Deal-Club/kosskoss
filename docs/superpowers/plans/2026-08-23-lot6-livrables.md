# Lot 6 — Livrables et transfert — Plan

> **SOUS-COMPÉTENCE REQUISE :** superpowers:subagent-driven-development.

**Critères visés : 21 à 23** — livrables, documentation de reprise, transfert.

## Pourquoi ce lot n'est pas de la décoration

La documentation actuelle **ment sur des points qui coûtent cher** :

- `docs/HANDOVER.md` est daté du 26 juillet, annonce une base **SQLite locale** et
  recommande `npm run db:migrate`. La base est en réalité **PostgreSQL sur Neon**,
  et **partagée entre développement et production** — cette commande est
  précisément celle qui peut proposer une réinitialisation.
- `TARGET.md` décrit encore une **boutique française de bois de chauffage**. Il est
  chargé par `AGENTS.md`, donc lu par tout agent qui reprendra ce dépôt. Trois
  agents s'y sont déjà référés à tort pendant ce chantier.
- Rien ne documente ce qui a été construit depuis : rôles et capacités, réglages,
  écran des traductions, approvisionnement, tableau de bord des ventes, marques,
  facettes, mesure d'audience.

Une reprise qui suit une documentation fausse fait des dégâts en production. C'est
le seul risque de ce lot, et il suffit à le justifier.

## Contraintes globales

1. **Tout ce qui est écrit doit être vérifié dans le code**, pas recopié d'une
   version antérieure. Chaque commande donnée doit avoir été lancée.
2. **Aucune donnée d'entreprise inventée.** Les valeurs actuelles sont des valeurs
   d'exemple, et le document doit le dire clairement plutôt que d'avoir l'air
   complet.
3. **Aucun nom de personne, aucun pseudonyme, aucune adresse électronique
   personnelle** dans les documents livrés. Les comptes se désignent par leur rôle.
4. **Le français est la langue des livrables.**
5. **Avant chaque commit :** `tsc --noEmit`, `eslint`, `npm test` ; `npm run build`
   si du code est touché — **au premier plan**, `timeout` 600000. Rien en
   arrière-plan.

---

### Tâche 1 : Les 57 chaînes d'interface restantes

**Fichiers :** ceux que le rapport du lot 4B nomme — le corps de `routines/page.tsx`,
`compte/connexion/page.tsx`, `favoris/page.tsx`, et une vingtaine de composants
`kk` et `journal`.

- [ ] Les recenser d'abord (`grep` des chaînes accentuées dans du JSX), écrire la
      liste dans le rapport, puis les passer par next-intl.
- [ ] Toute clé ajoutée l'est dans **les deux** fichiers de messages : un test de
      parité compare les clés, leur place et leurs valeurs, et tombe sinon.
- [ ] **Aucune logique ne change.** Ce lot remplace des chaînes.
- [ ] Recopier les textes français **mot pour mot** — une reformulation se confond
      avec une régression.
- [ ] Donner le décompte avant/après, et **ce qui reste**, par fichier.
- [ ] Vérifier et commiter.

---

### Tâche 2 : La documentation de reprise, refaite

**Fichiers :** `docs/HANDOVER.md` réécrit, `TARGET.md` réécrit, `README.md` vérifié.

- [ ] **`TARGET.md`** décrit la boutique réelle : concept-store cosmétique
      camerounais, FCFA sans sous-unité, français à la racine et anglais sous `/en`,
      livraison au Cameroun, paiement Mobile Money, WhatsApp comme canal de contact.
      **Retire toute trace de l'activité précédente.** Ce fichier est chargé par
      `AGENTS.md` : il oriente tout agent qui reprendra le dépôt.
- [ ] **`docs/HANDOVER.md`** dit la vérité sur l'infrastructure :
      - base **PostgreSQL sur Neon**, **partagée entre développement et
        production** — et ce que cela implique ;
      - **la procédure de migration réelle** : `prisma migrate diff` pour lire le
        SQL, écrire le dossier à la main, `migrate deploy`, `generate`. **Écris
        pourquoi `prisma migrate dev` est proscrit** : il se bloque dans cet
        environnement et peut proposer une réinitialisation sur une base de
        production ;
      - les variables d'environnement réellement lues, et lesquelles sont des
        secrets ;
      - le déploiement.
- [ ] **Vérifie chaque commande en la lançant.** Une commande fausse dans un
      document de reprise se découvre au pire moment.

---

### Tâche 3 : Le manuel du back-office

**Fichiers :** créer `docs/BACK-OFFICE.md`.

Le commerçant doit pouvoir s'en servir sans nous. Une section par écran, courte,
disant **ce qu'il fait, ce qu'il ne fait pas, et le piège à connaître** :

- [ ] **Rôles et accès** — les quatre rôles, ce que chacun peut, et **le fait que le
      rôle est relu à chaque requête** : rétrograder ou désactiver un compte prend
      effet immédiatement.
- [ ] **Produits, marques, tags** — dont le coût d'achat, et le fait qu'un coût
      absent n'est pas un coût nul.
- [ ] **Approvisionnement** — fournisseurs, bons, réception ; **une réception ne se
      défait pas**, elle se corrige par un ajustement de stock tracé ; et la case qui
      met à jour le coût d'achat **écrase le coût dans tout le catalogue**.
- [ ] **Ventes et export** — ce que l'encaissé comprend et ne comprend pas, pourquoi
      les remises sont réparties, pourquoi les commandes annulées en sortent et les
      remboursées y restent.
- [ ] **Traductions** — et le fait que le corps des articles se traduit dans
      l'éditeur d'article, pas là.
- [ ] **Réglages** — WhatsApp, formulaire d'évaluation, mesure d'audience ; les
      secrets ne se réaffichent jamais, et un champ vide les laisse inchangés.
- [ ] **Commandes et facturation** — l'émission de facture, la numérotation.
- [ ] **Consentement et mesure** — rien ne part sans consentement, y compris la
      mesure serveur.

---

### Tâche 4 : L'état de conformité, sans complaisance

**Fichiers :** créer `docs/ETAT-DES-LIEUX.md`.

- [ ] **Un tableau des critères d'acceptation**, avec pour chacun : couvert, partiel
      ou non traité, et **où c'est dans le code**. Un critère partiel doit dire ce
      qui manque.
- [ ] **Ce qui reste à la main du commerçant**, chaque point avec sa conséquence :
      - les données d'entreprise sont des **valeurs d'exemple** et s'impriment sur
        chaque facture ;
      - questions au comptable : mentions obligatoires de facture, régime de TVA,
        `XOF` contre `XAF`, base du coût d'achat, et le choix **dernier prix payé
        contre coût moyen pondéré** ;
      - les identifiants de mesure et le jeton de l'API de conversions à renseigner.
- [ ] **Les limites connues, nommées** : coût d'achat par variante, chaînes
      d'interface restantes, avoirs et remboursements non déduits du chiffre
      d'affaires, un chemin de commande mort conservé.
- [ ] **Ne rien enjoliver.** Ce document sert à décider, pas à rassurer.

---

### Tâche 5 : Le contrôle du transfert

- [ ] **Suivre la documentation à la lettre**, depuis un état propre, comme le ferait
      quelqu'un qui reprend : installer, migrer, lancer, ouvrir le back-office.
      Chaque écart entre ce qui est écrit et ce qui se passe est un défaut à
      corriger dans le document.
- [ ] Vérifier qu'**aucun nom de personne ni adresse électronique personnelle** ne
      figure dans les documents livrés.
- [ ] Vérifier que les quatre documents ne se contredisent pas entre eux.
- [ ] Rapporter chaque écart trouvé et corrigé.

## Vérification finale

- [ ] `npm test` au vert, `npm run build` en succès.
- [ ] Les commandes des documents ont toutes été lancées.
- [ ] Aucune trace de l'activité précédente dans `TARGET.md`.
- [ ] Le tableau des critères dit la vérité, y compris sur ce qui est partiel.
