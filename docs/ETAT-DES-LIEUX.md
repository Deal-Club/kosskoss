# État des lieux — lot 6

## Contraintes globales de ce lot

1. Tout ce qui est écrit ici a été vérifié dans le code, pas recopié d'une version
   antérieure. Chaque commande citée a été lancée.
2. Aucune donnée d'entreprise inventée. Les valeurs actuelles sont des valeurs
   d'exemple, et ce document le dit plutôt que d'avoir l'air complet.
3. Aucun nom de personne, aucun pseudonyme, aucune adresse électronique
   personnelle dans les documents livrés. Les comptes se désignent par leur rôle.
4. Le français est la langue des livrables.
5. Avant chaque commit : `tsc --noEmit`, `eslint`, `npm test` ; `npm run build` si
   du code est touché — au premier plan, timeout 600000. Rien en arrière-plan.

---

> **Ce document ne doit rassurer personne.** Il sert à décider. Un critère
> partiel dit ce qui manque ; une limite connue est écrite avec sa conséquence
> pour le commerçant, pas en note de bas de page.
>
> Un brouillon de ce document existait (`.superpowers/brouillon-etat-des-lieux.md`,
> mémoire du chantier). Il n'a pas été recopié : chaque ligne a été rejouée contre
> le code, et **plusieurs se sont révélées fausses** — pas sur les faits qu'il
> décrivait, mais sur le numéro de critère qu'il leur attribuait. Le détail est au
> §1.

## 1. Tableau des critères d'acceptation

### 1.1 Une mise en garde nécessaire sur la numérotation

**L'annexe 3 du contrat, qui porte le libellé exact des 23 critères, n'est pas
dans ce dépôt.** Neuf lots ont été exécutés en s'y référant (`docs/superpowers/plans/`
et `docs/superpowers/specs/`, 20-23 août 2026), et chacun cite le ou les numéros
qu'il ferme. C'est la seule source fiable dont ce document dispose — je l'ai
relue lot par lot plutôt que de recopier le brouillon transmis, et sur six
critères le brouillon se trompait de numéro :

| Critère | Le brouillon disait | Le dossier d'exécution dit | Preuve |
|---|---|---|---|
| 02 | Compte créé sur option cochée après paiement | **Téléphone camerounais** (format `+237XXXXXXXXX`, neuf chiffres) | *« le critère 02 demande le format camerounais »* — `docs/superpowers/specs/2026-08-20-lot1-facturation-telephone-facettes-design.md:139` |
| 03 | Mot de passe généré et envoyé | **Facturation** (paiement → statut « Payée », stock décrémenté, ligne `Invoice` créée) | Tableau de contrôle de fin de lot — `docs/superpowers/plans/2026-08-20-lot1-facturation-telephone-facettes.md:1672-1677` |
| 04 | E-mail d'accès conditionnel | **Les deux e-mails post-paiement** : accusé de réception, puis « paiement reçu » avec la facture PDF jointe (FCFA, jamais en euros) **et** l'e-mail d'accès conditionné à l'option de suivi | Même tableau, ligne 04 ; et *« La seconde moitié du critère 04 est donc satisfaite »* — spec lot 1, ligne 21 |
| 07 | Statuts de commande du cahier des charges | **QCM du diagnostic bilingue en base, tags administrables** (déjà conforme avant le lot 2) | *« Le critère 07 est déjà conforme »* — `docs/superpowers/specs/2026-08-21-lot2-diagnostic-bilinguisme-design.md:207` |
| 08 | Facturation | **Diagnostic Beauté** : gestes administrables sans redéploiement, lien visible entre gestes actifs et nombre de produits proposés, déroulement bilingue | *« c'est le lien que le critère 08 demande de rendre visible »* — plan lot 2, ligne 549 ; tableau de contrôle, lignes 1292-1293 |
| 09 | Historique des commandes | **Profil du diagnostic** : reprise proposée à un client reconnecté, routine envoyée par e-mail, inscription **optionnelle** avec la source `diagnostic` | Tableau de contrôle, lignes 1294-1296 |

Les statuts de commande CDC (`en_attente_paiement`, `payee`, `en_preparation`,
`en_acheminement`, `livree`, `evaluee`, `annulee`, `remboursee`) et la
facturation numérotée sont **réels et vérifiés** — seul le numéro que le
brouillon leur attribuait était faux.

**Critères 01 et 10** : le brouillon avait juste. Confirmé par
`docs/superpowers/plans/2026-08-22-lot4c-facettes.md:5` (« Critère visé : 01 ») et
par les entrées « critère 10 » / « critère servi : 10 » des lots 2, 4a et 4b.

**Critères 12 à 16, 19, 20, 21-23** : confirmés directement par l'en-tête de
chaque spec (`docs/superpowers/specs/2026-08-22-lot3d…` à `2026-08-23-lot6…`),
sans ambiguïté de numérotation.

### 1.2 Les critères 05, 06, 11, 17, 18

**Aucun document du dépôt — neuf lots, dix-sept fichiers de plan et de
conception — n'attribue jamais l'un de ces cinq numéros à une exigence
précise.** Je ne les invente pas : les tableaux « critère visé » cités plus haut
couvrent 18 des 23 numéros (01-04, 07-10, 12-16, 19-23) ; il en manque
exactement cinq, et ce sont ceux-ci. Sans l'annexe 3, leur libellé exact **ne
peut pas être confirmé depuis ce dépôt** — l'écrire quand même serait fabriquer
une source qui n'existe pas.

Ce que je peux faire honnêtement : lister, comme **candidats non confirmés**,
les exigences du CDC (`docs/13-cdc-synthesis-and-gap.md`, `docs/10-implementation-roadmap.md`)
qui ne sont couvertes par aucun des 18 numéros ci-dessus, avec leur état réel
dans le code. Ce ne sont pas des attributions — seulement ce qui reste sans
numéro assigné :

| Exigence CDC sans numéro confirmé | État vérifié dans le code |
|---|---|
| Paiement Mobile Money par agrégateur, webhook signé, idempotence, jamais « Payée » depuis le retour navigateur seul | **Construit** pour l'essentiel (voir §4, point 1) — avec des réserves à lever avant mise en ligne |
| Livraison externe + bouton WhatsApp `wa.me` pré-rempli sur la page de confirmation | **Construit** — `src/app/[locale]/confirmation/[orderNumber]/page.tsx` compose n° de commande, articles, total, nom, téléphone, lieu de livraison |
| Lien du formulaire d'évaluation (Google Form), réglable en admin | **Construit** — réglage `formulaireEvaluation` (`src/lib/kk/parametres.ts`) |
| Bandeau de consentement cookies | **Construit** — `src/components/kk/cookie-consent.tsx` |
| `PaymentTransaction` + `WebhookEvent` (traçabilité, idempotence) | **Construit** — modèles Prisma utilisés par `src/server/kk/paiement.ts` |
| Avis vérifiés (badge réservé aux acheteurs) + réponse de la marque | **NON construit** — le modèle `Review` n'a ni lien vers une commande ni champ de vérification d'achat, ni champ de réponse (`prisma/schema.prisma:377-397`) |
| Journal d'activité admin (qui a changé quoi) | **NON construit** — aucun modèle `ActivityLog`/`AuditLog` dans le schéma |

Si le commerçant retrouve l'annexe 3, la correction de ce tableau est
mécanique : il suffit d'y reporter les cinq libellés manquants en face de leur
état déjà vérifié ci-dessus.

### 1.3 Récapitulatif corrigé

| N° | Sujet (libellé reconstruit depuis le dossier d'exécution) | État | Où c'est |
|---|---|---|---|
| 01 | Filtres catalogue : catégorie, marque, type de peau, préoccupation, prix, tri | **Couvert** | `src/lib/kk/facettes.ts`, `src/server/kk/catalog.ts`, `src/components/kk/catalog-filters.tsx` |
| 02 | Téléphone au format camerounais (`+237`, neuf chiffres, mobile ou fixe) | **Couvert** | `src/lib/kk/telephone.ts`, appelé côté formulaire et côté serveur |
| 03 | Facturation : paiement → « Payée », stock décrémenté, `Invoice` créée, numérotation `FAC-AAAA-NNNNNN` | **Couvert** | `src/server/invoice.ts`, `src/server/kk/facture.ts`, `src/server/kk/facture-numero.ts` |
| 04 | E-mails post-paiement (accusé, puis « paiement reçu » avec PDF, montants FCFA) + e-mail d'accès conditionné à l'option de suivi | **Couvert** | `src/server/kk/checkout.ts` (`sendAccountAccessEmail`), `src/server/kk/emails.ts` |
| 07 | QCM du diagnostic bilingue en base, tags administrables | **Couvert** | `src/server/kk/diagnostic.ts`, `DiagQuestion`/`DiagAnswer`/`DiagStep` |
| 08 | Diagnostic Beauté : gestes administrables, lien visible gestes↔produits, déroulement FR/EN | **Couvert** | `src/server/kk/diagnostic.ts` (`ROUTINE_STEPS` devenu `DiagStep` administrable) |
| 09 | Profil du diagnostic : reprise pour client connecté, routine par e-mail, inscription optionnelle | **Couvert** | flux diagnostic, source `diagnostic` sur le compte créé |
| 10 | Bilinguisme intégral FR/EN (contenu, tunnel, facture, interface) | **PARTIEL** | contenu et tunnel entièrement traduits ; **5 chaînes françaises restent en dur dans `src/components/kk/brands-showcase.tsx`** — voir §3 pour la nuance : ce composant n'a aucun appelant |
| 12 | Rôles Administrateur / Gestionnaire de commandes | **Couvert** | `src/lib/kk/roles.ts`, `src/server/kk/acces.ts` — le rôle est relu à chaque requête, jamais mis en cache de session |
| 13 | Back-office complet (marques, approvisionnement, traductions, produits/tags) | **Couvert**, avec des volets du CDC hors périmètre de ce numéro — voir §1.2 (avis vérifiés, journal d'activité) | écrans `/admin/marques`, `/admin/fournisseurs`, `/admin/bons`, `/admin/traductions`, `/admin/produits` |
| 14 | Tableau de bord des ventes | **Couvert** | `/admin/ventes`, `src/server/kk/ventes.ts` |
| 15 | Export CSV des ventes avec coûts et marges | **Couvert** | `/api/admin/ventes/export` |
| 16 | Réglages administrables sans redéploiement (WhatsApp, formulaire d'évaluation, GA4/Pixel) | **Couvert** | `/admin/parametres`, `src/server/kk/parametres.ts` |
| 19 | Mesure GA4 e-commerce | **Couvert, à confirmer en production** | la pose est faite ; aucune requête n'a pu être prouvée jusqu'aux serveurs de Google, faute d'identifiant réel dans cet environnement |
| 20 | Meta Pixel + API de conversions serveur, déduplication `event_id` | **Couvert** | `src/server/kk/capi.ts` — appelé uniquement au passage en « payée » (`src/server/kk/paiement.ts:203-227`), jamais avant, jamais sans consentement |
| 21-23 | Livrables, documentation de reprise, transfert | **Ce lot** | `docs/HANDOVER.md`, `docs/BACK-OFFICE.md`, `docs/ETAT-DES-LIEUX.md`, `TARGET.md`, `README.md` |
| **05, 06, 11, 17, 18** | **Libellé non confirmable depuis ce dépôt** | **Non déterminé** — voir §1.2 pour les candidats identifiés et leur état de code |

## 2. Ce qui reste à la main du commerçant

| Point | Conséquence si on l'oublie |
|---|---|
| Les données d'entreprise sont des **valeurs d'exemple** (`src/content/legal/company.ts`, `provisoire: true`) | elles s'impriment sur **chaque facture** — RCS/RCCM, NIU, capital, adresse. `provisoire` reste à `true` tant qu'elles n'ont pas été remplacées et relues par un juriste (avertissement déjà présent dans `src/content/legal/fr.ts:39`) |
| Identifiants GA4, Meta Pixel, jeton de l'API de conversions | rien n'est mesuré tant qu'ils sont vides — vérifié : aucune valeur réelle n'est fournie dans cet environnement |
| Lien du formulaire d'évaluation, numéro WhatsApp | réglables en admin (`/admin/parametres`) ; sans eux, le bouton WhatsApp retombe sur le téléphone de `COMPANY` et le lien d'évaluation reste vide |
| Identifiants de paiement en ligne (voir §4, point 1) | sans eux, toute commande Mobile Money ou carte reste en « en attente de paiement », à relancer manuellement |

## 3. Limites connues, sans les adoucir

- **La performance mobile est sous l'objectif du cahier des charges.** Le CDC
  vise un score supérieur à 80 ; il n'avait jamais été mesuré. Il l'est
  désormais, avec Lighthouse 12, en profil mobile, sur la construction de
  production servie en local :

  | Page | Score | Premier affichage | Plus grand affichage | Réponse du serveur |
  |---|---|---|---|---|
  | Accueil | **55 / 100** | 3,6 s | 7,7 s | 1,9 s |
  | Rayon `/soins-visage` | **41 / 100** | 3,6 s | 9,6 s | 2,1 s |

  Le décalage cumulé est nul, ce qui est bon : la page ne saute pas pendant son
  chargement. Le poste dominant, dans les deux cas, est le **temps de réponse du
  serveur**, à environ deux secondes.

  **Ce que cette mesure vaut, et ce qu'elle ne vaut pas.** Elle a été prise sur
  un poste de développement, contre la base PostgreSQL hébergée aux États-Unis
  (`us-east-2`), avec un aller-retour mesuré à environ 220 millisecondes par
  requête. Une page de rayon en émet une vingtaine. En production sur Vercel,
  dans la même région que la base, ce poste devrait fondre — mais **ce n'est
  pas une mesure, c'est une hypothèse**, et elle doit être vérifiée sur
  l'hébergement réel avant d'annoncer un chiffre au client.

  **Ce levier a été actionné.** Les décomptes de facettes du rayon émettaient
  dix requêtes, une par entrée de vocabulaire. La colonne `tags` est désormais
  lue une fois par famille et le comptage se fait en mémoire : deux requêtes au
  lieu de dix, pour un résultat vérifié identique sur les trois univers et
  toutes les clés de vocabulaire.

  | Rayon `/soins-visage` | Avant | Après |
  |---|---|---|
  | Réponse du serveur | 2 090 ms | **570 ms** |
  | Plus grand affichage | 9,6 s | **6,0 s** |
  | Score mobile | 41 / 100 | **46 / 100** |

  Le score reste sous l'objectif : ce qui domine désormais n'est plus la base
  mais le JavaScript exécuté au chargement. C'est le prochain levier, et il
  demande un travail d'une autre nature.

  **À refaire sur l'hébergement de production**, page d'accueil, rayon et fiche
  produit, avant toute annonce de conformité sur ce point.


- **Le coût d'achat par variante n'existe pas.** Deux contenances d'un même
  produit partagent le coût du produit parent (`Product.costCents`) : les
  marges des déclinaisons sont approximatives. Confirmé : le rapport de la
  tâche 23 de ce lot documente qu'une réception écrase ce champ unique,
  partagé par toutes les variantes.
- **5 chaînes françaises restent en dur**, toutes dans
  `src/components/kk/brands-showcase.tsx` (« Nos maisons », « Toutes vos marques,
  un seul panier », le paragraphe d'accroche, « Toutes nos marques », le
  libellé « référence(s) »). **Ce composant n'a aucun appelant** — vérifié par
  recherche de `BrandsShowcase`/`brands-showcase` dans tout `src/` : la seule
  autre occurrence est un commentaire de `src/app/[locale]/page.tsx:174-176` qui
  dit explicitement que le composant « reste dans le dépôt mais n'a plus aucun
  appelant : à supprimer si la décision se confirme ». Aucun visiteur ne peut
  donc lire ces 5 chaînes aujourd'hui — mais si ce composant est un jour
  raccroché à une page, elles devront être traduites avant.
- **Les avoirs et remboursements ne sont pas déduits du chiffre d'affaires.**
  Une commande remboursée reste dans l'encaissé (`src/server/kk/ventes.ts`,
  commentaire de tête « ANNULÉE SORT, REMBOURSÉE RESTE ») : une commande
  annulée en sort (la marchandise n'est jamais partie), une commande
  remboursée y reste (elle a été encaissée). C'est un choix documenté dans le
  code, pas un oubli — mais il fausse le chiffre tant qu'un lot d'avoirs
  n'existe pas. Confirmé : aucun modèle `CreditNote`/`Avoir` dans le schéma.
- **Un chemin de création de commande est mort mais conservé.**
  `src/server/orders.ts` exporte toujours `createOrder`, utilisée par
  `src/app/api/checkout/route.ts` — une route HTTP qui répond encore. Elle
  n'est appelée par aucune page : son seul consommateur front,
  `src/components/checkout/CheckoutFlow.tsx` (et le composant qu'il utilise,
  `AddressFieldset.tsx`), n'est lui-même importé par aucune page du dépôt.
  Vérifié par recherche de `CheckoutFlow` dans tout `src/` : un seul résultat,
  son propre fichier. Réanimé sans revue, ce chemin réintroduirait le modèle de
  livraison France/zones et le format de téléphone que le CDC KossKoss a
  remplacés.
- **Aucune infrastructure de test avec base de données.** Vérifié : aucune
  variable `TEST_DATABASE_URL`, aucun harnais de test relié à Postgres. Les
  fonctions qui écrivent (création de commande, paiement, réception de stock)
  ne sont couvertes que par relecture et essais manuels, pas par des tests
  automatiques.
- **`/admin/diagnostic/tags` est rangé sous le diagnostic** alors que c'est un
  écran de vocabulaire de catalogue (types de peau, préoccupations). Vérifié :
  le dossier existe bien sous `src/app/admin/(protected)/diagnostic/tags/`.
  Sans effet aujourd'hui (un seul rôle Administrateur y accède), mais un futur
  rôle limité au catalogue ne le verrait pas à cet endroit.
- **`NEXT_PUBLIC_WHATSAPP_NUMBER` et `CONTACT.whatsapp` n'ont plus aucun
  lecteur.** Vérifié : `CONTACT.whatsapp` est assigné dans
  `src/config/brand.ts:67-69` mais aucune recherche dans `src/` n'en trouve de
  lecture — le bouton WhatsApp réel (`src/components/WhatsAppButton.tsx`) lit
  le réglage en base (`numeroWhatsappEffectif`), avec repli sur
  `COMPANY.phone`, jamais sur cette variable. À retirer après confirmation en
  production, pour ne pas laisser croire qu'elle sert encore à quelque chose.
- **Des identifiants d'intégration CinetPay existent en base mais ne sont
  câblés à aucun code.** `prisma/seed.ts` crée trois lignes `Integration`
  (`cinetpay_apikey`, `cinetpay_site_id`, `cinetpay_secret_key`), affichables
  et modifiables depuis l'écran générique des intégrations du back-office.
  Vérifié : aucune recherche de « cinetpay » dans `src/` ne trouve de code qui
  les lit. Le paiement réellement branché (voir §4, point 1) est un prestataire
  différent (GeniusPay), configuré par variables d'environnement, sans écran
  admin dédié. **Un commerçant qui renseigne ces trois champs CinetPay
  croira le paiement en ligne activé — il ne se passera rien.** Ni
  `docs/HANDOVER.md`, ni `docs/BACK-OFFICE.md`, ni `docs/PAIEMENT.md`
  n'avertissaient de ce piège avant ce lot ; corrigé dans `docs/BACK-OFFICE.md`
  (tâche 5 de ce lot, voir le rapport de contrôle du transfert).

## 4. Le point le plus lourd : l'encaissement Mobile Money

**Ce que dit le brouillon de mémoire n'était pas tout à fait exact, dans les
deux sens.** Il fallait le vérifier, pas le recopier — voici ce que le code
montre réellement.

### Ce qui existe

Un adaptateur Mobile Money **est bien construit et branché** dans le tunnel
réel de KossKoss (`src/server/kk/paiement.ts`, autour du prestataire
**GeniusPay** — Wave, Orange Money, MTN, carte) :

- ouverture d'une tentative de paiement à la commande (`ouvrirPaiement`) ;
- conclusion uniquement par **webhook signé** — jamais depuis le retour
  navigateur seul, la règle est écrite noir sur blanc en tête de fichier ;
- vérification de signature acceptant les deux formats de documentation
  contradictoires du prestataire (`X-GeniusPay-Signature` et
  `X-Webhook-Signature`) ;
- idempotence par upsert sur la référence de transaction ;
- rapprochement du montant reçu contre le montant de la commande, avec refus
  et trace explicite en cas d'écart ;
- déclenchement de l'API de conversions Meta **uniquement** au passage réel en
  « payée », jamais avant.

Ce n'est donc **pas** l'absence totale que le brouillon décrivait — le brouillon
avait raison de dire qu'aucun adaptateur **CinetPay** n'existe (recommandation
du CDC), mais tort de conclure que rien n'encaisse en Mobile Money : GeniusPay
en est un, différent de celui recommandé.

### Ce qui manque réellement, aujourd'hui

Trois réserves sont écrites dans le fichier du prestataire lui-même
(`src/server/gateways/geniuspay.ts:9-41`), et une quatrième constatée dans cet
environnement :

1. **Correction après vérification directe du fichier `.env.local` de cet
   environnement** (première rédaction de ce document erronée sur ce point :
   elle avait cherché un fichier `.env`, pas `.env.local`, celui que Next.js et
   Prisma chargent réellement). Des clés GeniusPay **y sont bien renseignées**
   — préfixe `pk_sandbox_…`, donc un compte de test, pas un compte de
   production. `paiementDisponible()` y renvoie donc `true` : sur **ce poste**,
   une commande Orange Money ou MTN ouvre réellement une session de paiement
   sandbox chez GeniusPay. Ce que ce dépôt ne permet **pas** de savoir, parce
   que les variables d'environnement ne sont jamais versionnées : si des clés
   — sandbox ou live — sont configurées **en production**. C'est une question
   à poser à qui gère l'hébergement, pas quelque chose que le code peut
   trancher. Sans elles, en production, le scénario est bien celui que le
   brouillon décrivait : commande créée, stock décrémenté, aucune tentative de
   paiement en ligne ouverte, commande laissée « en attente de paiement » à
   reprendre par WhatsApp.
2. **La couverture Cameroun n'est pas confirmée par GeniusPay.** Leur
   documentation liste Sénégal, Côte d'Ivoire, Mali, Burkina Faso pour Orange
   Money, et Côte d'Ivoire/Burkina Faso pour MTN — pas le Cameroun.
3. **Leur API refuse le XAF** (422 en sandbox, vérifié par l'équipe qui a
   construit ce module) et n'accepte que le XOF. Parité fixe entre les deux
   francs, donc le montant transite juste — mais l'encaissement sera libellé
   XOF chez le prestataire pendant que la boutique affiche du XAF : à valider
   avec le comptable.
4. **Un doublon d'intégration CinetPay existe en base sans effet** (voir §3,
   dernier point) — un risque de confusion pour le commerçant, pas pour le
   client.

### Ce que le commerçant doit faire pour que cela change

1. Ouvrir un compte GeniusPay et **faire confirmer par écrit la couverture
   Orange Money CM et MTN MoMo CM**, ou, si elle n'est pas disponible,
   ouvrir un compte CinetPay (ou Maviance/ElyonPay) et faire écrire
   l'adaptateur correspondant — l'interface `PaymentProvider` existante n'a
   pas besoin d'être touchée, seul un nouveau fichier dans
   `src/server/gateways/` le serait.
2. Renseigner `GENIUSPAY_API_KEY`, `GENIUSPAY_API_SECRET`,
   `GENIUSPAY_WEBHOOK_SECRET` en production (déjà documenté dans
   `docs/HANDOVER.md`).
3. Faire trancher par le comptable la question XOF/XAF avant l'ouverture du
   mode réel (voir §5).
4. Soit supprimer les trois lignes d'intégration CinetPay orphelines du seed,
   soit écrire l'adaptateur qui les rend utiles — les laisser dans cet état
   trompe quiconque les remplit.

Tant que la production n'a pas de clés confirmées (sandbox ou live) **et** que
la couverture Cameroun n'est pas validée par écrit avec GeniusPay, **la
réalité que le brouillon décrivait reste la plus prudente à retenir** : un
client peut choisir Orange Money, la commande se crée, le stock se décrémente,
et rien n'est encaissé en ligne en production. La différence avec ce que
disait le brouillon est que le code pour encaisser existe déjà et fonctionne
en sandbox sur ce poste — il manque une confirmation du prestataire pour le
Cameroun et une décision sur les clés de production, pas un chantier de
développement.

## 5. Questions au comptable

| Question | Pourquoi elle se pose |
|---|---|
| Mentions obligatoires de la facture au Cameroun | la facture actuelle suit un modèle hérité de `mlcbois`, corrigé pour le FCFA mais pas revu par un juriste local |
| Régime de TVA | vérifié : **aucun calcul de TVA n'existe dans le code** (`src/lib/kk/`, `src/server/kk/`) — le taux est à zéro, sans décomposition sur la facture |
| `XOF` ou `XAF` déclaré au prestataire de paiement et aux traceurs | GeniusPay n'accepte que le XOF (voir §4) alors que la boutique affiche et déclare du XAF (JSON-LD, tracking) — parité fixe donc montant correct, mais écriture comptable à trancher |
| Base du coût d'achat | si les factures fournisseurs sont hors taxe et les prix de vente toutes taxes, le taux de marge affiché est optimiste |
| **Dernier prix payé ou coût moyen pondéré** | vérifié : une réception de stock écrit le dernier prix payé sur `Product.costCents`, un champ **unique par produit, partagé par toutes ses ventes futures** (`src/server/kk/bons.ts`, fonction `recevoirLignes`) — la moyenne pondérée serait plus juste mais exige de suivre le stock valorisé, ce qui n'est pas fait |

## 6. Base de données

**Développement et production partagent la même base PostgreSQL sur Neon.**
Vérifié par `npx prisma migrate status` (lecture seule) : 27 migrations, base à
jour, aucune dérive entre le schéma et la base. Ce n'est pas un détail
d'infrastructure : c'est la raison pour laquelle `prisma migrate dev` est
proscrit (voir `docs/HANDOVER.md`) — il peut se bloquer ou proposer une
réinitialisation sur une base que la production utilise aussi.
