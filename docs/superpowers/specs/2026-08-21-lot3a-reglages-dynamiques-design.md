# Lot 3A — Réglages dynamiques du back-office

*Conception validée le 21 août 2026. Couvre le critère d'acceptation 16 de l'annexe 3.*

## Pourquoi ce sous-lot d'abord

Le « lot 3 » du plan initial est en réalité **sept sous-systèmes**. Celui-ci est le plus
petit, et c'est aujourd'hui un **échec franc** : le critère 16 exige que la modification du
numéro WhatsApp, du lien Google Form et des identifiants de tracking « prenne effet sans
redéploiement », or le numéro est une variable d'environnement lue à la construction et les
deux autres n'existent pas.

Il débloque aussi le lot de mesure d'audience : les identifiants GA4 et Pixel y vivront.

### Découpage retenu pour le reste du back-office

| | Sujet | Critère |
|---|---|---|
| **A** | Réglages dynamiques *(ce document)* | 16 |
| **B** | Coût d'achat et marge sur le produit | 13 |
| **C** | Tableau de bord des ventes et export CSV | 14, 15 |
| **D** | Rôles et autorisations | 12 |
| **E** | Marques comme entité | 13 |
| **F** | Fournisseurs et bons de commande | 13 |
| **G** | Écran de traductions FR/EN | 13 |

Trois dépendances : **B débloque C** — sans coût d'achat, ni la marge du tableau de bord ni
les colonnes de l'export n'existent ; **A débloque le lot de mesure d'audience** ; **E doit
précéder F** si les bons de commande référencent des marques.

## Ce que l'exploration a établi

- **`adminApi.ts`, la garde de toutes les routes d'administration, ne vérifie aucun rôle.**
  Un `superadmin` existe pour gérer les comptes (`server/admins.ts:15,85`), mais tout
  administrateur authentifié peut appeler n'importe quelle route. C'est le sous-lot D.
- Le motif clé/valeur existe et sert déjà trois fois : `announcement.config`
  (`server/announcements.ts:22`), le virement bancaire (`server/bankTransfer.ts:64`) et les
  passerelles de paiement (`server/gateways/index.ts:73`). Chacun stocke un JSON dans une
  clé `Setting`, lu par `findUnique`, écrit par `upsert`.
- `getAnnouncementConfig` est mémoïsé par **`cache()` de React** — le bon précédent, parce
  que cette valeur est lue à chaque rendu de page.
- **Le Google Form est le formulaire d'évaluation**, dont le lien est envoyé au client par
  WhatsApp (`docs/13-cdc-synthesis-and-gap.md:63`). Ce n'était pas une inconnue à faire
  trancher : le CDC le dit.

---

## 1. Où vivent les réglages

### Décision

Aucun modèle nouveau. Une clé `Setting` portant un JSON, sur le motif des trois précédents.

Créer une table dédiée n'apporterait rien : ces réglages sont lus en bloc, jamais
interrogés champ par champ, et le projet a déjà tranché cette question trois fois dans le
même sens.

### Contenu

```ts
interface ParametresBoutique {
  /** Numéro WhatsApp de la boutique, en chiffres. Remplace NEXT_PUBLIC_WHATSAPP_NUMBER. */
  whatsapp: string;
  /** Lien du formulaire d'évaluation, envoyé au client par WhatsApp après livraison. */
  formulaireEvaluation: string;
  /** Identifiant de mesure GA4 — public, il part dans le HTML. */
  ga4: string;
  /** Identifiant du Pixel Meta — public lui aussi. */
  metaPixel: string;
}
```

### Ce que ce réglage ne portera jamais

Le **jeton de l'API Conversions** de Meta est un secret. `Integration`
(`schema.prisma:380`) existe pour cela et le chiffre en AES-256-GCM.

Les deux ne doivent pas se mélanger : mettre un jeton dans ce JSON le ferait voyager en
clair vers toute route d'administration qui lit les réglages, et vers l'écran qui les
affiche. La règle est simple — **ce qui part dans le HTML va dans `Setting`, ce qui reste
au serveur va dans `Integration`.**

---

## 2. Lecture

### Mémoïsation

`cache()` de React, comme `getAnnouncementConfig`. Sans cela, le numéro WhatsApp
déclencherait **trois** requêtes par page : l'en-tête, le pied de page et le bouton
flottant le lisent chacun.

### La difficulté que la migration révèle

`NEXT_PUBLIC_WHATSAPP_NUMBER` est une variable **publique** : `WhatsAppButton`, un
composant client, la lit directement dans son propre code (`components/WhatsAppButton.tsx`).

Une valeur en base ne peut pas l'atteindre ainsi. Elle devra **descendre en propriété**
depuis un composant serveur. C'est ce qui rend ce réglage moins trivial qu'il n'en a
l'air, et c'est le seul endroit où la migration change une frontière serveur/client.

### Repli, pour qu'aucun déploiement ne casse

La lecture retombe sur `NEXT_PUBLIC_WHATSAPP_NUMBER` tant que le réglage est vide. Entre
la migration et la première saisie, le site continue donc d'afficher le bon numéro.

Un seed initialise le réglage avec la valeur actuelle de la variable. Celle-ci devient
morte ensuite — mais **on ne la supprime pas dans ce sous-lot** : la retirer pendant que la
production tourne encore sur l'ancien code casserait le site entre le déploiement et la
propagation. Sa suppression est une tâche de nettoyage à part, une fois le réglage vérifié
en production.

---

## 3. Écran d'administration

`/admin/parametres`, sur le patron des deux écrans livrés aux lots précédents —
`/admin/products/tags` et `/admin/diagnostic/gestes` : `requireAdminApi()` en première
instruction de la route d'écriture, validation de **chaque** champ avant **toute** écriture,
valeurs stockées rognées.

Quatre champs, tous facultatifs : une boutique qui n'a pas encore de Pixel doit pouvoir
enregistrer les trois autres.

### Validation

| Champ | Règle | Pourquoi |
|---|---|---|
| `whatsapp` | chiffres uniquement après normalisation, ou vide | Le lien `wa.me` n'accepte rien d'autre |
| `formulaireEvaluation` | URL `https://`, ou vide | Un lien envoyé au client ne doit pas pointer en clair |
| `ga4` | motif `G-XXXXXXXXXX`, ou vide | Une faute de frappe ne remonterait aucune mesure, en silence |
| `metaPixel` | chiffres, ou vide | Idem |

Les motifs GA4 et Pixel ne garantissent pas que le compte existe — rien ne le peut depuis
ce formulaire. Ils attrapent la faute de frappe, qui est le cas réel : une mesure qui ne
remonte pas ne se signale jamais d'elle-même.

---

## 4. Ce qui consomme les réglages

| Réglage | Consommateur | État après ce sous-lot |
|---|---|---|
| `whatsapp` | en-tête, pied de page, bouton flottant, page de confirmation | Branché |
| `formulaireEvaluation` | message WhatsApp envoyé après livraison | **Réglage posé, pas encore envoyé** |
| `ga4`, `metaPixel` | balises de mesure | **Réglage posé, balises au lot de mesure** |

L'envoi du lien d'évaluation et la pose des balises appartiennent à d'autres lots. Ce
sous-lot fournit la source ; le critère 16 porte sur le fait que **la modification prenne
effet sans redéploiement**, ce qui se vérifie dès que le réglage est lu quelque part.

Le numéro WhatsApp le démontre à lui seul, et c'est le seul des quatre qui soit déjà
consommé aujourd'hui.

---

## Tests

Le projet compte 434 tests au vert ; ils doivent le rester.

| Objet | Ce qui est vérifié |
|---|---|
| Normalisation du numéro | espaces, `+`, indicatif ; vide accepté |
| Validation GA4 | `G-` suivi de dix caractères ; refus d'une faute de frappe |
| Validation du Pixel | chiffres seuls |
| Validation du lien | `https://` exigé, `http://` refusé, vide accepté |
| Lecture avec repli | réglage absent → valeur de la variable d'environnement |
| Lecture d'un JSON corrompu | valeurs vides, jamais une exception |

La mémoïsation et l'écran demandent une base et un navigateur, qu'aucun harnais de test ne
fournit ici.

---

## Hors périmètre

- **La pose des balises GA4 et Pixel**, et le jeton CAPI : lot de mesure d'audience.
- **L'envoi du lien d'évaluation par WhatsApp** : il suppose de savoir à quel moment du
  cycle de commande il part, ce que ce sous-lot n'a pas à trancher.
- **La suppression de `NEXT_PUBLIC_WHATSAPP_NUMBER`** : nettoyage à part, après vérification
  en production.
- **Les rôles** : sous-lot D. Cet écran sera donc accessible à tout administrateur
  authentifié jusque-là, comme tous les autres.

## Décision consignée sur le sous-lot G

Le critère 13 dit « traductions » sans préciser. Le CDC est plus net : il demande des
« **Traductions FR/EN dédiées** » comme écran du tableau de bord
(`docs/13-cdc-synthesis-and-gap.md:68`).

C'est donc un livrable réel, et non une exigence que l'édition bilingue déjà en place
(produits, catégories, journal, pages légales) suffirait à couvrir. Il reste en dernier dans
l'ordre, mais il reste.
