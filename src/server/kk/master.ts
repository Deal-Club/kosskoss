import path from "node:path";
import { readSheet, type CellValue, type Row } from "read-excel-file/node";
import { estNiveau, type NiveauRoutine } from "@/lib/kk/routines-niveau";

/**
 * Lecteur du master client (KOSSKOSS_CATALOGUE_ROUTINES_V1_2.xlsx).
 *
 * ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
 *
 * Le classeur porte 71 fiches produit, 14 routines et leurs gestes (colonne
 * PRODUITS_ROUTINES) : le master du client, préparé à la main dans un
 * tableur. Ce module en fait la lecture SEULE — la validation des lignes, sans
 * toucher à la base. L'écriture (rapprochement par SKU/code, mise à jour,
 * création de routine, remplacement des gestes) vit dans les fonctions
 * `importer*` plus bas, ajoutées lot après lot sur ce même fichier.
 *
 * ── DÉPENDANCE AJOUTÉE ───────────────────────────────────────────────────────
 *
 * Aucune bibliothèque de lecture de tableur n'était présente dans le dépôt.
 * Choix : `read-excel-file` — pure JS (aucune dépendance native à compiler),
 * maintenue, et nettement plus légère que l'alternative `exceljs` (~2,5 Mo
 * contre ~22 Mo de dépendances). `xlsx` (SheetJS) a été écarté : la version
 * publiée sur npm traîne des CVE non corrigées depuis plusieurs années.
 *
 * ── LE CLASSEUR EST UNE SAISIE HUMAINE ──────────────────────────────────────
 *
 * Il portera des lignes vides (séparateurs visuels dans le tableur) et des
 * cellules mal typées (un prix saisi en texte, une étape non numérique). Une
 * ligne invalide est ÉCARTÉE et NOMMÉE dans le compte rendu — jamais devinée,
 * jamais silencieusement ignorée.
 */

// ---- Feuilles et colonnes ---------------------------------------------------

const FEUILLE_FICHES = "FICHES_PRODUITS";
const FEUILLE_ROUTINES = "ROUTINES";
const FEUILLE_LIAISONS = "PRODUITS_ROUTINES";

/** Chemin par défaut du master, tel que livré par le client. */
export const CHEMIN_MASTER_PAR_DEFAUT = path.join(
  process.cwd(),
  "assets",
  "corrections",
  "KOSSKOSS_CATALOGUE_ROUTINES_V1_2.xlsx",
);

// ---- Types ------------------------------------------------------------------

export interface LigneIgnoree {
  /** Numéro de ligne dans le classeur, en-tête compris (donc 1-based, ligne 1 = en-têtes). */
  ligne: number;
  raison: string;
}

/** Une fiche produit du master, colonnes validées et prêtes à l'emploi. */
export interface FicheMaster {
  ligne: number;
  sku: string;
  /** EAN_UPC — candidat pour `Product.gtin`, encore non validé (voir `isValidGtin`). */
  ean: string;
  marque: string;
  nom: string;
  /** FCFA entier — le FCFA n'a pas de sous-unité, jamais de division par 100. */
  prixFcfa: number;
  /** Libellé de catégorie du master (« Nettoyant », « Toner »…) — sert uniquement
   *  au signalement d'écart, jamais à déplacer un produit (voir `CATEGORIE_MASTER_VERS_SLUG`). */
  categorie: string;
  /** Solution_Courte → `Product.shortDescription`. */
  shortDescription: string;
  /** Benefice_1..3, non vides uniquement → `Product.bullets` (JSON). */
  benefices: string[];
  problemeAccroche: string;
  idealPour: string;
  usageMatin: string;
  usageSoir: string;
  frequence: string;
  conseilKossKoss: string;
  precautions: string;
  actifsCles: string;
  /** Reprises telles quelles : ce sont des indications pour le commerçant, pas du contenu client. */
  statutPublication: string;
  donneesAConfirmer: string;
}

/** Une routine du master (onglet ROUTINES), colonnes validées. */
export interface RoutineMaster {
  ligne: number;
  /** Routine_ID — clé de rapprochement, jamais le nom ni le slug. */
  code: string;
  niveau: NiveauRoutine;
  besoin: string;
  nom: string;
  /** Promesse → `Routine.claim`. */
  promesse: string;
  profilCible: string;
  usageMatin: string;
  usageSoir: string;
  badge: string;
  noteKossKoss: string;
}

/** Une liaison routine ↔ produit (onglet PRODUITS_ROUTINES), un geste. */
export interface LiaisonMaster {
  ligne: number;
  routineCode: string;
  /** Etape — entier positif, sert d'ordre d'affichage du geste. */
  etape: number;
  role: string;
  sku: string;
  moment: string;
}

export interface LectureMaster {
  fiches: FicheMaster[];
  fichesIgnorees: LigneIgnoree[];
  routines: RoutineMaster[];
  routinesIgnorees: LigneIgnoree[];
  liaisons: LiaisonMaster[];
  liaisonsIgnorees: LigneIgnoree[];
}

// ---- Aides pures (testées sans fichier ni base) ------------------------------

/** Index nom de colonne → position, à partir de la ligne d'en-têtes. */
export function indexerEntetes(entetes: Row): Record<string, number> {
  const index: Record<string, number> = {};
  entetes.forEach((valeur, i) => {
    if (typeof valeur === "string" && valeur.trim()) index[valeur.trim()] = i;
  });
  return index;
}

/** Valeur d'une colonne nommée sur une ligne — `undefined` si la colonne est absente. */
function cellule(index: Record<string, number>, ligne: Row, colonne: string): CellValue | null | undefined {
  const i = index[colonne];
  return i === undefined ? undefined : ligne[i];
}

/** Texte nettoyé : `null`/`undefined` deviennent une chaîne vide, jamais "null" ou "undefined". */
function texte(valeur: CellValue | null | undefined): string {
  if (valeur === null || valeur === undefined) return "";
  if (typeof valeur === "string") return valeur.trim();
  if (valeur instanceof Date) return valeur.toISOString();
  return String(valeur).trim();
}

/**
 * Entier positif tolérant à la saisie tableur : un nombre déjà typé, ou un
 * texte du type « 18 000 FCFA » — espaces et lettres retirés avant conversion.
 * Rend `null` pour tout ce qui ne se réduit pas à un entier strictement positif.
 */
function versEntierPositif(valeur: CellValue | null | undefined): number | null {
  if (typeof valeur === "number") {
    return Number.isInteger(valeur) && valeur > 0 ? valeur : null;
  }
  if (typeof valeur === "string") {
    const nettoye = valeur.replace(/[^\d.-]/g, "");
    if (!nettoye) return null;
    const n = Number(nettoye);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return null;
}

/** Vrai si toutes les cellules de la ligne sont vides — un séparateur visuel du tableur. */
function ligneVide(ligne: Row): boolean {
  return ligne.every((c) => c === null || c === undefined || (typeof c === "string" && c.trim() === ""));
}

// ---- Analyse d'une ligne, par feuille ---------------------------------------

export function analyserLigneFiche(
  index: Record<string, number>,
  ligne: Row,
  numero: number,
): { fiche: FicheMaster } | { ignoree: LigneIgnoree } {
  if (ligneVide(ligne)) return { ignoree: { ligne: numero, raison: "ligne vide" } };

  const sku = texte(cellule(index, ligne, "SKU"));
  if (!sku) return { ignoree: { ligne: numero, raison: "SKU manquant" } };

  const prixFcfa = versEntierPositif(cellule(index, ligne, "Prix_FCFA"));
  if (prixFcfa === null) {
    return { ignoree: { ligne: numero, raison: `prix invalide pour le SKU ${sku}` } };
  }

  const benefices = [
    texte(cellule(index, ligne, "Benefice_1")),
    texte(cellule(index, ligne, "Benefice_2")),
    texte(cellule(index, ligne, "Benefice_3")),
  ].filter((b) => b !== "");

  return {
    fiche: {
      ligne: numero,
      sku,
      ean: texte(cellule(index, ligne, "EAN_UPC")),
      marque: texte(cellule(index, ligne, "Marque")),
      nom: texte(cellule(index, ligne, "Nom_Produit")),
      prixFcfa,
      categorie: texte(cellule(index, ligne, "Categorie")),
      shortDescription: texte(cellule(index, ligne, "Solution_Courte")),
      benefices,
      problemeAccroche: texte(cellule(index, ligne, "Probleme_Accroche")),
      idealPour: texte(cellule(index, ligne, "Ideal_Pour")),
      usageMatin: texte(cellule(index, ligne, "Usage_Matin")),
      usageSoir: texte(cellule(index, ligne, "Usage_Soir")),
      frequence: texte(cellule(index, ligne, "Frequence")),
      conseilKossKoss: texte(cellule(index, ligne, "Conseil_KossKoss")),
      precautions: texte(cellule(index, ligne, "Precautions")),
      actifsCles: texte(cellule(index, ligne, "Actifs_Cles")),
      statutPublication: texte(cellule(index, ligne, "Statut_Publication")),
      donneesAConfirmer: texte(cellule(index, ligne, "Donnees_A_Confirmer")),
    },
  };
}

export function analyserLigneRoutine(
  index: Record<string, number>,
  ligne: Row,
  numero: number,
): { routine: RoutineMaster } | { ignoree: LigneIgnoree } {
  if (ligneVide(ligne)) return { ignoree: { ligne: numero, raison: "ligne vide" } };

  const code = texte(cellule(index, ligne, "Routine_ID"));
  if (!code) return { ignoree: { ligne: numero, raison: "code de routine manquant" } };

  const niveauBrut = texte(cellule(index, ligne, "Niveau"));
  const niveau = niveauBrut.toLowerCase();
  if (!estNiveau(niveau)) {
    return {
      ignoree: {
        ligne: numero,
        raison: `niveau « ${niveauBrut || "(vide)"} » non reconnu pour la routine ${code}`,
      },
    };
  }

  return {
    routine: {
      ligne: numero,
      code,
      niveau,
      besoin: texte(cellule(index, ligne, "Besoin")),
      nom: texte(cellule(index, ligne, "Nom_Routine")),
      promesse: texte(cellule(index, ligne, "Promesse")),
      profilCible: texte(cellule(index, ligne, "Profil_Cible")),
      usageMatin: texte(cellule(index, ligne, "Usage_Matin")),
      usageSoir: texte(cellule(index, ligne, "Usage_Soir")),
      badge: texte(cellule(index, ligne, "Badge")),
      noteKossKoss: texte(cellule(index, ligne, "Note_KossKoss")),
    },
  };
}

export function analyserLigneLiaison(
  index: Record<string, number>,
  ligne: Row,
  numero: number,
): { liaison: LiaisonMaster } | { ignoree: LigneIgnoree } {
  if (ligneVide(ligne)) return { ignoree: { ligne: numero, raison: "ligne vide" } };

  const routineCode = texte(cellule(index, ligne, "Routine_ID"));
  if (!routineCode) return { ignoree: { ligne: numero, raison: "code de routine manquant" } };

  const sku = texte(cellule(index, ligne, "SKU"));
  if (!sku) {
    return { ignoree: { ligne: numero, raison: `SKU manquant pour la routine ${routineCode}` } };
  }

  const etape = versEntierPositif(cellule(index, ligne, "Etape"));
  if (etape === null) {
    return {
      ignoree: { ligne: numero, raison: `étape invalide pour ${routineCode} / ${sku}` },
    };
  }

  return {
    liaison: {
      ligne: numero,
      routineCode,
      etape,
      role: texte(cellule(index, ligne, "Role")),
      sku,
      moment: texte(cellule(index, ligne, "Moment")),
    },
  };
}

// ---- Lecture du classeur (impure : accès disque) -----------------------------

function analyserFeuille<T extends { ligne: number }>(
  rows: Row[],
  analyser: (index: Record<string, number>, ligne: Row, numero: number) => { valeur: T } | { ignoree: LigneIgnoree },
): { valeurs: T[]; ignorees: LigneIgnoree[] } {
  const index = indexerEntetes(rows[0] ?? []);
  const valeurs: T[] = [];
  const ignorees: LigneIgnoree[] = [];
  for (let i = 1; i < rows.length; i++) {
    // Ligne 1 = en-têtes ; la ligne de donnée d'indice tableau `i` est la
    // ligne `i + 1` du classeur, tel qu'un utilisateur l'y lirait.
    const resultat = analyser(index, rows[i], i + 1);
    if ("ignoree" in resultat) ignorees.push(resultat.ignoree);
    else valeurs.push(resultat.valeur);
  }
  return { valeurs, ignorees };
}

/** Lit et valide les trois onglets du master. N'écrit rien en base. */
export async function lireMaster(chemin: string = CHEMIN_MASTER_PAR_DEFAUT): Promise<LectureMaster> {
  const [ficheRows, routineRows, liaisonRows] = await Promise.all([
    readSheet(chemin, FEUILLE_FICHES),
    readSheet(chemin, FEUILLE_ROUTINES),
    readSheet(chemin, FEUILLE_LIAISONS),
  ]);

  const fiches = analyserFeuille(ficheRows, (index, ligne, numero) => {
    const resultat = analyserLigneFiche(index, ligne, numero);
    return "fiche" in resultat ? { valeur: resultat.fiche } : resultat;
  });
  const routines = analyserFeuille(routineRows, (index, ligne, numero) => {
    const resultat = analyserLigneRoutine(index, ligne, numero);
    return "routine" in resultat ? { valeur: resultat.routine } : resultat;
  });
  const liaisons = analyserFeuille(liaisonRows, (index, ligne, numero) => {
    const resultat = analyserLigneLiaison(index, ligne, numero);
    return "liaison" in resultat ? { valeur: resultat.liaison } : resultat;
  });

  return {
    fiches: fiches.valeurs,
    fichesIgnorees: fiches.ignorees,
    routines: routines.valeurs,
    routinesIgnorees: routines.ignorees,
    liaisons: liaisons.valeurs,
    liaisonsIgnorees: liaisons.ignorees,
  };
}
