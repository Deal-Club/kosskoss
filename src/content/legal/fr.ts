/**
 * Contenu légal et informatif en FRANÇAIS — KossKoss Select (marché Cameroun).
 *
 * ATTENTION : toutes les données d'entreprise sont des PLACEHOLDERS
 * (adresse, RCCM, NIU, capital, tarifs). Voir docs/LEGAL.md pour la liste
 * exhaustive des éléments à remplacer avant mise en ligne.
 *
 * Cadre juridique visé : droit camerounais de la vente et de la protection du
 * consommateur — notamment la loi n° 2011/012 du 6 mai 2011 portant protection
 * du consommateur au Cameroun, l'Acte uniforme OHADA relatif au droit commercial
 * général, et la réglementation applicable aux produits cosmétiques. Les
 * références précises restent à confirmer.
 *
 * Ce corpus est un MODÈLE. Il doit être relu par un juriste avant publication.
 */

import type { LegalPageMap } from "./types";

/** Date de dernière révision rédactionnelle du corpus français. */
const UPDATED_AT = "2026-08-06";

/**
 * Coordonnées de l'entreprise.
 * Exportées : la facture et les pages légales y puisent une source unique —
 * deux jeux de coordonnées qui divergeraient seraient pires qu'un seul faux.
 *
 * Identité, adresse, RCCM et NIU restent à compléter à partir du registre
 * camerounais — voir docs/LEGAL.md § 3.
 */
export const COMPANY = {
  name: "KossKoss Select",
  /** Forme sociale — à renseigner selon l'immatriculation camerounaise. */
  legalForm: "À compléter",
  street: "À compléter",
  city: "À compléter",
  country: "Cameroun",
  email: "contact@kosskoss.cm",
  phone: "+237 658 01 36 46",
  /** Directeur de la publication. À COMPLÉTER. */
  managingDirector: "À compléter",
  /** Registre du commerce et du crédit mobilier (RCCM). À COMPLÉTER. */
  register: "RCCM à compléter",
  /** Champ hérité (SIREN, France) — sans objet au Cameroun. À COMPLÉTER. */
  siren: "À compléter",
  /** Champ hérité (SIRET, France) — sans objet au Cameroun. À COMPLÉTER. */
  siret: "À compléter",
  /** Capital social. À COMPLÉTER. */
  capital: "À compléter",
  /** Numéro d'identifiant unique (NIU). À COMPLÉTER. */
  vatId: "NIU à compléter",
  domain: "kosskoss.vercel.app",
  /** Hébergeur. */
  host: "Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis",
} as const;

/** Adresse de retour (identique au siège dans ce modèle). */
const RETURN_ADDRESS = `${COMPANY.name}, service retours, ${COMPANY.street}, ${COMPANY.city}, ${COMPANY.country}`;

/** Avertissement placé en tête de chaque page juridique. */
const DISCLAIMER =
  "Avertissement : contenu juridique provisoire pour la boutique en ligne KossKoss Select (marché Cameroun). L'identité de la société, l'adresse, l'immatriculation (RCCM) et le NIU restent à renseigner avant publication, puis à faire relire par un juriste — c'est à cette condition seulement que ce texte est utilisable.";

/** Assemble le chapeau : avertissement puis texte d'introduction. */
function intro(lead: string): string {
  return `${DISCLAIMER}\n\n${lead}`;
}

export const frLegalPages: LegalPageMap = {
  /* ------------------------------------------------------------------ */
  /* Mentions légales                                                    */
  /* ------------------------------------------------------------------ */
  "mentions-legales": {
    slug: "mentions-legales",
    title: "Mentions légales",
    intro: intro(
      "Informations sur l'éditeur du site et sur l'hébergement, mises à disposition du public conformément à la réglementation camerounaise applicable au commerce électronique.",
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
        body: `Représentant légal : ${COMPANY.managingDirector}\n\nLe représentant légal assure la direction de la publication du site.`,
      },
      {
        heading: "Nous contacter",
        body: "Vous nous joignez directement par les moyens suivants. Notre service client est joignable du lundi au samedi, ainsi que sur WhatsApp.",
        list: [
          `Téléphone / WhatsApp : ${COMPANY.phone}`,
          `E-mail : ${COMPANY.email}`,
          `Formulaire de contact : ${COMPANY.domain}/contact`,
        ],
      },
      {
        heading: "Immatriculation",
        body: `Immatriculation au registre du commerce et du crédit mobilier (RCCM) : ${COMPANY.register}.\n\nNuméro d'identifiant unique (NIU) : ${COMPANY.vatId}.\n\nCes informations sont à compléter à partir des documents d'immatriculation de la société avant la mise en ligne.`,
      },
      {
        heading: "Taxes",
        body: "Les prix affichés sur la boutique sont exprimés en francs CFA (FCFA), toutes taxes comprises. La taxe sur la valeur ajoutée est appliquée selon la réglementation fiscale camerounaise en vigueur ; son taux et son montant figurent sur la facture.",
      },
      {
        heading: "Hébergement du site",
        body: `Le site est hébergé par :\n\n${COMPANY.host}`,
      },
      {
        heading: "Responsabilité relative au contenu",
        body: "Nous apportons le plus grand soin à l'exactitude des informations publiées sur ce site. Des erreurs ou omissions peuvent néanmoins subsister, notamment sur les caractéristiques des produits et les délais annoncés. Ces informations sont fournies à titre indicatif et sont susceptibles d'évoluer ; elles ne sauraient engager notre responsabilité au-delà de ce que prévoient les dispositions légales impératives applicables.",
      },
      {
        heading: "Liens vers des sites tiers",
        body: "Ce site peut contenir des liens vers des sites édités par des tiers, dont nous ne maîtrisons pas le contenu. Chaque éditeur demeure seul responsable de son propre site. Nous retirons sans délai tout lien qui nous serait signalé comme problématique.",
      },
      {
        heading: "Propriété intellectuelle",
        body: "Les contenus de ce site — textes, photographies, illustrations, éléments graphiques, structure et code — sont protégés au titre de la propriété intellectuelle. Toute reproduction, représentation, adaptation ou exploitation, totale ou partielle, sans autorisation écrite préalable est interdite, à l'exception des usages expressément autorisés par la loi. Les marques et logos des fabricants demeurent la propriété de leurs titulaires respectifs.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* CGV                                                                 */
  /* ------------------------------------------------------------------ */
  cgv: {
    slug: "cgv",
    title: "Conditions générales de vente",
    intro: intro(
      "Les présentes conditions générales régissent les ventes conclues sur la boutique en ligne KossKoss Select. Elles constituent le socle de la relation commerciale entre le vendeur et le client.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "1. Champ d'application",
        body: `Les présentes conditions générales de vente s'appliquent à toute commande passée sur ${COMPANY.domain} auprès de ${COMPANY.name}. Elles sont opposables au client qui reconnaît en avoir pris connaissance et les avoir acceptées avant de valider sa commande.\n\nToute condition contraire posée par le client est inopposable, sauf acceptation écrite de notre part.`,
      },
      {
        heading: "2. Produits et disponibilité",
        body: "Les produits proposés sont des produits cosmétiques et de soin, présentés avec leurs caractéristiques essentielles sur chaque fiche. Ils sont disponibles dans la limite des stocks. Les photographies ont une valeur indicative : la teinte, le conditionnement ou le format d'un article peuvent varier légèrement selon les arrivages du fabricant, sans que cela constitue un défaut.\n\nEn cas d'indisponibilité après la commande, nous vous en informons sans délai et vous remboursons l'intégralité des sommes versées pour l'article manquant.",
      },
      {
        heading: "3. Prix",
        body: "Les prix sont indiqués en francs CFA (FCFA), toutes taxes comprises. Les frais de livraison sont annoncés séparément avant la validation de la commande. Le prix total à payer est affiché de manière lisible sur la page de récapitulatif avant le paiement.\n\nNous nous réservons le droit de modifier nos prix à tout moment. Le prix applicable est celui affiché au moment de la validation de la commande.",
      },
      {
        heading: "4. Commande",
        body: "La commande suit trois étapes : coordonnées et adresse de livraison, choix du moyen de paiement, puis vérification et validation. Vous pouvez corriger vos informations à chaque étape avant la validation finale.\n\nLa validation du bouton de paiement vaut acceptation ferme de la commande et des présentes conditions. Nous accusons réception de la commande par courrier électronique. La livraison est ensuite coordonnée avec vous, notamment par WhatsApp.",
      },
      {
        heading: "5. Paiement",
        body: "Les moyens de paiement acceptés sont indiqués sur la page « Moyens de paiement » et lors de la commande : Mobile Money (Orange Money, MTN Mobile Money), carte bancaire et, selon la zone, paiement à la livraison. Les données de paiement sont traitées par notre prestataire de paiement par une liaison chiffrée et ne sont jamais conservées sur nos serveurs.",
      },
      {
        heading: "6. Livraison",
        body: `Nous livrons au Cameroun. Les villes desservies, les délais et les tarifs figurent sur la page « Livraison ». La livraison est organisée en lien avec vous, le plus souvent par téléphone ou WhatsApp, afin de convenir du lieu et du moment de remise.\n\nLes risques liés au produit sont transférés au client au moment de la remise physique du colis.`,
      },
      {
        heading: "7. Rétractation et retours",
        body: `Vous disposez d'un délai de quatorze jours pour changer d'avis sur un article non ouvert et dans son emballage d'origine scellé. Pour des raisons d'hygiène et de sécurité sanitaire, les produits cosmétiques descellés ou entamés ne peuvent pas être repris. Les modalités complètes figurent sur la page « Droit de rétractation ».\n\nAdresse de retour : ${RETURN_ADDRESS}.`,
      },
      {
        heading: "8. Conformité et produit défectueux",
        body: "Nous sommes tenus de livrer un produit conforme à sa description et propre à l'usage attendu. Si un article vous parvient endommagé, périmé ou non conforme à votre commande, contactez-nous : nous procédons à son remplacement ou à son remboursement selon les modalités de la page « Retours & réclamations ».",
      },
      {
        heading: "9. Authenticité des produits",
        body: "KossKoss Select s'engage à ne commercialiser que des produits authentiques, provenant de circuits d'approvisionnement identifiés. Chaque fiche précise la marque et, lorsque l'information est disponible, la contenance et la date de durabilité minimale.",
      },
      {
        heading: "10. Données personnelles",
        body: "Le traitement des données personnelles collectées à l'occasion d'une commande est décrit sur la page « Politique de confidentialité ». Les données strictement nécessaires à l'exécution du contrat et à la conservation des pièces comptables sont conservées pour les durées légales.",
      },
      {
        heading: "11. Réclamation",
        body: `Toute réclamation doit d'abord être adressée à notre service client, par e-mail à ${COMPANY.email}, par téléphone ou sur WhatsApp au ${COMPANY.phone}. Nous nous efforçons d'apporter une réponse dans les meilleurs délais et de trouver une solution amiable.`,
      },
      {
        heading: "12. Droit applicable",
        body: "Les présentes conditions sont soumises au droit camerounais. En cas de litige, les parties rechercheront une solution amiable avant toute action ; à défaut, les juridictions compétentes au Cameroun seront saisies conformément aux règles applicables.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Politique de confidentialité                                        */
  /* ------------------------------------------------------------------ */
  confidentialite: {
    slug: "confidentialite",
    title: "Politique de confidentialité",
    intro: intro(
      "Informations sur le traitement de vos données personnelles, dans le respect de la réglementation camerounaise applicable à la protection des données à caractère personnel.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Responsable du traitement",
        body: "Le responsable du traitement de vos données est :",
        list: [
          COMPANY.name,
          COMPANY.street,
          COMPANY.city,
          COMPANY.country,
          `E-mail : ${COMPANY.email}`,
          `Téléphone / WhatsApp : ${COMPANY.phone}`,
        ],
      },
      {
        heading: "Données traitées lors d'une commande",
        body: "Pour traiter une commande, nous collectons les données suivantes :",
        list: [
          "Nom et prénom",
          "Adresse de livraison",
          "Adresse électronique",
          "Numéro de téléphone, nécessaire pour organiser la livraison (notamment par WhatsApp)",
          "Contenu de la commande, montants et moyen de paiement retenu",
          "Réponses au diagnostic beauté, lorsque vous choisissez de l'utiliser",
        ],
      },
      {
        heading: "Finalités",
        body: "Vos données servent uniquement aux finalités suivantes :",
        list: [
          "Exécution de la commande, de la livraison et du service après-vente",
          "Respect de nos obligations comptables et fiscales",
          "Recommandations de produits issues du diagnostic beauté, avec votre accord",
          "Envoi de communications commerciales lorsque vous y avez consenti, révocable à tout moment",
        ],
      },
      {
        heading: "Compte client",
        body: "La création d'un compte est facultative : la commande en tant qu'invité reste possible. Le mot de passe est stocké sous forme d'empreinte non réversible et n'est jamais lisible, y compris par nos équipes.",
      },
      {
        heading: "Destinataires des données",
        body: "Vos données ne sont transmises qu'aux destinataires nécessaires à l'exécution du contrat :",
        list: [
          "Livreur ou transporteur, pour l'acheminement du colis",
          "Prestataire de paiement, pour l'encaissement (Mobile Money, carte)",
          "Prestataires techniques (hébergement, envoi d'e-mails), en qualité de sous-traitants",
        ],
      },
      {
        heading: "Durées de conservation",
        body: "Nous ne conservons vos données que le temps nécessaire :",
        list: [
          "Données de commande et factures : selon les durées de conservation comptables et fiscales applicables",
          "Compte client : jusqu'à sa suppression par vous, puis effacement dans un délai raisonnable",
          "Destinataires de communications commerciales : jusqu'au retrait de votre consentement",
        ],
      },
      {
        heading: "Cookies et traceurs",
        body: "Le site n'utilise que des cookies strictement nécessaires à son fonctionnement : session de connexion, panier et préférence de langue. Aucun cookie de mesure d'audience tierce, de publicité ou de réseau social n'est déposé sans votre consentement préalable.",
      },
      {
        heading: "Vos droits",
        body: "Vous disposez, dans les conditions prévues par la réglementation applicable, des droits suivants :",
        list: [
          "Droit d'accès à vos données",
          "Droit de rectification",
          "Droit à l'effacement",
          "Droit d'opposition, notamment à la prospection commerciale",
          "Droit de retirer votre consentement à tout moment",
        ],
      },
      {
        heading: "Exercer vos droits",
        body: `Adressez votre demande à ${COMPANY.email}. Depuis votre compte client, vous pouvez également exporter vos données et supprimer votre compte sans passer par nous.`,
      },
      {
        heading: "Limite du droit à l'effacement",
        body: "La suppression d'un compte n'entraîne pas celle des commandes déjà exécutées : les factures et pièces comptables relèvent des durées de conservation légales. Les commandes sont alors détachées du compte et les coordonnées non exigées par la facture en sont retirées.",
      },
      {
        heading: "Sécurité",
        body: "Les échanges avec le site sont chiffrés (TLS). L'accès aux données est limité aux personnes qui en ont besoin, l'authentification du back-office exige un second facteur, et les secrets techniques sont protégés au repos.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Droit de rétractation / retours                                     */
  /* ------------------------------------------------------------------ */
  retractation: {
    slug: "retractation",
    title: "Droit de rétractation",
    intro: intro(
      "Conditions dans lesquelles vous pouvez changer d'avis après une commande, et limites propres aux produits cosmétiques pour des raisons d'hygiène.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Délai pour changer d'avis",
        body: "Vous pouvez changer d'avis sur un article dans un délai de quatorze jours à compter de la réception de votre commande, sans avoir à motiver votre décision, dès lors que l'article est retourné non ouvert et dans son emballage d'origine scellé.",
      },
      {
        heading: "Produits exclus pour raison d'hygiène",
        body: "Pour des raisons d'hygiène et de protection de la santé, les produits cosmétiques et de soin descellés, ouverts ou entamés après la livraison ne peuvent pas être repris ni échangés. Cette exclusion est usuelle pour ce type de produits et vise votre sécurité comme celle des autres clients.",
      },
      {
        heading: "Comment exercer ce droit",
        body: `Pour exercer votre droit, notifiez-nous votre décision au moyen d'une déclaration claire — e-mail, téléphone ou message WhatsApp — en indiquant votre numéro de commande.\n\nAdressez votre notification à :\n\n${COMPANY.name}\n${COMPANY.street}\n${COMPANY.city}\n${COMPANY.country}\nE-mail : ${COMPANY.email}\nTéléphone / WhatsApp : ${COMPANY.phone}`,
      },
      {
        heading: "Renvoi des articles",
        body: `Vous devez renvoyer ou rendre les articles concernés sans retard excessif après nous avoir communiqué votre décision.\n\nAdresse de retour : ${RETURN_ADDRESS}.\n\nLes frais directs de renvoi sont à votre charge, sauf lorsque le retour fait suite à un article non conforme, endommagé ou périmé, auquel cas nous les prenons en charge.`,
      },
      {
        heading: "Remboursement",
        body: "En cas de retour accepté, nous vous remboursons les sommes correspondantes par le même moyen de paiement que celui utilisé pour la commande, sauf accord de votre part pour un autre moyen (par exemple un remboursement Mobile Money). Le remboursement intervient après réception et vérification de l'article retourné.",
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
      "Villes desservies, délais, tarifs et organisation de la remise. Ces informations sont fournies avant la validation de la commande.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Zone de livraison",
        body: "Nous livrons au Cameroun. Les grandes villes sont desservies rapidement ; le reste du pays est livré par transporteur partenaire.",
        list: [
          "Douala et Yaoundé : livraison rapide, généralement sous 24 à 72 heures",
          "Autres villes : livraison par transporteur, délai selon la destination",
        ],
      },
      {
        heading: "Tarifs",
        body: "Les frais de livraison dépendent de la ville de destination et sont affichés avant la validation de la commande. Des opérations de livraison offerte peuvent être proposées ponctuellement ; elles sont alors indiquées clairement dans le panier.",
      },
      {
        heading: "Organisation de la remise",
        body: `Après la commande, nous vous contactons — le plus souvent par WhatsApp au ${COMPANY.phone} — pour convenir du lieu et du moment de remise du colis. Gardez votre téléphone joignable : c'est ainsi que la livraison se coordonne le plus simplement.`,
      },
      {
        heading: "Réception de la commande",
        body: "À la réception, vérifiez que le colis est bien scellé et que les articles correspondent à votre commande. Signalez-nous immédiatement tout article manquant, endommagé ou non conforme afin que nous puissions le traiter rapidement.",
      },
      {
        heading: "Transfert des risques",
        body: "Les risques de perte ou d'endommagement des articles vous sont transférés au moment où vous prenez physiquement possession du colis.",
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
          "Mobile Money — Orange Money",
          "Mobile Money — MTN Mobile Money",
          "Carte bancaire (Visa, Mastercard)",
          "Paiement à la livraison, selon la zone et à signaler lors de la commande",
        ],
      },
      {
        heading: "Sécurité des transactions",
        body: "Les paiements en ligne sont traités par un prestataire de paiement spécialisé, par une liaison chiffrée. Les données de paiement ne transitent jamais en clair par nos serveurs et n'y sont jamais conservées.",
      },
      {
        heading: "Paiement Mobile Money",
        body: "Le paiement par Mobile Money s'effectue depuis votre compte Orange Money ou MTN Mobile Money. Vous validez la transaction directement sur votre téléphone ; la confirmation nous parvient automatiquement et déclenche la préparation de la commande.",
      },
      {
        heading: "Paiement à la livraison",
        body: "Lorsque le paiement à la livraison est proposé pour votre zone, il doit être indiqué au moment de la commande. Préparez si possible le montant à l'appoint afin de faciliter la remise.",
      },
      {
        heading: "Facture",
        body: "Une facture est associée à chaque commande et rappelée dans l'e-mail de confirmation. Les clients disposant d'un compte retrouvent leurs commandes et factures à tout moment dans la rubrique « Mes commandes ».",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Retours & réclamations                                              */
  /* ------------------------------------------------------------------ */
  retours: {
    slug: "retours",
    title: "Retours & réclamations",
    intro: intro(
      "Marche à suivre en cas d'article non conforme, endommagé ou périmé, et rappel des limites propres aux produits cosmétiques.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Deux situations distinctes",
        body: "Un retour peut relever de deux cas différents, qui n'ouvrent pas les mêmes droits :",
        list: [
          "Le changement d'avis : possible sous quatorze jours, uniquement pour un article non ouvert et scellé. Les frais de retour sont à votre charge. Voir la page « Droit de rétractation ».",
          "L'article non conforme, endommagé ou périmé : les frais de retour et le remplacement ou remboursement sont à notre charge.",
        ],
      },
      {
        heading: "Article non conforme ou défectueux",
        body: "Si un article vous parvient endommagé, périmé, non conforme à votre commande ou visiblement altéré, nous en assurons le remplacement ou le remboursement. Contactez-nous dès la réception, si possible avec une photographie de l'article et de son emballage.",
      },
      {
        heading: "Hygiène des produits cosmétiques",
        body: "Pour des raisons d'hygiène et de sécurité, un produit cosmétique descellé ou entamé ne peut pas être repris au titre d'un simple changement d'avis. Cette limite ne s'applique pas lorsque le défaut est de notre fait (article endommagé, périmé ou non conforme).",
      },
      {
        heading: "Ouvrir une réclamation",
        body: `Écrivez à ${COMPANY.email} ou contactez-nous par WhatsApp au ${COMPANY.phone} en indiquant le numéro de commande, la nature du problème et, si possible, des photographies. Nous vous indiquons la marche à suivre avant tout renvoi.`,
      },
      {
        heading: "Adresse de retour",
        body: RETURN_ADDRESS,
      },
      {
        heading: "Remboursement",
        body: "Le remboursement intervient par le même moyen de paiement que celui utilisé pour la commande, sauf accord de votre part pour un autre moyen (par exemple Mobile Money), après réception et vérification de l'article retourné.",
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
        heading: "Les produits sont-ils authentiques ?",
        body: "Oui. KossKoss Select ne commercialise que des produits authentiques, provenant de circuits d'approvisionnement identifiés. Chaque fiche indique la marque et, quand l'information est disponible, la contenance et la date de durabilité.",
      },
      {
        heading: "Comment fonctionne le diagnostic beauté ?",
        body: "Le diagnostic beauté vous pose quelques questions simples sur votre type de peau, vos préférences et vos objectifs, puis vous propose une sélection de produits adaptés. Il est gratuit, sans engagement, et vous restez libre de suivre ou non les recommandations.",
      },
      {
        heading: "Comment payer ma commande ?",
        body: "Vous pouvez payer par Mobile Money (Orange Money, MTN Mobile Money) ou par carte bancaire. Le paiement à la livraison est proposé selon votre zone. Le moyen de paiement se choisit à l'étape « Paiement » ; le total définitif s'affiche avant validation.",
      },
      {
        heading: "Où et en combien de temps livrez-vous ?",
        body: "Nous livrons au Cameroun. Douala et Yaoundé sont généralement livrées sous 24 à 72 heures ; les autres villes sont desservies par transporteur, avec un délai qui dépend de la destination. Les frais s'affichent avant la validation de la commande.",
      },
      {
        heading: "Comment se passe la livraison concrètement ?",
        body: "Après votre commande, nous vous contactons — le plus souvent par WhatsApp — pour convenir du lieu et du moment de remise. Gardez votre téléphone joignable : c'est le moyen le plus simple de coordonner la livraison.",
      },
      {
        heading: "Puis-je retourner un produit ?",
        body: "Vous pouvez changer d'avis sous quatorze jours sur un article non ouvert et scellé. Pour des raisons d'hygiène, un produit cosmétique descellé ou entamé ne peut pas être repris, sauf s'il vous est parvenu endommagé, périmé ou non conforme : dans ce cas, nous le remplaçons ou le remboursons.",
      },
      {
        heading: "Dois-je créer un compte pour commander ?",
        body: "Non. La commande en tant qu'invité est possible et le compte reste facultatif. Créer un compte vous évite simplement de ressaisir vos informations et vous donne accès à l'historique de vos commandes.",
      },
      {
        heading: "Comment conserver mes produits ?",
        body: "Conservez vos cosmétiques à l'abri de la chaleur et de la lumière directe, bien refermés après usage. Respectez la date de durabilité et, le cas échéant, la période après ouverture indiquée sur l'emballage (par exemple « 12M » pour douze mois après ouverture).",
      },
      {
        heading: "Comment suivre ma commande ?",
        body: "Après votre commande, vous recevez une confirmation par e-mail. Nous vous tenons informé de l'avancement, notamment par WhatsApp. Si vous avez un compte, la rubrique « Mes commandes » indique le même état d'avancement.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* À propos                                                            */
  /* ------------------------------------------------------------------ */
  "a-propos": {
    slug: "a-propos",
    title: "À propos de KossKoss Select",
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Ce que nous proposons",
        body: "KossKoss Select est une boutique en ligne de cosmétiques et de produits de soin, pensée pour le Cameroun. Nous réunissons plusieurs marques, du soin du visage au corps, en passant par les cheveux et l'hygiène, et nous vous aidons à choisir grâce à un diagnostic beauté simple.",
      },
      {
        heading: "Des produits authentiques",
        body: "Nous ne vendons que des produits authentiques, issus de circuits d'approvisionnement identifiés. Notre sélection privilégie des formules lisibles et des marques reconnues, pour que vous sachiez ce que vous appliquez sur votre peau.",
      },
      {
        heading: "Le diagnostic beauté",
        body: "Choisir un produit de soin n'est pas évident. Notre diagnostic beauté vous pose quelques questions sur votre peau, vos préférences et vos objectifs, puis vous oriente vers une sélection adaptée. Gratuit et sans engagement, il est là pour vous simplifier la décision, pas pour la prendre à votre place.",
      },
      {
        heading: "Une livraison de proximité",
        body: `Nous livrons au Cameroun et coordonnons chaque livraison avec vous, le plus souvent par WhatsApp. Douala et Yaoundé sont livrées rapidement ; le reste du pays est desservi par transporteur. Une question avant d'acheter ? Écrivez-nous, une vraie personne vous répond.`,
      },
      {
        heading: "Nous joindre",
        body: `Notre service client est joignable par téléphone et sur WhatsApp au ${COMPANY.phone}, ainsi que par e-mail à ${COMPANY.email}.`,
      },
      {
        heading: "Informations légales",
        body: `${COMPANY.name}, ${COMPANY.legalForm} au capital de ${COMPANY.capital}, ${COMPANY.street}, ${COMPANY.city}, ${COMPANY.country}. ${COMPANY.register}. NIU : ${COMPANY.vatId}. Les informations complètes figurent dans les mentions légales.`,
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
        body: "Pour toute question sur une commande, un délai ou un produit, nous sommes joignables du lundi au samedi, par téléphone, sur WhatsApp et par e-mail.",
        list: [
          `Téléphone / WhatsApp : ${COMPANY.phone}`,
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
        body: "Après votre commande, vous recevez une confirmation par e-mail et nous vous tenons informé, notamment par WhatsApp. Si vous avez un compte, la rubrique « Mes commandes » donne l'état d'avancement. Gardez le numéro de commande sous la main : il accélère tout échange.",
      },
      {
        heading: "Réclamation",
        body: `Adressez votre réclamation à ${COMPANY.email} ou par WhatsApp au ${COMPANY.phone}, en indiquant le numéro de commande et, si possible, des photographies. La marche à suivre détaillée figure sur la page « Retours & réclamations ».`,
      },
      {
        heading: "Protection des données",
        body: `Les demandes d'accès, de rectification ou d'effacement de vos données se font à ${COMPANY.email}. Depuis votre compte, vous pouvez aussi exporter vos données et supprimer votre compte.`,
      },
      {
        heading: "Partenariats",
        body: `Les propositions de partenariat ou de mise en avant de marques sont à adresser à ${COMPANY.email} avec l'objet « Partenariat ».`,
      },
      {
        heading: "Informations légales",
        body: `${COMPANY.name}, représentée par ${COMPANY.managingDirector}. ${COMPANY.register}. NIU : ${COMPANY.vatId}. Les informations complètes figurent dans les mentions légales.`,
      },
    ],
  },
};
