/**
 * Contenu légal et informatif en FRANÇAIS — MLC Bois.
 *
 * ATTENTION : toutes les données d'entreprise sont des PLACEHOLDERS
 * (adresse, RCS, numéro de TVA intracommunautaire, capital, tarifs, assureur).
 * Voir docs/LEGAL.md pour la liste exhaustive des éléments à remplacer avant
 * mise en ligne.
 *
 * Droit retenu : droit français applicable à la vente à distance à un
 * consommateur — art. 6 III de la LCEN pour les mentions légales, art. L111-1
 * et L221-5 du Code de la consommation pour l'information précontractuelle,
 * art. L221-18 et suivants pour la rétractation, art. L217-3 et suivants pour
 * la garantie légale de conformité, art. 1641 du Code civil pour les vices
 * cachés, RGPD et loi Informatique et Libertés pour les données personnelles.
 *
 * Ce corpus est un MODÈLE. Il doit être relu par un juriste avant publication.
 */

import type { LegalPageMap } from "./types";

/** Date de dernière révision rédactionnelle du corpus français. */
const UPDATED_AT = "2026-07-30";

/**
 * Coordonnées de l'entreprise.
 * Exportées : la facture PDF y puise les mentions exigées par l'article 242
 * nonies A de l'annexe II au Code général des impôts, et deux jeux de
 * coordonnées qui divergeraient seraient pires qu'un seul faux.
 *
 * Identité, adresse, SIREN, SIRET et TVA proviennent du registre (relevé du
 * 30/07/2026). Restent à compléter, faute de figurer au registre public :
 * `capital`, `managingDirector`, `phone` et `email` — voir docs/LEGAL.md § 3.
 */
export const COMPANY = {
  name: "MLC BOIS",
  /** Forme sociale telle qu'immatriculée. */
  legalForm: "Société par actions simplifiée unipersonnelle (SASU)",
  street: "27 Grande Rue",
  city: "21700 Villebichot",
  country: "France",
  email: "contact@mlc-bois.fr",
  phone: "+33 6 35 01 35 57",
  /** Président — directeur de la publication au sens de la LCEN. À COMPLÉTER. */
  managingDirector: "Prénom Nom (à compléter)",
  /** Immatriculation au registre du commerce et des sociétés. */
  register: "RCS Dijon 990 527 871",
  /** Numéro unique d'identification (SIREN). */
  siren: "990 527 871",
  /** Établissement principal (SIRET du siège). */
  siret: "990 527 871 00018",
  /** Capital social, mention obligatoire pour une société commerciale. À COMPLÉTER. */
  capital: "à compléter",
  /** Numéro de TVA intracommunautaire. */
  vatId: "FR71990527871",
  domain: "www.mlc-bois.fr",
  /** Hébergeur, à nommer au titre de l'article 6 III 1° de la LCEN. */
  host: "Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Allemagne — +49 9831 505-0",
} as const;

/** Adresse de retour (identique au siège dans ce modèle). */
const RETURN_ADDRESS = `${COMPANY.name}, service retours, ${COMPANY.street}, ${COMPANY.city}, ${COMPANY.country}`;

/** Avertissement placé en tête de chaque page juridique. */
const DISCLAIMER =
  "Avertissement : ce texte est un modèle rédigé avec soin pour la boutique en ligne MLC Bois. L'identité, l'adresse, l'immatriculation et le numéro de TVA sont ceux du registre. Restent à renseigner avant publication : le capital social, le nom du président, le téléphone, l'assureur et le médiateur de la consommation. Faites ensuite relire le texte par un juriste : c'est à cette condition seulement qu'il est utilisable en l'état.";

/** Assemble le chapeau : avertissement puis texte d'introduction. */
function intro(lead: string): string {
  return `${DISCLAIMER}\n\n${lead}`;
}

export const frLegalPages: LegalPageMap = {
  /* ------------------------------------------------------------------ */
  /* Mentions légales — art. 6 III LCEN, art. R123-237 C. com.          */
  /* ------------------------------------------------------------------ */
  "mentions-legales": {
    slug: "mentions-legales",
    title: "Mentions légales",
    intro: intro(
      "Informations sur l'éditeur du site prévues à l'article 6 III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN) et à l'article R123-237 du Code de commerce.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Éditeur du site",
        body: "Cette boutique en ligne est éditée par :",
        list: [
          COMPANY.name,
          `${COMPANY.legalForm} au capital de ${COMPANY.capital}`,
          COMPANY.street,
          COMPANY.city,
          COMPANY.country,
        ],
      },
      {
        heading: "Représentant légal et directeur de la publication",
        body: `Président : ${COMPANY.managingDirector}\n\nLe président assure également la direction de la publication au sens de l'article 6 III 2° de la LCEN.`,
      },
      {
        heading: "Nous contacter",
        body: "Vous nous joignez directement par les moyens suivants. Notre service client est joignable du lundi au vendredi de 8h à 17h et le samedi de 9h à 13h.",
        list: [
          `Téléphone : ${COMPANY.phone} (appel non surtaxé)`,
          `E-mail : ${COMPANY.email}`,
          `Formulaire de contact : ${COMPANY.domain}/contact`,
        ],
      },
      {
        heading: "Immatriculation",
        body: `Immatriculation au registre du commerce et des sociétés : ${COMPANY.register}.\n\nNuméro SIREN : ${COMPANY.siren}\nNuméro SIRET du siège : ${COMPANY.siret}\n\nCode APE / NAF : 4673A (commerce de gros de bois et de matériaux de construction) — à confirmer selon l'activité déclarée.`,
      },
      {
        heading: "Numéro de TVA intracommunautaire",
        body: `Numéro individuel d'identification à la TVA : ${COMPANY.vatId}.\n\nLe bois de chauffage à usage domestique relève du taux réduit de 10 % (article 278 bis du Code général des impôts). Les prestations et fournitures qui ne relèvent pas de ce régime sont facturées au taux normal de 20 %.`,
      },
      {
        heading: "Hébergement du site",
        body: `Le site est hébergé par :\n\n${COMPANY.host}`,
      },
      {
        heading: "Assurance responsabilité civile professionnelle",
        body: "Informations relatives à l'assurance responsabilité civile professionnelle et produits (mention facultative, obligatoire pour certaines activités réglementées) :",
        list: [
          "Assureur : nom de la compagnie (valeur d'exemple)",
          "Adresse de l'assureur (valeur d'exemple)",
          "Étendue géographique de la couverture : France métropolitaine (valeur d'exemple)",
        ],
      },
      {
        heading: "Médiation de la consommation",
        body:
          "Conformément aux articles L612-1 et suivants du Code de la consommation, tout consommateur a le droit de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d'un litige qui l'oppose à un professionnel.\n\n" +
          "Avant toute saisine du médiateur, adressez d'abord une réclamation écrite à notre service client : nous trouvons une solution dans la très grande majorité des cas.\n\n" +
          "Médiateur compétent : nom et coordonnées du médiateur auquel l'entreprise adhère (valeur d'exemple — l'adhésion à un dispositif de médiation est obligatoire et doit être souscrite avant la mise en ligne).\n\n" +
          "La plateforme européenne de règlement en ligne des litiges a définitivement cessé son activité le 20 juillet 2025. Aucun lien vers cette plateforme ne doit donc plus figurer sur le site.",
      },
      {
        heading: "Responsabilité relative au contenu",
        body: "Nous apportons le plus grand soin à l'exactitude des informations publiées sur ce site. Des erreurs ou omissions peuvent néanmoins subsister, notamment sur les caractéristiques des produits et les délais annoncés. Ces informations sont fournies à titre indicatif et sont susceptibles d'évoluer ; elles ne sauraient engager notre responsabilité au-delà de ce que prévoient les dispositions légales impératives, en particulier celles du Code de la consommation.",
      },
      {
        heading: "Liens vers des sites tiers",
        body: "Ce site peut contenir des liens vers des sites édités par des tiers, dont nous ne maîtrisons pas le contenu. Chaque éditeur demeure seul responsable de son propre site. Les pages liées ont été vérifiées au moment de la mise en place du lien et ne présentaient alors aucun contenu illicite. Un contrôle permanent n'étant pas exigible en l'absence d'indice concret, nous retirons sans délai tout lien qui nous serait signalé comme problématique.",
      },
      {
        heading: "Propriété intellectuelle",
        body: "Les contenus de ce site — textes, photographies, illustrations, éléments graphiques, structure et code — sont protégés par le Code de la propriété intellectuelle. Toute reproduction, représentation, adaptation ou exploitation, totale ou partielle, sans autorisation écrite préalable est interdite, à l'exception des usages expressément autorisés par la loi (copie privée, courte citation). Les marques et logos des fabricants demeurent la propriété de leurs titulaires respectifs.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* CGV — art. L441-1 C. com., L221-5 C. conso.                        */
  /* ------------------------------------------------------------------ */
  cgv: {
    slug: "cgv",
    title: "Conditions générales de vente",
    intro: intro(
      "Les présentes conditions générales régissent les ventes conclues sur la boutique en ligne MLC Bois. Elles constituent le socle unique de la relation commerciale au sens de l'article L441-1 du Code de commerce.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "1. Champ d'application",
        body: `Les présentes conditions générales de vente s'appliquent à toute commande passée sur ${COMPANY.domain} auprès de ${COMPANY.name}. Elles sont opposables au client qui reconnaît en avoir pris connaissance et les avoir acceptées avant de valider sa commande.\n\nElles s'adressent aussi bien aux consommateurs, au sens du liminaire du Code de la consommation, qu'aux professionnels. Les dispositions expressément réservées aux consommateurs — notamment le droit de rétractation — ne bénéficient pas aux professionnels agissant dans le cadre de leur activité, sous les réserves prévues par la loi.\n\nToute condition contraire posée par le client est inopposable, sauf acceptation écrite de notre part.`,
      },
      {
        heading: "2. Produits et disponibilité",
        body: "Les produits proposés sont ceux figurant sur le site au jour de la consultation, dans la limite des stocks disponibles. Les photographies et descriptions ont une valeur indicative : le bois est un produit naturel dont la teinte, l'écorce et le calibre varient d'un lot à l'autre sans que cela constitue un défaut de conformité.\n\nLes volumes sont exprimés en mètre cube apparent (MAP), c'est-à-dire le volume occupé par le bois versé en vrac. Un MAP correspond à environ 0,7 stère une fois rangé et à environ 0,4 mètre cube de bois réel. Les tolérances d'usage de la profession s'appliquent.\n\nEn cas d'indisponibilité après la commande, nous vous en informons sans délai et vous remboursons l'intégralité des sommes versées au plus tard dans les quatorze jours, conformément à l'article L216-3 du Code de la consommation.",
      },
      {
        heading: "3. Prix",
        body: "Les prix sont indiqués en euros toutes taxes comprises. Le bois de chauffage à usage domestique bénéficie du taux réduit de TVA de 10 % en application de l'article 278 bis du Code général des impôts ; les autres articles et prestations sont soumis au taux applicable à leur nature.\n\nLes frais de livraison sont annoncés séparément avant la validation de la commande, conformément à l'article L221-5 du Code de la consommation. Le prix total à payer est affiché de manière lisible sur la page de récapitulatif avant le paiement.\n\nNous nous réservons le droit de modifier nos prix à tout moment. Le prix applicable est celui affiché au moment de la validation de la commande.",
      },
      {
        heading: "4. Commande",
        body: "La commande suit trois étapes : coordonnées et adresses, choix du moyen de paiement, puis vérification et validation. Vous pouvez corriger vos informations à chaque étape avant la validation finale.\n\nLa validation du bouton portant la mention « Commander avec obligation de paiement » vaut acceptation ferme de la commande et des présentes conditions, conformément à l'article L221-14 du Code de la consommation.\n\nNous accusons réception de la commande par courrier électronique, sur un support durable, dans un délai raisonnable et au plus tard à la livraison. Le contrat n'est formé qu'à cet accusé de réception.",
      },
      {
        heading: "5. Paiement",
        body: "Les moyens de paiement acceptés sont indiqués sur la page « Moyens de paiement » et lors de la commande. Les données de paiement sont transmises de manière chiffrée et ne sont jamais conservées sur nos serveurs.\n\nEn cas de paiement par virement préalable, la commande est préparée après réception effective des fonds. En cas de retard de paiement d'un client professionnel, des pénalités égales à trois fois le taux d'intérêt légal ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement sont dues de plein droit (articles L441-10 et D441-5 du Code de commerce).",
      },
      {
        heading: "6. Livraison",
        body: `Nous livrons en France métropolitaine. Les zones, les délais et les tarifs figurent sur la page « Livraison ».\n\nLa livraison s'entend au seuil de la propriété : le déchargement en bord de voirie ou dans l'allée est compris dans le prix, à condition qu'un véhicule de 7,5 tonnes puisse accéder. Le rangement en cour, en cave ou au garage fait l'objet d'un supplément annoncé avant la commande.\n\nÀ défaut d'indication de date, nous livrons au plus tard trente jours après la conclusion du contrat (article L216-1 du Code de la consommation). En cas de manquement, vous pouvez nous enjoindre de livrer dans un délai supplémentaire raisonnable, puis résoudre le contrat si nous n'exécutons toujours pas.\n\nLes risques sont transférés au client au moment de la prise de possession physique du bien (article L216-4 du Code de la consommation).`,
      },
      {
        heading: "7. Droit de rétractation",
        body: `Le consommateur dispose d'un délai de quatorze jours pour exercer son droit de rétractation sans avoir à motiver sa décision, dans les conditions des articles L221-18 et suivants du Code de la consommation. Les modalités complètes et le formulaire type figurent sur la page « Droit de rétractation ».\n\nAdresse de retour : ${RETURN_ADDRESS}.`,
      },
      {
        heading: "8. Garanties légales",
        body: "Tous nos produits bénéficient de la garantie légale de conformité (articles L217-3 et suivants du Code de la consommation) et de la garantie contre les vices cachés (articles 1641 et suivants du Code civil). Le détail de ces garanties et la marche à suivre figurent sur la page « Retours & réclamations ».\n\nLa garantie légale de conformité s'exerce pendant deux ans à compter de la délivrance du bien. Le consommateur n'a pas à prouver l'existence du défaut pendant ce délai : le défaut est présumé exister au jour de la délivrance.",
      },
      {
        heading: "9. Réserve de propriété",
        body: "Les marchandises livrées demeurent notre propriété jusqu'au paiement intégral du prix. Cette réserve de propriété ne fait pas obstacle au transfert des risques, qui intervient à la remise du bien.",
      },
      {
        heading: "10. Données personnelles",
        body: "Le traitement des données personnelles collectées à l'occasion d'une commande est décrit sur la page « Politique de confidentialité ». Les données strictement nécessaires à l'exécution du contrat et à la conservation des pièces comptables sont conservées pour les durées légales.",
      },
      {
        heading: "11. Réclamation et médiation",
        body: `Toute réclamation doit d'abord être adressée à notre service client, par e-mail à ${COMPANY.email} ou par courrier à l'adresse du siège. Nous répondons sous quatorze jours.\n\nÀ défaut de solution, le consommateur peut saisir gratuitement le médiateur de la consommation dont les coordonnées figurent dans les mentions légales, dans un délai maximal d'un an à compter de la réclamation écrite.`,
      },
      {
        heading: "12. Droit applicable et juridiction",
        body: "Les présentes conditions sont soumises au droit français.\n\nEn cas de litige avec un consommateur, les règles de compétence du Code de procédure civile s'appliquent : le consommateur peut saisir, à son choix, la juridiction du lieu où il demeurait au moment de la conclusion du contrat ou de la survenance du fait dommageable (article R631-3 du Code de la consommation).\n\nÀ l'égard d'un client professionnel, compétence est attribuée au tribunal de commerce dans le ressort duquel se trouve notre siège social.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Politique de confidentialité — RGPD                                 */
  /* ------------------------------------------------------------------ */
  confidentialite: {
    slug: "confidentialite",
    title: "Politique de confidentialité",
    intro: intro(
      "Informations sur le traitement de vos données personnelles au sens des articles 13 et 14 du règlement (UE) 2016/679 (RGPD) et de la loi n° 78-17 du 6 janvier 1978 modifiée.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Responsable du traitement",
        body: `Le responsable du traitement au sens de l'article 4, point 7, du RGPD est :`,
        list: [
          COMPANY.name,
          COMPANY.street,
          COMPANY.city,
          COMPANY.country,
          `E-mail : ${COMPANY.email}`,
          `Téléphone : ${COMPANY.phone}`,
        ],
      },
      {
        heading: "Délégué à la protection des données",
        body: "Pour toute question relative à vos données, écrivez à confidentialite@mlc-bois.fr ou par courrier au siège avec la mention « Protection des données ». La désignation d'un délégué à la protection des données n'est pas obligatoire pour une activité de cette taille ; cette adresse reste le point de contact unique.",
      },
      {
        heading: "Données traitées lors d'une commande",
        body: "Pour traiter une commande, nous collectons les données suivantes :",
        list: [
          "Civilité, nom et prénom",
          "Adresse de facturation et, le cas échéant, adresse de livraison",
          "Adresse électronique",
          "Numéro de téléphone, nécessaire pour convenir du créneau de livraison",
          "Contenu de la commande, montants et moyen de paiement retenu",
          "Adresse IP et horodatage de la validation de la commande",
        ],
      },
      {
        heading: "Finalités et bases légales",
        body: "Chaque traitement repose sur une base légale identifiée :",
        list: [
          "Exécution du contrat de vente et de livraison — article 6, § 1, b du RGPD",
          "Respect d'obligations légales, notamment comptables et fiscales — article 6, § 1, c",
          "Prévention de la fraude et sécurité du site — intérêt légitime, article 6, § 1, f",
          "Envoi de communications commerciales — consentement, article 6, § 1, a, révocable à tout moment",
        ],
      },
      {
        heading: "Compte client",
        body: "La création d'un compte est facultative : la commande en tant qu'invité reste possible, conformément au principe de minimisation posé à l'article 5, § 1, c du RGPD. Le mot de passe est stocké sous forme d'empreinte non réversible et n'est jamais lisible, y compris par nos équipes.",
      },
      {
        heading: "Destinataires des données",
        body: "Vos données ne sont transmises qu'aux destinataires nécessaires à l'exécution du contrat :",
        list: [
          "Transporteur, pour l'acheminement et la prise de rendez-vous",
          "Prestataire de paiement, pour l'encaissement",
          "Expert-comptable et administration fiscale, au titre des obligations légales",
          "Hébergeur du site, en qualité de sous-traitant au sens de l'article 28 du RGPD",
        ],
      },
      {
        heading: "Durées de conservation",
        body: "Nous ne conservons vos données que le temps nécessaire :",
        list: [
          "Données de commande et factures : dix ans à compter de la clôture de l'exercice (article L123-22 du Code de commerce) et six ans au titre du droit de communication (article L102 B du Livre des procédures fiscales)",
          "Compte client : jusqu'à sa suppression par vous, puis effacement sous trente jours",
          "Prospects et destinataires de communications commerciales : trois ans à compter du dernier contact",
          "Journaux de connexion : douze mois",
        ],
      },
      {
        heading: "Cookies et traceurs",
        body: "Le site n'utilise que des cookies strictement nécessaires à son fonctionnement : session de connexion, panier et préférence de langue. Ces cookies sont dispensés de consentement au titre de l'article 82 de la loi Informatique et Libertés, tel qu'interprété par la CNIL.\n\nAucun cookie de mesure d'audience tierce, de publicité ou de réseau social n'est déposé sans votre consentement préalable. Si de tels traceurs devaient être ajoutés, un bandeau de recueil du consentement serait mis en place et cette page mise à jour.",
      },
      {
        heading: "Vos droits",
        body: "Vous disposez, dans les conditions prévues par le RGPD, des droits suivants :",
        list: [
          "Droit d'accès à vos données — article 15",
          "Droit de rectification — article 16",
          "Droit à l'effacement — article 17",
          "Droit à la limitation du traitement — article 18",
          "Droit à la portabilité — article 20",
          "Droit d'opposition — article 21",
          "Droit de retirer votre consentement à tout moment, sans effet rétroactif",
        ],
      },
      {
        heading: "Exercer vos droits",
        body: `Adressez votre demande à ${COMPANY.email} ou par courrier au siège. Nous répondons dans le délai d'un mois prévu à l'article 12, § 3 du RGPD, prolongeable de deux mois en cas de demande complexe.\n\nDepuis votre compte client, vous pouvez également exporter vos données au format JSON et supprimer votre compte sans passer par nous.`,
      },
      {
        heading: "Limite du droit à l'effacement",
        body: "La suppression d'un compte n'entraîne pas celle des commandes déjà exécutées : les factures et pièces comptables relèvent des durées de conservation légales rappelées plus haut, cas expressément prévu à l'article 17, § 3, b du RGPD. Les commandes sont alors détachées du compte et les coordonnées qui ne sont pas exigées par la facture en sont retirées.",
      },
      {
        heading: "Réclamation auprès de la CNIL",
        body: "Si vous estimez que le traitement de vos données constitue une violation du RGPD, vous pouvez introduire une réclamation auprès de la Commission nationale de l'informatique et des libertés — 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, www.cnil.fr.",
      },
      {
        heading: "Sécurité",
        body: "Les échanges avec le site sont chiffrés en TLS. L'accès aux données est limité aux personnes qui en ont besoin, l'authentification du back-office exige un second facteur, et les secrets techniques sont chiffrés au repos. Ces mesures sont réexaminées régulièrement au titre de l'article 32 du RGPD.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Droit de rétractation — art. L221-18 et s. C. conso.               */
  /* ------------------------------------------------------------------ */
  retractation: {
    slug: "retractation",
    title: "Droit de rétractation",
    intro: intro(
      "Information précontractuelle sur le droit de rétractation, conforme aux articles L221-18 à L221-28 du Code de la consommation et au formulaire type de l'annexe à l'article R221-1.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Droit de rétractation",
        body: "Vous avez le droit de vous rétracter du présent contrat sans donner de motif dans un délai de quatorze jours.\n\nLe délai de rétractation expire quatorze jours après le jour où vous-même, ou un tiers autre que le transporteur et désigné par vous, prend physiquement possession du dernier bien.\n\nEn cas de commande portant sur plusieurs biens livrés séparément, le délai court à compter de la réception du dernier bien.",
      },
      {
        heading: "Comment exercer ce droit",
        body: `Pour exercer le droit de rétractation, vous devez nous notifier votre décision au moyen d'une déclaration dénuée d'ambiguïté — lettre envoyée par la poste ou courrier électronique. Vous pouvez utiliser le formulaire type ci-dessous, sans que cela soit obligatoire.\n\nAdressez votre notification à :\n\n${COMPANY.name}\n${COMPANY.street}\n${COMPANY.city}\n${COMPANY.country}\nE-mail : ${COMPANY.email}\nTéléphone : ${COMPANY.phone}\n\nPour que le délai de rétractation soit respecté, il suffit que votre notification soit envoyée avant l'expiration du délai de quatorze jours.`,
      },
      {
        heading: "Effets de la rétractation",
        body: "En cas de rétractation, nous vous remboursons tous les paiements reçus de vous, y compris les frais de livraison — à l'exception des frais supplémentaires découlant du fait que vous avez choisi un mode de livraison autre que le mode moins coûteux de livraison standard que nous proposons.\n\nNous procédons au remboursement sans retard excessif et, en tout état de cause, au plus tard quatorze jours à compter du jour où nous sommes informés de votre décision. Nous pouvons différer le remboursement jusqu'à récupération des biens ou jusqu'à ce que vous ayez fourni une preuve d'expédition, la date retenue étant celle du premier de ces faits.\n\nNous procédons au remboursement en utilisant le même moyen de paiement que celui que vous avez utilisé pour la transaction initiale, sauf accord exprès de votre part pour un autre moyen ; en tout état de cause, ce remboursement n'occasionne pas de frais pour vous.",
      },
      {
        heading: "Renvoi des biens",
        body: `Vous devez renvoyer ou rendre les biens sans retard excessif et, en tout état de cause, au plus tard quatorze jours après nous avoir communiqué votre décision de rétractation. Ce délai est réputé respecté si vous renvoyez les biens avant son expiration.\n\nAdresse de retour : ${RETURN_ADDRESS}.\n\nLes frais directs de renvoi des biens sont à votre charge. S'agissant de bois de chauffage livré en vrac ou sur palette, ce renvoi ne peut être effectué normalement par voie postale : le coût du retour est estimé à un montant compris entre 90 € et 180 € par palette selon la zone de livraison, conformément à l'obligation d'estimation posée à l'article L221-5 du Code de la consommation.\n\nVotre responsabilité n'est engagée qu'à l'égard de la dépréciation des biens résultant de manipulations autres que celles nécessaires pour établir leur nature, leurs caractéristiques et leur bon fonctionnement. Le bois déjà brûlé ne peut évidemment pas être repris.`,
      },
      {
        heading: "Exceptions au droit de rétractation",
        body: "Le droit de rétractation ne s'applique pas, conformément à l'article L221-28 du Code de la consommation, notamment aux contrats :",
        list: [
          "De fourniture de biens confectionnés selon vos spécifications ou nettement personnalisés — par exemple une longueur de bûche sur mesure",
          "De fourniture de biens qui, après avoir été livrés et de par leur nature, sont mélangés de manière indissociable avec d'autres articles — par exemple un vrac déversé dans un stock existant",
          "De fourniture de biens susceptibles de se détériorer ou de se périmer rapidement",
          "Conclus par un professionnel agissant dans le cadre de son activité, la rétractation étant réservée au consommateur",
        ],
      },
      {
        heading: "Formulaire type de rétractation",
        body: "Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.",
        list: [
          `À l'attention de ${COMPANY.name}, ${COMPANY.street}, ${COMPANY.city}, ${COMPANY.country}, ${COMPANY.email} :`,
          "Je vous notifie par la présente ma rétractation du contrat portant sur la vente du bien ci-dessous :",
          "Commandé le … / reçu le …",
          "Numéro de commande : …",
          "Nom du consommateur : …",
          "Adresse du consommateur : …",
          "Signature du consommateur (uniquement en cas de notification du présent formulaire sur papier)",
          "Date : …",
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Livraison                                                           */
  /* ------------------------------------------------------------------ */
  livraison: {
    slug: "livraison",
    title: "Livraison",
    intro: intro(
      "Zones desservies, délais, tarifs et conditions de déchargement. Ces informations font partie de l'information précontractuelle exigée par l'article L221-5 du Code de la consommation.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Zone de livraison",
        body: "Nous livrons en France métropolitaine. La Corse et les territoires ultramarins ne sont pas desservis pour l'instant : le coût du transport y dépasserait celui de la marchandise.\n\nTrois zones structurent nos tournées :",
        list: [
          "Zone A — Paris et petite couronne (75, 92, 93, 94) : livraison sous 48 heures",
          "Zone B — grande couronne, Oise et Eure-et-Loir (77, 78, 91, 95, 60, 28) : livraison sous 3 à 5 jours ouvrés",
          "Zone C — reste de la France métropolitaine : expédition sur palette par transporteur, 5 à 8 jours ouvrés",
        ],
      },
      {
        heading: "Tarifs",
        body: "La livraison standard est offerte, sans montant minimum de commande, sous 3 à 5 jours ouvrés.\n\nLa livraison express est facturée 60,00 € et intervient sous 24 à 48 heures.\n\nLes suppléments éventuels sont annoncés avant la validation de la commande :",
        list: [
          "Accès étroit nécessitant la petite remorque : 20 €",
          "Rangement en cour, en cave ou au garage : 35 € par mètre cube apparent",
        ],
      },
      {
        heading: "Délais",
        body: "Les délais indiqués courent à compter de la confirmation du créneau et, pour les paiements par virement préalable, de la réception effective des fonds.\n\nÀ défaut d'indication de date, la livraison intervient au plus tard trente jours après la conclusion du contrat, conformément à l'article L216-1 du Code de la consommation. Si nous manquons à cette obligation, vous pouvez nous enjoindre de livrer dans un délai supplémentaire raisonnable, puis résoudre le contrat par lettre recommandée si nous n'exécutons toujours pas. Les sommes versées vous sont alors remboursées dans les quatorze jours.",
      },
      {
        heading: "Prise de rendez-vous",
        body: "Pour les zones A et B, nous appelons la veille et annonçons un créneau de deux heures. Vous n'avez pas à bloquer votre journée.\n\nPour la zone C, le transporteur prend contact directement selon ses propres procédures.",
      },
      {
        heading: "Déchargement",
        body: "Le déchargement en bord de voirie ou dans l'allée est compris dans le prix, à condition qu'un véhicule de 7,5 tonnes puisse accéder et manœuvrer. Signalez tout accès étroit, portail bas, cour fermée ou stationnement contraint au moment de la commande : nous adaptons le véhicule.\n\nEn zone C, la palette est déposée au plus près du domicile par le transporteur, sans manutention de notre part.",
      },
      {
        heading: "Réception de la marchandise",
        body: "Vérifiez la marchandise en présence du livreur. Toute réserve doit être portée sur le bon de livraison de manière précise et détaillée, une mention générale du type « sous réserve de déballage » étant sans valeur.\n\nCette formalité ne fait pas obstacle à vos garanties légales : la garantie de conformité et la garantie des vices cachés restent acquises même sans réserve à la livraison.",
      },
      {
        heading: "Transfert des risques",
        body: "Les risques de perte ou d'endommagement des biens vous sont transférés au moment où vous prenez physiquement possession de ceux-ci, conformément à l'article L216-4 du Code de la consommation. Lorsque vous confiez la livraison à un transporteur de votre choix, ce transfert intervient à la remise du bien à ce transporteur.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Moyens de paiement                                                  */
  /* ------------------------------------------------------------------ */
  "moyens-de-paiement": {
    slug: "moyens-de-paiement",
    title: "Moyens de paiement",
    intro: intro(
      "Moyens de paiement acceptés, sécurité des transactions et facturation. Les moyens réellement actifs sont ceux affichés lors de la commande.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Moyens acceptés",
        body: "Les moyens de paiement disponibles sont affichés à l'étape « Paiement » du tunnel de commande. Selon la configuration en vigueur, il peut s'agir de :",
        list: [
          "Carte bancaire (Carte Bleue, Visa, Mastercard)",
          "Virement bancaire préalable",
          "PayPal",
          "Espèces à la livraison, à signaler impérativement lors de la commande",
        ],
      },
      {
        heading: "Aucun frais supplémentaire",
        body: "Aucun frais n'est appliqué en fonction du moyen de paiement choisi. L'article L112-11 du Code monétaire et financier interdit de facturer des frais pour l'usage d'un instrument de paiement lié à une carte ou à un virement en euros au sein de l'Espace économique européen.",
      },
      {
        heading: "Sécurité des transactions",
        body: "Les données de paiement sont transmises directement au prestataire de paiement par une liaison chiffrée. Elles ne transitent jamais en clair par nos serveurs et n'y sont jamais conservées.\n\nLes paiements par carte font l'objet d'une authentification forte du client conformément à la deuxième directive sur les services de paiement.",
      },
      {
        heading: "Virement préalable",
        body: `En cas de virement, indiquez le numéro de commande en référence : sans lui, le rapprochement est manuel et retarde la préparation. Les coordonnées bancaires figurent sur la page de confirmation et dans l'e-mail de confirmation.\n\nLa commande est préparée après réception effective des fonds. Si aucun virement ne nous parvient sous dix jours ouvrés, la commande est annulée et le stock libéré.`,
      },
      {
        heading: "Paiement à la livraison",
        body: "Le paiement en espèces à la livraison doit être indiqué au moment de la commande : les chauffeurs ne transportent pas de monnaie et le montant doit être préparé à l'appoint. Le plafond légal de paiement en espèces entre un particulier domicilié fiscalement en France et un professionnel est de 1 000 € (article L112-6 du Code monétaire et financier).",
      },
      {
        heading: "Facture",
        body: "Une facture au format PDF est jointe à l'e-mail de confirmation de commande. Elle comporte l'ensemble des mentions exigées par l'article 242 nonies A de l'annexe II au Code général des impôts, dont le montant hors taxe, le taux et le montant de la TVA, et le total toutes taxes comprises.\n\nLes clients disposant d'un compte retrouvent leurs factures à tout moment dans la rubrique « Mes commandes ».",
      },
      {
        heading: "Retard de paiement",
        body: "Pour un client professionnel, tout retard de paiement entraîne de plein droit des pénalités calculées au taux de trois fois le taux d'intérêt légal, ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement, conformément aux articles L441-10 et D441-5 du Code de commerce.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Retours & réclamations — garanties légales                          */
  /* ------------------------------------------------------------------ */
  retours: {
    slug: "retours",
    title: "Retours & réclamations",
    intro: intro(
      "Marche à suivre en cas de produit non conforme, endommagé ou faisant l'objet d'une rétractation, et rappel des garanties légales dont vous bénéficiez.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Deux situations distinctes",
        body: "Un retour peut relever de deux régimes différents, qui n'ouvrent pas les mêmes droits :",
        list: [
          "La rétractation : vous changez d'avis, sans motif à donner, dans les quatorze jours. Les frais de retour sont à votre charge. Voir la page « Droit de rétractation ».",
          "La garantie légale : le produit est non conforme ou affecté d'un vice. Les frais de retour et de remise en état sont à notre charge.",
        ],
      },
      {
        heading: "Garantie légale de conformité",
        body: "Le vendeur est tenu de livrer un bien conforme au contrat et répond des défauts de conformité existant lors de la délivrance (articles L217-3 et suivants du Code de la consommation).\n\nVous disposez d'un délai de deux ans à compter de la délivrance du bien pour agir. Pendant ce délai, vous n'avez pas à prouver l'existence du défaut de conformité : il est présumé exister au jour de la délivrance.\n\nVous pouvez choisir entre la réparation et le remplacement, sous réserve des conditions de coût prévues à l'article L217-12. Si aucune de ces solutions n'est possible, vous pouvez obtenir la réduction du prix ou la résolution de la vente.",
      },
      {
        heading: "Garantie des vices cachés",
        body: "Indépendamment de la garantie de conformité, vous pouvez invoquer la garantie des vices cachés au sens de l'article 1641 du Code civil. Dans ce cas, vous pouvez choisir entre la résolution de la vente et une réduction du prix, conformément à l'article 1644 du Code civil.\n\nL'action doit être intentée dans un délai de deux ans à compter de la découverte du vice.",
      },
      {
        heading: "Ce qui n'est pas un défaut",
        body: "Le bois est un produit naturel. Les variations suivantes sont normales et ne constituent pas un défaut de conformité :",
        list: [
          "Différences de teinte, d'écorce et de grain entre deux bûches ou deux lots",
          "Fentes de séchage en étoile sur la coupe, qui sont au contraire un signe de séchage correct",
          "Écarts de calibre dans la tolérance annoncée pour la longueur commandée",
          "Traces de mousse ou de lichen sur l'écorce, sans incidence sur la combustion",
        ],
      },
      {
        heading: "Humidité constatée",
        body: "Un relevé de mesure est joint à chaque livraison. Si vous constatez une humidité supérieure à celle annoncée, mesurez sur une bûche fraîchement fendue et non sur la face extérieure, puis envoyez-nous une photo de l'humidimètre avec le numéro de commande. Une humidité sur brut supérieure à celle annoncée constitue un défaut de conformité et donne lieu à remplacement ou à réduction de prix.",
      },
      {
        heading: "Ouvrir une réclamation",
        body: `Écrivez à ${COMPANY.email} en indiquant le numéro de commande, la nature du problème et, si possible, des photographies. Nous répondons sous deux jours ouvrés et vous indiquons la marche à suivre avant tout renvoi.\n\nN'expédiez rien sans nous avoir prévenus : un retour non annoncé ne peut pas être rattaché à votre dossier.`,
      },
      {
        heading: "Adresse de retour",
        body: RETURN_ADDRESS,
      },
      {
        heading: "Remboursement",
        body: "Le remboursement intervient par le même moyen de paiement que celui utilisé pour la commande, sauf accord exprès de votre part pour un autre moyen. Il est effectué au plus tard quatorze jours après réception des biens retournés ou après la preuve de leur expédition.",
      },
      {
        heading: "Médiation",
        body: "Si notre réponse ne vous satisfait pas, vous pouvez saisir gratuitement le médiateur de la consommation dont les coordonnées figurent dans les mentions légales, dans un délai maximal d'un an à compter de votre réclamation écrite.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* FAQ                                                                 */
  /* ------------------------------------------------------------------ */
  faq: {
    slug: "faq",
    title: "Questions fréquentes",
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Quelle quantité de bois pour un hiver ?",
        body: "Cela dépend de l'appareil et de l'usage. Pour un poêle à bûches utilisé en chauffage d'appoint le soir et le week-end, comptez 5 à 8 mètres cubes apparents par saison. En chauffage principal dans une maison correctement isolée, comptez 12 à 18 MAP.\n\nPour situer ces volumes : un mètre cube apparent représente environ 0,7 stère une fois rangé, et pèse de l'ordre de 420 kg en feuillu à moins de 18 % d'humidité. En cas de doute sur la quantité, appelez-nous plutôt que de commander au jugé.",
      },
      {
        heading: "Quelle longueur de bûche choisir ?",
        body: "Mesurez la largeur du foyer et retirez cinq centimètres de chaque côté. Les longueurs de 25 cm conviennent aux poêles compacts, 33 cm est la longueur la plus courante, 50 cm s'adresse aux inserts larges et aux cheminées ouvertes.\n\nEn cas de doute, prenez la longueur inférieure : une bûche trop longue ne rentre pas, une bûche trop courte brûle très bien.",
      },
      {
        heading: "Quelle différence entre MAP, stère et mètre cube réel ?",
        body: "Un mètre cube apparent (MAP) est un mètre cube de bois versé en vrac. Rangé proprement, le même volume donne environ 0,7 stère. En retirant tout l'air entre les bûches, il reste environ 0,4 mètre cube de bois réel.\n\nNous vendons au mètre cube apparent, parce que c'est la quantité qui arrive réellement chez vous.",
      },
      {
        heading: "Le bois est-il vraiment sec ?",
        body: "Notre bois sort du séchoir après 72 heures à 75 °C, avec une humidité sur brut inférieure à 18 %. Chaque lot est mesuré et le relevé est joint à la livraison.\n\nPour vérifier vous-même, enfoncez un humidimètre dans une bûche fraîchement fendue et non sur la face extérieure : à l'extérieur, même un bois humide donne une valeur faible.",
      },
      {
        heading: "Comment stocker le bois après la livraison ?",
        body: "Sous abri, à distance du mur pour laisser circuler l'air, et jamais à même le sol — une palette dessous suffit. Le bois séché en séchoir n'a plus besoin de sécher, mais il reprend l'humidité s'il est exposé.\n\nDans une cave fermée et non ventilée, le bois repasse au-dessus de 20 % en un an.",
      },
      {
        heading: "Livrez-vous les professionnels ?",
        body: "Oui. Pour les fours à bois, les restaurants de grillades et les boulangeries, nous fournissons du hêtre en 25 et 33 cm à moins de 15 % d'humidité sur brut, en réapprovisionnement hebdomadaire sur demande. Un tarif dégressif s'applique à partir de trois palettes par mois.",
      },
      {
        heading: "Combien coûte la livraison ?",
        body: "La livraison standard est offerte, sans montant minimum de commande, et intervient sous 3 à 5 jours ouvrés.\n\nLa livraison express est facturée 60,00 € et intervient sous 24 à 48 heures. Le mode se choisit à la première étape du tunnel de commande : le total définitif s'affiche avant la page de paiement.",
      },
      {
        heading: "Livrez-vous en dehors de la France ?",
        body: "Nous livrons partout en France, ainsi que dans certaines villes de Belgique.\n\nEn France, nous livrons nous-mêmes avec notre remorque. Ailleurs, la marchandise part sur palette par transporteur : le service est alors celui du transporteur. Dans les deux cas, vous êtes prévenu avant le passage.",
      },
      {
        heading: "Peut-on choisir la date de livraison ?",
        body: "Oui. Vous indiquez une date souhaitée à la commande et nous appelons la veille pour confirmer un créneau de deux heures. Vous n'avez pas à bloquer votre journée.\n\nPour les livraisons confiées à un transporteur, celui-ci prend contact directement, selon ses propres procédures.",
      },
      {
        heading: "Où le bois est-il déposé, et si l'accès est difficile ?",
        body: "Le déchargement en bord de voirie est compris dans le prix. Nous disposons de transpalettes pour amener les palettes jusqu'à votre garage ou votre parking de stockage.\n\nSignalez tout accès étroit, portail bas, cour fermée ou stationnement contraint au moment de la commande : nous adaptons le véhicule. Sans cette information, le camion se présente et un déplacement sans livraison possible reste facturé.",
      },
      {
        heading: "Puis-je commander sans créer de compte ?",
        body: "Oui. La commande en tant qu'invité est possible et le compte reste facultatif. Créer un compte vous évite simplement de ressaisir votre adresse et vous donne accès à l'historique de vos commandes et à vos factures.",
      },
      {
        heading: "Comment suivre ma commande ?",
        body: "L'e-mail de confirmation contient un lien de suivi qui fonctionne sans connexion. Si vous avez un compte, la rubrique « Mes commandes » donne le même état d'avancement.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* À propos                                                            */
  /* ------------------------------------------------------------------ */
  "a-propos": {
    slug: "a-propos",
    title: "À propos de MLC Bois",
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Ce que nous vendons",
        body: "Du bois de chauffage prêt à brûler, séché en séchoir, livré par nos soins. Hêtre, chêne, bouleau et frêne issus de forêts françaises, en bûches de 25, 33 et 50 cm, complétés par des bûches densifiées, des granulés certifiés ENplus A1 et du petit bois d'allumage.",
      },
      {
        heading: "Pourquoi le séchage en séchoir",
        body: "Un bois séché à l'air met deux étés à descendre sous 20 % d'humidité sur brut, et encore, à condition d'être bien stocké. Le séchoir fait le même travail en 72 heures, de manière contrôlée et vérifiable.\n\nL'écart n'est pas cosmétique : l'eau contenue dans le bois doit s'évaporer avant que la combustion ne dégage de la chaleur utile. Un bois à 30 % d'humidité perd près de la moitié de son pouvoir calorifique dans cette évaporation, encrasse le conduit et noircit la vitre.",
      },
      {
        heading: "Mesuré, pas promis",
        body: "Chaque lot est mesuré avant le départ et le relevé accompagne la livraison. « Bois sec » ne veut rien dire tant qu'aucun chiffre ne l'accompagne ; un humidimètre coûte moins de 20 € et met fin à toute discussion.",
      },
      {
        heading: "Notre propre logistique",
        body: "Nous livrons dans toute la France métropolitaine, selon deux modes que nous distinguons clairement.\n\nEn Île-de-France, nous livrons nous-mêmes avec notre remorque. Pas d'avis de passage, pas de palette qui attend trois jours en dépôt. Nous appelons la veille et annonçons un créneau de deux heures.\n\nDans le reste du pays, nous expédions sur palette par transporteur : le service est alors celui du transporteur, et nous le disons plutôt que de le laisser croire.",
      },
      {
        heading: "Origine du bois",
        body: "Notre bois provient de forêts françaises gérées durablement et certifiées PEFC. L'approvisionnement local limite le transport, qui pèse lourd dans le bilan d'un produit vendu au volume.",
      },
      {
        heading: "Nous joindre",
        body: `Du lundi au vendredi de 8h à 17h et le samedi de 9h à 13h, au ${COMPANY.phone}. La personne qui décroche connaît le produit : dans ce métier, une commande sur deux se conclut par un appel.`,
      },
      {
        heading: "Informations légales",
        body: `${COMPANY.name}, ${COMPANY.legalForm} au capital de ${COMPANY.capital}, ${COMPANY.street}, ${COMPANY.city}. ${COMPANY.register}. Numéro de TVA intracommunautaire : ${COMPANY.vatId}. Les informations complètes figurent dans les mentions légales.`,
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Contact                                                             */
  /* ------------------------------------------------------------------ */
  contact: {
    slug: "contact",
    title: "Contact",
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Service client",
        body: "Pour toute question sur une commande, un délai ou un produit, nous sommes joignables du lundi au vendredi de 8h à 17h et le samedi de 9h à 13h.",
        list: [
          `Téléphone : ${COMPANY.phone} (appel non surtaxé)`,
          `E-mail : ${COMPANY.email}`,
          `Formulaire : ${COMPANY.domain}/contact`,
        ],
      },
      {
        heading: "Adresse postale",
        body: `${COMPANY.name}\n${COMPANY.street}\n${COMPANY.city}\n${COMPANY.country}`,
      },
      {
        heading: "Suivi de commande",
        body: "Le lien de suivi figure dans l'e-mail de confirmation et fonctionne sans connexion. Si vous avez un compte, la rubrique « Mes commandes » donne le même état d'avancement. Gardez le numéro de commande sous la main : il accélère tout échange.",
      },
      {
        heading: "Réclamation",
        body: `Adressez votre réclamation à ${COMPANY.email} en indiquant le numéro de commande et, si possible, des photographies. Nous répondons sous deux jours ouvrés. La marche à suivre détaillée figure sur la page « Retours & réclamations ».`,
      },
      {
        heading: "Commandes professionnelles et gros volumes",
        body: `Pour les restaurants, boulangeries, campings, collectivités et syndics, écrivez à ${COMPANY.email} avec l'objet « Professionnel » en précisant le volume mensuel envisagé et l'adresse de livraison. Nous répondons le jour ouvré même avec un tarif dégressif.`,
      },
      {
        heading: "Protection des données",
        body: "Les demandes d'accès, de rectification ou d'effacement de vos données se font à confidentialite@mlc-bois.fr ou par courrier au siège avec la mention « Protection des données ». Nous répondons dans le délai d'un mois prévu par le RGPD.",
      },
      {
        heading: "Presse et partenariats",
        body: `Les demandes presse et les propositions de partenariat sont à adresser à ${COMPANY.email} avec l'objet « Presse » ou « Partenariat ».`,
      },
      {
        heading: "Informations légales",
        body: `${COMPANY.name}, représentée par ${COMPANY.managingDirector}. ${COMPANY.register}. Numéro de TVA intracommunautaire : ${COMPANY.vatId}. Les informations complètes figurent dans les mentions légales.`,
      },
    ],
  },
};
