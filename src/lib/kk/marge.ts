/**
 * Marge commerciale d'un produit.
 *
 * ── POURQUOI CE MODULE EST PUR ──────────────────────────────────────────────
 *
 * Le tableau de bord des ventes et l'export CSV le consommeront tous les deux.
 * En le gardant sans dépendance, la règle de calcul reste testable sans base —
 * et c'est la seule partie où une erreur se verrait chez le comptable.
 *
 * ── LA CONVENTION RETENUE, ET POURQUOI ELLE COMPTE ──────────────────────────
 *
 * Deux conventions coexistent dans le commerce, et elles donnent des chiffres
 * très différents pour la même vente :
 *
 *   • TAUX DE MARGE, sur le prix de vente : (prix − coût) / prix
 *   • COEFFICIENT, sur le coût d'achat :    (prix − coût) / coût
 *
 * Un produit acheté 12 000 et vendu 18 500 affiche 35 % dans la première et
 * 54 % dans la seconde. Confondre les deux est l'erreur classique.
 *
 * Ce module retient le TAUX DE MARGE SUR PRIX DE VENTE : c'est la convention
 * du commerce de détail, celle qu'un commerçant lit sans conversion, et celle
 * qui reste bornée à 100 % — donc lisible dans un tableau de bord.
 *
 * ── LE FCFA N'A PAS DE SOUS-UNITÉ ───────────────────────────────────────────
 *
 * Les entiers reçus ici SONT des francs entiers. Le suffixe « Cents » des
 * champs de la base est hérité d'une activité précédente et ment. Aucune
 * division par 100 nulle part.
 */

/**
 * Marge en francs sur une unité vendue.
 *
 * Rend `null` quand le coût d'achat n'est pas renseigné. C'est délibéré : un
 * coût absent n'est PAS un coût nul. Traiter l'un comme l'autre ferait afficher
 * 100 % de marge sur tout le catalogue existant, dont aucun produit ne porte
 * encore de coût — un chiffre faux, et plus nuisible qu'une case vide.
 *
 * Une marge négative est rendue telle quelle : un produit vendu à perte, par
 * déstockage ou par erreur de saisie, doit se voir. La masquer empêcherait
 * précisément de la repérer.
 */
export function margeUnitaire(
  prixCents: number,
  coutCents: number | null | undefined,
): number | null {
  if (coutCents === null || coutCents === undefined) return null;
  return prixCents - coutCents;
}

/**
 * Taux de marge en pourcentage du prix de vente, arrondi à une décimale.
 *
 * Rend `null` quand le coût n'est pas renseigné, et quand le prix est nul :
 * diviser par le prix de vente exige qu'il existe. Un produit à prix zéro n'a
 * pas de taux — ce n'est pas une erreur, simplement une question sans réponse.
 *
 * L'arrondi à une décimale n'est pas cosmétique : un taux affiché avec quinze
 * décimales ne se lit pas, et le tableau de bord est fait pour être lu d'un
 * coup d'œil.
 */
export function tauxMarge(
  prixCents: number,
  coutCents: number | null | undefined,
): number | null {
  const marge = margeUnitaire(prixCents, coutCents);
  if (marge === null || prixCents === 0) return null;
  return Math.round((marge / prixCents) * 1000) / 10;
}

/**
 * Une saisie de coût d'achat est-elle exploitable ?
 *
 * ── POURQUOI CETTE FONCTION EXISTE ──────────────────────────────────────────
 *
 * `toCents` rend 0 aussi bien pour « 0 » que pour « abc » : après conversion,
 * les deux sont indistinguables. Or l'un est un coût RÉEL — un échantillon reçu
 * gratuitement, une dotation fournisseur — et l'autre une faute de frappe.
 *
 * On regarde donc la SAISIE et non son résultat. Sans cela, l'aperçu de marge
 * annonçait « 100 % » sur « abc » avant que le serveur ne refuse la même
 * chaîne : l'écran et le serveur se contredisaient sur des touches identiques.
 *
 * Une chaîne vide est licite : elle signifie « pas encore renseigné », ce qui
 * est différent de zéro et que la colonne nullable existe pour distinguer.
 */
export function coutSaisiValide(saisie: string): boolean {
  const brut = saisie.trim();
  if (!brut) return true;
  // Au moins un chiffre : « 0 » passe, « abc » et « — » non. `toCents` écarte
  // ensuite tout le reste, donc ce test suffit à séparer les deux cas.
  return /\d/.test(brut);
}
