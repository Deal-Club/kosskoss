# Contenu légal et informatif — MLC Bois

Ce document décrit le corpus légal livré dans `src/content/legal/`, ce qu'il couvre,
ce qui **doit impérativement être personnalisé avant la mise en ligne**, et les sources
juridiques utilisées.

> **Avertissement.** Les textes livrés sont des **modèles rédactionnels**, pas un conseil
> juridique. Toutes les données d'entreprise sont fictives. Aucune page ne doit être publiée
> avant relecture par un avocat ou un juriste spécialisé en droit de la consommation et du
> commerce électronique français.

---

## 1. Fichiers livrés

| Fichier | Rôle |
| --- | --- |
| `src/content/legal/types.ts` | Types partagés (`LegalPage`, `LegalSection`, `LegalSlug`, `LegalLocale`, liens de pied de page) |
| `src/content/legal/fr.ts` | Contenu français complet (`frLegalPages`) et constante `COMPANY` |
| `src/content/legal/en.ts` | Traduction anglaise intégrale (`enLegalPages`) |
| `src/content/legal/index.ts` | Accès unifié : slugs, gardes de type, liens de pied de page |
| `docs/LEGAL.md` | Ce document |

Le corps des sections est du **texte simple**. Les paragraphes sont séparés par `\n\n`.
Aucun HTML brut n'est stocké : le rendu découpe sur `\n\n` et échappe normalement
(pas de `dangerouslySetInnerHTML`).

Le français est la langue de référence. En cas de divergence entre les deux versions,
c'est le texte français qui engage la société — la version anglaise le dit explicitement
dans son avertissement.

## 2. Pages disponibles (slugs)

| Slug | Page (FR) | Page (EN) | Avertissement juridique en tête |
| --- | --- | --- | --- |
| `mentions-legales` | Mentions légales | Legal notice | oui |
| `cgv` | Conditions générales de vente | Terms and conditions of sale | oui |
| `confidentialite` | Politique de confidentialité | Privacy policy | oui |
| `retractation` | Droit de rétractation et formulaire type | Right of withdrawal and model form | oui |
| `livraison` | Livraison | Delivery | oui |
| `moyens-de-paiement` | Moyens de paiement | Payment methods | oui |
| `retours` | Retours & réclamations | Returns & complaints | oui |
| `faq` | Questions fréquentes | Frequently asked questions | non |
| `a-propos` | À propos de MLC Bois | About MLC Bois | non |
| `contact` | Contact | Contact | non |

Les URL sont identiques dans les deux langues : le français vit à la racine
(`/cgv`), l'anglais sous `/en` (`/en/cgv`).

Répartition dans le pied de page (`FOOTER_GROUP_SLUGS`) :

- **Service** : `livraison`, `moyens-de-paiement`, `retours`, `faq`
- **Informations légales** : `mentions-legales`, `cgv`, `confidentialite`
- **Entreprise** : `a-propos`, `contact`

`retractation` n'est pas listée dans le pied de page : la page existe et reste servie
à son adresse, les liens qui y mènent viennent du tunnel de commande et du suivi de
commande.

## 3. À remplacer impérativement avant la mise en ligne

Toutes ces valeurs vivent dans la constante `COMPANY`, en tête de
`src/content/legal/fr.ts`. Elles alimentent aussi la **facture PDF**
(`src/server/invoice.ts`) et le **pied des e-mails de campagne**
(`src/server/emails/campaign.ts`, constante `IMPRESSUM`) : les trois doivent être
modifiées **ensemble**, sans quoi la facture et le site annonceraient des mentions
différentes.

Renseigné depuis le registre (relevé du 30/07/2026) :

| Champ | Valeur en place | Source |
| --- | --- | --- |
| `name` | MLC BOIS | Registre |
| `legalForm` | SASU | Registre |
| `street`, `city` | 27 Grande Rue, 21700 Villebichot | Registre |
| `register` | RCS Dijon 990 527 871 | SIREN + greffe de la Côte-d'Or |
| `siren` | 990 527 871 | Registre |
| `siret` | 990 527 871 00018 | Registre (siège) |
| `vatId` | FR71990527871 | Registre |

**Reste à compléter** — ces champs ne figurent pas au registre public :

| Champ | Valeur en place | Où la trouver |
| --- | --- | --- |
| `capital` | à compléter | Statuts / Kbis |
| `managingDirector` | Prénom Nom (à compléter) | Président, Kbis |
| `phone` | 01 23 45 67 89 (fictif) | Ligne réellement décrochée |
| `email` | contact@mlc-bois.fr | Boîte réellement relevée |
| `host` | Hetzner Online GmbH… | Hébergeur réel — mention obligatoire (art. 6 III 1° LCEN) |

Le **greffe** (`RCS Dijon`) est déduit du code postal 21700 (Côte-d'Or) : à
confirmer sur le Kbis, c'est la seule valeur du premier tableau qui ne vienne pas
directement du registre.

Autres éléments à vérifier au cas par cas :

- **Code APE / NAF** annoncé dans les mentions légales (4673A par défaut) ;
- **Assurance responsabilité civile professionnelle** : nom, adresse et étendue
  géographique de l'assureur, dans les mentions légales ;
- **Médiateur de la consommation** : l'adhésion à un dispositif de médiation est
  **obligatoire** (art. L612-1 du Code de la consommation) et doit être souscrite
  avant l'ouverture de la boutique. Les coordonnées du médiateur figurent dans les
  mentions légales et dans les CGV ;
- **Coordonnées bancaires** affichées sur la page de confirmation de commande
  (`src/app/[locale]/confirmation/[orderNumber]/page.tsx`) : ce sont des valeurs de
  test, signalées comme telles dans l'interface ;
- **Coût estimé du retour** annoncé sur la page rétractation (90 € à 180 € par
  palette) : à ajuster aux tarifs réellement pratiqués par le transporteur, car
  l'article L221-5 du Code de la consommation impose une estimation sincère ;
- **Zones et tarifs de livraison** (`src/messages/fr.json`, namespace `lieferung`,
  et la page `livraison`) : ils doivent correspondre à ce qui est réellement pratiqué,
  et rester alignés sur `MERCHANT_SHIPPING` (`src/server/merchant.ts`) que Google
  compare au contenu de la page.

## 4. Taux de TVA

`VAT_RATE_PERCENT` vaut **10** (`src/lib/cart.ts`).

Le bois de chauffage à usage domestique relève du taux réduit de 10 % prévu à
l'article 278 bis du Code général des impôts. La boutique n'applique **qu'un seul
taux** pour l'ensemble du panier. Si le catalogue venait à mélanger des articles
relevant du taux normal (20 % — allume-feu, accessoires non combustibles, prestations),
le taux devrait être porté par la ligne de commande et non plus par une constante
globale.

**À faire confirmer par le comptable avant la mise en production.**

## 5. Sources juridiques utilisées

| Sujet | Référence |
| --- | --- |
| Mentions légales d'un site marchand | Art. 6 III de la LCEN (loi n° 2004-575 du 21 juin 2004) ; art. R123-237 du Code de commerce |
| Information précontractuelle | Art. L111-1 et L221-5 du Code de la consommation |
| Bouton « commander avec obligation de paiement » | Art. L221-14 du Code de la consommation |
| Confirmation sur support durable | Art. L221-13 du Code de la consommation |
| Droit de rétractation, formulaire type | Art. L221-18 à L221-28 ; annexe à l'art. R221-1 |
| Exceptions au droit de rétractation | Art. L221-28 du Code de la consommation |
| Délai de livraison et résolution | Art. L216-1 et L216-3 du Code de la consommation |
| Transfert des risques | Art. L216-4 du Code de la consommation |
| Garantie légale de conformité | Art. L217-3 et suivants du Code de la consommation |
| Garantie des vices cachés | Art. 1641 et suivants du Code civil |
| Médiation de la consommation | Art. L612-1 et suivants du Code de la consommation |
| Affichage des prix TTC | Art. L112-1 du Code de la consommation |
| Interdiction de surfacturer un moyen de paiement | Art. L112-11 du Code monétaire et financier |
| Plafond de paiement en espèces | Art. L112-6 du Code monétaire et financier |
| Retard de paiement entre professionnels | Art. L441-10 et D441-5 du Code de commerce |
| Socle unique de la relation commerciale | Art. L441-1 du Code de commerce |
| Mentions obligatoires d'une facture | Art. 242 nonies A de l'annexe II au Code général des impôts |
| Conservation des pièces comptables | Art. L123-22 du Code de commerce (10 ans) ; art. L102 B du LPF (6 ans) |
| Données personnelles | RGPD (UE) 2016/679 ; loi n° 78-17 du 6 janvier 1978 modifiée |
| Cookies strictement nécessaires | Art. 82 de la loi Informatique et Libertés, doctrine CNIL |
| Compétence juridictionnelle du consommateur | Art. R631-3 du Code de la consommation |
| Taux réduit de TVA sur le bois de chauffage | Art. 278 bis du Code général des impôts |
| Humidité du bois de chauffage | Label France Bois Bûche ; norme NF EN ISO 17225-5 (classe H1 ≤ 20 %) |

La plateforme européenne de règlement en ligne des litiges (RLL) a définitivement
cessé son activité le **20 juillet 2025**. Aucun lien vers cette plateforme ne doit
figurer sur le site ; le corpus n'en contient volontairement aucun.

## 6. Ce que le corpus ne couvre pas

- **Bandeau de consentement aux cookies** : le site ne dépose aujourd'hui que des
  cookies strictement nécessaires (session, panier, langue), dispensés de consentement.
  Ajouter une mesure d'audience tierce, un pixel publicitaire ou un widget social
  impose de mettre en place un recueil du consentement conforme et de mettre à jour
  la politique de confidentialité.
- **Registre des traitements** (art. 30 RGPD) : à tenir hors du dépôt.
- **Conditions professionnelles (B2B)** : les CGV livrées visent d'abord le
  consommateur. Une activité B2B significative appelle des conditions distinctes,
  ne serait-ce que sur le taux de TVA et la rétractation.

## 7. Réécriture depuis le back-office

Ces pages sont modifiables depuis `/admin/pages`. La table `LegalContent` prime sur
le fichier ; en son absence, ou si une ligne est illisible, le contenu du dépôt est
servi (`src/server/legalPages.ts`). Une page légale ne doit jamais tomber parce que
la base est indisponible.

Le back-office affiche les deux langues côte à côte. Publier en français sans publier
en anglais laisse la version anglaise sur le texte du dépôt : c'est volontaire, une
traduction manquante n'efface jamais le contenu.
