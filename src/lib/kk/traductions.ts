// Registre des champs traduisibles en anglais et calcul de l'état d'un
// enregistrement — module pur, sans accès base de données.
//
// La convention du schéma (voir src/server/localizedContent.ts) : un champ
// français facultatif `xxx` porte à côté de lui une colonne `xxxEn`, vide par
// défaut. Vide = repli sur le français à l'affichage ; ce module sert l'écran
// qui dit ce qui reste vide et permet de le remplir.
//
// `Article.blocksEn` EST EXCLU DU REGISTRE : c'est un tableau de blocs éditoriaux
// sérialisé en JSON, pas un texte. L'éditer depuis une case de traduction
// reviendrait à modifier du JSON à la main — une virgule oubliée casserait
// l'article. Le taire ferait croire l'article entièrement traduit alors que
// son contenu ne l'est pas ; l'exclusion doit donc être dite, ici et à l'écran.

export type FormatChamp = "texte" | "texte-long" | "liste";

export interface ChampTraduisible {
  /** Nom du champ français en base, tel qu'il figure dans le schéma Prisma. */
  fr: string;
  /** Nom du champ anglais en base. */
  en: string;
  /** Libellé affiché à l'écran. */
  libelle: string;
  format: FormatChamp;
}

export interface ModeleTraduisible {
  /** Nom du modèle Prisma, tel quel : sert de clé de route et de sélecteur. */
  cle: string;
  libelle: string;
  champs: ChampTraduisible[];
}

export interface EtatTraduction {
  traduits: number;
  aTraduire: number;
  total: number;
  complet: boolean;
}

// Dix-neuf modèles, un par table portant au moins un couple de champs
// `xxx` / `xxxEn`. Les noms de champs reprennent exactement ceux du schéma —
// voir prisma/schema.prisma, vérifié champ par champ à l'écriture de ce
// registre, et confirmé par le test qui relit le schéma (traductions.test.ts).
//
// Deux entrées s'écartent de la convention `fr` + « En » = `en` :
// `DiagStep.labelFr` et `ProductTag.labelFr` portent déjà, dans le schéma,
// un suffixe `Fr` explicite (contrairement à `DiagAnswer.label`, par exemple,
// qui n'en porte pas) ; leur seule paire réellement présente en base est
// `labelFr` → `labelEn`. Inventer un champ `label` qui n'existe pas casserait
// la compilation dès la tâche 2.
export const MODELES_TRADUISIBLES: ModeleTraduisible[] = [
  {
    cle: "Group",
    libelle: "Groupes",
    champs: [{ fr: "label", en: "labelEn", libelle: "Libellé", format: "texte" }],
  },
  {
    cle: "Category",
    libelle: "Catégories",
    champs: [
      { fr: "label", en: "labelEn", libelle: "Libellé", format: "texte" },
      { fr: "description", en: "descriptionEn", libelle: "Description", format: "texte-long" },
      { fr: "guideIntro", en: "guideIntroEn", libelle: "Introduction du guide", format: "texte-long" },
      { fr: "guideClosing", en: "guideClosingEn", libelle: "Conclusion du guide", format: "texte-long" },
    ],
  },
  {
    cle: "GuideSection",
    libelle: "Sections de guide",
    champs: [
      { fr: "heading", en: "headingEn", libelle: "Titre de section", format: "texte" },
      { fr: "body", en: "bodyEn", libelle: "Texte de section", format: "texte-long" },
    ],
  },
  {
    cle: "Brand",
    libelle: "Marques",
    champs: [
      { fr: "name", en: "nameEn", libelle: "Nom", format: "texte" },
      { fr: "description", en: "descriptionEn", libelle: "Description", format: "texte-long" },
    ],
  },
  {
    cle: "Product",
    libelle: "Produits",
    champs: [
      { fr: "name", en: "nameEn", libelle: "Nom", format: "texte" },
      { fr: "shortDescription", en: "shortDescriptionEn", libelle: "Description courte", format: "texte-long" },
      { fr: "description", en: "descriptionEn", libelle: "Description", format: "texte-long" },
      { fr: "bullets", en: "bulletsEn", libelle: "Caractéristiques", format: "liste" },
      { fr: "problemeAccroche", en: "problemeAccrocheEn", libelle: "Accroche (problème)", format: "texte" },
      { fr: "idealPour", en: "idealPourEn", libelle: "Idéal pour", format: "texte-long" },
      { fr: "usageMatin", en: "usageMatinEn", libelle: "Usage du matin", format: "texte-long" },
      { fr: "usageSoir", en: "usageSoirEn", libelle: "Usage du soir", format: "texte-long" },
      { fr: "frequence", en: "frequenceEn", libelle: "Fréquence", format: "texte" },
      { fr: "conseilKossKoss", en: "conseilKossKossEn", libelle: "Conseil KossKoss", format: "texte-long" },
      { fr: "precautions", en: "precautionsEn", libelle: "Précautions", format: "texte-long" },
      { fr: "actifsCles", en: "actifsClesEn", libelle: "Actifs clés", format: "texte" },
      { fr: "pourquoiKossKoss", en: "pourquoiKossKossEn", libelle: "Le Choix KossKoss Select", format: "texte-long" },
      { fr: "zone", en: "zoneEn", libelle: "Zone d'application", format: "texte" },
      { fr: "cible", en: "cibleEn", libelle: "Cible", format: "texte" },
      // statutPublication / donneesAConfirmer volontairement absents : voir
      // les EXCLUSIONS de traductions.test.ts et le commentaire du modèle
      // Product dans prisma/schema.prisma.
    ],
  },
  {
    cle: "Routine",
    libelle: "Routines",
    champs: [
      { fr: "name", en: "nameEn", libelle: "Nom", format: "texte" },
      { fr: "claim", en: "claimEn", libelle: "Accroche", format: "texte" },
      { fr: "description", en: "descriptionEn", libelle: "Description", format: "texte-long" },
      { fr: "profilCible", en: "profilCibleEn", libelle: "Profil cible", format: "texte-long" },
      { fr: "usageMatin", en: "usageMatinEn", libelle: "Usage du matin", format: "texte-long" },
      { fr: "usageSoir", en: "usageSoirEn", libelle: "Usage du soir", format: "texte-long" },
      { fr: "badge", en: "badgeEn", libelle: "Badge", format: "texte" },
      { fr: "noteKossKoss", en: "noteKossKossEn", libelle: "Note KossKoss", format: "texte-long" },
    ],
  },
  {
    cle: "RoutineStep",
    libelle: "Étapes de routine",
    champs: [
      { fr: "label", en: "labelEn", libelle: "Geste", format: "texte" },
      { fr: "why", en: "whyEn", libelle: "Pourquoi", format: "texte-long" },
      { fr: "role", en: "roleEn", libelle: "Rôle du geste", format: "texte" },
      // `moment` n'a pas de contrepartie *En : « AM/PM », « AM », « PM » sont
      // déjà lisibles tels quels en anglais, et une formulation libre plus
      // longue (« PM / AM si besoin ») reste un repère d'usage, pas un texte
      // éditorial destiné à la traduction — voir traductions.test.ts.
    ],
  },
  {
    cle: "ProductVariant",
    libelle: "Variantes de produit",
    champs: [{ fr: "label", en: "labelEn", libelle: "Libellé du volume", format: "texte" }],
  },
  {
    cle: "DiagQuestion",
    libelle: "Questions du diagnostic",
    champs: [
      { fr: "title", en: "titleEn", libelle: "Question", format: "texte" },
      { fr: "subtitle", en: "subtitleEn", libelle: "Sous-titre", format: "texte" },
    ],
  },
  {
    cle: "DiagAnswer",
    libelle: "Réponses du diagnostic",
    champs: [
      { fr: "label", en: "labelEn", libelle: "Réponse", format: "texte" },
      { fr: "description", en: "descriptionEn", libelle: "Description", format: "texte-long" },
      { fr: "chip", en: "chipEn", libelle: "Étiquette de profil", format: "texte" },
    ],
  },
  {
    cle: "DiagStep",
    libelle: "Étapes du diagnostic",
    champs: [{ fr: "labelFr", en: "labelEn", libelle: "Libellé du geste", format: "texte" }],
  },
  {
    cle: "ProductTag",
    libelle: "Tags produit",
    champs: [{ fr: "labelFr", en: "labelEn", libelle: "Libellé du tag", format: "texte" }],
  },
  {
    cle: "Campaign",
    libelle: "Campagnes",
    champs: [
      { fr: "subject", en: "subjectEn", libelle: "Objet", format: "texte" },
      { fr: "headline", en: "headlineEn", libelle: "Titre", format: "texte" },
      { fr: "bodyText", en: "bodyTextEn", libelle: "Corps du message", format: "texte-long" },
      { fr: "ctaLabel", en: "ctaLabelEn", libelle: "Bouton d'appel à l'action", format: "texte" },
    ],
  },
  {
    cle: "Article",
    libelle: "Articles",
    champs: [
      { fr: "title", en: "titleEn", libelle: "Titre", format: "texte" },
      { fr: "excerpt", en: "excerptEn", libelle: "Chapeau", format: "texte-long" },
      // blocks / blocksEn volontairement absents — voir le commentaire d'en-tête.
      { fr: "coverAlt", en: "coverAltEn", libelle: "Texte alternatif de couverture", format: "texte" },
      { fr: "metaTitle", en: "metaTitleEn", libelle: "Titre SEO", format: "texte" },
      { fr: "metaDescription", en: "metaDescriptionEn", libelle: "Description SEO", format: "texte-long" },
    ],
  },
  {
    cle: "ArticleCategory",
    libelle: "Catégories d'article",
    champs: [
      { fr: "label", en: "labelEn", libelle: "Libellé", format: "texte" },
      { fr: "description", en: "descriptionEn", libelle: "Description", format: "texte-long" },
    ],
  },
  {
    cle: "ArticleTag",
    libelle: "Tags d'article",
    champs: [{ fr: "label", en: "labelEn", libelle: "Libellé", format: "texte" }],
  },
  {
    cle: "ArticleAuthor",
    libelle: "Auteurs",
    champs: [
      { fr: "role", en: "roleEn", libelle: "Fonction", format: "texte" },
      { fr: "bio", en: "bioEn", libelle: "Biographie", format: "texte-long" },
    ],
  },
  {
    cle: "Announcement",
    libelle: "Bandeau d'annonce",
    champs: [{ fr: "message", en: "messageEn", libelle: "Message", format: "texte" }],
  },
  {
    cle: "PaymentMethod",
    libelle: "Moyens de paiement",
    champs: [
      { fr: "label", en: "labelEn", libelle: "Libellé", format: "texte" },
      { fr: "description", en: "descriptionEn", libelle: "Description", format: "texte-long" },
      { fr: "feeLabel", en: "feeLabelEn", libelle: "Mention de frais", format: "texte" },
    ],
  },
];

/**
 * État de traduction d'un enregistrement pour un jeu de champs donné.
 *
 * Règles (voir les tests) :
 * - un champ français vide n'attend aucune traduction, il n'entre pas dans
 *   `total` ;
 * - une traduction faite uniquement d'espaces ne compte pas comme traduite ;
 * - une traduction identique au français compte comme traduite (un nom propre
 *   ne se traduit pas).
 */
export function etatTraduction(
  valeurs: Record<string, string>,
  champs: ChampTraduisible[],
): EtatTraduction {
  let total = 0;
  let traduits = 0;

  for (const champ of champs) {
    const fr = (valeurs[champ.fr] ?? "").trim();
    if (!fr) continue;

    total += 1;
    const en = (valeurs[champ.en] ?? "").trim();
    if (en) traduits += 1;
  }

  return { traduits, aTraduire: total - traduits, total, complet: traduits === total };
}
