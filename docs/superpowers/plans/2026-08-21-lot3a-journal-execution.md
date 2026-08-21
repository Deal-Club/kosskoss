# SDD ledger — plan: docs/superpowers/plans/2026-08-21-lot3a-reglages-dynamiques.md

Spec : docs/superpowers/specs/2026-08-21-lot3a-reglages-dynamiques-design.md (lue, autorité liante)
Branche : feat/lot3a-reglages
BASE du lot : fd9cf5b

## Balayage préalable

### Paires partageant un fichier ou une interface

| Paires | Produit / consommé | Constat |
|---|---|---|
| T1 → T2 | types, `PARAMETRES_PAR_DEFAUT`, `normaliserParametres`, les quatre validateurs | Concordants |
| T2 → T3 | `getParametres`, `saveParametres`, validateurs réexportés | Concordants |
| T2 → T4 | `getParametres`, `numeroWhatsappEffectif` | Concordants |
| T1, T2 → `parametres` | T1 le module pur, T2 le module serveur qui le réexporte | Deux fichiers distincts, aucun conflit |

### Cohérence interne de chaque tâche

| Tâche | Vérifié | Constat |
|---|---|---|
| T1 | imports du test contre exports (18 cas) | Concordants |
| T2 | le test n'appelle que `numeroWhatsappEffectif`, pas les fonctions base | Sûr : `prisma` est un Proxy paresseux |
| T3 | renvoie à un patron au lieu de montrer le code | Délibéré, justifié dans le brief |
| T3 | chemin `api/admin/parametres` | **Vérifié libre** |
| T4 | suppose que les consommateurs sont des composants CLIENTS | **CONFLIT** — voir ruling |

### Rulings

**Ruling: la difficulté centrale annoncée par la spec n'existe pas.**
La spec affirme que `NEXT_PUBLIC_WHATSAPP_NUMBER` étant publique, le bouton la lit « dans
son propre code de composant client », et qu'une valeur en base « devra descendre en
propriété depuis un composant serveur ». Vérifié : **ni `src/components/kk/chrome.tsx` ni
`src/components/WhatsAppButton.tsx` ne portent `"use client"`**, et `WhatsAppButton` est
rendu depuis `src/app/[locale]/layout.tsx:52`, un composant serveur. Les deux sont donc
des composants serveur et peuvent appeler `await getParametres()` directement.

Le préfixe `NEXT_PUBLIC_` ne dit rien du composant qui lit la variable : il dit seulement
qu'elle est exposée au navigateur. J'ai déduit un composant client d'un préfixe.

Conséquence : la tâche 4 est un branchement serveur direct, sans propriété à faire
descendre et sans frontière déplacée. Son étape 1 — le relevé qui devait décider de la
forme — reste utile comme vérification, mais son résultat est déjà connu.
— *Coût si erroné :* si un composant client s'avérait consommer le numéro par un autre
  chemin, l'implémenteur le découvrirait à l'étape 1 et la propriété redeviendrait
  nécessaire. Le brief le lui fait vérifier de toute façon.

## Journal des tâches

Ruling: la base de tests annoncée par le plan est fausse de deux. Le plan dit 434 ; la suite
  en comptait 436 avant la tâche 1, qui en a ajouté 18 pour un total de 454 vérifié par le
  contrôleur. Attendus corrigés pour la suite : T2 → 457, T3 → 457, T4 → 457.
  — *Coût si erroné :* un implémenteur croirait à une régression et chercherait une panne
    qui n'existe pas.

CORRECTION de mon ruling précédent. Le relecteur a compté 20 blocs `it()` dans le fichier de
  test, pas 18. Donc 434 + 20 = 454 : la BASE annoncée par le plan (434) était juste, et
  c'est mon décompte des cas de test qui était faux — dans le plan comme dans la correction
  que je venais d'en faire. Les attendus corrigés (457 pour la suite) restent bons, mais
  pour la bonne raison cette fois.

Task 1: complete (commits fd9cf5b..55592bc, review clean)
  - Pureté vérifiée : zéro `import` dans le module. C'est la propriété qui justifie son
    existence.
  - `normaliserParametres` tracé non-levant sur toutes les formes : null, undefined, nombre,
    chaîne, tableau, objet à champs mal typés, valeurs imbriquées.
Task 1: Ruling: à porter dans le dispatch de la TÂCHE 3. Le relecteur signale que si le
  formulaire valide la saisie BRUTE — avec `+` et espaces — avant de la normaliser,
  `numeroWhatsappValide` refusera un numéro pourtant correct. L'ordre est donc imposé :
  normaliser d'abord, valider ensuite.
  — *Coût si erroné :* un administrateur saisissant « +237 658 01 36 46 » se verrait refuser
    un numéro valide, sans comprendre pourquoi.
Task 1: minor (deferred): `PARAMETRES_PAR_DEFAUT` est exporté non gelé. `normaliserParametres`
  l'étale défensivement, mais un futur consommateur qui le muterait en place corromprait le
  singleton pour tout le processus.
Task 1: minor (deferred): aucun test ne prouve l'indépendance champ à champ — qu'un champ
  valide survit à côté d'un champ mal typé.
Task 2: complete (commits 55592bc..18a5546, review clean)
  - Les trois affirmations de l'implémenteur vérifiées par le relecteur : non-levée,
    couverture du repli avec réduction aux chiffres, et restauration de la variable
    d'environnement sur tous les chemins — ce dernier point comptant parce que toute la
    suite tourne dans un seul processus.
Task 2: minor (deferred): le `catch` avale l'erreur sans journaliser, rendant une panne de
  base indistinguable d'une absence de ligne. Convention héritée : `getAnnouncementConfig`
  fait exactement pareil.

Task 3: Ruling: le verrou d'enregistrement doit porter sur les champs MODIFIÉS, pas sur les
  quatre. L'implémenteur avait ajouté, au-delà du brief, une désactivation du bouton quand un
  champ non vide est invalide — mais le calcul porte sur l'ensemble des champs, y compris
  ceux que l'administrateur n'a jamais touchés. Une valeur écrite avant un durcissement de
  validateur, ou par tout autre chemin, bloquerait donc l'enregistrement des trois autres,
  sans issue pour quelqu'un qui ne sait pas appeler l'API.
  L'ajout reste bienvenu — le retour immédiat vaut mieux qu'un aller-retour serveur — mais il
  doit se limiter à ce que l'administrateur vient d'écrire.
  — *Coût si erroné :* nul ; le serveur reste seul maître de l'écriture et valide de toute
    façon.
Task 3: fix round 1/5 (2 addressed, 0 open — verrou restreint aux champs modifiés, table de formats mutualisée ; commits da6a7f5..b54114b)
Task 3: complete (commits 18a5546..b54114b, review clean)
  - Le relecteur a tracé les trois scénarios : champ valide édité avec un champ invalide en
    base → enregistrement possible ; champ édité devenu invalide → bloqué ; retour à la
    valeur d'origine → sort de l'ensemble modifié. Le champ invalide non touché continue
    d'afficher son message.
  - Pureté de `src/lib/kk/parametres.ts` préservée malgré l'ajout de la table partagée :
    toujours zéro import.
Task 3: parked — le « test de contraste » du rapport ne prouve pas le correctif client : le
  400 renvoyé sur une charge complète est le comportement serveur inchangé. Le rapport ne le
  présente pas comme tel, mais un lecteur pressé pourrait s'y tromper. La vraie preuve est la
  lecture du code et le rejeu de la charge partielle.

Task 4: CORRECTION de mon ruling préalable — juste sur la prémisse, incomplet sur les
  conséquences. Les trois consommateurs sont bien des composants serveur, comme je l'avais
  vérifié. Mais `src/components/journal/share-buttons.tsx` EST un composant client, et il
  importait `WhatsAppGlyph` DEPUIS `WhatsAppButton.tsx`. En donnant à ce fichier un import
  qui touche Prisma, `pg` et `tls` sont partis dans le paquet navigateur et la construction a
  cassé.
  La spec avait donc à moitié raison de craindre la frontière client : pas là où elle le
  croyait, et pas pour le numéro, mais pour un SYMBOLE qu'un composant client importait du
  même fichier. J'ai vérifié qui rendait quoi, pas qui importait quoi.
  L'implémenteur a extrait le glyphe dans un fichier sans dépendance. C'est la bonne
  réponse : séparer ce qu'un client peut prendre de ce qu'il ne doit pas.
  — *Coût si erroné :* la construction cassait, donc rien ne serait parti en production.
    Défaut bruyant, pas silencieux.
Task 4: complete (commits b54114b..2fc0546, review clean)
  - Chaîne de repli à trois étages vérifiée sur les trois consommateurs : réglage → variable
    d'environnement → numéro société. Les constantes finales diffèrent par leur nom
    (`COMPANY.phone`, `CONTACT.phone`) mais portent la même valeur — aucune régression.
  - Extraction du glyphe complète : plus aucun fichier ne l'importe depuis l'ancien chemin.
  - Une seule requête de réglages par page, mémoïsation préservée.
Task 4: minor (deferred): la page de confirmation suppose que le numéro est déjà en chiffres
  sans que l'invariant soit documenté à cet endroit.

REVUE FINALE DE BRANCHE (fd9cf5b..2fc0546, 5 commits) — PAS ENCORE FUSIONNABLE.
  CRITICAL : `api/admin/parametres/route.ts:63` n'appelle pas `revalidatePath("/", "layout")`.
    Le site est prérendu statiquement et le numéro est injecté par le gabarit (bouton
    flottant monté dans `layout.tsx:52`, pied de page sur chaque page). Sans invalidation,
    l'administration affiche le nouveau numéro et la boutique sert l'ancien jusqu'à ce
    qu'une écriture sans rapport revalide par hasard. LE CRITÈRE 16 N'EST PAS TENU — celui
    que ce sous-lot existe pour fermer. Et le défaut est INVISIBLE en développement, où rien
    n'est mis en cache.
    Le relecteur a inspecté les 50 routes d'administration : toutes celles dont l'effet est
    visible sur la boutique appellent `revalidatePath`. C'est la seule qui ne le fait pas.
  IMPORTANT : un `whatsapp` saisi sans aucun chiffre — « à venir », « wa.me/kosskoss » — est
    normalisé à vide, passe la validation puisque le vide est licite, est enregistré, et
    l'écran annonce « Enregistré ✓ ». Le numéro de contact est effacé en silence. Le champ
    `whatsapp` est le seul dont la normalisation SUPPRIME des caractères au lieu de rogner.
  Signale aussi que `CONTACT.whatsapp` (`config/brand.ts:69`) n'a désormais PLUS AUCUN
    consommateur, et doit partir avec la variable d'environnement au nettoyage prévu.
  Vague de correction unique dispatchée.

CORRECTION du constat CRITICAL de la revue finale — la prémisse était fausse, et
  l'implémenteur l'a signalé. Vérifié par le contrôleur sur la sortie de `next build` :
  5 routes statiques, 162 DYNAMIQUES. La boutique n'est pas prérendue, elle est rendue à la
  demande, parce que `src/app/[locale]/layout.tsx:62` attend `tracageActif()`, qui lit les
  cookies. Le relecteur avait déduit le prérendu de la présence de `generateStaticParams`
  sans regarder la sortie de construction.
  Conséquence : LE CRITÈRE 16 ÉTAIT DÉJÀ TENU avant la correction. Celle-ci reste juste —
  elle vide le cache de routeur côté client, et protège le jour où cette lecture de cookies
  se déplacera — mais elle relevait de la défense en profondeur, pas d'un défaut critique.
  Ruling: conserver la correction. Elle ne coûte rien, aligne cette route sur les cinquante
  autres, et le jour où le gabarit cessera de lire les cookies, son absence deviendrait le
  défaut que le relecteur décrivait.
  — *Coût si erroné :* nul. Une invalidation de cache superflue sur une route
    d'administration écrite rarement.
  À signaler : le message du commit `f82623f` affirme le prérendu comme un fait présent et
  surestime donc le défaut. `e7b9cbe` le corrige dans son propre message plutôt que de
  réécrire l'historique.

VAGUE DE CORRECTION FINALE : 2 findings + 3 items joints, tous ADDRESSED, aucune régression
  (commits 2fc0546..e7b9cbe, 461 tests, build en succès).
  La garde contre l'effacement silencieux est bien indexée sur le COUPLE (saisie, normalisée)
  et non sur le nom du champ : le relecteur l'a tracée sur les quatre, et seul `whatsapp`
  peut la déclencher aujourd'hui, par construction et non par test de nom.
  Écart mineur de comptage entre mon relevé (5 routes statiques) et celui de l'implémenteur
  (4) : sans effet, les deux établissant qu'aucune route `[locale]` n'est prérendue.

RÉSIDUS PARQUÉS :
  - Ruling: parqué — `CONTACT.whatsapp` n'a plus aucun consommateur et `PARAMETRES_PAR_DEFAUT`
    est un réexport mort du module serveur. Les deux partiront avec le nettoyage de
    `NEXT_PUBLIC_WHATSAPP_NUMBER`, après vérification en production.
  - Ruling: parqué — le message du commit `f82623f` surestime le défaut qu'il corrige. Le
    commit suivant le rectifie dans son propre message plutôt que de réécrire l'historique,
    ce qui est le bon arbitrage sur une branche déjà partagée.
