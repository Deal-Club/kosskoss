/**
 * Facture PDF jointe à la confirmation de commande.
 *
 * Mise en page : logo, bloc client à gauche et bloc vendeur à droite, références
 * de facture au centre, tableau des articles avec vignette produit, totaux à
 * droite, puis les coordonnées de paiement centrées et l'encadré de TVA
 * intracommunautaire en pied de page.
 *
 * Mentions reprises : nom et adresse complets du vendeur et de l'acheteur,
 * date d'émission et numéro de facture unique, quantité et désignation de
 * chaque article, date de livraison ou mention qu'elle suivra, et le total.
 *
 * La TVA a été retirée du système : la facture ne présente ni taux ni montant
 * de taxe, seulement les prix réglés. Le numéro de TVA intracommunautaire du
 * vendeur reste affiché, il est exigé quel que soit le régime.
 *
 * pdf-lib n'embarque que les polices WinAnsi : tout caractère hors de ce jeu
 * doit être translittéré avant écriture, sinon la génération échoue.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { COMPANY } from "@/content/legal";
import type { BankTransferSettings } from "@/server/bankTransfer";
import type { OrderAddress, OrderRecord } from "@/server/orders";

const MARGE = 50;
const LARGEUR = 595.28; // A4 en points
const HAUTEUR = 841.89;
const DROITE = LARGEUR - MARGE;
const CENTRE = LARGEUR / 2;

const NOIR = rgb(0.1, 0.1, 0.1);
const GRIS = rgb(0.45, 0.45, 0.45);
const TRAIT = rgb(0.85, 0.85, 0.85);
const LIEN = rgb(0.16, 0.35, 0.7);
const ROUGE = rgb(0.83, 0.11, 0.13);

/** Colonnes du tableau des articles. */
const COL_NUM = MARGE;
const COL_IMAGE = MARGE + 20;
const VIGNETTE = 46;
const COL_DESIGNATION = MARGE + 82;
const LARGEUR_DESIGNATION = 180;
const COL_QUANTITE = 335; // centré sur cet axe
const COL_UNITAIRE = 445; // aligné à droite sur cet axe
const COL_TOTAL = DROITE;

/** Colonne des libellés du bloc « totaux ». */
const COL_TOTAUX = 400;

/**
 * Hauteur réservée au pied de page sur chaque page : mentions obligatoires et
 * encadré de TVA. Le flux ne descend jamais en dessous. Serré volontairement :
 * une commande de trois ou quatre lignes doit tenir sur une seule page, comme
 * le modèle dont la facture reprend la mise en page.
 */
const PIED_RESERVE = 128;

/**
 * Ramène le texte au jeu WinAnsi accepté par les polices standard.
 * Les tirets longs et guillemets typographiques viennent des libellés produits
 * rédigés pour le site ; sans cette conversion, pdf-lib refuse la ligne. Les
 * lettres accentuées et le signe euro appartiennent à WinAnsi et sont gardés.
 */
function winAnsi(valeur: string): string {
  return (valeur ?? "")
    .replace(/[—–]/g, "-")
    .replace(/[“”„]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/…/g, "...")
    // Espaces fines et insécables : celle qu'Intl place entre les milliers est
    // une U+202F, absente de WinAnsi — sans cette conversion, « 1 845,00 » se
    // serait écrit « 1845,00 ».
    .replace(/[    ]/g, " ")
    .replace(/[^\x20-\x7E€¡-ÿ]/g, "");
}

/** « 129900 » -> « 1 299,00 € », au format français. */
function euros(cents: number): string {
  return `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function dateFrancaise(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function lignesAdresse(adresse: OrderAddress): string[] {
  const nom = [adresse.salutation, adresse.firstName, adresse.lastName].filter(Boolean).join(" ");
  return [
    adresse.company,
    nom,
    adresse.street,
    `${adresse.postalCode} ${adresse.city}`.trim(),
    adresse.country === "FR" ? "France" : adresse.country,
  ].filter((ligne) => ligne && ligne.trim().length > 0);
}

/* ------------------------------------------------------------------ */
/* Images                                                             */
/* ------------------------------------------------------------------ */

/**
 * Logo officiel du site, le même fichier que l'en-tête et les e-mails.
 * Lu une seule fois puis gardé en mémoire : la facture est générée à chaque
 * commande et le fichier ne change pas entre deux déploiements. Le chemin est
 * écrit littéralement pour que le traçage de fichiers de Next.js embarque
 * l'image dans le bundle serveur.
 */
const LOGO_LARGEUR = 150;
let logoOctets: Buffer | null | undefined;

async function chargerLogo(doc: PDFDocument): Promise<PDFImage | null> {
  if (logoOctets === undefined) {
    try {
      logoOctets = await readFile(path.join(process.cwd(), "public", "images", "logo-full.png"));
    } catch {
      // Image absente du bundle : la facture reprend le lettrage en texte.
      logoOctets = null;
    }
  }
  if (!logoOctets) return null;
  try {
    return await doc.embedPng(logoOctets);
  } catch {
    return null;
  }
}

/** Au-delà, on renonce à la vignette : la facture ne doit pas retarder l'e-mail. */
const VIGNETTE_DELAI = 4000;

/**
 * Recadre une URL Cloudinary en petite vignette PNG. pdf-lib ne lit ni WebP ni
 * AVIF, or la diffusion automatique de Cloudinary sert volontiers ces formats.
 */
function urlVignette(source: string): string {
  const marqueur = "/image/upload/";
  const position = source.indexOf(marqueur);
  if (position === -1) return source;
  const coupe = position + marqueur.length;
  return `${source.slice(0, coupe)}w_180,h_180,c_pad,b_white,f_png/${source.slice(coupe)}`;
}

async function octetsVignette(source: string): Promise<Buffer | null> {
  try {
    if (source.startsWith("http://") || source.startsWith("https://")) {
      const reponse = await fetch(urlVignette(source), {
        signal: AbortSignal.timeout(VIGNETTE_DELAI),
      });
      if (!reponse.ok) return null;
      return Buffer.from(await reponse.arrayBuffer());
    }
    // Visuel téléversé depuis l'administration : lu dans public/, en refusant
    // toute remontée d'arborescence.
    if (source.startsWith("/") && !source.includes("..")) {
      return await readFile(path.join(process.cwd(), "public", source.slice(1)));
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Vignette du produit, ou null si elle est introuvable, illisible ou dans un
 * format que pdf-lib ne sait pas embarquer. Le cache évite de retélécharger la
 * même image quand deux lignes portent sur le même produit.
 */
async function chargerVignette(
  doc: PDFDocument,
  cache: Map<string, PDFImage | null>,
  source: string,
): Promise<PDFImage | null> {
  const cle = (source ?? "").trim();
  if (!cle) return null;
  const connue = cache.get(cle);
  if (connue !== undefined) return connue;

  let image: PDFImage | null = null;
  const octets = await octetsVignette(cle);
  if (octets && octets.length > 3) {
    try {
      if (octets[0] === 0x89 && octets[1] === 0x50) {
        image = await doc.embedPng(octets);
      } else if (octets[0] === 0xff && octets[1] === 0xd8) {
        image = await doc.embedJpg(octets);
      }
    } catch {
      image = null;
    }
  }
  cache.set(cle, image);
  return image;
}

/* ------------------------------------------------------------------ */
/* Écriture                                                           */
/* ------------------------------------------------------------------ */

type Ancrage = "gauche" | "droite" | "centre";

interface Feuille {
  doc: PDFDocument;
  page: PDFPage;
  /** Ligne de base courante du flux. */
  y: number;
  normale: PDFFont;
  grasse: PDFFont;
}

interface OptionsTexte {
  x?: number;
  y?: number;
  taille?: number;
  gras?: boolean;
  couleur?: ReturnType<typeof rgb>;
  ancrage?: Ancrage;
}

/** Écrit une ligne et renvoie sa largeur, utile pour enchaîner libellé et valeur. */
function texte(f: Feuille, contenu: string, options: OptionsTexte = {}): number {
  const taille = options.taille ?? 9;
  const police = options.gras ? f.grasse : f.normale;
  const valeur = winAnsi(contenu);
  const largeur = police.widthOfTextAtSize(valeur, taille);
  const repere = options.x ?? MARGE;
  const ancrage = options.ancrage ?? "gauche";
  const x =
    ancrage === "droite" ? repere - largeur : ancrage === "centre" ? repere - largeur / 2 : repere;

  f.page.drawText(valeur, {
    x,
    y: options.y ?? f.y,
    size: taille,
    font: police,
    color: options.couleur ?? NOIR,
  });
  return largeur;
}

function filet(f: Feuille, y: number, x1 = MARGE, x2 = DROITE, epaisseur = 0.8): void {
  f.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: epaisseur, color: TRAIT });
}

/**
 * Ouvre une page si le bloc à venir n'entre plus au-dessus du pied de page.
 * Renvoie vrai quand une page a été ajoutée : l'appelant peut alors reposer ce
 * qui doit l'être en tête de page, l'en-tête du tableau par exemple.
 */
function assurerEspace(f: Feuille, hauteur: number): boolean {
  if (f.y - hauteur >= PIED_RESERVE) return false;
  f.page = f.doc.addPage([LARGEUR, HAUTEUR]);
  f.y = HAUTEUR - MARGE;
  return true;
}

/** Tronque un mot trop long pour sa colonne, en marquant la coupure. */
function tronquer(valeur: string, police: PDFFont, taille: number, largeur: number): string {
  let visible = valeur;
  while (visible.length > 1 && police.widthOfTextAtSize(`${visible}...`, taille) > largeur) {
    visible = visible.slice(0, -1);
  }
  return `${visible}...`;
}

/** Découpe un libellé sur plusieurs lignes, sans jamais dépasser `maxLignes`. */
function decouper(
  valeur: string,
  police: PDFFont,
  taille: number,
  largeur: number,
  maxLignes: number,
): string[] {
  const mots = winAnsi(valeur).split(/\s+/).filter(Boolean);
  const lignes: string[] = [];
  let courante = "";

  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (police.widthOfTextAtSize(essai, taille) <= largeur) {
      courante = essai;
      continue;
    }
    if (courante) lignes.push(courante);
    courante =
      police.widthOfTextAtSize(mot, taille) > largeur
        ? tronquer(mot, police, taille, largeur)
        : mot;
  }
  if (courante) lignes.push(courante);

  if (lignes.length > maxLignes) {
    const gardees = lignes.slice(0, maxLignes);
    gardees[maxLignes - 1] = tronquer(gardees[maxLignes - 1], police, taille, largeur);
    return gardees;
  }
  return lignes.length > 0 ? lignes : [""];
}

/* ------------------------------------------------------------------ */
/* Facture                                                            */
/* ------------------------------------------------------------------ */

/**
 * Compose la facture d'une commande et renvoie le PDF prêt à être joint.
 * Le numéro de facture reprend celui de la commande : il est déjà séquentiel,
 * chronologique et sans rupture, ce qu'exige l'article 242 nonies A.
 *
 * `bank` n'est transmis que pour une commande réglée par virement : les
 * coordonnées du compte n'ont rien à faire sur une facture réglée par carte.
 */
export async function buildInvoicePdf(
  order: OrderRecord,
  bank?: BankTransferSettings,
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const normale = await doc.embedFont(StandardFonts.Helvetica);
  const grasse = await doc.embedFont(StandardFonts.HelveticaBold);
  const f: Feuille = {
    doc,
    page: doc.addPage([LARGEUR, HAUTEUR]),
    y: HAUTEUR - MARGE,
    normale,
    grasse,
  };

  doc.setTitle(`Facture ${order.orderNumber}`);
  doc.setProducer(COMPANY.name);
  doc.setCreationDate(new Date(order.createdAt));

  // ---- Logo ----
  const logo = await chargerLogo(doc);
  if (logo) {
    // drawImage se cale sur le coin inférieur gauche : on descend d'abord de la
    // hauteur du logo pour que son bord haut affleure la marge.
    const hauteurLogo = (LOGO_LARGEUR * logo.height) / logo.width;
    f.y -= hauteurLogo;
    f.page.drawImage(logo, { x: MARGE, y: f.y, width: LOGO_LARGEUR, height: hauteurLogo });
  } else {
    texte(f, COMPANY.name, { taille: 16, gras: true, couleur: ROUGE });
    f.y -= 6;
  }

  // ---- Vendeur à droite, client à gauche, sur la même ligne de départ ----
  const yBlocs = f.y - 30;

  let yVendeur = yBlocs;
  texte(f, COMPANY.name, { x: DROITE, y: yVendeur, ancrage: "droite", taille: 10, gras: true });
  yVendeur -= 15;
  for (const ligne of [COMPANY.street, COMPANY.city, COMPANY.phone, COMPANY.email]) {
    texte(f, ligne, { x: DROITE, y: yVendeur, ancrage: "droite", taille: 8.5, couleur: GRIS });
    yVendeur -= 12;
  }

  let yClient = yBlocs;
  texte(f, "Client", { y: yClient, taille: 13, gras: true });
  yClient -= 20;
  for (const ligne of lignesAdresse(order.billing)) {
    texte(f, ligne, { y: yClient, taille: 9 });
    yClient -= 12;
  }
  yClient -= 3;
  const largeurCourriel = texte(f, "E-mail : ", { y: yClient, taille: 9, gras: true });
  texte(f, order.email, { x: MARGE + largeurCourriel, y: yClient, taille: 9, couleur: LIEN });
  yClient -= 13;
  if (order.phone) {
    const largeurTel = texte(f, "Téléphone : ", { y: yClient, taille: 9, gras: true });
    texte(f, order.phone, { x: MARGE + largeurTel, y: yClient, taille: 9 });
    yClient -= 13;
  }

  // ---- Références de la facture ----
  let yReference = Math.min(yClient, yVendeur) - 8;
  const reference = (etiquette: string, valeur: string) => {
    texte(f, etiquette, { x: 300, y: yReference, taille: 9.5, gras: true });
    texte(f, valeur, { x: 430, y: yReference, taille: 9.5, gras: true });
    yReference -= 15;
  };
  reference("Facture n° :", order.orderNumber);
  reference("Date de facture :", dateFrancaise(order.createdAt));
  reference("Date de commande :", dateFrancaise(order.createdAt));

  // ---- Tableau des articles ----
  // Reposé en haut de chaque page : une suite de lignes sans intitulés de
  // colonnes ne se lit pas.
  const enTeteTableau = () => {
    filet(f, f.y);
    f.y -= 17;
    const colonne = (etiquette: string, x: number, ancrage: Ancrage = "gauche") =>
      texte(f, etiquette, { x, ancrage, taille: 8.5, gras: true, couleur: GRIS });
    colonne("N°", COL_NUM);
    colonne("PHOTO", COL_IMAGE);
    colonne("PRODUIT", COL_DESIGNATION);
    colonne("QUANTITÉ", COL_QUANTITE, "centre");
    colonne("PRIX", COL_UNITAIRE, "droite");
    colonne("PRIX TOTAL", COL_TOTAL, "droite");
    f.y -= 8;
    filet(f, f.y);
    f.y -= 10;
  };

  f.y = yReference - 10;
  enTeteTableau();

  const vignettes = new Map<string, PDFImage | null>();
  let numero = 0;

  for (const article of order.items) {
    numero += 1;
    const designation = `${article.brand} ${article.name}`.trim();
    const lignes = decouper(designation, normale, 9, LARGEUR_DESIGNATION, 3);
    const secondaires = [article.variantLabel, `Réf. ${article.sku}`].filter(
      (valeur) => valeur.trim().length > 0,
    );
    const hauteurTexte = lignes.length * 12 + secondaires.length * 10;
    const hauteurContenu = Math.max(VIGNETTE, hauteurTexte);
    if (assurerEspace(f, hauteurContenu + 16)) enTeteTableau();

    const haut = f.y;
    const vignette = await chargerVignette(doc, vignettes, article.image);
    if (vignette) {
      // Contenue dans un carré fixe, proportions gardées et centrée dedans.
      const echelle = Math.min(VIGNETTE / vignette.width, VIGNETTE / vignette.height);
      const largeurImage = vignette.width * echelle;
      const hauteurImage = vignette.height * echelle;
      f.page.drawImage(vignette, {
        x: COL_IMAGE + (VIGNETTE - largeurImage) / 2,
        y: haut - hauteurImage - (VIGNETTE - hauteurImage) / 2,
        width: largeurImage,
        height: hauteurImage,
      });
    }

    texte(f, String(numero), { x: COL_NUM, y: haut - 9, taille: 8.5, couleur: GRIS });

    let yTexte = haut - 9;
    for (const ligne of lignes) {
      texte(f, ligne, { x: COL_DESIGNATION, y: yTexte, taille: 9 });
      yTexte -= 12;
    }
    for (const ligne of secondaires) {
      texte(f, ligne, { x: COL_DESIGNATION, y: yTexte, taille: 7.5, couleur: GRIS });
      yTexte -= 10;
    }

    // Quantité et montants centrés verticalement sur la ligne, comme le modèle.
    const milieu = haut - hauteurContenu / 2 - 3;
    texte(f, String(article.quantity), {
      x: COL_QUANTITE,
      y: milieu,
      ancrage: "centre",
      taille: 9,
    });
    texte(f, euros(article.unitPriceCents), {
      x: COL_UNITAIRE,
      y: milieu,
      ancrage: "droite",
      taille: 9,
    });
    texte(f, euros(article.lineTotalCents), {
      x: COL_TOTAL,
      y: milieu,
      ancrage: "droite",
      taille: 9,
    });

    f.y = haut - hauteurContenu - 12;
  }

  filet(f, f.y + 2);

  // ---- Totaux ----
  assurerEspace(f, 92);
  f.y -= 20;

  const totalLigne = (etiquette: string, valeur: string, fort = false) => {
    texte(f, etiquette, {
      x: COL_TOTAUX,
      taille: fort ? 10 : 8.5,
      gras: true,
      couleur: fort ? NOIR : GRIS,
    });
    texte(f, valeur, {
      x: COL_TOTAL,
      ancrage: "droite",
      taille: fort ? 11 : 9,
      gras: fort,
    });
    f.y -= 16;
  };

  totalLigne("SOUS-TOTAL", euros(order.subtotalCents));
  totalLigne("LIVRAISON", order.shippingCents === 0 ? "OFFERTE" : euros(order.shippingCents));
  texte(f, order.shippingMethodKey === "express" ? "(24 à 48 h)" : "(3 à 5 jours ouvrés)", {
    x: COL_TOTAL,
    ancrage: "droite",
    taille: 7.5,
    couleur: GRIS,
  });
  f.y -= 12;
  filet(f, f.y + 4, COL_TOTAUX, DROITE);
  f.y -= 12;
  totalLigne("TOTAL", euros(order.totalCents), true);

  // ---- Moyen de paiement et coordonnées du virement ----
  const virement: Array<[string, string]> =
    bank && bank.iban.trim().length > 0
      ? ([
          ["Titulaire du compte :", bank.holder],
          ["IBAN :", bank.iban],
          ["BIC :", bank.bic],
          ["Type de virement :", bank.transferType],
          ["Référence :", order.orderNumber],
        ] as Array<[string, string]>).filter(([, valeur]) => valeur.trim().length > 0)
      : [];

  assurerEspace(f, 34 + virement.length * 14);
  f.y -= 8;
  filet(f, f.y);
  f.y -= 20;

  texte(f, `Mode de paiement : ${order.paymentMethodLabel}`, {
    x: CENTRE,
    ancrage: "centre",
    taille: 11,
    gras: true,
  });
  f.y -= 20;

  if (virement.length > 0) {
    // Libellés alignés à droite sur un axe commun, valeurs à sa droite : le
    // bloc reste lisible même quand les libellés n'ont pas la même longueur.
    const AXE = CENTRE - 30;
    for (const [etiquette, valeur] of virement) {
      texte(f, etiquette, { x: AXE, ancrage: "droite", taille: 9.5, gras: true });
      texte(f, valeur, { x: AXE + 10, taille: 9.5 });
      f.y -= 14;
    }
  }

  // ---- Pied de page : mentions obligatoires, puis encadré de TVA ----
  let yPied = 118;
  const pied = (contenu: string, taille = 7.5) => {
    texte(f, contenu, { y: yPied, taille, couleur: GRIS });
    yPied -= 10;
  };

  pied(
    order.shippedAt
      ? `Livraison : expédiée le ${dateFrancaise(order.shippedAt)}.`
      : "Livraison : la date de livraison correspond à la date d'expédition et sera communiquée séparément.",
  );
  pied(
    order.paidAt
      ? `Paiement : payée le ${dateFrancaise(order.paidAt)} par ${order.paymentMethodLabel}.`
      : `Paiement : ${order.paymentMethodLabel}. Payable comptant, sans escompte.`,
  );
  pied(
    "En cas de retard de paiement : pénalités au taux de trois fois l'intérêt légal et indemnité forfaitaire de 40 € pour frais de recouvrement.",
  );
  // Identité complète de l'émetteur sur une ligne : raison sociale, forme
  // sociale, adresse, moyens de contact et immatriculation.
  //
  // Le téléphone et le courriel viennent de la branche « identité du vendeur »,
  // qui les regroupait dans un second encadré à gauche. Cet encadré n'a pas été
  // repris : il aurait chevauché celui de la TVA, posé juste en dessous par la
  // refonte de la facture. Une ligne de plus suffit à porter la même
  // information, sans toucher à la mise en page.
  pied(
    `${COMPANY.name} · ${COMPANY.legalForm} · ${COMPANY.street} · ${COMPANY.city} · Tél. ${COMPANY.phone} · ${COMPANY.email} · ${COMPANY.register}`,
    7,
  );

  const mentionTva = `TVA intracommunautaire : ${COMPANY.vatId}`;
  const largeurMention = grasse.widthOfTextAtSize(winAnsi(mentionTva), 10);
  const largeurCadre = largeurMention + 40;
  const hauteurCadre = 26;
  const yCadre = 52;
  f.page.drawRectangle({
    x: CENTRE - largeurCadre / 2,
    y: yCadre,
    width: largeurCadre,
    height: hauteurCadre,
    borderColor: NOIR,
    borderWidth: 1,
  });
  texte(f, mentionTva, {
    x: CENTRE,
    y: yCadre + 9,
    ancrage: "centre",
    taille: 10,
    gras: true,
  });

  const octets = await doc.save();
  return Buffer.from(octets);
}

/** Nom du fichier joint, lisible dans la boîte de réception du client. */
export function invoiceFilename(order: OrderRecord): string {
  return `Facture-${order.orderNumber}.pdf`;
}
