/**
 * Coordonnées de l'entreprise — source unique.
 *
 * ── POURQUOI CE FICHIER EXISTE À PART ───────────────────────────────────────
 *
 * Ces valeurs vivaient dans `fr.ts`, au milieu de 34 Ko de texte juridique.
 * Tout module qui voulait les coordonnées héritait donc de tout le corpus des
 * pages légales — ce qui a poussé `server/emails/campaign.ts` à en RECOPIER une
 * seconde version plutôt que d'importer, avec ses propres « À compléter » qui
 * divergeaient déjà.
 *
 * Le fichier est donc extrait : il ne contient que ces champs, sans dépendance,
 * et tout le monde peut l'importer sans traîner le corpus. `fr.ts` le réexporte,
 * si bien qu'aucun appelant existant n'a changé.
 *
 * C'est aussi le point unique à brancher le jour où ces valeurs passeront en
 * base, comme le client le prévoit.
 *
 * ── DONNÉES DE DÉMONSTRATION ────────────────────────────────────────────────
 *
 * `provisoire` vaut `true` : les valeurs ci-dessous sont des DONNÉES DE TEST,
 * posées pour que la facture et les pages légales se composent avec des champs
 * de la bonne forme. Elles ne désignent aucune société réelle.
 *
 * Les identifiants sont volontairement à zéros — « RC/DLA/2026/B/00000 »,
 * « M000000000000X » — parce qu'une facture PORTE ces mentions jusque chez le
 * client. Un numéro d'apparence crédible aurait fini par être pris pour vrai ;
 * une suite de zéros se repère au premier coup d'œil de quiconque connaît le
 * format.
 *
 * La gérance est désignée par sa fonction et non par un nom : inventer une
 * personne physique comme directeur de la publication reviendrait à fabriquer
 * une identité, ce qu'aucune donnée de test ne justifie.
 *
 * À REMPLACER par les valeurs du registre camerounais avant la mise en ligne
 * réelle — voir docs/LEGAL.md § 3.
 */
export const COMPANY = {
  /**
   * Drapeau de vérité : tant qu'il vaut `true`, aucune des mentions ci-dessous
   * n'engage la société. Il donne aux vérifications futures — écran
   * d'administration, garde de mise en production — un test unique à interroger,
   * plutôt que de comparer des chaînes. La facture s'en sert déjà pour se
   * déclarer document de démonstration.
   */
  provisoire: true,
  name: "KossKoss Select",
  /** Forme sociale OHADA, la plus courante pour un commerce de détail. */
  legalForm: "SARL",
  street: "Rue Njo-Njo, Bonapriso",
  city: "Douala",
  country: "Cameroun",
  email: "contact@kosskoss.cm",
  phone: "+237 658 01 36 46",
  /** Désignée par sa fonction : aucune personne physique n'est inventée ici. */
  managingDirector: "La gérance",
  /** Registre du commerce et du crédit mobilier — greffe de Douala. */
  register: "RC/DLA/2026/B/00000",
  /** Capital social, en francs CFA. */
  capital: "1 000 000 FCFA",
  /** Numéro d'identifiant unique attribué par la Direction générale des impôts. */
  vatId: "M000000000000X",
  domain: "kosskoss.vercel.app",
  /** Hébergeur. */
  host: "Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis",
} as const;
