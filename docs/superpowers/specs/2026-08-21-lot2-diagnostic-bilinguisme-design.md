# Lot 2 — Diagnostic administrable, profil client, bilinguisme

*Conception validée le 21 août 2026. Couvre les critères d'acceptation 08, 09 et 10
de l'annexe 3.*

## Pourquoi ce lot maintenant

Les sections A à D conditionnent le deuxième versement. Le lot 1 a clos les critères 02,
03 et 04. Ce lot ferme les 08, 09 et 10, ne laissant que la section D — le back-office —
avant ce versement.

## Ce que l'exploration a trouvé, et qui corrige l'audit

Trois constats, vérifiés dans le code avant toute conception :

- Le résultat du diagnostic produit **un produit par geste**, et les gestes sont une
  constante de code — `ROUTINE_STEPS` (`src/server/kk/diagnostic.ts:15`), quatre entrées :
  Nettoyer, Traiter, Hydrater, Protéger. Le « nombre de produits » vaut donc 4, figé.
- Ces libellés n'ont **aucune traduction anglaise**. Un visiteur sur `/en` lit « Nettoyer ».
  Le critère 08 et le critère 10 se rejoignent donc sur le même objet.
- **Un précédent bilingue fonctionnel existe déjà** : `src/server/emails/order.ts` porte un
  type `OrderEmailLocale = "fr" | "en"` et branche sur `order.locale` (`:303-304`). C'est
  l'e-mail de commande hérité de mlcbois. Les e-mails KossKoss (`src/server/kk/emails.ts`)
  sont ceux qui sont en français en dur. Le critère 10 est donc « appliquer un motif
  présent », pas « en inventer un ».

Une collision de noms à éviter : `RoutineStep` est **déjà** un modèle Prisma
(`schema.prisma:294`), celui des routines éditoriales. Les gestes du diagnostic prennent
donc le nom `DiagStep`, dans la continuité de `DiagQuestion` et `DiagAnswer`.

---

## 1. Gestes du diagnostic administrables

### Décision

Le nombre de produits proposés devient une **conséquence** du nombre de gestes activés,
non un réglage séparé.

Un plafond arbitraire — « au plus N produits » — couperait une routine cohérente au
milieu : le client se retrouverait avec un nettoyant et un traitement, sans hydratant ni
protection solaire. Désactiver le geste « Protéger » donne au contraire une routine de
trois gestes qui se tient.

### Modèle

```prisma
// Gestes du Diagnostic Beauté : un produit est proposé par geste actif.
//
// Le nom ne peut pas être « RoutineStep » : ce modèle existe déjà pour les
// routines éditoriales. La famille Diag* (DiagQuestion, DiagAnswer) est la
// bonne voisine.
//
// La CLÉ est l'identifiant, comme pour ProductTag : elle est écrite dans le
// code du moteur de routines et dans les libellés rendus au visiteur.
model DiagStep {
  key      String  @id
  labelFr  String
  labelEn  String  @default("")
  // Slug de la catégorie produit où puiser le candidat de ce geste.
  category String
  position Int     @default(0)
  active   Boolean @default(true)

  @@index([position])
}
```

Semé depuis les quatre entrées de `ROUTINE_STEPS`, avec leurs traductions anglaises.

### Conséquences

- `buildRoutine` (`src/server/kk/diagnostic.ts:45`) lit les gestes actifs triés par
  position au lieu de la constante, qui disparaît.
- Un écran d'administration à `/admin/diagnostic/gestes`, servi par une route d'écriture
  `POST /api/admin/diagnostic-steps`. Il rejoint ainsi les deux écrans du diagnostic déjà
  en place — `/admin/diagnostic` pour les questions, `/admin/diagnostic/tags` pour les
  pondérations — au lieu d'aller vivre sous `/admin/products`, où il n'a rien à faire.
  Sa structure reprend celle de l'écran du vocabulaire des tags livré au lot 1 : clé en
  lecture seule, libellés bilingues, validation complète avant écriture.
- Le libellé rendu suit la langue de la page, ce qui règle une part du critère 10.

### Ce que le seed ne doit pas faire

Leçon du lot 1 : le seed des tags écrasait `family` à chaque exécution, donc revenait sur
un choix fait par le client dans l'écran d'administration. Le seed des gestes ne met à jour
que ce qui n'est pas un choix éditorial — il **ne touche ni `position`, ni `active`, ni
`category`** sur une ligne existante.

---

## 2. Profil du client connecté

### Décision

On stocke **les réponses au QCM**, pas la routine calculée.

Un type de peau ne change pas tous les mois : les réponses restent valables. La routine,
elle, vieillit — ruptures de stock, prix périmés, produits retirés du catalogue. Stocker
les réponses fait que le client qui revient dans six mois voit une routine recalculée sur
le catalogue du jour, sans qu'on ait à gérer chaque cas de péremption à l'affichage.

### Modèle

```prisma
// Profil Diagnostic d'un client connecté : ses RÉPONSES, pas sa routine.
//
// Les réponses restent valables dans le temps ; une routine calculée, non —
// elle vieillit avec le catalogue. Le client qui revient voit donc une routine
// recalculée sur les produits réellement disponibles.
model CustomerDiagProfile {
  id         String   @id @default(cuid())
  // Un profil par client : un nouveau diagnostic remplace le précédent.
  customerId String   @unique
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  // Tableau JSON d'identifiants DiagAnswer. Lu en bloc, jamais interrogé
  // entrée par entrée — comme les pondérations de DiagAnswer, qui sont déjà
  // stockées ainsi.
  answerIds  String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

`onDelete: Cascade` est ici correct, contrairement à la facture : un profil n'a aucune
valeur probante et n'existe que pour servir son client.

### Comportement

- Un client connecté qui termine le QCM voit son profil enregistré, sans action de sa part.
- À son retour sur la page du diagnostic, on lui propose de revoir sa routine plutôt que de
  refaire le QCM. Refaire le QCM remplace le profil.
- Un visiteur non connecté ne déclenche aucune écriture.

---

## 3. E-mail de routine

### Décision

Deux consentements distincts dans un seul formulaire.

L'envoi de la routine est **transactionnel** : le visiteur l'a demandé, il n'appelle pas de
consentement marketing. L'inscription à la lettre d'information en appelle un, et elle est
donc proposée par une case **décochée par défaut**, à côté et non à la place.

### Comportement

Sur la page de résultat : un champ e-mail, pré-rempli pour un client connecté, un bouton
d'envoi, et la case d'inscription séparée.

- L'envoi passe par une nouvelle fonction `sendRoutineEmail` dans `src/server/kk/emails.ts`,
  **bilingue dès l'écriture** — pas de dette à reprendre plus tard.
- L'inscription réutilise la route existante `POST /api/kk/newsletter`.
- Les deux actions sont indépendantes : cocher la case sans demander l'envoi inscrit ;
  demander l'envoi sans cocher n'inscrit pas.
- Envoi **best-effort**, comme les autres e-mails du projet : une panne SMTP ne doit pas
  faire échouer l'affichage du résultat.

---

## 4. Bilinguisme

### Ce qui manque exactement

| Objet | État |
|---|---|
| `src/server/kk/emails.ts` — confirmation, accès, paiement reçu | Français en dur |
| E-mail de routine | À écrire, donc bilingue d'emblée |
| `src/components/kk/checkout-form.tsx` | Français en dur, n'utilise pas `next-intl` |
| Libellés des gestes | Traités en section 1 |

### Le motif à suivre

`src/server/emails/order.ts` a déjà résolu ce problème : un type `OrderEmailLocale`, une
sélection `const lang = order.locale === "en" ? "en" : "fr"`, et des textes choisis par
cette variable. On l'applique aux e-mails KossKoss plutôt que d'introduire une seconde
mécanique.

**Cela ferme le point que la revue du lot 1 avait laissé ouvert** : l'e-mail de facture
partait en français à un acheteur venu de `/en`.

Le formulaire de commande, lui, n'a pas de mécanique du tout : ses chaînes rejoignent les
fichiers de messages `next-intl`, à côté des clés du catalogue déjà présentes.

---

## Tests

Le projet compte 404 tests au vert ; ils doivent le rester.

| Objet | Ce qui est vérifié |
|---|---|
| Sélection de langue | `fr` par défaut, `en` seulement sur `"en"`, valeur inconnue → `fr` |
| Gestes actifs | ordre par position, inactifs écartés, liste vide gérée |
| Nombre de produits | il suit le nombre de gestes actifs |
| Repli de libellé | `labelEn` vide → libellé français, jamais la clé brute |
| Réponses du profil | sérialisation et relecture, JSON corrompu → tableau vide |

Le reste — envoi SMTP, écriture du profil — est lié à la base et au serveur de messagerie,
qu'aucun harnais de test ne fournit ici.

---

## Hors périmètre

- **Le critère 07 est déjà conforme** : le QCM est bilingue en base et ses tags sont
  administrables. On n'y touche pas.
- **Les facettes du vrai catalogue** (critère 01) restent le lot séparé déjà identifié.
- **La réémission de facture depuis le back-office** reste au lot back-office.

## Point ouvert

Le seed des gestes reprend les quatre gestes actuels et leurs traductions. Si le client
veut d'autres gestes — tonique, contour des yeux, sérum — il pourra les ajouter lui-même
depuis l'écran d'administration, **à condition qu'une catégorie produit correspondante
existe**. Un geste pointant vers une catégorie vide ne proposera rien et sera simplement
absent de la routine, sans erreur.
