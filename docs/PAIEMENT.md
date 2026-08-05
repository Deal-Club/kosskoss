# Brancher la boutique sur un compte de paiement

Cinq prestataires sont câblés : **Stripe**, **Square**, **Mollie**, **PayPal** et
**Nexi**. Un seul encaisse à la fois — c'est le choix retenu pour la boutique, et
il se change en deux clics : les clés de tous restent enregistrées, le
basculement d'un client à l'autre est immédiat.

Tout se configure depuis le back-office : **Admin → Moyens de paiement →
Paiement en ligne (carte bancaire)**. Aucune variable d'environnement à ajouter,
aucun redéploiement. Les clés sont stockées chiffrées (AES-256-GCM) dans la table
`Integration` et ne sont jamais réaffichées.

Dans tous les cas le client paie sur une page hébergée par le prestataire :
aucune donnée de carte ne transite par le serveur de la boutique.

---

## La marche à suivre, commune à tous

1. **Choisir le prestataire** dans la liste.
2. **Coller ses clés** (voir la section correspondante plus bas).
3. Cliquer sur **« Enregistrer les clés et tester la connexion »**. Le test
   interroge le prestataire sans rien encaisser et affiche :
   - si les clés sont acceptées, et pour quel compte ;
   - **l'URL de webhook exacte à déclarer** — la recopier de là plutôt que de la
     retaper ;
   - ce qui manque ou ne colle pas (devise, compte non vérifié, webhook absent…).
4. **Déclarer le webhook** chez le prestataire si le test le demande.
5. **Cocher les moyens de paiement** de la boutique qui passent par lui
   (typiquement « Carte bancaire »). Ceux qui restent décochés — le virement —
   continuent d'être réglés hors ligne.
6. **Enregistrer le paiement en ligne.**

### Ce qui se passe ensuite, quel que soit le prestataire

1. Le client valide sa commande. Elle est écrite en base en « en attente », le
   stock est décompté, les e-mails partent.
2. Si le moyen choisi est rattaché au prestataire actif, la boutique ouvre un
   paiement et redirige le navigateur.
3. Le client paie, puis revient sur la page de confirmation.
4. Le prestataire notifie le webhook ; la commande passe en **« Payée »**.

Le retour du client ne prouve rien — il peut fermer l'onglet. **Seule la
notification fait foi.** Corollaire : sans webhook correctement déclaré, le
client paie et la commande reste « en attente ».

Si le prestataire est injoignable au moment de la commande, la commande reste
valable et simplement réglable autrement — elle n'est jamais perdue.

---

## Stripe

Le plus simple, et le mieux couvert en France.

| Clé | Où la trouver |
|---|---|
| **Clé secrète** | Tableau de bord Stripe → Développeurs → Clés API → `sk_live_…` |
| **Secret du webhook** | Développeurs → Webhooks → l'endpoint → `whsec_…` |

**Webhook** : Développeurs → Webhooks → Ajouter un endpoint, URL
`https://mlc-bois.fr/api/payments/webhook/stripe`, événement
`checkout.session.completed`.

Le test de connexion va plus loin ici : il lit la liste des webhooks déclarés
chez Stripe et signale si l'URL manque, si l'endpoint est désactivé ou s'il ne
suit pas le bon événement. (Avec une clé restreinte, cette lecture peut être
refusée — c'est signalé, non bloquant.)

Essais : utiliser `sk_test_…` et la carte `4242 4242 4242 4242`.

---

## Square

| Clé | Où la trouver |
|---|---|
| **Jeton d'accès** | [developer.squareup.com/apps](https://developer.squareup.com/apps) → l'application → Credentials → onglet Production → `EAAA…` |
| **Identifiant d'établissement** | Même écran, `Location ID`. Inutile de le chercher : le test de connexion liste tous les établissements du compte avec leur identifiant. |
| **Clé de signature du webhook** | L'application → Webhooks → l'abonnement → `Signature key` |
| **Environnement** *(facultatif)* | Vide = production. Écrire `sandbox` pour des essais. |

**Webhook** : URL `https://mlc-bois.fr/api/payments/webhook/square`, événement
`payment.updated`.

> Square est le seul à faire entrer l'URL dans le calcul de la signature :
> elle doit être identique **au caractère près** à celle déclarée. Un `www.` ou
> une barre oblique en trop et toutes les notifications sont rejetées.

Le jeton doit venir du compte Square **qui reçoit l'argent**. Si le compte
appartient au client, c'est à lui de le générer depuis sa propre console — un
identifiant de connexion Square ne suffit pas et ne devrait pas être partagé.

Essais : onglet Sandbox de l'application, champ Environnement à `sandbox`, carte
`4111 1111 1111 1111`, CVV `111`, code postal `10003`.

---

## Mollie

Le plus léger à configurer : **une seule clé, et rien à déclarer côté Mollie.**

| Clé | Où la trouver |
|---|---|
| **Clé API** | Tableau de bord Mollie → Développeurs → Clés API → `live_…` (ou `test_…`) |

**Webhook** : rien à faire. L'URL de notification est transmise à chaque
paiement.

Le test de connexion affiche le profil, son statut de vérification, et **la liste
des moyens de paiement réellement activés** chez Mollie — c'est là qu'on voit si
la carte bancaire est ouverte ou encore en cours d'activation.

> Les notifications Mollie ne sont pas signées : elles ne contiennent qu'un
> identifiant de paiement, et la boutique relit le paiement depuis l'API avec sa
> propre clé. C'est le modèle documenté par Mollie — une fausse notification ne
> peut rien affirmer.

> Mollie refuse une URL de notification non publique. En local, passer par un
> tunnel (`ngrok http 3000`) et aligner `NEXT_PUBLIC_SITE_URL` dessus.

---

## PayPal

| Clé | Où la trouver |
|---|---|
| **Identifiant client** | [developer.paypal.com](https://developer.paypal.com) → Apps & Credentials → l'application → `Client ID` |
| **Secret** | Même écran, `Secret` |
| **Identifiant du webhook** | L'application → Webhooks → l'abonnement → `Webhook ID` |
| **Environnement** *(facultatif)* | Vide = production. Écrire `sandbox` pour des essais. |

**Webhook** : URL `https://mlc-bois.fr/api/payments/webhook/paypal`, événements
`CHECKOUT.ORDER.APPROVED` **et** `PAYMENT.CAPTURE.COMPLETED`.

Les deux sont nécessaires, et c'est la particularité de PayPal : approuver n'est
pas payer. Quand le client approuve, la boutique reçoit
`CHECKOUT.ORDER.APPROVED` et **capture alors les fonds** ; c'est cette capture
qui déclenche `PAYMENT.CAPTURE.COMPLETED` et fait passer la commande en
« payée ». Sans le premier événement, l'argent approuvé n'est jamais encaissé.

L'identifiant du webhook est indispensable : c'est PayPal lui-même qui valide la
signature, et il a besoin de savoir de quel abonnement il s'agit. Le test de
connexion vérifie que l'abonnement existe, qu'il pointe sur la bonne URL, qu'il
suit les deux événements, et que l'identifiant enregistré est bien le sien.

---

## Nexi

> ⚠ **Adaptateur non éprouvé.** Il est écrit d'après la documentation publique
> XPay Global, sans qu'un compte Nexi ait pu servir à le vérifier. Le back-office
> affiche cet avertissement, et le test de connexion ne renvoie jamais un feu
> vert. **Passer un paiement de test complet, notification comprise, avant toute
> mise en production.**

| Clé | Où la trouver |
|---|---|
| **Clé API** | Fournie avec le contrat XPay (en-tête `X-Api-Key`) |
| **Environnement** *(facultatif)* | Vide = production. Écrire `test` pour l'environnement d'essai. |
| **URL de base** *(facultatif)* | À renseigner **seulement** si le contrat ne dépend pas de XPay Global. Intesa, Greece et CEE ont chacun leur URL. |

**Webhook** : rien à déclarer, l'URL est transmise à chaque paiement.

Deux points à revalider avec un contrat de test :

1. **La correspondance des statuts.** L'adaptateur ne marque « payée » que sur
   `operationResult = EXECUTED`, ou `AUTHORIZED` sur une capture. Tout le reste
   laisse la commande en attente. C'est volontairement prudent : une commande
   payée qu'il faut confirmer à la main est un moindre mal comparé à une commande
   impayée marquée « payée ». Le comportement est figé par des tests
   (`src/server/gateways/nexiEvents.test.ts`) : le corriger après un vrai
   paiement de test sera un changement délibéré et visible.
2. **L'URL de base de l'environnement de test**, qui varie selon le portail.

> Les notifications Nexi ne sont pas signées non plus. Nexi rend un
> `securityToken` à l'ouverture du paiement et le rejoue dans chaque
> notification ; la boutique le conserve sur la commande (colonne
> `Order.gatewaySecurityToken`) et compare les deux à temps constant.

---

## Limites connues, communes

- **Les remboursements ne sont pas synchronisés.** Un remboursement fait depuis
  le tableau de bord d'un prestataire ne repasse pas la commande en
  « remboursée » — il faut le faire à la main dans le back-office. C'est
  volontaire : un remboursement partiel ne doit pas marquer toute la commande
  comme remboursée.
- **Un seul prestataire actif à la fois.** Les clés des autres restent
  enregistrées, le basculement est immédiat.
- **`NEXT_PUBLIC_SITE_URL` doit être exact en production.** Toutes les URL de
  webhook en découlent.
- **Devise.** Les comptes doivent encaisser en EUR ; les tests de connexion le
  vérifient quand le prestataire expose l'information.

---

## Ajouter un sixième prestataire

Le contrat est dans [`src/server/gateways/types.ts`](../src/server/gateways/types.ts).
Écrire un fichier qui satisfait `PaymentGateway` — `isConfigured`,
`createCheckoutSession`, `handleWebhook`, et de préférence `verifyConnection` —
puis l'inscrire dans le registre
[`src/server/gateways/index.ts`](../src/server/gateways/index.ts) et dans
`GATEWAY_IDS`. Rien d'autre ne change : ni le tunnel de commande, ni la route de
webhook, ni l'écran d'administration, qui se construisent à partir du registre.
