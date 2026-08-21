# SDD ledger — plan: docs/superpowers/plans/2026-08-21-lot2-diagnostic-bilinguisme.md

Spec : docs/superpowers/specs/2026-08-21-lot2-diagnostic-bilinguisme-design.md (lue, autorité liante)
Branche : feat/lot2-diagnostic
BASE du lot : aa9d42a

## Balayage préalable

### Paires partageant un fichier ou une interface

| Paires | Produit / consommé | Constat |
|---|---|---|
| T1 → T2 | `prisma.diagStep` | Champs concordants |
| T2 → T3 | `lireGestes()`, `type GesteLigne` | Signatures concordantes |
| T2, T3 → `gestes.ts` | T2 crée la lecture, T3 ajoute l'écriture | Séquentiel, régions distinctes |
| T2 → T7 | `buildRoutine(answers, locale)` | T2 ajoute le second paramètre que T7 utilise |
| T4 → T5 | `lireReponses`, `ecrireReponses`, `prisma.customerDiagProfile` | Concordants |
| T6 → T7 | `choisirLangue`, `type Langue` | Concordants |
| T6, T7 → `emails.ts` | T6 traduit trois fonctions, T7 en ajoute une | Séquentiel |
| T7 → T8 | `POST /api/kk/diagnostic/routine-email` | Concordant |
| T1, T4 → `schema.prisma` | deux migrations additives | Séquentiel |

### Cohérence interne de chaque tâche

| Tâche | Vérifié | Constat |
|---|---|---|
| T1 | champs du seed contre champs du modèle | Concordants |
| T2 | imports du test contre exports (7 cas) | Concordants |
| T3 | renvoie à un patron au lieu de montrer le code | Délibéré, justifié dans le brief |
| T4 | imports du test contre exports (6 cas) | Concordants |
| T5 | renvoie à `src/server/customerSession.ts` | **Vérifié : le fichier existe** |
| T6 | 5 cas de test, total annoncé 422 | Concordants après correction |
| T7 | le code appelle `esc`, `shell`, `SAND`, `formatFcfa` | Tous présents dans `emails.ts` |
| T8 | renvoie à `src/components/kk/newsletter.tsx` | **Vérifié : le fichier existe** |
| T9 | étape 1 propose `ls messages/` | **CONFLIT** — voir ruling |

### Rulings

**Ruling: T9 étape 1 — le chemin des fichiers de messages est `src/messages/`, pas `messages/`.**
Vérifié : `src/messages/fr.json` et `src/messages/en.json`. Le `ls messages/` du plan
échouerait ; son repli `find` retrouverait le bon chemin, mais autant le donner directement.
Le chemin correct sera porté dans le dispatch de T9, et le `git add messages/` de son commit
devient `git add src/messages/`.
— *Coût si erroné :* l'implémenteur perdrait un tour à chercher, ou pire, créerait un
  second dossier de messages que `next-intl` ne lirait jamais.

## Journal des tâches

Task 1: complete (commits aa9d42a..ee94ad9, review clean)
  - Aucune anomalie Critical/Important/Minor.
  - Point central tenu : la clause `update` du seed ne porte que `labelFr` et `labelEn`,
    donc `position`, `active` et `category` sont structurellement à l'abri d'un reseed.
    Prouvé par lecture statique, pas seulement par le test de l'implémenteur.
  - ⚠️ du relecteur (séquence de migration non attestable depuis le diff) levé par le
    contrôleur : `prisma migrate status` rend « Database schema is up to date », aucune
    dérive, aucune réinitialisation.

Task 2: complete (commits ee94ad9..faacf2d, review clean)
  - Fonctions pures correctement isolées et testées sur les vrais bords : non-mutation du
    tableau reçu, tous gestes inactifs, `labelEn` vide.
  - `ROUTINE_STEPS` n'a plus aucun consommateur vivant, vérifié par le relecteur.

Task 2: Ruling: l'écran d'attente `diagnostic-analyse.tsx:42-50` code en dur quatre libellés
  de gestes (`GESTES = ["Nettoyer","Traiter","Hydrater","Protéger"]`), indépendamment des
  gestes réellement actifs. Dès que le client en désactivera un depuis l'écran de la tâche 3,
  l'animation promettra au visiteur une étape absente de sa routine — ce que la contrainte
  « routine plus courte mais COHÉRENTE » interdit. Aucune tâche du plan ne couvre ce fichier.
  Décision : porter la correction dans le dispatch de la TÂCHE 8, qui touche déjà
  `diagnostic-flow.tsx`, donc la même surface visiteur. Y joindre le commentaire périmé
  citant `ROUTINE_STEPS` (ligne 45).
  — *Coût si erroné :* une incohérence visible entre l'écran d'attente et le résultat, dès
    la première désactivation de geste par le client.

Task 3: Ruling: `AGENTS.md` était modifié dans l'arbre sans appartenir à la tâche. Vérifié :
  le bloc est réécrit par `next dev` lui-même
  (`node_modules/next/dist/server/lib/generate-agent-files.js`), et son propre texte indique
  que le commiter garde l'arbre propre. Commité à part, hors du diff de la tâche, pour ne
  pas polluer la revue.
  — *Coût si erroné :* nul ; le fichier serait de toute façon régénéré.

Task 3: Ruling: corriger la phrase du compte de produits à zéro geste actif.
  `DiagStepsAdmin.tsx:302-306` teste `actifs > 1` pour le pluriel, si bien qu'à `actifs === 0`
  le message tombe dans la branche singulière et annonce « le diagnostic proposera un
  produit » — en contradiction avec le `0` affiché dans la même phrase. Ce n'est pas
  cosmétique : cette phrase EST le lien visible que le critère 08 exige, et elle ment dans
  le seul état où le client a besoin qu'elle soit juste.
  — *Coût si erroné :* nul, une branche de plus.

Task 3: ⚠️ non levé : aucune vérification par navigateur n'a été possible — ni compte
  administrateur ni boîte mail pour l'OTP. L'implémenteur a exercé directement `lireGestes`,
  `enregistrerGestes` et `buildRoutine`, ce qui atteste le chemin de DONNÉES (4→3 produits à
  la désactivation, libellé anglais résolu) mais pas le câblage HTTP ni le cycle React. Le
  risque résiduel est faible — route et écran sont des copies quasi littérales d'un patron
  déjà éprouvé — mais réel. À couvrir à la recette.

Task 3: minor (deferred): pas de détection de clé dupliquée dans une même charge utile ;
  une clé inconnue est acceptée et crée une ligne. Les deux défauts existent à l'identique
  dans la route `vocabulaire-tags` dont ce code est copié.
Task 3: fix round 1/5 (1 addressed, 0 open — branche dédiée à zéro geste actif ; commits 59b9b2d..ea2f105)
Task 3: complete (commits faacf2d..ea2f105, review clean)
Task 4: complete (commits ea2f105..d00ff85, review clean)
  - `lireReponses` tracé non-levant sur toutes les formes malformées, y compris imbriquées.
  - Unicité de `customerId` attestée au niveau BASE, pas seulement dans le schéma Prisma.
  - ⚠️ du relecteur (exécution de migration passée en arrière-plan par l'environnement) levé
    par le contrôleur : `prisma migrate status` rend « up to date », aucune dérive.
Task 4: minor (deferred): aucun test explicite sur un tableau à valeur imbriquée
  (`["a", ["b"]]`), alors que le code le gère. Régression possible sans test pour la voir.
Task 5: complete (commits d00ff85..6eeb717, review clean)
  - Chemin anonyme tracé : une seule garde `if (customer)`, aucune branche alternative
    n'atteint une écriture. Session expirée ou client supprimé rendent `null` sans lever.
  - `upsert` sur colonne unique compile en `INSERT ... ON CONFLICT DO UPDATE` sous
    PostgreSQL : deux soumissions simultanées ne peuvent pas créer deux lignes.
  - ⚠️ du relecteur levé par le contrôleur : tsc, eslint et la suite au vert.
  - ⚠️ NON levé : le rendu navigateur de l'écran de reprise. Aucun outil de navigateur
    disponible ; seuls le flux de données serveur et le comportement en base sont attestés.
Task 5: minor (deferred): `getCurrentCustomer()` est appelé sans garde aux deux endroits.
  Prouvé sûr par trace, mais la sûreté est implicite au lieu d'être documentée sur place.
Task 6: complete (commits 6eeb717..a9da730, review clean)
  - Aucune chaîne française atteignable depuis une commande anglaise, sur les trois e-mails,
    objets et variantes texte comprises. `esc()` tenu dans LES DEUX branches de langue.
  - SOLDE le résidu de la revue finale du lot 1 : la facture partait en français à un
    acheteur venu de /en.
Task 6: Ruling: le ⚠️ du relecteur porte sur mon propre brief — « ajouter `langue: Langue` à
  l'entrée de `sendAccountAccessEmail` » pouvait se lire comme un objet d'entrée.
  L'implémenteur a ajouté un quatrième paramètre positionnel, épousant le style existant de
  cette fonction. C'est le bon choix : inventer un objet d'entrée pour une seule des trois
  fonctions aurait créé une incohérence là où il n'y en avait pas.
  — *Coût si erroné :* nul, les deux formes sont équivalentes à l'appel.
Task 6: minor (deferred): le titre et le texte brut de l'e-mail d'accès codent « KossKoss
  Select » en dur alors que l'objet utilise `BRAND.name`. Préexistant, désormais identique
  dans les deux langues.

Task 7: Ruling: extraire l'expression de validation d'e-mail dans un module partagé.
  L'implémenteur signale, à juste titre, qu'il l'a recopiée verbatim faute qu'elle soit
  exportée par la route newsletter. Or ma contrainte disait « réutiliser plutôt qu'écrire une
  seconde expression » — une copie littérale EST une seconde expression, avec le défaut
  qu'elle doit rester synchronisée sans que rien ne le rappelle. Traité avant la revue, la
  réserve portant sur le périmètre.
  — *Coût si erroné :* nul ; une constante partagée de plus, importée par deux routes.

Task 7: Ruling: poser une limitation de débit et un plafond sur la route d'envoi de routine.
  Le relecteur signale, à raison, que cette route publique et non authentifiée envoie un
  e-mail à une adresse ARBITRAIRE, sans limite de débit, et laisse passer un tableau
  `answers` sans plafond jusqu'à un `IN (...)` Prisma. Deux abus possibles : bombarder un
  tiers sous la réputation d'envoi de la marque, et gonfler le coût de la requête.
  Le dépôt a déjà le motif exact : `customerResetRate` (`@/server/customerRate`), utilisé
  par `api/account/password/forgot` — route publique elle aussi, qui envoie un e-mail à une
  adresse fournie et ne doit rien révéler. L'implémenteur a repris la moitié « ne rien
  révéler » de cette convention sans sa moitié « limiter le débit ».
  C'est une omission de MON plan, qui n'a jamais mentionné la limitation.
  — *Coût si erroné :* un visiteur légitime pourrait être bridé s'il redemande sa routine
    trop vite. Sans correction : mise en cause de la réputation d'envoi du domaine.
Task 7: fix round 1/5 (3 addressed, 0 open — limite 5/heure sur l'adresse, plafond de 20 réponses avant toute requête, deux mineures de rédaction ; commits 530ee0c..8281126)
Task 7: complete (commits a9da730..8281126, review clean)
  - Non-divulgation vérifiée par le relecteur : le compteur est en mémoire, indexé sur la
    seule chaîne d'adresse, et aucune requête base ne le précède. Le 429 ne dépend donc
    jamais de l'existence de l'adresse en base.
Task 7: minor (deferred): le compteur est consommé AVANT la validation de `reponses`. Un
  attaquant connaissant une adresse peut brûler ses 5 créneaux avec des corps vides. Sans
  coût base, et plus strict que `forgot/route.ts` qui ne valide même pas le format.
Task 7: parked — Ruling: limiter sur l'ADRESSE ferme le bombardement d'une victime unique,
  pas l'arrosage de nombreuses adresses différentes depuis la même source. Propriété héritée
  de `forgot/route.ts`, qui a exactement la même. Une limite par IP la fermerait, mais elle
  n'existe nulle part dans ce projet et l'introduire ici seule créerait une asymétrie entre
  deux routes de même nature. À traiter globalement, pas dans ce lot.
  — *Coût si erroné :* la réputation d'envoi du domaine reste exposée à un arrosage
    distribué. Le volume par adresse, lui, est borné.
Task 8: complete (commits 8281126..4716f26, review clean)
  - Indépendance des deux consentements vérifiée : les deux appels sont construits en
    fermetures avant tout `await`, chacun avec son `try/catch` qui ne relance pas, donc
    `Promise.all` ne peut pas laisser l'un annuler l'autre.
  - Case décochée par défaut : un envoi sans coche ne produit AUCUNE requête newsletter.
  - Correctif de l'écran d'attente livré : il puise `gestesActifs(await lireGestes())`, la
    même source que la routine, donc un geste désactivé disparaît des deux par construction.
Task 8: Ruling: le texte du formulaire est en français en dur, sur une page servie dans les
  deux langues. Le relecteur a raison de ne pas l'imputer à cette tâche : mon brief disait de
  suivre `NewsletterBand`, qui a exactement ce défaut, et rien dans `diagnostic-flow.tsx`
  n'utilise `next-intl`. Mais le critère 10 exige que toutes les pages existent dans les deux
  langues : la page de résultat du diagnostic n'y satisfait pas, et ce lot ne le corrige pas.
  À porter à la revue finale pour arbitrage, pas à traiter dans la tâche 8.
  — *Coût si erroné :* un visiteur anglophone lit un formulaire français au bout d'un
    questionnaire qu'il a fait en anglais. Le critère 10 resterait partiellement ouvert.
Task 8: minor (deferred): `retryAfterSeconds: 0` est traité comme absent (test de véracité au
  lieu d'un test de type), et le message d'inscription n'a pas d'`id` relié par
  `aria-describedby` comme celui d'envoi.

Task 9: Ruling: ACCEPTER la création de l'espace de noms `commande`, contre ma propre
  consigne. Le relecteur signale à raison qu'elle viole une instruction répétée deux fois.
  Mais il a aussi vérifié pourquoi : l'espace `checkout` existant sert un composant
  DIFFÉRENT et non routé (`CheckoutFlow.tsx`), avec une forme de champs incompatible —
  civilité, société, code postal, clés d'erreur en snake_case. Le réutiliser aurait signifié
  soit y verser une seconde forme incompatible, soit renommer des clés servant du code mort.
  Le dépôt a par ailleurs déjà `recherche`, un espace nommé d'après une route française.
  Ma consigne visait à éviter la fragmentation ; ici elle aurait produit pire.
  — *Coût si erroné :* deux espaces de noms de commande coexistent, dont un mort. À nettoyer
    le jour où `CheckoutFlow.tsx` sera supprimé.

Task 9: Ruling: corriger le `placeholder="exemple@email.com"` (`checkout-form.tsx:440`), qui
  s'affiche tel quel sur la page anglaise. C'est un vrai manquement à la contrainte, et il a
  échappé à l'audit parce que le motif de recherche que J'AVAIS donné dans le brief ne
  capturait que les chaînes commençant par une majuscule — « exemple » commence en
  minuscule. L'implémenteur a suivi ma consigne ; c'est ma consigne qui était trouée.
  — *Coût si erroné :* nul.
Task 9: fix round 1/5 (1 addressed, 1 accepté sans action ; commits 00deb8d..c4cbc78)
Task 9: complete (commits 4716f26..c4cbc78, review clean)
  - Parité des clés REVÉRIFIÉE par le relecteur lui-même, 70/70, différence vide dans les
    deux sens. Une clé manquante d'un seul côté ne casse pas la construction : elle casse la
    page en production, dans une seule langue.
  - Masque de téléphone laissé non traduit : format de chiffres, pas de la prose. Le message
    d'erreur associé, lui, est traduit.

REVUE FINALE DE BRANCHE (aa9d42a..c4cbc78, 14 commits) — PAS ENCORE FUSIONNABLE.
  Important 1 : `diagnostic-flow.tsx:203` n'envoie pas `locale` à `/api/kk/diagnostic`, qui
    retombe donc toujours sur « fr ». Sur /en : chips d'attente en ANGLAIS (rendues serveur),
    libellés du résultat en FRANÇAIS. Toute la traduction des gestes était morte sur le
    chemin principal ; seul l'e-mail l'exerçait. La branche a CRÉÉ cette incohérence.
  Important 2 : `diagnostic-flow.tsx:150` teste la seule PRÉSENCE d'une clé de session, or un
    autre effet écrit une valeur vide mais véridique au montage. La proposition « revoir ma
    routine » ne survit qu'au premier montage, et seulement grâce à l'ordre de déclaration
    des effets.
  Important 3 : la migration crée `DiagStep` VIDE et rien dans docs/DEPLOY.md ne la remplit.
    En production, `migrate deploy` seul ⇒ `buildRoutine` rend `[]` ⇒ diagnostic sans aucun
    produit, panne silencieuse et totale.
  Minor déféré n°10 REQUALIFIÉ en bloquant : le message d'erreur anglais cite « Cash on
    delivery » alors que le bouton s'affiche « Paiement à la livraison ». On envoie un
    acheteur anglophone chercher une commande qui n'existe pas, au moment de payer.
  Vague de correction unique dispatchée sur ces quatre points.

VAGUE DE CORRECTION FINALE : 4 findings + 3 items joints, tous ADDRESSED, aucune régression
  (commits c4cbc78..ce23c41, 434 tests, build et migrate status au vert).
  Le relecteur a REFUTÉ un point de la revue finale : `diagnostic-analyse.tsx` n'a aucune
  liste de gestes en dur — le tableau pris pour tel est `TEMPS`, les phases d'analyse.
  L'implémenteur avait raison de contredire la revue.

RÉSIDUS PARQUÉS :
  - Ruling: parqué — le commentaire de `emails.ts:271-274` se décrit mal lui-même (annonce une
    espace insécable là où l'octet est une espace ordinaire). Le code est juste, le
    commentaire trompera le prochain lecteur.
  - Ruling: parqué — garde de reprise (`diagnostic-flow.tsx:156-164`) : cas latent si l'effet
    se rejouait sans remontage. Aucun déclencheur n'existe aujourd'hui, vérifié par recherche.
  - Ruling: parqué — le correctif n°1 (envoi de `locale`) n'a AUCUN test de non-régression.
    La clé peut être supprimée sans qu'un seul test tombe. Non testable sous `node --test`
    faute de DOM ; à couvrir par un test de bout en bout le jour où le projet en aura.
  - Ruling: À SURFACER au partenaire, pas parqué — `dotenv` est importé par `seed-gestes.ts`
    et `seed-tags.ts`, qui sont désormais des ÉTAPES OBLIGATOIRES de déploiement, alors qu'il
    n'est déclaré ni en `dependencies` ni en `devDependencies` : il n'est présent que par
    transitivité. Si la dépendance transitive disparaît, une étape obligatoire de mise en
    production casse. Correction d'une ligne, hors périmètre de cette vague.
    — *Coût si erroné :* déploiement cassé sur une installation propre.
  - Ruling: parqué — le relecteur signale une troisième voie que l'implémenteur n'a pas
    pesée pour le remplissage des tables : une NOUVELLE migration de données portant
    `INSERT ... ON CONFLICT DO NOTHING`. Elle satisfaisait ses deux objections. La voie
    documentaire retenue est défendable et bien placée ; celle-ci était meilleure.
