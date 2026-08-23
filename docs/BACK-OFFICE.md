# Manuel du back-office

Ce document explique le back-office de KossKoss Select écran par écran :
**ce qu'il fait, ce qu'il ne fait pas, et le piège à connaître.** Il est écrit
pour que le commerçant puisse s'en servir sans revenir vers l'équipe technique.
Chaque affirmation ci-dessous a été vérifiée dans le code au moment de la
rédaction — pas recopiée d'une note antérieure.

Les comptes sont désignés par leur **rôle**, jamais par un nom : un
« Propriétaire » ou un « Administrateur », pas une personne.

Pour l'installation, la base de données et les variables d'environnement,
voir [`docs/HANDOVER.md`](HANDOVER.md).

## 1. Rôles et accès

**Écran : Accès (`/admin/users`).**

Quatre rôles existent, du plus large au plus restreint :

| Rôle | Voit / peut agir sur |
|---|---|
| **Superadmin** | tout — catalogue, commandes, contenus, réglages, comptes |
| **Propriétaire** | tout — catalogue, commandes, contenus, réglages, comptes |
| **Administrateur** | catalogue, commandes, contenus, réglages — **pas** les comptes |
| **Gestionnaire de commandes** | commandes (et donc les ventes, qui en dépendent) — rien d'autre |

Ce que cet écran **ne montre pas** : le rôle **Superadmin** est un accès de
secours, posé par un script technique et **absent de la liste des comptes**
que cet écran affiche. Il ne peut donc ni se créer ni se gérer depuis
l'interface — c'est volontaire, ce n'est pas un oubli d'affichage.

**Ce qu'il fait** : créer un compte, changer son rôle, l'activer ou le
désactiver, changer son adresse e-mail (avec confirmation, puisqu'elle sert
aussi bien d'identifiant que de destinataire du code de connexion).

**Ce qu'il ne fait pas** : il ne réinitialise pas de mot de passe à distance —
le mot de passe se change depuis le compte lui-même, une fois connecté. Le
dernier compte **actif** ne peut être ni désactivé ni supprimé : il doit
toujours en rester au moins un pour pouvoir entrer dans le back-office.

**Le piège à connaître** : le rôle d'un compte est **relu en base à chaque
requête**, jamais mis en cache dans sa session. Rétrograder ou désactiver un
compte prend donc effet **immédiatement** — la personne connectée perd
l'accès à la page suivante qu'elle demande, sans avoir à se déconnecter ni
attendre l'expiration de sa session.

## 2. Produits, marques, tags

**Écrans : Produits (`/admin/products`), Marques (`/admin/brands`), Tags
produits (`/admin/products/tags`), Univers (`/admin/groups`), Catégories
(`/admin/categories`).**

**Ce qu'ils font** : la fiche produit porte le prix, le stock, les
traductions anglaises, les attributs Google Merchant (GTIN, catégorie Google,
poids d'expédition…), et un **coût d'achat facultatif**. Les marques sont une
entité à part (nom, logo, description), que chaque produit peut relier — ou
pas. Les tags produits alimentent à la fois les facettes du catalogue
(filtre par type de peau, préoccupation…) et le moteur de recommandation du
diagnostic beauté.

**Ce qu'ils ne font pas** : le champ texte « marque » de chaque produit reste
la seule source d'affichage sur la boutique, dans tous les cas — relier un
produit à une fiche **Marque**, ou renommer cette fiche, ne change **pas**
automatiquement ce qui s'affiche sur la fiche produit ou dans les listes. Un
même produit ne porte qu'un seul coût d'achat, pas un coût par variante
(contenance) : quand un produit a plusieurs contenances, elles partagent
toutes le même coût affiché.

**Le piège à connaître** : le champ « Coût d'achat » est **facultatif**, et
un champ **laissé vide n'est pas un coût de zéro**. L'écran le dit
explicitement tant qu'il est vide (« Laissez vide tant que le coût n'est pas
connu : un coût absent n'est pas un coût nul »). La raison : un coût traité
comme zéro ferait afficher **100 % de marge** sur tout produit sans coût
renseigné, un chiffre faux et plus trompeur qu'une case vide. Le tableau de
bord des ventes (section 4) affiche une case **vide**, jamais un zéro, tant
que le coût n'est pas connu.

## 3. Approvisionnement

**Écrans : Fournisseurs (`/admin/suppliers`), Bons de commande
(`/admin/purchase-orders`), Stock (`/admin/stock`).**

**Ce qu'ils font** : un bon de commande fournisseur se crée en brouillon, se
complète de lignes (produit, quantité commandée, coût unitaire), puis se
transmet — les lignes se verrouillent à partir de là. La **réception**
avance la quantité reçue de chaque ligne, augmente le stock du produit
correspondant, et — si la case correspondante est cochée — met à jour son
coût d'achat. Une sur-livraison est acceptée sans plafond. L'écran Stock
permet aussi un **ajustement manuel** (correction d'inventaire, casse, retour
client) hors de tout bon.

**Ce qu'ils ne font pas** : un fournisseur ne peut pas être supprimé tant
qu'il a des bons de commande rattachés (le refus précise combien). Un bon
transmis (« envoyé ») ne peut plus voir ses lignes modifiées — c'est un
engagement écrit. Un bon déjà entièrement reçu ne peut plus être annulé : la
marchandise reçue est un fait accompli.

**Les deux pièges à connaître** :

- **Une réception ne se défait pas.** Il n'existe aucune action « annuler la
  réception ». Une erreur de quantité reçue se corrige par un **ajustement de
  stock tracé** (écran Stock, motif « Correction »), qui laisse une trace
  distincte dans l'historique — jamais en réécrivant la réception elle-même.
- **La case « mettre à jour le coût du produit », cochée par défaut à la
  réception, écrase le coût d'achat dans tout le catalogue** — pas seulement
  sur ce bon. Le nouveau coût devient la référence pour **toutes** les ventes
  suivantes de ce produit, pas seulement celles issues de cette livraison.
  Pour un achat exceptionnel qui ne doit pas devenir la référence (dépannage,
  prix négocié ponctuel), décocher la case avant de valider la réception. Si
  le coût saisi vaut zéro (échantillon, dotation fournisseur), l'écran le
  signale explicitement plutôt que de l'écrire sans le dire : ce n'est pas
  une erreur, mais ça mérite d'être vérifié avant de continuer.

## 4. Ventes et export

**Écran : Ventes (`/admin/ventes`).**

**Ce qu'il fait** : un tableau de bord des ventes **encaissées** sur une
période choisie, et son export CSV (bouton en haut de l'écran), ligne par
ligne de commande, avec coût et marge quand ils sont connus. Une **remise de
commande** (code promo) est répartie au prorata entre les lignes de la
commande qu'elle concerne — jamais imputée en bloc à une seule ligne, ce qui
fausserait sa marge affichée.

**Ce qu'il ne fait pas** : il ne mélange jamais l'encaissé avec les commandes
seulement engagées (payées mais dont l'encaissement n'est pas confirmé, ou en
attente) — ce montant est présenté séparément.

**Le piège à connaître** : **une commande annulée sort du chiffre d'affaires,
une commande remboursée y reste.** Ce n'est pas un oubli : une commande payée
puis annulée remet la marchandise en stock, elle n'est donc jamais réellement
partie, et la compter ferait double emploi. Une commande remboursée, elle, a
bien été encaissée puis rendue — ce lot ne couvre pas les avoirs, et la
retirer du chiffre d'affaires créerait un trou invisible dans la
comptabilité. C'est un choix documenté, pas un défaut. De la même façon, un
coût de ligne inconnu laisse les colonnes coût et marge de l'export
**vides**, jamais à zéro : y écrire zéro ferait entrer une ligne non
renseignée dans le total du comptable sans que rien ne le signale.

## 5. Traductions

**Écran : Traductions (`/admin/traductions`).**

**Ce qu'il fait** : liste, modèle par modèle (produits, catégories, marques,
tags, articles du Journal, moyens de paiement…), ce que la version anglaise
du site affiche encore en français faute de traduction, avec un filtre
« à traduire » / « traduit ». Un champ français vide n'attend aucune
traduction ; une traduction identique au français compte comme traduite.

**Ce qu'il ne fait pas — le piège à connaître** : **le corps d'un article du
Journal ne se traduit pas depuis cet écran.** Il est volontairement exclu du
registre des champs traduisibles : le corps d'un article est un contenu
éditorial structuré (blocs), pas un champ texte simple comme un titre ou une
description. Sa traduction se fait dans **l'éditeur d'article lui-même**
(`/admin/journal/<id>`). L'écran Traductions affiche seulement, pour chaque
article, si son corps est traduit ou non — un article dont le titre, le
chapeau et le SEO sont traduits mais dont le corps ne l'est pas n'est **pas**
compté comme « Traduit ».

## 6. Réglages

**Écran : Paramètres (`/admin/parametres`).**

**Ce qu'il fait** : le numéro WhatsApp de la boutique (bouton pré-rempli sur
le site), le lien du formulaire d'évaluation envoyé après livraison,
l'identifiant de mesure GA4, l'identifiant du Pixel Meta, l'identifiant du
jeu de données de l'API de conversions Meta (CAPI). Le **jeton d'accès** de
cette API se saisit séparément (écran Intégrations, voir ci-dessous) : ce
n'est pas un réglage public, c'est un secret.

**Ce qu'il ne fait pas** : un champ **vidé volontairement** (saisie vide)
retire le réglage — c'est la façon prévue de l'effacer. Tant qu'aucun
identifiant de mesure n'est renseigné et qu'aucun script tiers n'est activé
(écran Scripts & balises), le bandeau de consentement ne s'affiche pas : voir
la section 8.

**Le piège à connaître** : les **secrets ne se réaffichent jamais** — que ce
soit ici, en Intégrations, ou sur les moyens de paiement. Une fois enregistré,
un secret (jeton CAPI, clé de passerelle de paiement…) n'est plus jamais
montré en clair, ni dans le formulaire, ni dans l'API : seuls un état
« configuré / non configuré » et les derniers caractères apparaissent. **Un
champ de secret laissé vide au moment d'enregistrer ne l'efface pas** : il
laisse la valeur déjà enregistrée inchangée. Pour retirer un secret, il n'y a
qu'un moyen : le réécrire, ou passer par la suppression de l'intégration.

## 7. Commandes et facturation

**Écran : Commandes (`/admin/orders`).**

**Ce qu'il fait** : le parcours d'une commande suit des statuts dans l'ordre
— en attente de paiement, payée, en préparation, en acheminement, livrée,
évaluée — avec deux statuts de sortie à part, annulée et remboursée (distincts
l'un de l'autre, voir section 4). Chaque commande porte un **historique**
d'événements horodatés — c'est la seule surface qui dit si une facture a été
émise, et vers quelle adresse elle a été envoyée.

Une **facture n'existe qu'après encaissement** : ce n'est qu'au passage au
statut de paiement « payée » qu'un numéro de facture est alloué et le document
émis — jamais à la simple création de la commande, qui n'est qu'un accusé de
réception. La numérotation suit une séquence annuelle à six chiffres
(`FAC-AAAA-NNNNNN`, remise à un chaque 1er janvier), garantie sans doublon par
une contrainte de la base plutôt que par une lecture optimiste du dernier
numéro. Le numéro de commande suit sa propre séquence, au format
`KOSS-AAAA-NNNNNN`.

**Ce qu'il ne fait pas — le piège à connaître** : il n'existe **ni écran de
factures dédié, ni bouton de renvoi manuel**. Si l'envoi de l'e-mail de
facture échoue après son émission (la facture existe déjà en base et a
consommé un numéro), l'historique de la commande le signale explicitement
plutôt que de dire simplement « échec » — mais le document doit alors être
transmis au client **à la main**, hors du back-office.

## 8. Consentement et mesure

**Écrans : Scripts & balises (`/admin/scripts`), Paramètres
(`/admin/parametres`, réglages GA4 / Pixel / CAPI).**

**Ce qu'il fait** : au-delà des cookies strictement nécessaires (session,
panier, langue), tout dépôt de mesure d'audience ou de publicité — balise
posée depuis Scripts & balises, identifiant GA4, Pixel Meta — est
**subordonné au consentement du visiteur**. Le bandeau de consentement n'est
d'ailleurs affiché **que** si l'un de ces réglages est actif : tant que rien
n'est configuré, il n'y a rien à faire consentir, et l'afficher quand même
dérangerait le visiteur pour une question sans objet. Dès qu'un identifiant
est enregistré ou qu'une balise est activée, le bandeau revient de lui-même —
personne n'a à s'en souvenir.

**Le piège à connaître** : la règle « rien ne part sans consentement »
s'applique **aussi à la mesure côté serveur**, pas seulement à ce qui se
charge dans le navigateur. L'événement d'achat envoyé à l'API de conversions
Meta (CAPI) — qui part directement du serveur, sans passer par le navigateur
du client — vérifie le **consentement marketing enregistré à la commande**
avant tout envoi, et ne part pas si ce consentement est absent, même si le
jeton et l'identifiant du jeu de données sont configurés. Un serveur qui
« oublierait » de vérifier le consentement parce que la mesure ne transite
pas par le navigateur reproduirait exactement l'erreur que ce contrôle existe
pour éviter.
