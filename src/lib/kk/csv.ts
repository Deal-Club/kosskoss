/**
 * Assemblage d'un fichier CSV destiné à Excel francophone.
 *
 * ── POURQUOI CE MODULE EXISTE ───────────────────────────────────────────────
 *
 * Ces deux fonctions vivaient recopiées dans la route d'export des produits.
 * L'export des ventes en aurait fait une deuxième copie, et deux copies d'une
 * règle d'échappement divergent tôt ou tard — au détriment d'un fichier que
 * personne ne relit avant de l'ouvrir chez le comptable.
 *
 * ── LES DEUX CONVENTIONS, ET LEURS RAISONS ──────────────────────────────────
 *
 *  • SÉPARATEUR POINT-VIRGULE — c'est celui qu'Excel attend dans un
 *    environnement francophone. La virgule y couperait « 12 000,50 » en deux
 *    colonnes.
 *  • BOM EN TÊTE — sans lui, Excel lit le fichier dans son encodage local et
 *    affiche « CrÃ¨me » au lieu de « Crème ».
 *
 * Ces conventions valent pour les exports du back-office. Le flux Google
 * Merchant et l'export de données personnelles ont les leurs, et ne passent
 * délibérément pas par ici.
 */

const SEPARATEUR = ";";

/**
 * Prépare une valeur pour une cellule.
 *
 * Les retours à la ligne sont remplacés plutôt qu'échappés : une cellule
 * multiligne est licite en CSV, mais elle rend le fichier illisible dès qu'on
 * le rouvre dans un autre outil que celui qui l'a écrit.
 */
export function csvCell(value: string): string {
  const propre = value.replace(/\r?\n/g, " ").trim();
  return /[";]/.test(propre) ? `"${propre.replace(/"/g, '""')}"` : propre;
}

/** Assemble l'en-tête et les lignes en un fichier complet, BOM compris. */
export function buildCsv(entetes: string[], lignes: string[][]): string {
  const toutes = [
    entetes.map(csvCell).join(SEPARATEUR),
    ...lignes.map((ligne) => ligne.map(csvCell).join(SEPARATEUR)),
  ];
  return `﻿${toutes.join("\r\n")}\r\n`;
}
